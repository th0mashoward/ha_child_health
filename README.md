# Child Health for Home Assistant

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/v/release/th0mashoward/ha_child_health?style=for-the-badge)](https://github.com/th0mashoward/ha_child_health/releases)
[![License](https://img.shields.io/github/license/th0mashoward/ha_child_health?style=for-the-badge)](LICENSE)
[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2025.4%2B-blue.svg?style=for-the-badge)](https://www.home-assistant.io)

A local-first Home Assistant custom integration for tracking a child's illness
episodes, temperature readings and medication given, shared between everyone in the
household. Nothing leaves your Home Assistant instance.

> **Status: early development (v0.6).** Config flow, storage, services, entities, events,
> notification blueprints and a dashboard card work.

## Not medical advice

This integration only **records** what you enter and **reminds** you using intervals you
supply from the medicine's label or your doctor/pharmacist. It never calculates or
suggests a dose. If you are worried about a child's health, speak to a medical professional.

## What it does

Add one entry per child. Each child gets a device with:

- **Temperature:** `Last temperature` and `Recheck temperature at` sensors and a `Fever`
  binary sensor.
- **Illness episodes:** a `Currently ill` binary sensor.
- **Symptoms** (Vomiting and Diarrhoea by default; add your own in the options). For each:
  `<symptom> last occurred`, `<symptom> all clear at` (timestamps) and `<symptom> all clear`
  (on once the all-clear time has passed with no further episode).
- **Medicines** (added in the options with the minimum hours between doses from the label):
  `<medicine> last dose`, `<medicine> next dose allowed` and a `<medicine> dose allowed`
  binary sensor (on once the gap you set has passed).

### Several children

Add one entry per child; everything (records, entities, settings, timers) is kept separate per
child, and services take a child picker. To avoid re-entering the same settings, the add-child
form has an optional **Copy settings from** dropdown (shown once another child exists), and
**Configure → Copy settings from another child** replaces an existing child's settings. Copying
takes the fever threshold, recheck time, medicines and symptom types, converting the fever
threshold if one child uses °C and the other °F. Names, dates of birth and logged history are
never copied, and the copy is independent: changing one child's settings later doesn't change
the other's.

### Services

`log_symptom`, `log_temperature`, `log_dose`, `start_episode`, `end_episode`,
`delete_entry` and `get_history`. Each takes the child (`config_entry`) and an optional
`occurred_at` to log something that happened earlier. `log_dose` refuses a dose sooner than
the interval you set unless `override: true`. Set `fail_if_too_soon: false` to get a response
(`logged: false`, `too_soon: true`, `next_dose_allowed`) instead of an error; the blueprints use this.

### Events

- `child_health_symptom_all_clear`: fired when the all-clear time passes (e.g. 48 hours after
  the last bout of vomiting). If Home Assistant was down at that moment, it fires once on startup.
- `child_health_fever_detected`: fired when a reading at or above the fever threshold starts a
  fever (not for every further high reading during the same fever).
- `child_health_recheck_temperature`: fired once when the recheck time (set in the child's
  options, 120 minutes by default) has passed after a fever reading with no new reading logged.
  A normal reading cancels it, and a newer fever reading restarts it.
- `child_health_dose_available`: fired when the minimum gap you set for a medicine has passed
  since its last dose.

Example automation:

```yaml
triggers:
  - trigger: event
    event_type: child_health_symptom_all_clear
actions:
  - action: notify.notify
    data:
      message: "{{ trigger.event.data.child }}: 48 hours since the last {{ trigger.event.data.symptom | lower }}."
```

The 48-hour default matches common school and nursery guidance for sickness and
diarrhoea, but policies differ, so it is configurable per symptom.

## Dashboard card

The integration ships a Lovelace card and loads it for you, so there is no dashboard resource to
add. Edit a dashboard → **Add card** → **Child Health**, then pick the child. Or in YAML:

```yaml
type: custom:child-health-card
entry_id: 0123456789abcdef   # pick the child in the card editor to fill this in
# child: Alice               # alternatively, match by name
# title: Alice
# days: 3                    # days of history for the chart and recent entries (1-14)
# show_chart: true
# show_timeline: true
```

What it shows and does:

- **Status chips** for ill/well, the last temperature and how long ago, and a recheck countdown.
- **Countdowns**: each symptom shows "All clear in 31h 12m" with a progress bar (or "All clear"),
  and each medicine shows "Allowed now" or "In 2h 10m".
- **One-tap logging** for each symptom type and medicine, a **Temperature** entry box (`38.4` or
  `38,4`), **Start/End illness**, and an **Earlier?** option to give a time for the next entry.
  If a dose is too soon, the card shows when the next one is allowed and asks before logging it anyway.
- **Temperature chart** with the fever threshold line, and a **recent entries** list where any entry
  can be deleted (after a confirmation).

The card needs no extra setup per child: it asks the integration for the child's settings and
entities. Anyone who can see the dashboard can log and delete entries, since they use the integration's
services, so share it only with people who should be able to.

To rebuild the card from source: `cd frontend && npm ci && npm run build` (the built file is
committed at `custom_components/child_health/frontend/child-health-card.js`).

## Icon

From Home Assistant 2026.3, the integration's own icon (`custom_components/child_health/brand/`) is shown
in the integrations list and the add-integration dialog. Older versions show a placeholder. The editable
source is `assets/icon.svg`; `cd frontend && npm run icon` re-renders the PNGs.

## Notification blueprints

Blueprints live in `blueprints/automation/child_health/`. HACS doesn't install blueprints, so
import each one in **Settings → Automations & Scenes → Blueprints → Import Blueprint** using
its URL, or copy the files to `config/blueprints/automation/child_health/`:

```
https://github.com/th0mashoward/ha_child_health/blob/main/blueprints/automation/child_health/dose_available.yaml
https://github.com/th0mashoward/ha_child_health/blob/main/blueprints/automation/child_health/symptom_all_clear.yaml
https://github.com/th0mashoward/ha_child_health/blob/main/blueprints/automation/child_health/fever_log_temperature.yaml
https://github.com/th0mashoward/ha_child_health/blob/main/blueprints/automation/child_health/quick_log.yaml
```

Create one automation per child from each blueprint. Each asks for the child and one or more
notify actions (for example `notify.mobile_app_toms_phone`, one per parent).

| Blueprint | What it does |
| --- | --- |
| **Next dose available** | When the gap you set for a medicine has passed, sends "can be given again" with a **Log dose given** button. If another parent already logged one, the button is refused and the notification shows when the next dose is allowed, with a **Log anyway** option, which helps avoid a double dose. Everyone gets the confirmation. |
| **Symptom all clear** | Notifies when the all-clear time (48 hours by default) has passed since the last bout of vomiting, diarrhoea or any other symptom type. |
| **Fever alert with temperature reply** | When a fever starts, sends the reading with a **Log new reading** button that asks you to type the next one (`38.4` or `38,4`). Sends a "time to recheck" reminder with the same button once the recheck time has passed. |
| **Quick log on the lock screen** | While the child's **Currently ill** sensor is on, keeps a notification with three buttons: first symptom, second symptom, and **Temperature** (type the reading). It is removed when the illness ends. Start an illness with `child_health.start_episode`. |

Notes:

- The Companion app doesn't say which parent tapped a button, so the dose blueprint has an
  optional **Logged as** name (for example "Parent") that is recorded with each dose.
- Android allows three buttons per notification, which is why quick log has exactly three. The
  typed-reading button needs a reasonably recent Companion app on iOS or Android.
- The blueprints only record what you tell them. They use the interval you entered from the
  medicine label and never suggest a dose.

## Privacy

Records are kept in Home Assistant's own storage (`.storage/child_health.*`), not the
database. The entity states still go to the recorder, so consider excluding the `child_health`
entities from it (`recorder: exclude: entity_globs: [sensor.*_last_*]` and so on).

## Roadmap

1. Scaffold, config flow, options flow, configurable symptom types (done)
2. Data model and services (done)
3. Per-child entities (done)
4. Events and notification blueprints (done)
5. Lovelace card (done)
6. Docs, privacy guidance, HACS default submission

## Installation (development)

1. HACS → ⋮ → Custom repositories → add this repository as type **Integration**.
2. Install **Child Health** and restart Home Assistant.
3. Settings → Devices & services → Add integration → **Child Health**.

Add one entry per child. Use **Configure** on an entry to set the fever threshold,
recheck reminder interval and medicines (name plus minimum hours between doses).

## Development

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements_test.txt
ruff check . && pytest
```

Requires Python 3.13 and Home Assistant 2025.4 or newer.
