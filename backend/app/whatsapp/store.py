import json
import os
from datetime import datetime, timezone
from typing import Any

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")
STORE_PATH = os.path.join(DATA_DIR, "whatsapp_profiles.json")


def _ensure_dir() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)


def _load_all() -> dict[str, Any]:
    _ensure_dir()
    if not os.path.exists(STORE_PATH):
        return {}
    try:
        with open(STORE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def _save_all(data: dict[str, Any]) -> None:
    _ensure_dir()
    with open(STORE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def save_profile(phone: str, profile: dict[str, Any]) -> None:
    from app.whatsapp.client import normalize_whatsapp_phone

    key = normalize_whatsapp_phone(phone)
    data = _load_all()
    data[key] = {**profile, "phone": key, "updated_at": datetime.now(timezone.utc).isoformat()}
    _save_all(data)


def get_profile(phone: str) -> dict[str, Any] | None:
    from app.whatsapp.client import normalize_whatsapp_phone

    key = normalize_whatsapp_phone(phone)
    return _load_all().get(key)
