# AGENTS.md - Child Health Home Assistant Integration

## Project Overview
Custom Home Assistant integration for tracking child health metrics (growth, vaccinations, milestones, medications) with a Lovelace card.

**Integration domain:** `child_health`
**HACS compatible:** Yes

## Architecture

```
custom_components/child_health/
├── __init__.py          # Integration setup, config flow registration
├── config_flow.py       # UI config flow (HACS compatible)
├── const.py             # Constants, domain, platforms
├── manifest.json        # Integration metadata (version, requirements)
├── services.yaml        # Service definitions
├── services.py          # Service implementations
├── entity.py            # Base entity class
├── sensor.py            # Sensor entities (growth, milestones, etc.)
├── binary_sensor.py     # Binary sensors (vaccination due, etc.)
├── data.py              # Data coordinator, storage, API
├── websocket.py         # WebSocket API for frontend
├── card.py              # Lovelace card registration
├── frontend/
│   └── child-health-card.js  # Custom Lovelace card (lit-element)
├── translations/
│   └── en.json          # English translations
└── brand/               # HACS branding assets
```

## Key Components

### Data Coordinator (`data.py`)
- `ChildHealthDataUpdateCoordinator` - Central data management
- Handles storage in `home-assistant/storage/child_health_<entry_id>`
- Manages child profiles, growth records, vaccinations, milestones, medications

### Entities
- **Sensors**: Growth measurements, next vaccination, upcoming milestones, medication schedule
- **Binary Sensors**: Vaccination due, medication due, checkup due

### Frontend Card (`frontend/child-health-card.js`)
- LitElement-based Lovelace card
- Displays child summary, growth charts, vaccination timeline
- Communicates via WebSocket API

### WebSocket API (`websocket.py`)
- `child_health/get_children` - List configured children
- `child_health/get_growth_data` - Growth chart data
- `child_health/get_vaccinations` - Vaccination records
- `child_health/add_growth_entry` - Add measurement
- `child_health/add_vaccination` - Record vaccination

### Services (`services.py`)
- `add_growth_entry` - Add height/weight/head circumference
- `add_vaccination` - Record vaccination
- `add_milestone` - Record developmental milestone
- `add_medication` - Add medication schedule
- `add_note` - Add health note

## Development Commands

```bash
# Run tests
python -m pytest tests/ -v

# Lint
ruff check custom_components/
ruff format custom_components/

# Type check (if configured)
# mypy custom_components/

# Build frontend (if using build tools)
# cd frontend && npm run build
```

## Testing
- Unit tests in `tests/`
- Integration tests use Home Assistant test utilities
- Frontend card tested via HA frontend testing

## Configuration
- Configured via UI (Config Flow)
- Stores child profiles in config entry data
- Health data stored in HA storage (not config)

## HACS Requirements
- `manifest.json` with version, domain, requirements
- `hacs.json` for repository metadata
- Branding assets in `brand/`
- Translations in `translations/`

## Common Tasks

### Adding a new sensor type
1. Add entity class in `sensor.py` or `binary_sensor.py`
2. Register in `__init__.py` async_setup_entry
3. Add translations in `translations/en.json`
4. Update frontend card if needed

### Modifying data schema
1. Update `data.py` storage structure
2. Handle migration in coordinator `_async_update_data`
3. Update WebSocket API if frontend affected

### Frontend changes
1. Edit `frontend/child-health-card.js`
2. Update `card.py` version if breaking changes
3. Test in Lovelace dashboard

## Code Style
- Follow Home Assistant core conventions
- Type hints required for new code
- Async/await throughout
- Use HA helpers (entity, update_coordinator, etc.)