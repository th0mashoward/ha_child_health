"""Binary sensors for Child Health."""

from __future__ import annotations

from typing import Any

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.util import dt as dt_util

from .data import ChildHealthConfigEntry, ChildHealthData, key_for
from .entity import ChildHealthEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ChildHealthConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    data = entry.runtime_data
    entities: list[ChildHealthEntity] = [FeverBinarySensor(data), IllBinarySensor(data)]
    entities.extend(SymptomClearBinarySensor(data, sym) for sym in data.symptom_defs)
    entities.extend(DoseAllowedBinarySensor(data, med) for med in data.medicine_defs)
    async_add_entities(entities)


class FeverBinarySensor(ChildHealthEntity, BinarySensorEntity):
    """On when the most recent reading is at or above the fever threshold."""

    _attr_icon = "mdi:thermometer-alert"

    def __init__(self, data: ChildHealthData) -> None:
        super().__init__(data, "fever", "Fever")

    @property
    def is_on(self) -> bool:
        record = self.data.last_temperature()
        return bool(record) and record["value"] >= self.data.fever_threshold


class IllBinarySensor(ChildHealthEntity, BinarySensorEntity):
    """On while an illness episode is open."""

    _attr_icon = "mdi:emoticon-sick"

    def __init__(self, data: ChildHealthData) -> None:
        super().__init__(data, "ill", "Currently ill")

    @property
    def is_on(self) -> bool:
        return self.data.open_episode() is not None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        episode = self.data.open_episode()
        return {"illness": episode["illness"], "since": episode["start"]} if episode else {}


class SymptomClearBinarySensor(ChildHealthEntity, BinarySensorEntity):
    """On once the all-clear time has passed with no further episode (or none was logged)."""

    def __init__(self, data: ChildHealthData, sym: dict[str, Any]) -> None:
        self._sym = sym
        super().__init__(data, f"symptom_{key_for(sym['name'])}_clear", f"{sym['name']} all clear")

    @property
    def is_on(self) -> bool:
        return self.data.is_clear(self._sym)

    @property
    def icon(self) -> str:
        return "mdi:check-circle-outline" if self.is_on else "mdi:timer-sand"

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        last = self.data.last_symptom_at(key_for(self._sym["name"]))
        clear = self.data.clear_at(self._sym)
        return {
            "last_occurred": last.isoformat() if last else None,
            "all_clear_at": clear.isoformat() if clear else None,
            "clear_hours": float(self._sym["clear_hours"]),
        }


class DoseAllowedBinarySensor(ChildHealthEntity, BinarySensorEntity):
    """On when the minimum interval you set has passed since the last dose (or none was logged).

    This reflects only the interval entered from the medicine label; it is not dosing advice.
    """

    def __init__(self, data: ChildHealthData, med: dict[str, Any]) -> None:
        self._med = med
        super().__init__(
            data, f"medicine_{key_for(med['name'])}_allowed", f"{med['name']} dose allowed"
        )

    @property
    def is_on(self) -> bool:
        next_dose = self.data.next_dose_at(self._med)
        return next_dose is None or dt_util.utcnow() >= next_dose

    @property
    def icon(self) -> str:
        return "mdi:pill" if self.is_on else "mdi:pill-off"

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        last = self.data.last_dose(key_for(self._med["name"]))
        next_dose = self.data.next_dose_at(self._med)
        return {
            "last_dose": last.isoformat() if last else None,
            "next_dose_allowed": next_dose.isoformat() if next_dose else None,
            "interval_hours": float(self._med["interval_hours"]),
        }
