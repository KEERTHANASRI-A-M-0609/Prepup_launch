import os

from twilio.rest import Client


def normalize_whatsapp_phone(phone: str) -> str:
    p = phone.strip().replace(" ", "").replace("-", "")
    if p.startswith("whatsapp:"):
        p = p[len("whatsapp:"):]
    if not p.startswith("+"):
        digits = "".join(c for c in p if c.isdigit())
        if len(digits) == 10:
            p = f"+91{digits}"
        elif digits.startswith("91") and len(digits) == 12:
            p = f"+{digits}"
        else:
            p = f"+{digits}" if digits else p
    return p


def send_whatsapp(phone: str, message: str) -> dict:
    sid = os.environ.get("TWILIO_SID")
    token = os.environ.get("TWILIO_TOKEN")
    from_ = os.environ.get("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

    if not sid or not token:
        return {
            "status": "skipped",
            "reason": "Twilio credentials not configured — add TWILIO_SID and TWILIO_TOKEN to backend/.env and restart the server",
        }

    if not from_.startswith("whatsapp:"):
        from_ = f"whatsapp:{from_}"

    try:
        client = Client(sid, token)
        to = normalize_whatsapp_phone(phone)
        if len(to) < 10:
            return {"status": "error", "reason": f"Invalid phone number: {phone}"}

        msg = client.messages.create(body=message[:1600], from_=from_, to=f"whatsapp:{to}")

        hint = None
        if msg.status in ("failed", "undelivered"):
            hint = "Message failed — ensure your number joined the Twilio WhatsApp sandbox."
        elif msg.status == "queued":
            hint = (
                f"Message queued to {to}. If you don't receive it within 2 min: "
                "1) Open Twilio Console → Messaging → Try WhatsApp → join sandbox from THIS phone. "
                "2) Confirm Settings shows the same +91 number."
            )

        return {
            "status": "sent" if msg.status != "failed" else "error",
            "sid": msg.sid,
            "to": to,
            "twilio_status": msg.status,
            "error_code": getattr(msg, "error_code", None),
            "hint": hint,
        }
    except Exception as e:
        err = str(e)
        hint = "Join Twilio sandbox: send the join code from your phone to +1 415 523 8886"
        if "401" in err or "invalid username" in err.lower() or "authenticate" in err.lower():
            hint = (
                "Invalid Twilio credentials. Copy your real Account SID and Auth Token from "
                "console.twilio.com → Account → API keys & tokens into backend/.env "
                "(TWILIO_SID, TWILIO_TOKEN), then restart the backend."
            )
        elif "63015" in err or "63016" in err:
            hint = "Your phone has NOT joined the Twilio WhatsApp sandbox yet. Join it first in Twilio Console."
        elif "21211" in err:
            hint = "Invalid phone number format. Use +91XXXXXXXXXX in your profile."
        return {"status": "error", "reason": err, "hint": hint}
