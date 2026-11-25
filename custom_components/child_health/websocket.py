"""Websocket API used by the Lovelace card to discover a child's entities and settings."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er

from .const import CONF_CLEAR_HOURS, CONF_INTERVAL_HOURS, DOMAIN, UNIT_SYMBOL
from .data import ChildHealthData, key_for


def describe_child(hass: HomeAssistant, data: ChildHealthData) -> dict[str, Any]:
    """Describe one child: settings plus the entity id of each of its entities."""
    registry = er.async_get(hass)
    entry_id = data.entry.entry_id

    def entity(platform: str, suffix: str) -> str | None:
        return registry.async_get_entity_id(platform, DOMAIN, f"{entry_id}_{suffix}")

    symptoms = []
    for sym in data.symptom_defs:
        key = key_for(sym["name"])
        symptoms.append(
            {
                "key": key,
                "name": sym["name"],
                "clear_hours": float(sym[CONF_CLEAR_HOURS]),
                "last": entity("sensor", f"symptom_{key}_last"),
                "clear_at": entity("sensor", f"symptom_{key}_clear_at"),
                "clear": entity("binary_sensor", f"symptom_{key}_clear"),
            }
        )

    medicines = []
    for med in data.medicine_defs:
        key = key_for(med["name"])
        medicines.append(
            {
                "key": key,
                "name": med["name"],
                "interval_hours": float(med[CONF_INTERVAL_HOURS]),
                "last": entity("sensor", f"medicine_{key}_last"),
                "next": entity("sensor", f"medicine_{key}_next"),
                "allowed": entity("binary_sensor", f"medicine_{key}_allowed"),
            }
        )

    return {
        "entry_id": entry_id,
        "name": data.name,
        "unit": data.unit,
        "unit_symbol": UNIT_SYMBOL[data.unit],
        "fever_threshold": data.fever_threshold,
        "recheck_minutes": data.recheck_minutes,
        "symptoms": symptoms,
        "medicines": medicines,
        "entities": {
            "last_temperature": entity("sensor", "last_temperature"),
            "recheck_at": entity("sensor", "recheck_at"),
            "fever": entity("binary_sensor", "fever"),
            "ill": entity("binary_sensor", "ill"),
        },
    }


@websocket_api.websocket_command({vol.Required("type"): "child_health/children"})
@callback
def ws_children(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Return every loaded child with its settings and entity ids."""
    children = [
        describe_child(hass, entry.runtime_data)
        for entry in hass.config_entries.async_entries(DOMAIN)
        if entry.state is ConfigEntryState.LOADED
    ]
    connection.send_result(msg["id"], children)


@callback
def async_register_websocket(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_children)
