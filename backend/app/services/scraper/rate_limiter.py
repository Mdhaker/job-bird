import asyncio
import random
import time
from dataclasses import dataclass, field
from app.core.config import get_settings

settings = get_settings()


@dataclass
class RateLimiter:
    min_delay: float = field(default_factory=lambda: settings.SCRAPER_MIN_DELAY_S)
    max_delay: float = field(default_factory=lambda: settings.SCRAPER_MAX_DELAY_S)
    _last_request_at: float = field(default=0.0, init=False)
    _request_count: int = field(default=0, init=False)
    _backoff_factor: float = field(default=1.0, init=False)

    async def wait(self) -> None:
        elapsed = time.monotonic() - self._last_request_at
        delay = random.uniform(self.min_delay, self.max_delay) * self._backoff_factor
        wait_time = max(0.0, delay - elapsed)
        if wait_time > 0:
            await asyncio.sleep(wait_time)
        self._last_request_at = time.monotonic()
        self._request_count += 1

    def on_rate_limited(self) -> None:
        self._backoff_factor = min(self._backoff_factor * 2.0, 16.0)

    def on_success(self) -> None:
        self._backoff_factor = max(1.0, self._backoff_factor * 0.9)

    async def human_pause(self, min_s: float = 1.5, max_s: float = 4.0) -> None:
        await asyncio.sleep(random.uniform(min_s, max_s))

    async def page_read_pause(self) -> None:
        """Simulate reading time before next action."""
        await asyncio.sleep(random.uniform(0.8, 2.5))
