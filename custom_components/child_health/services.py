"""Services for Child Health."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, ServiceCall, SupportsResponse, callback
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv

from .const import (
    DOMAIN,
    SERVICE_DELETE_ENTRY,
    SERVICE_END_EPISODE,
    SERVICE_GET_HISTORY,
    SERVICE_LOG_DOSE,
    SERVICE_LOG_SYMPTOM,
    SERVICE_LOG_TEMPERATURE,
    SERVICE_START_EPISODE,
    UNIT_SYMBOL,
)
from .data import KIND_TO_COLLECTION, ChildHealthData, DoseTooSoon

ATTR_CONFIG_ENTRY = "config_entry"
ATTR_OCCURRED_AT = "occurred_at"
ATTR_NOTE = "note"

_BASE = {
    vol.Required(ATTR_CONFIG_ENTRY): cv.string,
    vol.Optional(ATTR_OCCURRED_AT): cv.datetime,
}

LOG_SYMPTOM_SCHEMA = vol.Schema(
    {**_BASE, vol.Required("symptom"): cv.string, vol.Optional(ATTR_NOTE): cv.string}
)
LOG_TEMPERATURE_SCHEMA = vol.Schema(
    {
        **_BASE,
        vol.Required("temperature"): vol.Coerce(float),
        vol.Optional(ATTR_NOTE): cv.string,
    }
)
LOG_DOSE_SCHEMA = vol.Schema(
    {
        **_BASE,
        vol.Required("medicine"): cv.string,
        vol.Optional("given_by"): cv.string,
        vol.Optional(ATTR_NOTE): cv.string,
        vol.Optional("override", default=False): cv.boolean,
        vol.Optional("fail_if_too_soon", default=True): cv.boolean,
    }
)
START_EPISODE_SCHEMA = vol.Schema(
    {**_BASE, vol.Optional("illness"): cv.string, vol.Optional("notes"): cv.string}
)
END_EPISODE_SCHEMA = vol.Schema(_BASE)
DELETE_ENTRY_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_CONFIG_ENTRY): cv.string,
        vol.Required("kind"): vol.In(list(KIND_TO_COLLECTION)),
        vol.Required("record_id"): cv.string,
    }
)
GET_HISTORY_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_CONFIG_ENTRY): cv.string,
        vol.Optional("days", default=7): vol.All(vol.Coerce(int), vol.Range(min=1, max=3650)),
    }
)


def _get_data(call: ServiceCall) -> ChildHealthData:
    entry = call.hass.config_entries.async_get_entry(call.data[ATTR_CONFIG_ENTRY])
    if entry is None or entry.domain != DOMAIN:
        raise ServiceValidationError(translation_domain=DOMAIN, translation_key="unknown_child")
    if entry.state is not ConfigEntryState.LOADED:
        raise ServiceValidationError(translation_domain=DOMAIN, translation_key="child_not_loaded")
    return entry.runtime_data


async def _log_symptom(call: ServiceCall) -> dict[str, Any]:
    data = _get_data(call)
    record = data.log_symptom(
        call.data["symptom"], call.data.get(ATTR_OCCURRED_AT), call.data.get(ATTR_NOTE)
    )
    sym = next(s for s in data.symptom_defs if s["name"] == record["name"])
    clear = data.clear_at(sym)
    return {
        "id": record["id"],
        "child": data.name,
        "symptom": record["name"],
        "logged_at": record["at"],
        "all_clear_at": clear.isoformat() if clear else None,
        "clear_hours": float(sym["clear_hours"]),
    }


async def _log_temperature(call: ServiceCall) -> dict[str, Any]:
    data = _get_data(call)
    record = data.log_temperature(
        call.data["temperature"], call.data.get(ATTR_OCCURRED_AT), call.data.get(ATTR_NOTE)
    )
    return {
        "id": record["id"],
        "child": data.name,
        "temperature": record["value"],
        "unit": UNIT_SYMBOL[data.unit],
        "logged_at": record["at"],
        "fever": record["value"] >= data.fever_threshold,
    }


async def _log_dose(call: ServiceCall) -> dict[str, Any]:
    data = _get_data(call)
    try:
        record = data.log_dose(
            call.data["medicine"],
            call.data.get(ATTR_OCCURRED_AT),
            call.data.get("given_by") or None,
            call.data.get(ATTR_NOTE),
            call.data["override"],
        )
    except DoseTooSoon as err:
        if call.data["fail_if_too_soon"]:
            raise
        return {
            "logged": False,
            "too_soon": True,
            "child": data.name,
            "medicine": err.medicine,
            "next_dose_allowed": err.allowed_from.isoformat(),
        }
    med = next(m for m in data.medicine_defs if m["name"] == record["name"])
    next_allowed = data.next_dose_at(med)
    return {
        "logged": True,
        "too_soon": False,
        "id": record["id"],
        "child": data.name,
        "medicine": record["name"],
        "logged_at": record["at"],
        "next_dose_allowed": next_allowed.isoformat() if next_allowed else None,
    }


async def _start_episode(call: ServiceCall) -> dict[str, Any]:
    record = _get_data(call).start_episode(
        call.data.get("illness"), call.data.get(ATTR_OCCURRED_AT), call.data.get("notes")
    )
    return {"id": record["id"], "started_at": record["start"]}


async def _end_episode(call: ServiceCall) -> dict[str, Any]:
    record = _get_data(call).end_episode(call.data.get(ATTR_OCCURRED_AT))
    return {"id": record["id"], "ended_at": record["end"]}


async def _delete_entry(call: ServiceCall) -> None:
    _get_data(call).delete_record(call.data["kind"], call.data["record_id"])


async def _get_history(call: ServiceCall) -> dict[str, Any]:
    return _get_data(call).history(call.data["days"])


@callback
def async_register_services(hass: HomeAssistant) -> None:
    """Register the integration's services (once, at component setup)."""
    optional = SupportsResponse.OPTIONAL
    register = hass.services.async_register
    register(DOMAIN, SERVICE_LOG_SYMPTOM, _log_symptom, LOG_SYMPTOM_SCHEMA, optional)
    register(DOMAIN, SERVICE_LOG_TEMPERATURE, _log_temperature, LOG_TEMPERATURE_SCHEMA, optional)
    register(DOMAIN, SERVICE_LOG_DOSE, _log_dose, LOG_DOSE_SCHEMA, optional)
    register(DOMAIN, SERVICE_START_EPISODE, _start_episode, START_EPISODE_SCHEMA, optional)
    register(DOMAIN, SERVICE_END_EPISODE, _end_episode, END_EPISODE_SCHEMA, optional)
    register(DOMAIN, SERVICE_DELETE_ENTRY, _delete_entry, DELETE_ENTRY_SCHEMA)
    register(DOMAIN, SERVICE_GET_HISTORY, _get_history, GET_HISTORY_SCHEMA, SupportsResponse.ONLY)
