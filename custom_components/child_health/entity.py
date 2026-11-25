"""Base entity for Child Health."""

from __future__ import annotations

from homeassistant.core import callback
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import Entity

from .const import DOMAIN
from .data import ChildHealthData


class ChildHealthEntity(Entity):
    """Entity that refreshes whenever the child's records change."""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, data: ChildHealthData, key: str, name: str) -> None:
        self.data = data
        self._attr_unique_id = f"{data.entry.entry_id}_{key}"
        data.unique_ids.add(self._attr_unique_id)
        self._attr_name = name
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, data.entry.entry_id)},
            name=data.name,
            entry_type=DeviceEntryType.SERVICE,
        )

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            async_dispatcher_connect(self.hass, self.data.signal, self._handle_update)
        )

    @callback
    def _handle_update(self) -> None:
        self.async_write_ha_state()
