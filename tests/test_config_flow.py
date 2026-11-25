"""Tests for the Child Health config and options flows."""

import pytest
from homeassistant import config_entries
from homeassistant.const import CONF_NAME
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType, InvalidData
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.child_health.const import (
    CONF_BIRTH_DATE,
    CONF_CLEAR_HOURS,
    CONF_COPY_FROM,
    CONF_FEVER_THRESHOLD,
    CONF_INTERVAL_HOURS,
    CONF_MEDICINE_NAME,
    CONF_MEDICINES,
    CONF_RECHECK_MINUTES,
    CONF_SYMPTOM_NAME,
    CONF_SYMPTOMS,
    CONF_TEMPERATURE_UNIT,
    DOMAIN,
    default_options,
)


def _entry(name: str = "Alice", unit: str = "celsius", **options) -> MockConfigEntry:
    return MockConfigEntry(
        domain=DOMAIN,
        title=name,
        unique_id=name.lower(),
        data={CONF_NAME: name, CONF_TEMPERATURE_UNIT: unit},
        options={**default_options(unit), **options},
    )


async def test_user_flow_creates_entry(hass: HomeAssistant) -> None:
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {
            CONF_NAME: "  Alice ",
            CONF_BIRTH_DATE: "2021-03-04",
            CONF_TEMPERATURE_UNIT: "celsius",
        },
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Alice"
    assert result["data"] == {
        CONF_NAME: "Alice",
        CONF_BIRTH_DATE: "2021-03-04",
        CONF_TEMPERATURE_UNIT: "celsius",
    }
    assert result["options"][CONF_FEVER_THRESHOLD] == 38.0
    assert result["options"][CONF_MEDICINES] == []
    assert [x[CONF_SYMPTOM_NAME] for x in result["options"][CONF_SYMPTOMS]] == [
        "Vomiting",
        "Diarrhoea",
    ]
    assert all(x[CONF_CLEAR_HOURS] == 48.0 for x in result["options"][CONF_SYMPTOMS])


async def test_user_flow_fahrenheit_defaults(hass: HomeAssistant) -> None:
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_NAME: "Bob", CONF_TEMPERATURE_UNIT: "fahrenheit"}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert CONF_BIRTH_DATE not in result["data"]
    assert result["options"][CONF_FEVER_THRESHOLD] == 100.4


async def test_user_flow_rejects_future_birth_date(hass: HomeAssistant) -> None:
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {CONF_NAME: "Alice", CONF_BIRTH_DATE: "2999-01-01", CONF_TEMPERATURE_UNIT: "celsius"},
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {CONF_BIRTH_DATE: "birth_date_in_future"}


async def test_user_flow_rejects_blank_name(hass: HomeAssistant) -> None:
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_NAME: "   ", CONF_TEMPERATURE_UNIT: "celsius"}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {CONF_NAME: "name_required"}


async def test_user_flow_duplicate_aborts(hass: HomeAssistant) -> None:
    _entry("Alice").add_to_hass(hass)

    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_NAME: "alice", CONF_TEMPERATURE_UNIT: "celsius"}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "already_configured"


async def test_options_menu_hides_remove_when_no_medicines(hass: HomeAssistant) -> None:
    entry = _entry()
    entry.add_to_hass(hass)

    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["type"] is FlowResultType.MENU
    assert result["menu_options"] == [
        "settings",
        "add_medicine",
        "add_symptom",
        "remove_symptom",
    ]


async def test_options_settings(hass: HomeAssistant) -> None:
    entry = _entry()
    entry.add_to_hass(hass)

    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "settings"}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {CONF_FEVER_THRESHOLD: 37.8, CONF_RECHECK_MINUTES: 90}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert entry.options[CONF_FEVER_THRESHOLD] == 37.8
    assert entry.options[CONF_RECHECK_MINUTES] == 90


async def test_options_add_and_remove_medicine(hass: HomeAssistant) -> None:
    entry = _entry()
    entry.add_to_hass(hass)

    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "add_medicine"}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {CONF_MEDICINE_NAME: "Medicine A", CONF_INTERVAL_HOURS: 6}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert entry.options[CONF_MEDICINES] == [
        {CONF_MEDICINE_NAME: "Medicine A", CONF_INTERVAL_HOURS: 6.0}
    ]

    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert "remove_medicine" in result["menu_options"]
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "remove_medicine"}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {CONF_MEDICINES: ["Medicine A"]}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert entry.options[CONF_MEDICINES] == []


async def test_options_duplicate_medicine_rejected(hass: HomeAssistant) -> None:
    entry = _entry(medicines=[{CONF_MEDICINE_NAME: "Medicine A", CONF_INTERVAL_HOURS: 6.0}])
    entry.add_to_hass(hass)

    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "add_medicine"}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {CONF_MEDICINE_NAME: "medicine a", CONF_INTERVAL_HOURS: 4}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {CONF_MEDICINE_NAME: "medicine_exists"}


async def test_options_add_and_remove_symptom(hass: HomeAssistant) -> None:
    entry = _entry()
    entry.add_to_hass(hass)

    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "add_symptom"}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {CONF_SYMPTOM_NAME: "Rash", CONF_CLEAR_HOURS: 24}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert entry.options[CONF_SYMPTOMS][-1] == {CONF_SYMPTOM_NAME: "Rash", CONF_CLEAR_HOURS: 24.0}

    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "remove_symptom"}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {CONF_SYMPTOMS: ["Rash", "Vomiting"]}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert [x[CONF_SYMPTOM_NAME] for x in entry.options[CONF_SYMPTOMS]] == ["Diarrhoea"]


async def test_options_duplicate_symptom_rejected(hass: HomeAssistant) -> None:
    entry = _entry()
    entry.add_to_hass(hass)

    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "add_symptom"}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {CONF_SYMPTOM_NAME: "vomiting", CONF_CLEAR_HOURS: 48}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {CONF_SYMPTOM_NAME: "symptom_exists"}


SOURCE_OPTIONS = {
    CONF_FEVER_THRESHOLD: 37.8,
    CONF_RECHECK_MINUTES: 90,
    CONF_MEDICINES: [{CONF_MEDICINE_NAME: "Medicine A", CONF_INTERVAL_HOURS: 6.0}],
    CONF_SYMPTOMS: [{CONF_SYMPTOM_NAME: "Rash", CONF_CLEAR_HOURS: 24.0}],
}


def _field_names(result) -> set[str]:
    return {str(key) for key in result["data_schema"].schema}


async def test_copy_field_only_shown_when_another_child_exists(hass: HomeAssistant) -> None:
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert CONF_COPY_FROM not in _field_names(result)
    hass.config_entries.flow.async_abort(result["flow_id"])

    _entry("Alice").add_to_hass(hass)
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert CONF_COPY_FROM in _field_names(result)


async def test_new_child_copies_settings(hass: HomeAssistant) -> None:
    source = _entry("Alice", **SOURCE_OPTIONS)
    source.add_to_hass(hass)

    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {
            CONF_NAME: "Bob",
            CONF_BIRTH_DATE: "2019-06-01",
            CONF_TEMPERATURE_UNIT: "celsius",
            CONF_COPY_FROM: source.entry_id,
        },
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["data"] == {
        CONF_NAME: "Bob",
        CONF_BIRTH_DATE: "2019-06-01",
        CONF_TEMPERATURE_UNIT: "celsius",
    }
    assert result["options"] == {**default_options("celsius"), **SOURCE_OPTIONS}


async def test_copy_converts_fever_threshold_between_units(hass: HomeAssistant) -> None:
    celsius = _entry("Alice")  # 38.0 C by default
    fahrenheit = _entry("Cara", "fahrenheit", **{CONF_FEVER_THRESHOLD: 101.0})
    celsius.add_to_hass(hass)
    fahrenheit.add_to_hass(hass)

    async def add_child(name: str, unit: str, source: MockConfigEntry) -> dict:
        result = await hass.config_entries.flow.async_init(
            DOMAIN, context={"source": config_entries.SOURCE_USER}
        )
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {CONF_NAME: name, CONF_TEMPERATURE_UNIT: unit, CONF_COPY_FROM: source.entry_id},
        )
        assert result["type"] is FlowResultType.CREATE_ENTRY
        return result["options"]

    assert (await add_child("Bob", "fahrenheit", celsius))[CONF_FEVER_THRESHOLD] == 100.4
    assert (await add_child("Dan", "celsius", fahrenheit))[CONF_FEVER_THRESHOLD] == 38.3


async def test_unknown_copy_source_is_rejected(hass: HomeAssistant) -> None:
    _entry("Alice").add_to_hass(hass)
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    with pytest.raises(InvalidData):
        await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {CONF_NAME: "Bob", CONF_TEMPERATURE_UNIT: "celsius", CONF_COPY_FROM: "nope"},
        )


async def test_options_copy_settings_replaces_settings_and_keeps_child(
    hass: HomeAssistant,
) -> None:
    source = _entry("Alice", **SOURCE_OPTIONS)
    target = _entry("Bob", "fahrenheit")
    source.add_to_hass(hass)
    target.add_to_hass(hass)

    result = await hass.config_entries.options.async_init(target.entry_id)
    assert result["menu_options"][-1] == "copy_settings"
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "copy_settings"}
    )
    # only the other child is offered
    options = result["data_schema"].schema[CONF_COPY_FROM].config["options"]
    assert [o["value"] for o in options] == [source.entry_id]

    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {CONF_COPY_FROM: source.entry_id}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert target.options[CONF_FEVER_THRESHOLD] == 100.0  # 37.8 C -> F
    assert target.options[CONF_RECHECK_MINUTES] == 90
    assert target.options[CONF_MEDICINES] == SOURCE_OPTIONS[CONF_MEDICINES]
    assert target.options[CONF_SYMPTOMS] == SOURCE_OPTIONS[CONF_SYMPTOMS]
    assert target.data == {CONF_NAME: "Bob", CONF_TEMPERATURE_UNIT: "fahrenheit"}

    # the copy is independent: changing Bob's medicines doesn't touch Alice's
    result = await hass.config_entries.options.async_init(target.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "add_medicine"}
    )
    await hass.config_entries.options.async_configure(
        result["flow_id"], {CONF_MEDICINE_NAME: "Medicine B", CONF_INTERVAL_HOURS: 8}
    )
    assert len(target.options[CONF_MEDICINES]) == 2
    assert len(source.options[CONF_MEDICINES]) == 1
    assert source.options[CONF_FEVER_THRESHOLD] == 37.8
