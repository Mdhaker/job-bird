import asyncio
import random
import logging
from playwright.async_api import Page
from app.services.scraper.rate_limiter import RateLimiter

logger = logging.getLogger(__name__)

LINKEDIN_LOGIN_URL = "https://www.linkedin.com/login"
LINKEDIN_HOME_URL = "https://www.linkedin.com/feed"
CAPTCHA_SELECTORS = [
    "#captcha-internal",
    "iframe[src*='captcha']",
    ".captcha__image",
]
CHECKPOINT_SELECTORS = [
    "#input__phone_verification_pin",
    "[data-test-id='challenge-form']",
    ".challenge-dialog",
]


async def _type_humanlike(page: Page, selector: str, text: str) -> None:
    await page.click(selector)
    await asyncio.sleep(random.uniform(0.3, 0.8))
    for char in text:
        await page.type(selector, char, delay=random.randint(50, 180))
        if random.random() < 0.05:
            await asyncio.sleep(random.uniform(0.2, 0.6))


async def is_logged_in(page: Page) -> bool:
    try:
        await page.goto(LINKEDIN_HOME_URL, wait_until="domcontentloaded")
        await asyncio.sleep(random.uniform(1.5, 3.0))
        return page.url.startswith("https://www.linkedin.com/feed")
    except Exception:
        return False


async def login(page: Page, email: str, password: str, rate_limiter: RateLimiter) -> bool:
    logger.info("Attempting LinkedIn login for %s", email)
    await rate_limiter.wait()

    try:
        await page.goto(LINKEDIN_LOGIN_URL, wait_until="domcontentloaded")
        await asyncio.sleep(random.uniform(1.0, 2.5))

        await _type_humanlike(page, "#username", email)
        await rate_limiter.human_pause(0.5, 1.5)
        await _type_humanlike(page, "#password", password)
        await rate_limiter.human_pause(0.8, 2.0)

        await page.click('[data-litms-control-urn="login-submit"]')
        await page.wait_for_load_state("domcontentloaded")
        await asyncio.sleep(random.uniform(2.0, 4.0))

        if await _check_captcha(page):
            logger.warning("CAPTCHA detected during login for %s", email)
            return False

        if await _check_checkpoint(page):
            logger.warning("Security checkpoint detected for %s — manual action required", email)
            return False

        if page.url.startswith("https://www.linkedin.com/feed"):
            logger.info("Login successful for %s", email)
            return True

        logger.warning("Login failed for %s — unexpected URL: %s", email, page.url)
        return False

    except Exception as exc:
        logger.error("Login error for %s: %s", email, exc)
        return False


async def _check_captcha(page: Page) -> bool:
    for sel in CAPTCHA_SELECTORS:
        try:
            el = page.locator(sel)
            if await el.count() > 0:
                return True
        except Exception:
            pass
    return False


async def _check_checkpoint(page: Page) -> bool:
    for sel in CHECKPOINT_SELECTORS:
        try:
            el = page.locator(sel)
            if await el.count() > 0:
                return True
        except Exception:
            pass
    return "challenge" in page.url or "checkpoint" in page.url
