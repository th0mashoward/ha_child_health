"""Constants for the Child Health integration."""

from __future__ import annotations

DOMAIN = "child_health"

CONF_BIRTH_DATE = "birth_date"
CONF_TEMPERATURE_UNIT = "temperature_unit"
CONF_COPY_FROM = "copy_from"

CONF_FEVER_THRESHOLD = "fever_threshold"
CONF_RECHECK_MINUTES = "recheck_minutes"
CONF_MEDICINES = "medicines"
CONF_SYMPTOMS = "symptoms"
CONF_SYMPTOM_NAME = "name"
CONF_CLEAR_HOURS = "clear_hours"
CONF_MEDICINE_NAME = "name"
CONF_INTERVAL_HOURS = "interval_hours"

UNIT_CELSIUS = "celsius"
UNIT_FAHRENHEIT = "fahrenheit"

DEFAULT_FEVER_THRESHOLD = {UNIT_CELSIUS: 38.0, UNIT_FAHRENHEIT: 100.4}
TEMPERATURE_BOUNDS = {UNIT_CELSIUS: (35.0, 42.0), UNIT_FAHRENHEIT: (95.0, 107.6)}
UNIT_SYMBOL = {UNIT_CELSIUS: "°C", UNIT_FAHRENHEIT: "°F"}

DEFAULT_RECHECK_MINUTES = 120

# Seeded for every new child; fully editable. "Clear" means this many hours have
# passed with no further episode (a common rule for sickness and diarrhoea is 48h,
# but schools and nurseries differ, so it is configurable per symptom).
DEFAULT_SYMPTOMS = [
    {"name": "Vomiting", "clear_hours": 48.0},
    {"name": "Diarrhoea", "clear_hours": 48.0},
]


def default_options(unit: str) -> dict:
    """Return the default options for a new child entry."""
    return {
        CONF_FEVER_THRESHOLD: DEFAULT_FEVER_THRESHOLD[unit],
        CONF_RECHECK_MINUTES: DEFAULT_RECHECK_MINUTES,
        CONF_MEDICINES: [],
        CONF_SYMPTOMS: [dict(sym) for sym in DEFAULT_SYMPTOMS],
    }


# Storage
STORAGE_VERSION = 1
SAVE_DELAY = 2  # seconds

# Events fired on the HA bus
EVENT_SYMPTOM_ALL_CLEAR = "child_health_symptom_all_clear"
EVENT_FEVER_DETECTED = "child_health_fever_detected"
EVENT_DOSE_AVAILABLE = "child_health_dose_available"
EVENT_RECHECK_TEMPERATURE = "child_health_recheck_temperature"

# Services
SERVICE_LOG_SYMPTOM = "log_symptom"
SERVICE_LOG_TEMPERATURE = "log_temperature"
SERVICE_LOG_DOSE = "log_dose"
SERVICE_START_EPISODE = "start_episode"
SERVICE_END_EPISODE = "end_episode"
SERVICE_DELETE_ENTRY = "delete_entry"
SERVICE_GET_HISTORY = "get_history"

# Sanity bounds for a logged temperature (catches typos like 380 or 3.8)
PLAUSIBLE_TEMPERATURE = {UNIT_CELSIUS: (30.0, 45.0), UNIT_FAHRENHEIT: (86.0, 113.0)}


def convert_temperature(value: float, from_unit: str, to_unit: str) -> float:
    """Convert between the two supported units, rounded to 0.1."""
    if from_unit == to_unit:
        return value
    if to_unit == UNIT_FAHRENHEIT:
        return round(value * 9 / 5 + 32, 1)
    return round((value - 32) * 5 / 9, 1)
