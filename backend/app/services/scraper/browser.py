import asyncio
import json
import os
import random
from pathlib import Path
from typing import Optional
from playwright.async_api import async_playwright, Browser, BrowserContext, Page, Playwright
from app.core.config import get_settings

settings = get_settings()

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
]

VIEWPORTS = [
    {"width": 1920, "height": 1080},
    {"width": 1440, "height": 900},
    {"width": 1536, "height": 864},
    {"width": 1280, "height": 800},
]


class BrowserManager:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.session_dir = Path(settings.SCRAPER_SESSION_DIR) / session_id
        self.session_dir.mkdir(parents=True, exist_ok=True)
        self._playwright: Optional[Playwright] = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None

    async def __aenter__(self) -> "BrowserManager":
        await self.start()
        return self

    async def __aexit__(self, *args) -> None:
        await self.stop()

    async def start(self) -> None:
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
                "--disable-extensions",
                "--disable-gpu",
                "--window-size=1920,1080",
            ],
        )
        viewport = random.choice(VIEWPORTS)
        user_agent = random.choice(USER_AGENTS)
        storage_state = self._load_session()

        context_kwargs = {
            "viewport": viewport,
            "user_agent": user_agent,
            "locale": "en-US",
            "timezone_id": "America/New_York",
            "permissions": ["geolocation"],
            "java_script_enabled": True,
            "accept_downloads": False,
        }
        if storage_state:
            context_kwargs["storage_state"] = storage_state

        self._context = await self._browser.new_context(**context_kwargs)
        await self._apply_stealth(self._context)

    async def _apply_stealth(self, context: BrowserContext) -> None:
        await context.add_init_script("""
            // Remove webdriver property
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

            // Mock plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });

            // Mock languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });

            // Mock permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) =>
                parameters.name === 'notifications'
                    ? Promise.resolve({ state: Notification.permission })
                    : originalQuery(parameters);

            // Remove automation indicators
            window.chrome = { runtime: {} };

            // Mock hardware concurrency
            Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });

            // Mock device memory
            Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
        """)

    async def new_page(self) -> Page:
        page = await self._context.new_page()
        page.set_default_timeout(settings.SCRAPER_PAGE_TIMEOUT_MS)
        page.set_default_navigation_timeout(settings.SCRAPER_PAGE_TIMEOUT_MS)
        return page

    async def save_session(self) -> None:
        if self._context:
            state = await self._context.storage_state()
            state_path = self.session_dir / "session.json"
            state_path.write_text(json.dumps(state))

    def _load_session(self) -> Optional[dict]:
        state_path = self.session_dir / "session.json"
        if state_path.exists():
            try:
                return json.loads(state_path.read_text())
            except Exception:
                return None
        return None

    def clear_session(self) -> None:
        state_path = self.session_dir / "session.json"
        if state_path.exists():
            state_path.unlink()

    async def stop(self) -> None:
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
