"""Sensors for Child Health."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.const import UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import UNIT_CELSIUS
from .data import ChildHealthConfigEntry, ChildHealthData, key_for
from .entity import ChildHealthEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ChildHealthConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    data = entry.runtime_data
    entities: list[ChildHealthEntity] = [LastTemperatureSensor(data), RecheckAtSensor(data)]
    for sym in data.symptom_defs:
        entities.append(SymptomLastSensor(data, sym))
        entities.append(SymptomClearAtSensor(data, sym))
    for med in data.medicine_defs:
        entities.append(DoseLastSensor(data, med))
        entities.append(DoseNextSensor(data, med))
    async_add_entities(entities)


class LastTemperatureSensor(ChildHealthEntity, SensorEntity):
    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_suggested_display_precision = 1

    def __init__(self, data: ChildHealthData) -> None:
        super().__init__(data, "last_temperature", "Last temperature")
        self._attr_native_unit_of_measurement = (
            UnitOfTemperature.CELSIUS if data.unit == UNIT_CELSIUS else UnitOfTemperature.FAHRENHEIT
        )

    @property
    def native_value(self) -> float | None:
        record = self.data.last_temperature()
        return record["value"] if record else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        record = self.data.last_temperature()
        return {
            "recorded_at": record["at"] if record else None,
            "fever_threshold": self.data.fever_threshold,
        }


class SymptomLastSensor(ChildHealthEntity, SensorEntity):
    _attr_device_class = SensorDeviceClass.TIMESTAMP
    _attr_icon = "mdi:emoticon-sick-outline"

    def __init__(self, data: ChildHealthData, sym: dict[str, Any]) -> None:
        self._key = key_for(sym["name"])
        super().__init__(data, f"symptom_{self._key}_last", f"{sym['name']} last occurred")

    @property
    def native_value(self) -> datetime | None:
        return self.data.last_symptom_at(self._key)


class SymptomClearAtSensor(ChildHealthEntity, SensorEntity):
    _attr_device_class = SensorDeviceClass.TIMESTAMP
    _attr_icon = "mdi:timer-sand"

    def __init__(self, data: ChildHealthData, sym: dict[str, Any]) -> None:
        self._sym = sym
        super().__init__(
            data, f"symptom_{key_for(sym['name'])}_clear_at", f"{sym['name']} all clear at"
        )

    @property
    def native_value(self) -> datetime | None:
        return self.data.clear_at(self._sym)


class DoseLastSensor(ChildHealthEntity, SensorEntity):
    _attr_device_class = SensorDeviceClass.TIMESTAMP
    _attr_icon = "mdi:pill"

    def __init__(self, data: ChildHealthData, med: dict[str, Any]) -> None:
        self._key = key_for(med["name"])
        super().__init__(data, f"medicine_{self._key}_last", f"{med['name']} last dose")

    @property
    def native_value(self) -> datetime | None:
        return self.data.last_dose(self._key)


class DoseNextSensor(ChildHealthEntity, SensorEntity):
    """When the next dose is allowed, from the interval the user entered (not a dose advice)."""

    _attr_device_class = SensorDeviceClass.TIMESTAMP
    _attr_icon = "mdi:clock-check-outline"

    def __init__(self, data: ChildHealthData, med: dict[str, Any]) -> None:
        self._med = med
        super().__init__(
            data, f"medicine_{key_for(med['name'])}_next", f"{med['name']} next dose allowed"
        )

    @property
    def native_value(self) -> datetime | None:
        return self.data.next_dose_at(self._med)


class RecheckAtSensor(ChildHealthEntity, SensorEntity):
    """When to take another temperature. Empty unless the latest reading is a fever."""

    _attr_device_class = SensorDeviceClass.TIMESTAMP
    _attr_icon = "mdi:thermometer-alert"

    def __init__(self, data: ChildHealthData) -> None:
        super().__init__(data, "recheck_at", "Recheck temperature at")

    @property
    def native_value(self) -> datetime | None:
        return self.data.recheck_due_at()
