"""Serve the Child Health Lovelace card from the integration and load it in the frontend."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.loader import async_get_integration

from .const import DOMAIN

URL_BASE = "/child_health_static"
CARD_FILE = "child-health-card.js"
CARD_PATH = Path(__file__).parent / "frontend" / CARD_FILE


async def async_register_card(hass: HomeAssistant) -> None:
    """Make the card available at /child_health_static/ and add it to every dashboard load.

    Users therefore don't need to add a dashboard resource by hand. If the HTTP server or
    the frontend isn't loaded (or the card file is missing), this quietly does nothing.
    """
    http = getattr(hass, "http", None)
    if http is None or not CARD_PATH.is_file():
        return

    url = f"{URL_BASE}/{CARD_FILE}"
    await http.async_register_static_paths([StaticPathConfig(url, str(CARD_PATH), False)])

    if "frontend" in hass.config.components:
        from homeassistant.components.frontend import add_extra_js_url

        integration = await async_get_integration(hass, DOMAIN)
        add_extra_js_url(hass, f"{url}?v={integration.version}")
