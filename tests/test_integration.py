"""Tests for storage, services, entities and the all-clear event."""

from datetime import timedelta
from typing import Any

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_capture_events,
    async_fire_time_changed,
)

from custom_components.child_health.const import (
    CONF_CLEAR_HOURS,
    CONF_INTERVAL_HOURS,
    CONF_MEDICINES,
    CONF_SYMPTOMS,
    CONF_TEMPERATURE_UNIT,
    DOMAIN,
    EVENT_DOSE_AVAILABLE,
    EVENT_FEVER_DETECTED,
    EVENT_RECHECK_TEMPERATURE,
    EVENT_SYMPTOM_ALL_CLEAR,
    default_options,
)

NOW = "2026-11-18 10:00:00+00:00"
MEDICINE = {"name": "Medicine A", CONF_INTERVAL_HOURS: 6.0}


def _make_entry(**options: Any) -> MockConfigEntry:
    return MockConfigEntry(
        domain=DOMAIN,
        title="Alice",
        unique_id="alice",
        data={"name": "Alice", CONF_TEMPERATURE_UNIT: "celsius"},
        options={**default_options("celsius"), **options},
    )


async def _setup(hass: HomeAssistant, **options: Any) -> MockConfigEntry:
    entry = _make_entry(**options)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def _eid(hass: HomeAssistant, platform: str, entry: MockConfigEntry, key: str) -> str:
    entity_id = er.async_get(hass).async_get_entity_id(platform, DOMAIN, f"{entry.entry_id}_{key}")
    assert entity_id is not None, key
    return entity_id


async def _call(hass: HomeAssistant, service: str, entry: MockConfigEntry, **data: Any):
    return await hass.services.async_call(
        DOMAIN,
        service,
        {"config_entry": entry.entry_id, **data},
        blocking=True,
        return_response=True,
    )


async def test_setup_creates_expected_entities(hass: HomeAssistant) -> None:
    entry = await _setup(hass, **{CONF_MEDICINES: [MEDICINE]})
    ids = {
        e.unique_id for e in er.async_entries_for_config_entry(er.async_get(hass), entry.entry_id)
    }
    expected = {
        "last_temperature",
        "recheck_at",
        "fever",
        "ill",
        "symptom_vomiting_last",
        "symptom_vomiting_clear_at",
        "symptom_vomiting_clear",
        "symptom_diarrhoea_last",
        "symptom_diarrhoea_clear_at",
        "symptom_diarrhoea_clear",
        "medicine_medicine_a_last",
        "medicine_medicine_a_next",
        "medicine_medicine_a_allowed",
    }
    assert ids == {f"{entry.entry_id}_{k}" for k in expected}


async def test_symptom_all_clear_after_48_hours(hass: HomeAssistant, freezer) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    events = async_capture_events(hass, EVENT_SYMPTOM_ALL_CLEAR)
    clear = _eid(hass, "binary_sensor", entry, "symptom_vomiting_clear")
    clear_at = _eid(hass, "sensor", entry, "symptom_vomiting_clear_at")
    last = _eid(hass, "sensor", entry, "symptom_vomiting_last")

    assert hass.states.get(clear).state == "on"  # nothing logged yet

    response = await _call(hass, "log_symptom", entry, symptom="vomiting")
    assert response["symptom"] == "Vomiting"
    assert hass.states.get(clear).state == "off"
    assert dt_util.parse_datetime(hass.states.get(last).state) == dt_util.parse_datetime(NOW)
    assert dt_util.parse_datetime(hass.states.get(clear_at).state) == dt_util.parse_datetime(
        NOW
    ) + timedelta(hours=48)

    # 47h later: still not clear, no event
    freezer.tick(timedelta(hours=47))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert hass.states.get(clear).state == "off"
    assert events == []

    # another bout restarts the clock
    await _call(hass, "log_symptom", entry, symptom="Vomiting")
    freezer.tick(timedelta(hours=47))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert events == []

    freezer.tick(timedelta(hours=2))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert hass.states.get(clear).state == "on"
    assert len(events) == 1
    assert events[0].data["child"] == "Alice"
    assert events[0].data["symptom"] == "Vomiting"
    assert events[0].data["clear_hours"] == 48.0


async def test_backdated_old_symptom_does_not_notify(hass: HomeAssistant, freezer) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    events = async_capture_events(hass, EVENT_SYMPTOM_ALL_CLEAR)
    await _call(
        hass, "log_symptom", entry, symptom="Diarrhoea", occurred_at="2026-11-10T08:00:00+00:00"
    )
    await hass.async_block_till_done()
    assert (
        hass.states.get(_eid(hass, "binary_sensor", entry, "symptom_diarrhoea_clear")).state == "on"
    )
    assert events == []


async def test_unknown_symptom_and_future_time_rejected(hass: HomeAssistant, freezer) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    with pytest.raises(ServiceValidationError):
        await _call(hass, "log_symptom", entry, symptom="Rash")
    with pytest.raises(ServiceValidationError):
        await _call(
            hass, "log_symptom", entry, symptom="Vomiting", occurred_at="2026-11-20T10:00:00+00:00"
        )


async def test_dose_minimum_interval_and_override(hass: HomeAssistant, freezer) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass, **{CONF_MEDICINES: [MEDICINE]})

    response = await _call(hass, "log_dose", entry, medicine="medicine a", given_by="Parent")
    assert response["next_dose_allowed"] == "2026-11-18T16:00:00+00:00"

    next_sensor = _eid(hass, "sensor", entry, "medicine_medicine_a_next")
    assert dt_util.parse_datetime(hass.states.get(next_sensor).state) == dt_util.parse_datetime(
        "2026-11-18T16:00:00+00:00"
    )

    freezer.tick(timedelta(hours=1))
    with pytest.raises(ServiceValidationError):
        await _call(hass, "log_dose", entry, medicine="Medicine A")

    response = await _call(hass, "log_dose", entry, medicine="Medicine A", override=True)
    assert response["next_dose_allowed"] == "2026-11-18T17:00:00+00:00"

    freezer.tick(timedelta(hours=6))
    assert (await _call(hass, "log_dose", entry, medicine="Medicine A"))["id"]


async def test_temperature_and_fever(hass: HomeAssistant, freezer) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    events = async_capture_events(hass, EVENT_FEVER_DETECTED)
    fever = _eid(hass, "binary_sensor", entry, "fever")
    temp = _eid(hass, "sensor", entry, "last_temperature")

    assert hass.states.get(fever).state == "off"
    response = await _call(hass, "log_temperature", entry, temperature=38.6)
    assert response["fever"] is True
    assert hass.states.get(temp).state == "38.6"
    assert hass.states.get(fever).state == "on"
    assert len(events) == 1

    # a further high reading during the same fever doesn't alert again
    freezer.tick(timedelta(minutes=30))
    await _call(hass, "log_temperature", entry, temperature=39.4)
    assert len(events) == 1

    freezer.tick(timedelta(hours=1))
    await _call(hass, "log_temperature", entry, temperature=36.8)
    assert hass.states.get(fever).state == "off"
    assert len(events) == 1

    # but a fever that starts again after a normal reading does
    freezer.tick(timedelta(hours=3))
    await _call(hass, "log_temperature", entry, temperature=38.2)
    assert len(events) == 2

    with pytest.raises(ServiceValidationError):
        await _call(hass, "log_temperature", entry, temperature=3.8)


async def test_episode_lifecycle(hass: HomeAssistant, freezer) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    ill = _eid(hass, "binary_sensor", entry, "ill")

    with pytest.raises(ServiceValidationError):
        await _call(hass, "end_episode", entry)

    await _call(hass, "start_episode", entry, illness="Chickenpox")
    assert hass.states.get(ill).state == "on"
    assert hass.states.get(ill).attributes["illness"] == "Chickenpox"
    with pytest.raises(ServiceValidationError):
        await _call(hass, "start_episode", entry)

    await _call(hass, "end_episode", entry)
    assert hass.states.get(ill).state == "off"


async def test_history_and_delete(hass: HomeAssistant, freezer) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    await _call(hass, "log_temperature", entry, temperature=37.5)

    history = await _call(hass, "get_history", entry, days=1)
    assert len(history["temperatures"]) == 1
    record_id = history["temperatures"][0]["id"]

    await hass.services.async_call(
        DOMAIN,
        "delete_entry",
        {"config_entry": entry.entry_id, "kind": "temperature", "record_id": record_id},
        blocking=True,
    )
    assert (await _call(hass, "get_history", entry, days=1))["temperatures"] == []
    assert hass.states.get(_eid(hass, "sensor", entry, "last_temperature")).state == "unknown"

    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "delete_entry",
            {"config_entry": entry.entry_id, "kind": "temperature", "record_id": record_id},
            blocking=True,
        )


async def test_records_survive_reload(hass: HomeAssistant, hass_storage, freezer) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    await _call(hass, "log_symptom", entry, symptom="Vomiting")

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()

    assert f"{DOMAIN}.{entry.entry_id}" in hass_storage
    last = hass.states.get(_eid(hass, "sensor", entry, "symptom_vomiting_last"))
    assert dt_util.parse_datetime(last.state) == dt_util.parse_datetime(NOW)


async def test_all_clear_caught_up_once_after_downtime(
    hass: HomeAssistant, hass_storage, freezer
) -> None:
    freezer.move_to(NOW)
    entry = _make_entry()
    entry.add_to_hass(hass)
    key = f"{DOMAIN}.{entry.entry_id}"
    hass_storage[key] = {
        "version": 1,
        "minor_version": 1,
        "key": key,
        "data": {
            "symptoms": [
                {
                    "id": "a",
                    "symptom": "vomiting",
                    "name": "Vomiting",
                    "at": "2026-11-14T10:00:00+00:00",
                    "note": None,
                }
            ],
            "temperatures": [],
            "doses": [],
            "episodes": [],
            "notified": {},
        },
    }
    events = async_capture_events(hass, EVENT_SYMPTOM_ALL_CLEAR)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert len(events) == 1

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert len(events) == 1  # already notified


async def test_removed_symptom_entities_are_cleaned_up(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    registry = er.async_get(hass)
    assert registry.async_get_entity_id("sensor", DOMAIN, f"{entry.entry_id}_symptom_vomiting_last")

    hass.config_entries.async_update_entry(
        entry,
        options={
            **entry.options,
            CONF_SYMPTOMS: [{"name": "Diarrhoea", CONF_CLEAR_HOURS: 24.0}],
        },
    )
    await hass.async_block_till_done()

    assert (
        registry.async_get_entity_id("sensor", DOMAIN, f"{entry.entry_id}_symptom_vomiting_last")
        is None
    )
    assert registry.async_get_entity_id(
        "sensor", DOMAIN, f"{entry.entry_id}_symptom_diarrhoea_last"
    )


async def test_dose_available_event_and_sensor(hass: HomeAssistant, freezer) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass, **{CONF_MEDICINES: [MEDICINE]})
    events = async_capture_events(hass, EVENT_DOSE_AVAILABLE)
    allowed = _eid(hass, "binary_sensor", entry, "medicine_medicine_a_allowed")

    assert hass.states.get(allowed).state == "on"  # nothing given yet
    await _call(hass, "log_dose", entry, medicine="Medicine A")
    assert hass.states.get(allowed).state == "off"

    freezer.tick(timedelta(hours=5, minutes=59))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert events == []

    freezer.tick(timedelta(minutes=2))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert hass.states.get(allowed).state == "on"
    assert len(events) == 1
    assert events[0].data["child"] == "Alice"
    assert events[0].data["medicine"] == "Medicine A"
    assert events[0].data["interval_hours"] == 6.0
    assert events[0].data["entry_id"] == entry.entry_id


async def test_log_dose_response_instead_of_error(hass: HomeAssistant, freezer) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass, **{CONF_MEDICINES: [MEDICINE]})
    first = await _call(hass, "log_dose", entry, medicine="Medicine A")
    assert first["logged"] is True and first["too_soon"] is False

    freezer.tick(timedelta(hours=1))
    second = await _call(hass, "log_dose", entry, medicine="Medicine A", fail_if_too_soon=False)
    assert second["logged"] is False
    assert second["too_soon"] is True
    assert second["next_dose_allowed"] == "2026-11-18T16:00:00+00:00"
    assert len((await _call(hass, "get_history", entry, days=1))["doses"]) == 1


async def test_old_dose_does_not_notify_after_downtime(
    hass: HomeAssistant, hass_storage, freezer
) -> None:
    freezer.move_to(NOW)
    entry = _make_entry(**{CONF_MEDICINES: [MEDICINE]})
    entry.add_to_hass(hass)
    key = f"{DOMAIN}.{entry.entry_id}"
    hass_storage[key] = {
        "version": 1,
        "minor_version": 1,
        "key": key,
        "data": {
            "symptoms": [],
            "temperatures": [],
            "doses": [
                {
                    "id": "old",
                    "medicine": "medicine_a",
                    "name": "Medicine A",
                    "at": "2026-11-16T10:00:00+00:00",
                    "given_by": None,
                    "note": None,
                },
                {
                    "id": "recent",
                    "medicine": "medicine_a",
                    "name": "Medicine A",
                    "at": "2026-11-18T03:30:00+00:00",
                    "given_by": None,
                    "note": None,
                },
            ],
            "episodes": [],
            "notified": {},
            "notified_doses": {},
        },
    }
    events = async_capture_events(hass, EVENT_DOSE_AVAILABLE)
    # last dose 03:30 + 6h = 09:30, which passed 30 minutes ago: inside the catch-up window
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert len(events) == 1

    # restart again: already handled, nothing more
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert len(events) == 1


async def test_two_children_are_independent(hass: HomeAssistant, freezer) -> None:
    freezer.move_to(NOW)
    alice = await _setup(hass)
    bob_entry = MockConfigEntry(
        domain=DOMAIN,
        title="Bob",
        unique_id="bob",
        data={"name": "Bob", CONF_TEMPERATURE_UNIT: "fahrenheit"},
        options=default_options("fahrenheit"),
    )
    bob_entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(bob_entry.entry_id)
    await hass.async_block_till_done()

    events = async_capture_events(hass, EVENT_SYMPTOM_ALL_CLEAR)
    await _call(hass, "log_symptom", alice, symptom="Vomiting")
    await _call(hass, "log_temperature", bob_entry, temperature=101.5)

    assert (
        hass.states.get(_eid(hass, "binary_sensor", alice, "symptom_vomiting_clear")).state == "off"
    )
    assert (
        hass.states.get(_eid(hass, "binary_sensor", bob_entry, "symptom_vomiting_clear")).state
        == "on"
    )
    assert hass.states.get(_eid(hass, "binary_sensor", alice, "fever")).state == "off"
    assert hass.states.get(_eid(hass, "binary_sensor", bob_entry, "fever")).state == "on"
    assert (await _call(hass, "get_history", bob_entry, days=1))["symptoms"] == []
    assert (await _call(hass, "get_history", alice, days=1))["temperatures"] == []

    freezer.tick(timedelta(hours=49))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert [e.data["child"] for e in events] == ["Alice"]


async def test_recheck_reminder_after_fever_reading(hass: HomeAssistant, freezer) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)  # default recheck: 120 minutes
    events = async_capture_events(hass, EVENT_RECHECK_TEMPERATURE)
    recheck_at = _eid(hass, "sensor", entry, "recheck_at")
    assert hass.states.get(recheck_at).state == "unknown"

    await _call(hass, "log_temperature", entry, temperature=38.6)
    assert dt_util.parse_datetime(hass.states.get(recheck_at).state) == dt_util.parse_datetime(
        NOW
    ) + timedelta(minutes=120)

    freezer.tick(timedelta(minutes=119))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert events == []

    freezer.tick(timedelta(minutes=2))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert len(events) == 1
    data = events[0].data
    assert data["child"] == "Alice"
    assert data["last_temperature"] == 38.6
    assert data["unit"] == "°C"
    assert data["recheck_minutes"] == 120

    # one reminder per reading: nothing more without a new reading
    freezer.tick(timedelta(hours=5))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert len(events) == 1


async def test_new_reading_moves_recheck_and_normal_reading_cancels_it(
    hass: HomeAssistant, freezer
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    events = async_capture_events(hass, EVENT_RECHECK_TEMPERATURE)

    await _call(hass, "log_temperature", entry, temperature=38.6)
    freezer.tick(timedelta(minutes=60))
    await _call(hass, "log_temperature", entry, temperature=38.8)  # due now +120 from here

    freezer.tick(timedelta(minutes=70))  # 130 min after the first reading
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert events == []

    freezer.tick(timedelta(minutes=51))  # 121 min after the second
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert len(events) == 1
    assert events[0].data["last_temperature"] == 38.8

    # a fever reading followed by a normal one: no reminder
    await _call(hass, "log_temperature", entry, temperature=39.0)
    freezer.tick(timedelta(minutes=30))
    await _call(hass, "log_temperature", entry, temperature=37.0)
    assert hass.states.get(_eid(hass, "sensor", entry, "recheck_at")).state == "unknown"
    freezer.tick(timedelta(hours=4))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert len(events) == 1


async def test_recheck_uses_configured_minutes_and_survives_restart(
    hass: HomeAssistant, hass_storage, freezer
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass, recheck_minutes=45)
    events = async_capture_events(hass, EVENT_RECHECK_TEMPERATURE)
    await _call(hass, "log_temperature", entry, temperature=38.6)

    # restart HA's integration before the reminder is due: the timer is re-armed
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    freezer.tick(timedelta(minutes=46))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert len(events) == 1
    assert events[0].data["recheck_minutes"] == 45

    # once handled, a restart doesn't repeat it
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert len(events) == 1


@pytest.mark.parametrize(
    ("reading_at", "expected_events"),
    [
        ("2026-11-18T07:30:00+00:00", 1),  # due 09:30, passed 30 min ago: catch up once
        ("2026-11-17T20:00:00+00:00", 0),  # long overdue: marked handled, no late reminder
    ],
)
async def test_recheck_catch_up_after_downtime(
    hass: HomeAssistant, hass_storage, freezer, reading_at: str, expected_events: int
) -> None:
    freezer.move_to(NOW)  # 10:00
    entry = _make_entry()
    entry.add_to_hass(hass)
    key = f"{DOMAIN}.{entry.entry_id}"
    hass_storage[key] = {
        "version": 1,
        "minor_version": 1,
        "key": key,
        "data": {
            "symptoms": [],
            "temperatures": [{"id": "t1", "value": 38.6, "at": reading_at, "note": None}],
            "doses": [],
            "episodes": [],
            "notified": {},
            "notified_doses": {},
            "notified_recheck": None,
        },
    }
    events = async_capture_events(hass, EVENT_RECHECK_TEMPERATURE)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert len(events) == expected_events

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert len(events) == expected_events  # never repeated
