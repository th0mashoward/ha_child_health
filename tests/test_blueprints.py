"""Run the notification blueprints through Home Assistant with a mocked notify service."""

import shutil
from datetime import timedelta
from pathlib import Path

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
    async_mock_service,
)

from custom_components.child_health.const import CONF_MEDICINES, DOMAIN, default_options

from .test_integration import MEDICINE, NOW, _call, _eid, _setup

BLUEPRINTS = Path(__file__).parents[1] / "blueprints" / "automation" / "child_health"
NOTIFY = "notify.mobile_app_test"


@pytest.fixture
def notifications(hass: HomeAssistant, tmp_path: Path):
    """Point the blueprint loader at the repo's blueprints and capture notify calls."""
    shutil.copytree(BLUEPRINTS, tmp_path / "blueprints" / "automation" / "child_health")
    hass.config.config_dir = str(tmp_path)
    return async_mock_service(hass, "notify", "mobile_app_test")


async def _blueprint(hass: HomeAssistant, name: str, **inputs) -> None:
    assert await async_setup_component(
        hass,
        "automation",
        {
            "automation": [
                {
                    "id": name,
                    "use_blueprint": {"path": f"child_health/{name}.yaml", "input": inputs},
                }
            ]
        },
    )
    await hass.async_block_till_done()


async def _tap(hass: HomeAssistant, action: str, reply_text: str | None = None) -> None:
    data = {"action": action}
    if reply_text is not None:
        data["reply_text"] = reply_text
    hass.bus.async_fire("mobile_app_notification_action", data)
    await hass.async_block_till_done()


async def test_symptom_all_clear_blueprint(hass: HomeAssistant, freezer, notifications) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    await _blueprint(hass, "symptom_all_clear", child=entry.entry_id, notify_services=[NOTIFY])

    await _call(hass, "log_symptom", entry, symptom="Vomiting")
    assert notifications == []

    freezer.tick(timedelta(hours=49))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()

    assert len(notifications) == 1
    assert notifications[0].data["title"] == "Alice: vomiting all clear"
    assert "48 hours" in notifications[0].data["message"]


async def test_dose_available_blueprint_log_button_and_double_dose_guard(
    hass: HomeAssistant, freezer, notifications
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass, **{CONF_MEDICINES: [MEDICINE]})
    await _blueprint(
        hass,
        "dose_available",
        child=entry.entry_id,
        notify_services=[NOTIFY],
        given_by="Parent",
    )

    await _call(hass, "log_dose", entry, medicine="Medicine A")
    freezer.tick(timedelta(hours=6, minutes=1))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()

    # 1. "can be given again" with a log button
    assert len(notifications) == 1
    sent = notifications[0].data
    assert sent["title"] == "Alice: Medicine A can be given again"
    button = sent["data"]["actions"][0]
    assert button["action"] == f"CHD|dose|{entry.entry_id}|Medicine A"

    # 2. tapping it logs the dose and confirms to everyone
    await _tap(hass, button["action"])
    history = await _call(hass, "get_history", entry, days=1)
    assert len(history["doses"]) == 2
    assert history["doses"][0]["given_by"] == "Parent"
    assert len(notifications) == 2
    assert notifications[1].data["title"] == "Alice: Medicine A logged"
    assert "Next allowed from" in notifications[1].data["message"]

    # 3. the other parent taps the same (stale) button: refused, not double-logged
    await _tap(hass, button["action"])
    assert len((await _call(hass, "get_history", entry, days=1))["doses"]) == 2
    assert len(notifications) == 3
    assert notifications[2].data["title"] == "Alice: Medicine A not logged"
    force = notifications[2].data["data"]["actions"][0]
    assert force["action"] == f"CHD|force|{entry.entry_id}|Medicine A"

    # 4. "Log anyway" does log it
    await _tap(hass, force["action"])
    assert len((await _call(hass, "get_history", entry, days=1))["doses"]) == 3
    assert notifications[3].data["title"] == "Alice: Medicine A logged"


async def test_blueprints_ignore_other_children_and_unrelated_taps(
    hass: HomeAssistant, freezer, notifications
) -> None:
    freezer.move_to(NOW)
    alice = await _setup(hass, **{CONF_MEDICINES: [MEDICINE]})
    bob = MockConfigEntry(
        domain=DOMAIN,
        title="Bob",
        unique_id="bob",
        data={"name": "Bob", "temperature_unit": "celsius"},
        options={**default_options("celsius"), CONF_MEDICINES: [MEDICINE]},
    )
    bob.add_to_hass(hass)
    assert await hass.config_entries.async_setup(bob.entry_id)
    await hass.async_block_till_done()
    await _blueprint(hass, "dose_available", child=alice.entry_id, notify_services=[NOTIFY])

    await _call(hass, "log_dose", bob, medicine="Medicine A")
    freezer.tick(timedelta(hours=7))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert notifications == []  # Alice's automation ignores Bob's event

    await _tap(hass, "URI")  # some other app notification
    await _tap(hass, f"CHD|dose|{bob.entry_id}|Medicine A")  # Bob's button
    assert notifications == []
    assert (await _call(hass, "get_history", bob, days=1))["doses"][0]["name"] == "Medicine A"
    assert len((await _call(hass, "get_history", bob, days=1))["doses"]) == 1


async def test_fever_blueprint_and_temperature_reply(
    hass: HomeAssistant, freezer, notifications
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    await _blueprint(hass, "fever_log_temperature", child=entry.entry_id, notify_services=[NOTIFY])

    await _call(hass, "log_temperature", entry, temperature=38.6)
    await hass.async_block_till_done()
    assert len(notifications) == 1
    assert notifications[0].data["title"] == "Alice: 38.6°C"
    button = notifications[0].data["data"]["actions"][0]
    assert button["behavior"] == "textInput"
    assert button["action"] == f"CHF|temp|{entry.entry_id}"

    freezer.tick(timedelta(minutes=30))
    await _tap(hass, button["action"], reply_text="38,9")  # comma decimal
    history = await _call(hass, "get_history", entry, days=1)
    assert sorted(r["value"] for r in history["temperatures"]) == [38.6, 38.9]
    assert notifications[1].data["title"] == "Alice: 38.9°C logged"
    assert "fever threshold" in notifications[1].data["message"]

    # the recheck reminder reuses the same reply button
    freezer.tick(timedelta(minutes=121))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert notifications[2].data["title"] == "Time to recheck Alice's temperature"
    assert "38.9°C" in notifications[2].data["message"]
    assert notifications[2].data["data"]["actions"][0]["action"] == button["action"]
    assert notifications[2].data["data"]["tag"] == notifications[0].data["data"]["tag"]
    notifications.pop(2)

    await _tap(hass, button["action"], reply_text="not a number")
    assert len((await _call(hass, "get_history", entry, days=1))["temperatures"]) == 2
    assert notifications[2].data["title"] == "Temperature not logged"

    await _tap(hass, button["action"], reply_text="3")  # implausible: refused by the service
    assert len((await _call(hass, "get_history", entry, days=1))["temperatures"]) == 2
    assert notifications[3].data["title"] == "Temperature not logged"


async def test_quick_log_blueprint_lifecycle(hass: HomeAssistant, freezer, notifications) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    await _blueprint(
        hass,
        "quick_log",
        child=entry.entry_id,
        ill_sensor=_eid(hass, "binary_sensor", entry, "ill"),
        notify_services=[NOTIFY],
    )

    # illness starts -> sticky notification with three buttons
    await _call(hass, "start_episode", entry, illness="Tummy bug")
    await hass.async_block_till_done()
    assert len(notifications) == 1
    data = notifications[0].data["data"]
    assert data["tag"] == f"child_health_quick_{entry.entry_id}"
    assert [a["title"] for a in data["actions"]] == ["Vomiting", "Diarrhoea", "Temperature"]
    assert data["actions"][2]["behavior"] == "textInput"

    # symptom button
    await _tap(hass, data["actions"][0]["action"])
    history = await _call(hass, "get_history", entry, days=1)
    assert [s["name"] for s in history["symptoms"]] == ["Vomiting"]
    assert notifications[1].data["title"] == "Alice: Vomiting logged"
    assert "48 hours" in notifications[1].data["message"]

    # temperature reply
    freezer.tick(timedelta(minutes=5))
    await _tap(hass, data["actions"][2]["action"], reply_text="37.2")
    history = await _call(hass, "get_history", entry, days=1)
    assert [t["value"] for t in history["temperatures"]] == [37.2]
    assert notifications[2].data["title"] == "Alice: 37.2°C logged"

    # someone else's quick-log button is ignored
    await _tap(hass, "CHQ|sym|some-other-entry|Vomiting")
    assert len(notifications) == 3

    # illness ends -> notification cleared
    await _call(hass, "end_episode", entry)
    await hass.async_block_till_done()
    assert notifications[-1].data["message"] == "clear_notification"
    assert notifications[-1].data["data"]["tag"] == f"child_health_quick_{entry.entry_id}"
