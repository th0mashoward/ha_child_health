"""Config and options flow for Child Health."""

from __future__ import annotations

import copy
from datetime import date
from typing import Any

import voluptuous as vol
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.const import CONF_NAME, UnitOfTemperature
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import selector
from homeassistant.util import dt as dt_util
from homeassistant.util import slugify

from .const import (
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
    DEFAULT_RECHECK_MINUTES,
    DOMAIN,
    TEMPERATURE_BOUNDS,
    UNIT_CELSIUS,
    UNIT_FAHRENHEIT,
    UNIT_SYMBOL,
    convert_temperature,
    default_options,
)


def _other_children(hass: HomeAssistant, exclude: str | None = None) -> list[ConfigEntry]:
    """Child entries that settings can be copied from."""
    return [e for e in hass.config_entries.async_entries(DOMAIN) if e.entry_id != exclude]


def _source_selector(children: list[ConfigEntry]) -> selector.SelectSelector:
    return selector.SelectSelector(
        selector.SelectSelectorConfig(
            options=[selector.SelectOptionDict(value=e.entry_id, label=e.title) for e in children],
            mode=selector.SelectSelectorMode.DROPDOWN,
        )
    )


def _copied_options(source: ConfigEntry, unit: str) -> dict[str, Any]:
    """Another child's settings, converted to ``unit``. Names, dates and history are not copied."""
    options = default_options(unit)
    src = source.options
    if CONF_FEVER_THRESHOLD in src:
        low, high = TEMPERATURE_BOUNDS[unit]
        converted = convert_temperature(
            float(src[CONF_FEVER_THRESHOLD]), source.data[CONF_TEMPERATURE_UNIT], unit
        )
        options[CONF_FEVER_THRESHOLD] = min(max(converted, low), high)
    for key in (CONF_RECHECK_MINUTES, CONF_MEDICINES, CONF_SYMPTOMS):
        if key in src:
            options[key] = copy.deepcopy(src[key])
    return options


def _valid_source(
    hass: HomeAssistant, entry_id: str, exclude: str | None = None
) -> ConfigEntry | None:
    source = hass.config_entries.async_get_entry(entry_id)
    if source is None or source.domain != DOMAIN or source.entry_id == exclude:
        return None
    return source


class ChildHealthConfigFlow(ConfigFlow, domain=DOMAIN):
    """Add a child. One config entry per child."""

    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> ChildHealthOptionsFlow:
        """Return the options flow."""
        return ChildHealthOptionsFlow()

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Handle the initial step."""
        errors: dict[str, str] = {}

        if user_input is not None:
            name = user_input[CONF_NAME].strip()
            birth_date = user_input.get(CONF_BIRTH_DATE)

            if not name:
                errors[CONF_NAME] = "name_required"
            elif birth_date and date.fromisoformat(birth_date) > dt_util.now().date():
                errors[CONF_BIRTH_DATE] = "birth_date_in_future"

            source = None
            if copy_from := user_input.get(CONF_COPY_FROM):
                source = _valid_source(self.hass, copy_from)
                if source is None:
                    errors[CONF_COPY_FROM] = "unknown_child"

            if not errors:
                await self.async_set_unique_id(slugify(name) or name.casefold())
                self._abort_if_unique_id_configured()

                unit = user_input[CONF_TEMPERATURE_UNIT]
                data: dict[str, Any] = {CONF_NAME: name, CONF_TEMPERATURE_UNIT: unit}
                if birth_date:
                    data[CONF_BIRTH_DATE] = birth_date
                options = _copied_options(source, unit) if source else default_options(unit)
                return self.async_create_entry(title=name, data=data, options=options)

        default_unit = (
            UNIT_FAHRENHEIT
            if self.hass.config.units.temperature_unit == UnitOfTemperature.FAHRENHEIT
            else UNIT_CELSIUS
        )
        fields: dict[Any, Any] = {
            vol.Required(CONF_NAME): selector.TextSelector(),
            vol.Optional(CONF_BIRTH_DATE): selector.DateSelector(),
            vol.Required(CONF_TEMPERATURE_UNIT, default=default_unit): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=[UNIT_CELSIUS, UNIT_FAHRENHEIT],
                    translation_key="temperature_unit",
                    mode=selector.SelectSelectorMode.DROPDOWN,
                )
            ),
        }
        if children := _other_children(self.hass):
            fields[vol.Optional(CONF_COPY_FROM)] = _source_selector(children)
        schema = vol.Schema(fields)
        return self.async_show_form(
            step_id="user",
            data_schema=self.add_suggested_values_to_schema(schema, user_input),
            errors=errors,
        )


class ChildHealthOptionsFlow(OptionsFlow):
    """Fever/reminder settings and the medicine list."""

    @property
    def _unit(self) -> str:
        return self.config_entry.data[CONF_TEMPERATURE_UNIT]

    @property
    def _medicines(self) -> list[dict[str, Any]]:
        return list(self.config_entry.options.get(CONF_MEDICINES, []))

    @property
    def _symptoms(self) -> list[dict[str, Any]]:
        return list(self.config_entry.options.get(CONF_SYMPTOMS, []))

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Show the options menu."""
        menu = ["settings", "add_medicine"]
        if self._medicines:
            menu.append("remove_medicine")
        menu.append("add_symptom")
        if self._symptoms:
            menu.append("remove_symptom")
        if _other_children(self.hass, self.config_entry.entry_id):
            menu.append("copy_settings")
        return self.async_show_menu(step_id="init", menu_options=menu)

    async def async_step_settings(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Edit the fever threshold and recheck reminder interval."""
        options = self.config_entry.options
        low, high = TEMPERATURE_BOUNDS[self._unit]

        if user_input is not None:
            return self.async_create_entry(
                data={
                    **options,
                    CONF_FEVER_THRESHOLD: float(user_input[CONF_FEVER_THRESHOLD]),
                    CONF_RECHECK_MINUTES: int(user_input[CONF_RECHECK_MINUTES]),
                }
            )

        schema = vol.Schema(
            {
                vol.Required(CONF_FEVER_THRESHOLD): selector.NumberSelector(
                    selector.NumberSelectorConfig(
                        min=low,
                        max=high,
                        step=0.1,
                        mode=selector.NumberSelectorMode.BOX,
                        unit_of_measurement=UNIT_SYMBOL[self._unit],
                    )
                ),
                vol.Required(CONF_RECHECK_MINUTES): selector.NumberSelector(
                    selector.NumberSelectorConfig(
                        min=15,
                        max=720,
                        step=5,
                        mode=selector.NumberSelectorMode.BOX,
                        unit_of_measurement="min",
                    )
                ),
            }
        )
        suggested = {
            CONF_FEVER_THRESHOLD: options.get(CONF_FEVER_THRESHOLD),
            CONF_RECHECK_MINUTES: options.get(CONF_RECHECK_MINUTES, DEFAULT_RECHECK_MINUTES),
        }
        return self.async_show_form(
            step_id="settings",
            data_schema=self.add_suggested_values_to_schema(schema, suggested),
        )

    async def async_step_add_medicine(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Add a medicine and its minimum interval (taken from the label)."""
        errors: dict[str, str] = {}

        if user_input is not None:
            name = user_input[CONF_MEDICINE_NAME].strip()
            medicines = self._medicines
            if not name:
                errors[CONF_MEDICINE_NAME] = "name_required"
            elif any(m[CONF_MEDICINE_NAME].casefold() == name.casefold() for m in medicines):
                errors[CONF_MEDICINE_NAME] = "medicine_exists"

            if not errors:
                medicines.append(
                    {
                        CONF_MEDICINE_NAME: name,
                        CONF_INTERVAL_HOURS: float(user_input[CONF_INTERVAL_HOURS]),
                    }
                )
                return self.async_create_entry(
                    data={**self.config_entry.options, CONF_MEDICINES: medicines}
                )

        schema = vol.Schema(
            {
                vol.Required(CONF_MEDICINE_NAME): selector.TextSelector(),
                vol.Required(CONF_INTERVAL_HOURS): selector.NumberSelector(
                    selector.NumberSelectorConfig(
                        min=0.5,
                        max=48,
                        step=0.5,
                        mode=selector.NumberSelectorMode.BOX,
                        unit_of_measurement="h",
                    )
                ),
            }
        )
        return self.async_show_form(
            step_id="add_medicine",
            data_schema=self.add_suggested_values_to_schema(schema, user_input),
            errors=errors,
        )

    async def async_step_remove_medicine(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Remove one or more medicines."""
        medicines = self._medicines

        if user_input is not None:
            remove = set(user_input[CONF_MEDICINES])
            kept = [m for m in medicines if m[CONF_MEDICINE_NAME] not in remove]
            return self.async_create_entry(data={**self.config_entry.options, CONF_MEDICINES: kept})

        schema = vol.Schema(
            {
                vol.Required(CONF_MEDICINES): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=[m[CONF_MEDICINE_NAME] for m in medicines],
                        multiple=True,
                        mode=selector.SelectSelectorMode.LIST,
                    )
                )
            }
        )
        return self.async_show_form(step_id="remove_medicine", data_schema=schema)

    async def async_step_add_symptom(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Add an illness/symptom type to log (e.g. vomiting) and its all-clear time."""
        errors: dict[str, str] = {}

        if user_input is not None:
            name = user_input[CONF_SYMPTOM_NAME].strip()
            symptoms = self._symptoms
            if not name:
                errors[CONF_SYMPTOM_NAME] = "name_required"
            elif any(s[CONF_SYMPTOM_NAME].casefold() == name.casefold() for s in symptoms):
                errors[CONF_SYMPTOM_NAME] = "symptom_exists"

            if not errors:
                symptoms.append(
                    {
                        CONF_SYMPTOM_NAME: name,
                        CONF_CLEAR_HOURS: float(user_input[CONF_CLEAR_HOURS]),
                    }
                )
                return self.async_create_entry(
                    data={**self.config_entry.options, CONF_SYMPTOMS: symptoms}
                )

        schema = vol.Schema(
            {
                vol.Required(CONF_SYMPTOM_NAME): selector.TextSelector(),
                vol.Required(CONF_CLEAR_HOURS, default=48): selector.NumberSelector(
                    selector.NumberSelectorConfig(
                        min=1,
                        max=336,
                        step=1,
                        mode=selector.NumberSelectorMode.BOX,
                        unit_of_measurement="h",
                    )
                ),
            }
        )
        return self.async_show_form(
            step_id="add_symptom",
            data_schema=self.add_suggested_values_to_schema(schema, user_input),
            errors=errors,
        )

    async def async_step_remove_symptom(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Remove one or more symptom types."""
        symptoms = self._symptoms

        if user_input is not None:
            remove = set(user_input[CONF_SYMPTOMS])
            kept = [s for s in symptoms if s[CONF_SYMPTOM_NAME] not in remove]
            return self.async_create_entry(data={**self.config_entry.options, CONF_SYMPTOMS: kept})

        schema = vol.Schema(
            {
                vol.Required(CONF_SYMPTOMS): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=[s[CONF_SYMPTOM_NAME] for s in symptoms],
                        multiple=True,
                        mode=selector.SelectSelectorMode.LIST,
                    )
                )
            }
        )
        return self.async_show_form(step_id="remove_symptom", data_schema=schema)

    async def async_step_copy_settings(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Replace this child's settings with another child's."""
        errors: dict[str, str] = {}

        if user_input is not None:
            source = _valid_source(
                self.hass, user_input[CONF_COPY_FROM], self.config_entry.entry_id
            )
            if source is None:
                errors[CONF_COPY_FROM] = "unknown_child"
            else:
                return self.async_create_entry(data=_copied_options(source, self._unit))

        children = _other_children(self.hass, self.config_entry.entry_id)
        schema = vol.Schema({vol.Required(CONF_COPY_FROM): _source_selector(children)})
        return self.async_show_form(step_id="copy_settings", data_schema=schema, errors=errors)
