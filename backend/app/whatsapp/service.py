from app.whatsapp.client import normalize_whatsapp_phone, send_whatsapp
from app.whatsapp.messages import (
    build_application_alert_message,
    build_daily_digest,
    build_help_message,
    build_plan_message,
    build_resources_message,
    build_status_message,
    build_weekly_report_message,
)
from app.whatsapp.store import get_profile, save_profile


def sync_profile(payload: dict) -> dict:
    phone = payload.get("phone")
    if not phone:
        return {"status": "error", "reason": "phone required"}
    save_profile(phone, payload)
    return {"status": "ok", "phone": normalize_whatsapp_phone(phone)}


def send_digest(payload: dict) -> dict:
    phone = payload.get("phone")
    if not phone:
        return {"status": "error", "reason": "phone required"}

    save_profile(phone, payload)
    message = build_daily_digest(payload)
    return send_whatsapp(phone, message)


def send_weekly_report(payload: dict) -> dict:
    phone = payload.get("phone")
    if not phone:
        return {"status": "error", "reason": "phone required"}

    save_profile(phone, payload)
    message = build_weekly_report_message(payload)
    return send_whatsapp(phone, message)


def send_application_alert(payload: dict) -> dict:
    phone = payload.get("phone")
    if not phone:
        return {"status": "error", "reason": "phone required"}

    company = payload.get("company", "")
    if payload.get("profile"):
        save_profile(phone, payload["profile"])

    message = build_application_alert_message(payload)
    return send_whatsapp(phone, message)


def send_status(phone: str) -> dict:
    profile = get_profile(phone)
    if not profile:
        return send_whatsapp(
            phone,
            "👋 No PrepUp profile linked yet.\n\nSign in at PrepUp with this WhatsApp number, then open the app once to sync.",
        )
    return send_whatsapp(phone, build_status_message(profile))


def send_resources(phone: str) -> dict:
    profile = get_profile(phone)
    if not profile:
        return send_whatsapp(phone, "Link your profile first — sign in to PrepUp with this phone number.")
    return send_whatsapp(phone, build_resources_message(profile))


def send_plan(phone: str) -> dict:
    profile = get_profile(phone)
    if not profile:
        return send_whatsapp(phone, "Link your profile first — sign in to PrepUp with this phone number.")
    return send_whatsapp(phone, build_plan_message(profile))


def handle_inbound(phone: str, body: str) -> dict:
    cmd = (body or "").strip().upper()
    phone_norm = normalize_whatsapp_phone(phone)

    if cmd in ("HELP", "HI", "HELLO", "START"):
        return send_whatsapp(phone_norm, build_help_message())
    if cmd in ("STATUS", "SCORE", "SCORES", "1"):
        return send_status(phone_norm)
    if cmd in ("RESOURCES", "RESOURCE", "LINKS", "2"):
        return send_resources(phone_norm)
    if cmd in ("PLAN", "TODAY", "FOCUS", "3"):
        return send_plan(phone_norm)
    if cmd in ("WEEKLY", "REPORT", "WEEK", "4"):
        profile = get_profile(phone_norm)
        if not profile:
            return send_whatsapp(phone_norm, "Link your profile first — sign in to PrepUp with this phone number.")
        return send_whatsapp(phone_norm, build_weekly_report_message(profile))

    profile = get_profile(phone_norm)
    if profile:
        return send_whatsapp(
            phone_norm,
            f"Unknown command: \"{body.strip()}\"\n\nReply *HELP* for commands.\nOr try *STATUS*, *RESOURCES*, *PLAN*.",
        )
    return send_whatsapp(phone_norm, build_help_message())
