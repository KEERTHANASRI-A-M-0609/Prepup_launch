from app.whatsapp.resources import pick_resources


def _score_line(scores: dict, key: str, label: str) -> str:
    val = scores.get(key)
    if val is None:
        return ""
    return f"• {label}: {val}%"


def build_status_message(profile: dict) -> str:
    name = profile.get("name", "there")
    domain = profile.get("domain", "Software Engineering")
    scores = profile.get("scores") or {}
    gaps = profile.get("gaps") or []
    assessed = profile.get("assessed", False)
    streak = profile.get("streak", 0)
    overall = profile.get("overall_readiness")

    lines = [f"📊 *PrepUp Status — {name}*", f"Role track: {domain}"]

    if not assessed:
        lines.append("\n⚠️ Assessment not complete yet.")
        lines.append("Open PrepUp → take assessment to unlock your readiness score.")
        return "\n".join(lines)

    if overall is not None:
        lines.append(f"\n🎯 Overall readiness: *{overall}%*")

    score_bits = [
        _score_line(scores, "dsa", "DSA"),
        _score_line(scores, "projects", "Projects"),
        _score_line(scores, "resume", "Resume"),
        _score_line(scores, "aptitude", "Aptitude"),
        _score_line(scores, "communication", "Communication"),
    ]
    score_bits = [s for s in score_bits if s]
    if score_bits:
        lines.append("\n" + "\n".join(score_bits))

    if gaps:
        top = gaps[0]
        lines.append(f"\n🔴 Biggest gap: *{top.get('label', '?')}* ({top.get('current', 0)}% → target {top.get('target', 0)}%)")

    if streak:
        lines.append(f"\n🔥 Streak: {streak} day{'s' if streak != 1 else ''}")

    apps = profile.get("applications") or []
    active = [a for a in apps if a.get("status") not in ("Rejected", "Selected")]
    if active:
        lines.append(f"\n📋 Active applications: {len(active)}")

    lines.append("\nReply *RESOURCES* for personalized picks")
    lines.append("Reply *HELP* for all commands")
    return "\n".join(lines)


def build_resources_message(profile: dict) -> str:
    domain = profile.get("domain", "Software Engineering")
    gaps = profile.get("gaps") or []
    companies = profile.get("target_companies") or []
    picks = pick_resources(gaps, domain, companies, limit=4)

    lines = ["💡 *Resources for your weak areas*", f"Track: {domain}"]
    if companies:
        lines.append(f"Targeting: {', '.join(companies[:3])}")

    if not picks:
        lines.append("\nComplete your assessment first for personalized resources.")
        return "\n".join(lines)

    lines.append("")
    for i, r in enumerate(picks, 1):
        lines.append(f"{i}. *{r['title']}* ({r['area']})")
        lines.append(f"   {r['why']}")
        lines.append(f"   {r['url']}")

    lines.append("\nReply *STATUS* for your latest scores")
    return "\n".join(lines)


def build_help_message() -> str:
    return (
        "🤖 *PrepUp WhatsApp Bot*\n\n"
        "Commands (reply anytime):\n"
        "• *STATUS* — readiness scores & biggest gap\n"
        "• *RESOURCES* — picks based on weakness + your role\n"
        "• *PLAN* — today's focus action\n"
        "• *WEEKLY* — your weekly progress report\n"
        "• *HELP* — this menu\n\n"
        "Auto alerts: daily digest, Sunday weekly report, new application deadlines."
    )


def build_plan_message(profile: dict) -> str:
    gaps = profile.get("gaps") or []
    domain = profile.get("domain", "Software Engineering")
    actions = {
        "dsa": "Solve 3 LeetCode medium problems (focus your weakest topic)",
        "projects": "Push commits to GitHub or deploy one project live",
        "resume": "Add 2 quantified bullet points with numbers/impact",
        "aptitude": "Complete 15 quant questions on IndiaBix",
        "communication": "Practice 2 STAR-format answers out loud (record yourself)",
        "interview": "Log your last interview in Failure Intel",
    }
    if not gaps:
        return f"📌 *Today's focus*\n\nExplore PrepUp Daily Planner for your {domain} track."

    top = gaps[0]
    key = top.get("key", "dsa")
    action = actions.get(key, f"Work on {top.get('label', 'readiness')}")
    return (
        f"📌 *Today's focus — {domain}*\n\n"
        f"Priority: *{top.get('label', '?')}* (gap: {top.get('gap', 0)} pts)\n"
        f"→ {action}\n\n"
        f"Reply *RESOURCES* for study links"
    )


def build_daily_digest(profile: dict) -> str:
    name = profile.get("name", "there").split()[0]
    status = build_status_message(profile)
    resources = pick_resources(
        profile.get("gaps") or [],
        profile.get("domain", "Software Engineering"),
        profile.get("target_companies") or [],
        limit=2,
    )

    lines = [f"☀️ *Good morning, {name}!*", "", status]

    if resources:
        lines.append("\n💡 *Today's resource picks:*")
        for i, r in enumerate(resources, 1):
            lines.append(f"{i}. {r['title']} — {r['url']}")

    # Upcoming deadlines
    apps = profile.get("applications") or []
    soon = [a for a in apps if a.get("days_to_deadline") is not None and 0 <= a["days_to_deadline"] <= 3]
    if soon:
        lines.append("\n📅 *Deadlines coming up:*")
        for a in soon[:3]:
            lines.append(f"• {a.get('company')} — {a.get('days_to_deadline')}d ({a.get('status')})")

    inactive = profile.get("days_inactive")
    if inactive and inactive >= 2:
        lines.append(f"\n⚠️ Inactive {inactive} days — open Daily Planner to protect your streak.")

    lines.append("\nReply *STATUS* | *RESOURCES* | *PLAN* | *HELP*")
    msg = "\n".join(lines)
    return msg[:1600]


def build_weekly_report_message(profile: dict) -> str:
    name = profile.get("name", "there").split()[0]
    domain = profile.get("domain", "Software Engineering")
    overall = profile.get("overall_readiness")
    gaps = profile.get("gaps") or []
    weekly = profile.get("weekly_stats") or {}
    apps = profile.get("applications") or []

    hours = weekly.get("hours_this_week", 0)
    tasks = weekly.get("tasks_this_week", 0)
    delta = weekly.get("readiness_delta")
    active = weekly.get("active_applications", 0)
    offers = weekly.get("offers", 0)

    lines = [
        f"📈 *Weekly Report — {name}*",
        f"Week ending {weekly.get('week_label', 'today')} · {domain}",
        "",
    ]

    if overall is not None:
        trend = ""
        if delta is not None and delta != 0:
            trend = f" ({'+' if delta > 0 else ''}{delta}% vs last week)"
        lines.append(f"🎯 Readiness: *{overall}%*{trend}")
    else:
        lines.append("⚠️ Complete assessment for a readiness score.")

    lines.append(f"⏱ Prep this week: *{hours}* hrs · *{tasks}* tasks done")
    if profile.get("streak"):
        lines.append(f"🔥 Current streak: {profile.get('streak')} days")

    lines.append(f"\n📋 Pipeline: {active} active · {offers} offer{'s' if offers != 1 else ''}")

    if gaps:
        top = gaps[0]
        lines.append(f"🔴 Focus next week: *{top.get('label')}* (gap {top.get('gap', 0)} pts)")

    resources = pick_resources(
        gaps,
        domain,
        profile.get("target_companies") or [],
        limit=2,
    )
    if resources:
        lines.append("\n💡 *Resources for your weakness:*")
        for i, r in enumerate(resources, 1):
            lines.append(f"{i}. {r['title']} — {r['url']}")

    soon = [a for a in apps if a.get("days_to_deadline") is not None and 0 <= a["days_to_deadline"] <= 7]
    if soon:
        lines.append("\n📅 *Deadlines next 7 days:*")
        for a in soon[:4]:
            lines.append(f"• {a.get('company')} ({a.get('role', '')}) — {a.get('days_to_deadline')}d")

    lines.append("\nReply *STATUS* | *RESOURCES* | *PLAN* | *HELP*")
    return "\n".join(lines)[:1600]


def build_application_alert_message(app: dict) -> str:
    company = app.get("company", "Company")
    role = app.get("role", "")
    status = app.get("status", "Wishlist")
    deadline = app.get("deadline", "")
    days = app.get("days_to_deadline")

    lines = [
        "📅 *New application tracked!*",
        "",
        f"🏢 *{company}*",
        f"Role: {role or '—'}",
        f"Status: {status}",
    ]

    if deadline:
        if days is not None:
            when = f"in {days} day{'s' if days != 1 else ''}" if days >= 0 else "passed"
            lines.append(f"Deadline: {deadline} ({when})")
        else:
            lines.append(f"Deadline: {deadline}")
    else:
        lines.append("Deadline: not set — add one in PrepUp")

    lines.append("\nReply *STATUS* for readiness · *PLAN* for today's focus")
    return "\n".join(lines)
