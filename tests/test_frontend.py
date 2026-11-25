"""Tests for the card's backend: websocket discovery, serving the bundle, icons."""

import json
from pathlib import Path
from unittest.mock import patch

from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component

from custom_components.child_health.card import CARD_PATH, URL_BASE, async_register_card
from custom_components.child_health.const import CONF_MEDICINES, DOMAIN

from .test_integration import MEDICINE, NOW, _call, _eid, _setup

ROOT = Path(__file__).parents[1]


async def test_ws_children_describes_settings_and_entities(
    hass: HomeAssistant, hass_ws_client
) -> None:
    entry = await _setup(hass, **{CONF_MEDICINES: [MEDICINE]})
    client = await hass_ws_client(hass)

    await client.send_json({"id": 1, "type": "child_health/children"})
    msg = await client.receive_json()
    assert msg["success"] is True
    assert len(msg["result"]) == 1
    child = msg["result"][0]

    assert child["entry_id"] == entry.entry_id
    assert child["name"] == "Alice"
    assert child["unit"] == "celsius"
    assert child["unit_symbol"] == "°C"
    assert child["fever_threshold"] == 38.0
    assert child["recheck_minutes"] == 120
    assert [s["name"] for s in child["symptoms"]] == ["Vomiting", "Diarrhoea"]
    assert child["symptoms"][0]["clear_hours"] == 48.0
    assert child["medicines"][0]["name"] == "Medicine A"
    assert child["medicines"][0]["interval_hours"] == 6.0

    # every entity id the card will read exists and is the right one
    assert child["entities"]["ill"] == _eid(hass, "binary_sensor", entry, "ill")
    assert child["symptoms"][0]["clear"] == _eid(
        hass, "binary_sensor", entry, "symptom_vomiting_clear"
    )
    entity_ids = [
        *child["entities"].values(),
        *(v for s in child["symptoms"] for k, v in s.items() if k in ("last", "clear_at", "clear")),
        *(v for m in child["medicines"] for k, v in m.items() if k in ("last", "next", "allowed")),
    ]
    assert all(entity_ids)
    assert all(hass.states.get(entity_id) is not None for entity_id in entity_ids)


async def test_ws_children_lists_every_loaded_child(hass: HomeAssistant, hass_ws_client) -> None:
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    from custom_components.child_health.const import default_options

    await _setup(hass)
    bob = MockConfigEntry(
        domain=DOMAIN,
        title="Bob",
        unique_id="bob",
        data={"name": "Bob", "temperature_unit": "fahrenheit"},
        options=default_options("fahrenheit"),
    )
    bob.add_to_hass(hass)
    assert await hass.config_entries.async_setup(bob.entry_id)
    await hass.async_block_till_done()

    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "child_health/children"})
    result = (await client.receive_json())["result"]
    assert sorted(c["name"] for c in result) == ["Alice", "Bob"]
    bob_info = next(c for c in result if c["name"] == "Bob")
    assert bob_info["unit_symbol"] == "°F"
    assert bob_info["fever_threshold"] == 100.4


async def test_card_bundle_is_served(hass: HomeAssistant, hass_client) -> None:
    await _setup(hass)  # registers the static path (must happen before the server starts)
    client = await hass_client()
    response = await client.get(f"{URL_BASE}/child-health-card.js")
    assert response.status == 200
    body = await response.text()
    assert "child-health-card" in body


async def test_card_is_added_to_the_frontend_with_a_version(hass: HomeAssistant) -> None:
    assert await async_setup_component(hass, "http", {})
    hass.config.components.add("frontend")
    with patch("homeassistant.components.frontend.add_extra_js_url") as add_url:
        await async_register_card(hass)
    manifest = json.loads((ROOT / "custom_components/child_health/manifest.json").read_text())
    add_url.assert_called_once_with(
        hass, f"{URL_BASE}/child-health-card.js?v={manifest['version']}"
    )


async def test_card_registration_is_skipped_without_the_frontend(hass: HomeAssistant) -> None:
    assert await async_setup_component(hass, "http", {})
    with patch("homeassistant.components.frontend.add_extra_js_url") as add_url:
        await async_register_card(hass)
    add_url.assert_not_called()


def test_built_card_and_versions_are_in_sync() -> None:
    assert CARD_PATH.is_file() and CARD_PATH.stat().st_size > 10_000
    manifest = json.loads((ROOT / "custom_components/child_health/manifest.json").read_text())
    package = json.loads((ROOT / "frontend/package.json").read_text())
    assert package["version"] == manifest["version"]


async def test_state_icons_follow_the_state(hass: HomeAssistant, freezer) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass, **{CONF_MEDICINES: [MEDICINE]})
    clear = _eid(hass, "binary_sensor", entry, "symptom_vomiting_clear")
    allowed = _eid(hass, "binary_sensor", entry, "medicine_medicine_a_allowed")
    assert hass.states.get(clear).attributes["icon"] == "mdi:check-circle-outline"
    assert hass.states.get(allowed).attributes["icon"] == "mdi:pill"

    await _call(hass, "log_symptom", entry, symptom="Vomiting")
    await _call(hass, "log_dose", entry, medicine="Medicine A")
    assert hass.states.get(clear).attributes["icon"] == "mdi:timer-sand"
    assert hass.states.get(allowed).attributes["icon"] == "mdi:pill-off"


def test_service_icons_cover_every_service() -> None:
    icons = json.loads((ROOT / "custom_components/child_health/icons.json").read_text())
    services = (ROOT / "custom_components/child_health/services.yaml").read_text()
    registered = {line[:-1] for line in services.splitlines() if line and not line.startswith(" ")}
    assert set(icons["services"]) == registered


def _png_size(path: Path) -> tuple[int, int]:
    import struct

    header = path.read_bytes()[:24]
    assert header[:8] == b"\x89PNG\r\n\x1a\n"
    return struct.unpack(">II", header[16:24])


def test_brand_icons_are_square_pngs_of_the_right_size() -> None:
    brand = ROOT / "custom_components/child_health/brand"
    assert _png_size(brand / "icon.png") == (256, 256)
    assert _png_size(brand / "icon@2x.png") == (512, 512)
    assert (ROOT / "assets/icon.svg").is_file()
