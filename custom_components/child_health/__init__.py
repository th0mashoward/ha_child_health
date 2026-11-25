"""The Child Health integration.

Tracks a child's illness episodes, symptoms, temperature readings and medication given.
This integration only records data and reminds; it never calculates doses.
"""

from __future__ import annotations

from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.typing import ConfigType

from .card import async_register_card
from .const import DOMAIN
from .data import ChildHealthConfigEntry, ChildHealthData
from .services import async_register_services
from .websocket import async_register_websocket

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

PLATFORMS: list[Platform] = [Platform.BINARY_SENSOR, Platform.SENSOR]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register services, the card's websocket API and the card itself, once."""
    async_register_services(hass)
    async_register_websocket(hass)
    await async_register_card(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ChildHealthConfigEntry) -> bool:
    """Set up a child from a config entry."""
    data = ChildHealthData(hass, entry)
    await data.async_load()
    entry.runtime_data = data

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    _remove_stale_entities(hass, entry, data)
    data.async_start()

    entry.async_on_unload(entry.add_update_listener(_async_reload_on_update))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ChildHealthConfigEntry) -> bool:
    """Unload a config entry."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        await entry.runtime_data.async_shutdown()
    return unloaded


async def async_remove_entry(hass: HomeAssistant, entry: ChildHealthConfigEntry) -> None:
    """Delete the child's stored records when the entry is removed."""
    await ChildHealthData(hass, entry).async_remove_storage()


async def _async_reload_on_update(hass: HomeAssistant, entry: ChildHealthConfigEntry) -> None:
    """Reload the entry when its options change."""
    await hass.config_entries.async_reload(entry.entry_id)


def _remove_stale_entities(
    hass: HomeAssistant, entry: ChildHealthConfigEntry, data: ChildHealthData
) -> None:
    """Drop entities for symptoms or medicines that were removed in the options."""
    registry = er.async_get(hass)
    for entity in er.async_entries_for_config_entry(registry, entry.entry_id):
        if entity.unique_id not in data.unique_ids:
            registry.async_remove(entity.entity_id)
