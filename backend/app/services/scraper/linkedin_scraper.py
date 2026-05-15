import asyncio
import logging
import random
import re
from datetime import datetime, timezone
from typing import AsyncIterator, Optional
from urllib.parse import urlencode, quote_plus

from playwright.async_api import Page, TimeoutError as PlaywrightTimeout

from app.services.scraper.browser import BrowserManager
from app.services.scraper.linkedin_auth import login, is_logged_in
from app.services.scraper.rate_limiter import RateLimiter

logger = logging.getLogger(__name__)

LINKEDIN_JOBS_URL = "https://www.linkedin.com/jobs/search/"

EXPERIENCE_MAP = {
    "internship": "1",
    "entry": "2",
    "associate": "3",
    "mid": "3",
    "senior": "4",
    "director": "5",
    "executive": "6",
}

JOB_TYPE_MAP = {
    "full_time": "F",
    "part_time": "P",
    "contract": "C",
    "temporary": "T",
    "internship": "I",
    "volunteer": "V",
}

DATE_POSTED_MAP = {
    "24h": "r86400",
    "week": "r604800",
    "month": "r2592000",
}

REMOTE_MAP = {
    "onsite": "1",
    "remote": "2",
    "hybrid": "3",
}


def _build_search_url(
    keywords: str,
    location: str,
    remote_filter: Optional[str] = None,
    experience_levels: Optional[list[str]] = None,
    job_types: Optional[list[str]] = None,
    date_posted: Optional[str] = None,
    start: int = 0,
) -> str:
    params: dict = {
        "keywords": keywords,
        "location": location,
        "start": start,
        "sortBy": "R",
    }
    if remote_filter and remote_filter in REMOTE_MAP:
        params["f_WT"] = REMOTE_MAP[remote_filter]
    if experience_levels:
        codes = [EXPERIENCE_MAP[e] for e in experience_levels if e in EXPERIENCE_MAP]
        if codes:
            params["f_E"] = ",".join(codes)
    if job_types:
        codes = [JOB_TYPE_MAP[t] for t in job_types if t in JOB_TYPE_MAP]
        if codes:
            params["f_JT"] = ",".join(codes)
    if date_posted and date_posted in DATE_POSTED_MAP:
        params["f_TPR"] = DATE_POSTED_MAP[date_posted]

    return LINKEDIN_JOBS_URL + "?" + urlencode(params)


async def _scroll_page(page: Page) -> None:
    """Human-like scroll to load dynamic content."""
    total_height = await page.evaluate("document.body.scrollHeight")
    viewport_height = page.viewport_size["height"] if page.viewport_size else 800
    current = 0
    while current < total_height:
        scroll_by = random.randint(300, 600)
        current = min(current + scroll_by, total_height)
        await page.evaluate(f"window.scrollTo(0, {current})")
        await asyncio.sleep(random.uniform(0.3, 0.9))


async def _extract_job_cards(page: Page) -> list[dict]:
    """Extract basic job data from search results page."""
    await page.wait_for_selector(".jobs-search__results-list, .scaffold-layout__list", timeout=15000)
    cards = []
    job_items = await page.query_selector_all(
        "li.jobs-search-results__list-item, .job-card-container"
    )
    for item in job_items:
        try:
            title_el = await item.query_selector(".job-card-list__title, .base-search-card__title")
            company_el = await item.query_selector(".job-card-container__primary-description, .base-search-card__subtitle")
            location_el = await item.query_selector(".job-card-container__metadata-item, .job-search-card__location")
            link_el = await item.query_selector("a.job-card-list__title--link, a.base-card__full-link")
            job_id_el = await item.query_selector("[data-job-id]")

            title = await title_el.inner_text() if title_el else ""
            company = await company_el.inner_text() if company_el else ""
            location = await location_el.inner_text() if location_el else ""
            url = await link_el.get_attribute("href") if link_el else ""
            job_id = await job_id_el.get_attribute("data-job-id") if job_id_el else ""

            if not url:
                continue

            # Normalize URL
            if url.startswith("/"):
                url = "https://www.linkedin.com" + url
            url = url.split("?")[0]

            # Extract job ID from URL if not found in attribute
            if not job_id:
                m = re.search(r"/jobs/view/(\d+)", url)
                job_id = m.group(1) if m else url

            cards.append({
                "title": title.strip(),
                "company": company.strip(),
                "location": location.strip(),
                "url": url,
                "external_id": job_id,
            })
        except Exception as e:
            logger.debug("Error parsing job card: %s", e)

    return cards


async def _extract_job_detail(page: Page, url: str, rate_limiter: RateLimiter) -> dict:
    """Navigate to job detail page and extract full description."""
    await rate_limiter.wait()
    try:
        await page.goto(url, wait_until="domcontentloaded")
        await asyncio.sleep(random.uniform(1.5, 3.5))

        # Click "See more" to expand description
        try:
            see_more = page.locator(".jobs-description__footer-button, button:has-text('Show more')")
            if await see_more.count() > 0:
                await see_more.first.click()
                await asyncio.sleep(0.8)
        except Exception:
            pass

        description_el = await page.query_selector(
            ".jobs-description__content, .show-more-less-html__markup"
        )
        description = await description_el.inner_text() if description_el else ""

        easy_apply = False
        try:
            apply_btn = page.locator(".jobs-apply-button--top-card")
            if await apply_btn.count() > 0:
                btn_text = await apply_btn.first.inner_text()
                easy_apply = "easy apply" in btn_text.lower()
        except Exception:
            pass

        company_url = None
        try:
            company_link = await page.query_selector(".jobs-company__box a, .topcard__org-name-link")
            if company_link:
                company_url = await company_link.get_attribute("href")
        except Exception:
            pass

        salary = None
        try:
            salary_el = await page.query_selector(
                ".jobs-unified-top-card__salary-range, .compensation__salary-range"
            )
            if salary_el:
                salary = (await salary_el.inner_text()).strip()
        except Exception:
            pass

        job_type = None
        experience = None
        skills = []
        try:
            criteria = await page.query_selector_all(".description__job-criteria-item")
            for c in criteria:
                header_el = await c.query_selector(".description__job-criteria-subheader")
                value_el = await c.query_selector(".description__job-criteria-text")
                if header_el and value_el:
                    header = (await header_el.inner_text()).strip().lower()
                    value = (await value_el.inner_text()).strip()
                    if "employment type" in header:
                        job_type = value
                    elif "seniority" in header or "experience" in header:
                        experience = value
        except Exception:
            pass

        posted_at = None
        try:
            posted_el = await page.query_selector("time.jobs-unified-top-card__posted-date, time")
            if posted_el:
                dt_attr = await posted_el.get_attribute("datetime")
                if dt_attr:
                    posted_at = datetime.fromisoformat(dt_attr.replace("Z", "+00:00"))
        except Exception:
            pass

        await rate_limiter.page_read_pause()

        return {
            "description": description.strip(),
            "is_easy_apply": easy_apply,
            "company_url": company_url,
            "salary_range": salary,
            "job_type": job_type,
            "experience_level": experience,
            "skills_required": skills,
            "posted_at": posted_at,
        }

    except PlaywrightTimeout:
        logger.warning("Timeout loading job detail: %s", url)
        return {}
    except Exception as e:
        logger.error("Error extracting job detail %s: %s", url, e)
        return {}


class LinkedInScraper:
    def __init__(self, account_email: str, account_password: str, session_id: str):
        self.account_email = account_email
        self.account_password = account_password
        self.session_id = session_id
        self.rate_limiter = RateLimiter()

    async def scrape(
        self,
        keywords: str,
        location: str,
        remote_filter: Optional[str] = None,
        experience_levels: Optional[list[str]] = None,
        job_types: Optional[list[str]] = None,
        date_posted: Optional[str] = None,
        max_results: int = 100,
        progress_callback=None,
    ) -> AsyncIterator[dict]:
        """Main scraping method — yields job dicts one by one."""
        async with BrowserManager(session_id=self.session_id) as browser:
            page = await browser.new_page()

            # Authenticate
            already_in = await is_logged_in(page)
            if not already_in:
                success = await login(page, self.account_email, self.account_password, self.rate_limiter)
                if not success:
                    raise RuntimeError("LinkedIn login failed — check credentials or handle CAPTCHA")
                await browser.save_session()
            else:
                logger.info("Reusing existing LinkedIn session for %s", self.account_email)

            results_collected = 0
            start_offset = 0
            page_size = 25

            while results_collected < max_results:
                url = _build_search_url(
                    keywords=keywords,
                    location=location,
                    remote_filter=remote_filter,
                    experience_levels=experience_levels,
                    job_types=job_types,
                    date_posted=date_posted,
                    start=start_offset,
                )

                await self.rate_limiter.wait()
                logger.info("Fetching search page: start=%d", start_offset)

                try:
                    await page.goto(url, wait_until="domcontentloaded")
                    await asyncio.sleep(random.uniform(1.5, 3.0))
                except PlaywrightTimeout:
                    logger.warning("Timeout on search page start=%d, retrying...", start_offset)
                    self.rate_limiter.on_rate_limited()
                    await asyncio.sleep(10)
                    continue

                # Check for rate limiting / challenge
                if "checkpoint" in page.url or "challenge" in page.url:
                    logger.error("LinkedIn challenge page encountered — stopping")
                    break

                await _scroll_page(page)

                cards = await _extract_job_cards(page)
                if not cards:
                    logger.info("No more job cards found at start=%d — done", start_offset)
                    break

                for card in cards:
                    if results_collected >= max_results:
                        break

                    detail = await _extract_job_detail(page, card["url"], self.rate_limiter)
                    job_data = {**card, **detail, "scraped_at": datetime.now(timezone.utc)}

                    self.rate_limiter.on_success()
                    results_collected += 1

                    if progress_callback:
                        progress_callback(results_collected)

                    yield job_data

                start_offset += page_size
                if len(cards) < page_size:
                    break

                # Extra delay between pages
                await asyncio.sleep(random.uniform(3.0, 8.0))

            await browser.save_session()
            logger.info("Scraping completed: %d jobs collected", results_collected)
