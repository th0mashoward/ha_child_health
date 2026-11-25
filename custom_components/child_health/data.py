"""Runtime data, persistence and business logic for one child."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_NAME
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_point_in_utc_time
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util
from homeassistant.util import slugify

from .const import (
    CONF_CLEAR_HOURS,
    CONF_FEVER_THRESHOLD,
    CONF_INTERVAL_HOURS,
    CONF_MEDICINES,
    CONF_RECHECK_MINUTES,
    CONF_SYMPTOMS,
    CONF_TEMPERATURE_UNIT,
    DEFAULT_RECHECK_MINUTES,
    DOMAIN,
    EVENT_DOSE_AVAILABLE,
    EVENT_FEVER_DETECTED,
    EVENT_RECHECK_TEMPERATURE,
    EVENT_SYMPTOM_ALL_CLEAR,
    PLAUSIBLE_TEMPERATURE,
    SAVE_DELAY,
    STORAGE_VERSION,
    UNIT_SYMBOL,
)

type ChildHealthConfigEntry = ConfigEntry[ChildHealthData]

# A "dose available" event is only fired late (e.g. after a restart) if the moment
# passed within this window; older ones are marked handled without a notification.
DOSE_CATCH_UP = timedelta(hours=1)

# A high reading counts as "the same fever" if the previous reading was also high and
# was taken within this long before it.
FEVER_CONTINUES_FOR = timedelta(hours=12)

# Same idea as DOSE_CATCH_UP, for the recheck-temperature reminder.
RECHECK_CATCH_UP = timedelta(hours=1)

KIND_TO_COLLECTION = {
    "symptom": "symptoms",
    "temperature": "temperatures",
    "dose": "doses",
    "episode": "episodes",
}


def _empty_records() -> dict[str, Any]:
    return {
        "symptoms": [],
        "temperatures": [],
        "doses": [],
        "episodes": [],
        "notified": {},
        "notified_doses": {},
        "notified_recheck": None,
    }


def _dt(value: str) -> datetime:
    parsed = dt_util.parse_datetime(value)
    if parsed is None:  # pragma: no cover - only reachable with a corrupted store
        raise ValueError(f"Bad timestamp in storage: {value}")
    return dt_util.as_utc(parsed)


def _iso(value: datetime) -> str:
    return dt_util.as_utc(value).isoformat()


def key_for(name: str) -> str:
    """Stable key for a symptom or medicine name."""
    return slugify(name) or name.casefold()


class DoseTooSoon(ServiceValidationError):
    """A dose was logged sooner than the minimum interval the user set."""

    def __init__(self, *, medicine: str, hours: float, allowed_from: datetime) -> None:
        super().__init__(
            translation_domain=DOMAIN,
            translation_key="dose_too_soon",
            translation_placeholders={
                "medicine": medicine,
                "hours": f"{hours:g}",
                "next_allowed": dt_util.as_local(allowed_from).strftime("%H:%M on %d %b"),
            },
        )
        self.medicine = medicine
        self.allowed_from = allowed_from


class ChildHealthData:
    """Everything for one child: stored records, timers and the logging rules.

    This class only records what it is told and applies intervals the user entered.
    It never calculates or suggests a dose.
    """

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self.name: str = entry.data[CONF_NAME]
        self.unit: str = entry.data[CONF_TEMPERATURE_UNIT]
        self.records: dict[str, Any] = _empty_records()
        self.unique_ids: set[str] = set()
        self._store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, f"{DOMAIN}.{entry.entry_id}"
        )
        self._timers: dict[str, CALLBACK_TYPE] = {}

    # ----- options -----
    @property
    def signal(self) -> str:
        return f"{DOMAIN}_update_{self.entry.entry_id}"

    @property
    def symptom_defs(self) -> list[dict[str, Any]]:
        return list(self.entry.options.get(CONF_SYMPTOMS, []))

    @property
    def medicine_defs(self) -> list[dict[str, Any]]:
        return list(self.entry.options.get(CONF_MEDICINES, []))

    @property
    def fever_threshold(self) -> float:
        return float(self.entry.options[CONF_FEVER_THRESHOLD])

    @property
    def recheck_minutes(self) -> int:
        return int(self.entry.options.get(CONF_RECHECK_MINUTES, DEFAULT_RECHECK_MINUTES))

    # ----- lifecycle -----
    async def async_load(self) -> None:
        loaded = await self._store.async_load()
        if loaded:
            for key, default in _empty_records().items():
                self.records[key] = loaded.get(key, default)

    @callback
    def async_start(self) -> None:
        """Arm all-clear timers, catching up on any that passed while HA was down."""
        dirty = False
        for sym in self.symptom_defs:
            dirty |= self._schedule_all_clear(sym, fire_if_passed=True)
        for med in self.medicine_defs:
            dirty |= self._schedule_dose_available(med, fire_if_passed=True)
        dirty |= self._schedule_recheck(fire_if_passed=True)
        if dirty:
            self._changed()

    async def async_shutdown(self) -> None:
        """Cancel timers and flush records to disk (a reload re-reads from disk)."""
        for unsub in self._timers.values():
            unsub()
        self._timers.clear()
        await self._store.async_save(self.records)

    async def async_remove_storage(self) -> None:
        await self._store.async_remove()

    @callback
    def _changed(self) -> None:
        self._store.async_delay_save(lambda: self.records, SAVE_DELAY)
        async_dispatcher_send(self.hass, self.signal)

    # ----- queries -----
    def last_symptom_at(self, key: str) -> datetime | None:
        times = [_dt(r["at"]) for r in self.records["symptoms"] if r["symptom"] == key]
        return max(times, default=None)

    def clear_at(self, sym: dict[str, Any]) -> datetime | None:
        last = self.last_symptom_at(key_for(sym["name"]))
        if last is None:
            return None
        return last + timedelta(hours=float(sym[CONF_CLEAR_HOURS]))

    def is_clear(self, sym: dict[str, Any]) -> bool:
        clear = self.clear_at(sym)
        return clear is None or dt_util.utcnow() >= clear

    def last_temperature(self) -> dict[str, Any] | None:
        return max(self.records["temperatures"], key=lambda r: _dt(r["at"]), default=None)

    def recheck_due_at(self) -> datetime | None:
        """When to take another reading: set only while the latest reading is a fever."""
        latest = self.last_temperature()
        if latest is None or latest["value"] < self.fever_threshold:
            return None
        return _dt(latest["at"]) + timedelta(minutes=self.recheck_minutes)

    def last_dose(self, medicine_key: str) -> datetime | None:
        times = [_dt(r["at"]) for r in self.records["doses"] if r["medicine"] == medicine_key]
        return max(times, default=None)

    def next_dose_at(self, med: dict[str, Any]) -> datetime | None:
        last = self.last_dose(key_for(med["name"]))
        if last is None:
            return None
        return last + timedelta(hours=float(med[CONF_INTERVAL_HOURS]))

    def open_episode(self) -> dict[str, Any] | None:
        for episode in self.records["episodes"]:
            if episode["end"] is None:
                return episode
        return None

    # ----- helpers -----
    def _resolve_time(self, at: datetime | None) -> datetime:
        now = dt_util.utcnow()
        if at is None:
            return now
        at = dt_util.as_utc(at)
        if at > now + timedelta(minutes=1):
            raise ServiceValidationError(translation_domain=DOMAIN, translation_key="future_time")
        return at

    def _find_def(self, defs: list[dict[str, Any]], name: str, error_key: str) -> dict[str, Any]:
        wanted = name.strip().casefold()
        for definition in defs:
            if definition["name"].casefold() == wanted:
                return definition
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key=error_key,
            translation_placeholders={"child": self.name, "name": name},
        )

    # ----- logging -----
    @callback
    def log_symptom(self, symptom: str, at: datetime | None, note: str | None) -> dict[str, Any]:
        sym = self._find_def(self.symptom_defs, symptom, "unknown_symptom")
        when = self._resolve_time(at)
        record = {
            "id": uuid.uuid4().hex,
            "symptom": key_for(sym["name"]),
            "name": sym["name"],
            "at": _iso(when),
            "note": note,
        }
        self.records["symptoms"].append(record)
        self._schedule_all_clear(sym, fire_if_passed=False)
        self._changed()
        return record

    @callback
    def log_temperature(
        self, temperature: float, at: datetime | None, note: str | None
    ) -> dict[str, Any]:
        low, high = PLAUSIBLE_TEMPERATURE[self.unit]
        if not low <= temperature <= high:
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="temperature_out_of_range",
                translation_placeholders={"value": str(temperature), "unit": self.unit},
            )
        now = dt_util.utcnow()
        when = self._resolve_time(at)
        previous = self.last_temperature()  # before adding this reading
        record = {"id": uuid.uuid4().hex, "value": temperature, "at": _iso(when), "note": note}
        self.records["temperatures"].append(record)

        # Fire when a fever *starts*, not for every high reading while it continues, so
        # logging a follow-up reading (e.g. from a notification reply) doesn't re-alert.
        already_feverish = (
            previous is not None
            and previous["value"] >= self.fever_threshold
            and timedelta(0) <= when - _dt(previous["at"]) < FEVER_CONTINUES_FOR
        )
        if (
            temperature >= self.fever_threshold
            and not already_feverish
            and when >= now - timedelta(minutes=30)
        ):
            self.hass.bus.async_fire(
                EVENT_FEVER_DETECTED,
                {
                    "entry_id": self.entry.entry_id,
                    "child": self.name,
                    "temperature": temperature,
                    "threshold": self.fever_threshold,
                    "unit": UNIT_SYMBOL[self.unit],
                    "at": record["at"],
                },
            )
        self._schedule_recheck(fire_if_passed=False)
        self._changed()
        return record

    @callback
    def log_dose(
        self,
        medicine: str,
        at: datetime | None,
        given_by: str | None,
        note: str | None,
        override: bool,
    ) -> dict[str, Any]:
        med = self._find_def(self.medicine_defs, medicine, "unknown_medicine")
        key = key_for(med["name"])
        when = self._resolve_time(at)
        interval = timedelta(hours=float(med[CONF_INTERVAL_HOURS]))

        earlier = [
            _dt(r["at"])
            for r in self.records["doses"]
            if r["medicine"] == key and _dt(r["at"]) <= when
        ]
        if earlier and not override:
            allowed_from = max(earlier) + interval
            if when < allowed_from:
                raise DoseTooSoon(
                    medicine=med["name"],
                    hours=float(med[CONF_INTERVAL_HOURS]),
                    allowed_from=allowed_from,
                )

        record = {
            "id": uuid.uuid4().hex,
            "medicine": key,
            "name": med["name"],
            "at": _iso(when),
            "given_by": given_by,
            "note": note,
        }
        self.records["doses"].append(record)
        self._schedule_dose_available(med, fire_if_passed=False)
        self._changed()
        return record

    @callback
    def start_episode(
        self, illness: str | None, at: datetime | None, notes: str | None
    ) -> dict[str, Any]:
        if self.open_episode() is not None:
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="episode_already_open",
                translation_placeholders={"child": self.name},
            )
        record = {
            "id": uuid.uuid4().hex,
            "illness": illness,
            "start": _iso(self._resolve_time(at)),
            "end": None,
            "notes": notes,
        }
        self.records["episodes"].append(record)
        self._changed()
        return record

    @callback
    def end_episode(self, at: datetime | None) -> dict[str, Any]:
        episode = self.open_episode()
        if episode is None:
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="no_open_episode",
                translation_placeholders={"child": self.name},
            )
        episode["end"] = _iso(self._resolve_time(at))
        self._changed()
        return episode

    @callback
    def delete_record(self, kind: str, record_id: str) -> None:
        collection = self.records[KIND_TO_COLLECTION[kind]]
        for record in collection:
            if record["id"] == record_id:
                collection.remove(record)
                if kind == "symptom":
                    for sym in self.symptom_defs:
                        self._schedule_all_clear(sym, fire_if_passed=False)
                elif kind == "dose":
                    for med in self.medicine_defs:
                        self._schedule_dose_available(med, fire_if_passed=False)
                elif kind == "temperature":
                    self._schedule_recheck(fire_if_passed=False)
                self._changed()
                return
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="record_not_found",
            translation_placeholders={"id": record_id},
        )

    def history(self, days: int) -> dict[str, list[dict[str, Any]]]:
        cutoff = dt_util.utcnow() - timedelta(days=days)

        def recent(records: list[dict[str, Any]], field: str) -> list[dict[str, Any]]:
            return sorted(
                (r for r in records if _dt(r[field]) >= cutoff),
                key=lambda r: r[field],
                reverse=True,
            )

        episodes = [
            e for e in self.records["episodes"] if e["end"] is None or _dt(e["end"]) >= cutoff
        ]
        return {
            "symptoms": recent(self.records["symptoms"], "at"),
            "temperatures": recent(self.records["temperatures"], "at"),
            "doses": recent(self.records["doses"], "at"),
            "episodes": sorted(episodes, key=lambda e: e["start"], reverse=True),
        }

    # ----- all-clear timers -----
    def _schedule_all_clear(self, sym: dict[str, Any], *, fire_if_passed: bool) -> bool:
        """(Re)arm the all-clear timer for a symptom. Returns True if it changed storage."""
        key = key_for(sym["name"])
        timer_key = f"symptom:{key}"
        if (unsub := self._timers.pop(timer_key, None)) is not None:
            unsub()

        last = self.last_symptom_at(key)
        if last is None:
            return False
        clear = last + timedelta(hours=float(sym[CONF_CLEAR_HOURS]))
        last_iso = _iso(last)
        notified: dict[str, str] = self.records["notified"]

        if clear <= dt_util.utcnow():
            if notified.get(key) == last_iso:
                return False
            notified[key] = last_iso
            if fire_if_passed:
                self._fire_all_clear(sym, last, clear)
            return True

        @callback
        def _due(_now: datetime) -> None:
            self._timers.pop(timer_key, None)
            notified[key] = last_iso
            self._fire_all_clear(sym, last, clear)
            self._changed()

        self._timers[timer_key] = async_track_point_in_utc_time(self.hass, _due, clear)
        return False

    @callback
    def _fire_all_clear(self, sym: dict[str, Any], last: datetime, clear: datetime) -> None:
        self.hass.bus.async_fire(
            EVENT_SYMPTOM_ALL_CLEAR,
            {
                "entry_id": self.entry.entry_id,
                "child": self.name,
                "symptom": sym["name"],
                "last_occurred": _iso(last),
                "all_clear_at": _iso(clear),
                "clear_hours": float(sym[CONF_CLEAR_HOURS]),
            },
        )

    def _schedule_dose_available(self, med: dict[str, Any], *, fire_if_passed: bool) -> bool:
        """(Re)arm the "next dose available" timer. Returns True if it changed storage."""
        key = key_for(med["name"])
        timer_key = f"dose:{key}"
        if (unsub := self._timers.pop(timer_key, None)) is not None:
            unsub()

        last = self.last_dose(key)
        if last is None:
            return False
        available = last + timedelta(hours=float(med[CONF_INTERVAL_HOURS]))
        last_iso = _iso(last)
        notified: dict[str, str] = self.records["notified_doses"]
        now = dt_util.utcnow()

        if available <= now:
            if notified.get(key) == last_iso:
                return False
            notified[key] = last_iso
            if fire_if_passed and now - available <= DOSE_CATCH_UP:
                self._fire_dose_available(med, last, available)
            return True

        @callback
        def _due(_now: datetime) -> None:
            self._timers.pop(timer_key, None)
            notified[key] = last_iso
            self._fire_dose_available(med, last, available)
            self._changed()

        self._timers[timer_key] = async_track_point_in_utc_time(self.hass, _due, available)
        return False

    @callback
    def _fire_dose_available(
        self, med: dict[str, Any], last: datetime, available: datetime
    ) -> None:
        self.hass.bus.async_fire(
            EVENT_DOSE_AVAILABLE,
            {
                "entry_id": self.entry.entry_id,
                "child": self.name,
                "medicine": med["name"],
                "last_dose": _iso(last),
                "available_at": _iso(available),
                "interval_hours": float(med[CONF_INTERVAL_HOURS]),
            },
        )

    def _schedule_recheck(self, *, fire_if_passed: bool) -> bool:
        """(Re)arm the recheck-temperature reminder. Returns True if it changed storage.

        Only armed while the latest reading is a fever; a normal reading cancels it.
        """
        timer_key = "recheck"
        if (unsub := self._timers.pop(timer_key, None)) is not None:
            unsub()

        due = self.recheck_due_at()
        latest = self.last_temperature()
        if due is None or latest is None:
            return False
        now = dt_util.utcnow()

        if due <= now:
            if self.records["notified_recheck"] == latest["id"]:
                return False
            self.records["notified_recheck"] = latest["id"]
            if fire_if_passed and now - due <= RECHECK_CATCH_UP:
                self._fire_recheck(latest, due)
            return True

        @callback
        def _due(_now: datetime) -> None:
            self._timers.pop(timer_key, None)
            self.records["notified_recheck"] = latest["id"]
            self._fire_recheck(latest, due)
            self._changed()

        self._timers[timer_key] = async_track_point_in_utc_time(self.hass, _due, due)
        return False

    @callback
    def _fire_recheck(self, latest: dict[str, Any], due: datetime) -> None:
        self.hass.bus.async_fire(
            EVENT_RECHECK_TEMPERATURE,
            {
                "entry_id": self.entry.entry_id,
                "child": self.name,
                "last_temperature": latest["value"],
                "unit": UNIT_SYMBOL[self.unit],
                "last_at": latest["at"],
                "recheck_minutes": self.recheck_minutes,
                "due_at": _iso(due),
            },
        )
