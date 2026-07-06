"""Personalized daily execution plan — unique per user, date, gaps, and target companies."""

from __future__ import annotations

import hashlib
from datetime import date, datetime, timedelta
from typing import Any

from app.whatsapp.resources import pick_resources

DSA_ROTATION = [
    {"text": "Solve 2 LeetCode Medium on Arrays — two-pointer patterns", "mins": 50, "topic": "Arrays"},
    {"text": "Solve 2 LeetCode Medium on Trees — BFS/DFS traversals", "mins": 55, "topic": "Trees"},
    {"text": "Solve 1 LeetCode Hard on Dynamic Programming", "mins": 60, "topic": "DP"},
    {"text": "Solve 2 LeetCode Medium on Graphs — shortest path", "mins": 55, "topic": "Graphs"},
    {"text": "Complete 3 NeetCode 150 problems in weakest pattern", "mins": 45, "topic": "Patterns"},
    {"text": "Timed OA mock: 2 problems in 90 minutes", "mins": 90, "topic": "OA"},
]

APTITUDE_TASKS = [
    {"text": "IndiaBix — 15 Time & Work + Percentage (timed)", "mins": 35},
    {"text": "IndiaBix — 10 logical reasoning puzzles under 25 min", "mins": 30},
    {"text": "IndiaBix — 15 quant on ratios and profit-loss", "mins": 35},
]

COMM_TASKS = [
    {"text": "Record 3 STAR behavioral answers — count filler words", "mins": 30},
    {"text": "Practice 60-second self-introduction on camera", "mins": 15},
    {"text": "Mock HR: 5 behavioral questions with timer", "mins": 30},
]

RESUME_TASKS = [
    {"text": "Add 2 quantified bullet points — metrics and impact", "mins": 30},
    {"text": "Run resume through Jobscan — fix top ATS flags", "mins": 25},
]

PROJECT_TASKS = [
    {"text": "Push 3 commits + improve README with live demo link", "mins": 45},
    {"text": "Deploy one project live and add URL to resume", "mins": 40},
]

BENCHMARKS = {
    "Software Engineering": {"dsa": 80, "projects": 70, "resume": 70, "communication": 65, "aptitude": 65, "interview": 60},
    "Software Engineer": {"dsa": 80, "projects": 70, "resume": 70, "communication": 65, "aptitude": 65, "interview": 60},
    "Data Science": {"dsa": 65, "projects": 75, "resume": 70, "communication": 60, "aptitude": 75, "interview": 60},
    "Product Management": {"dsa": 40, "projects": 60, "resume": 75, "communication": 80, "aptitude": 70, "interview": 70},
}

LABEL_MAP = {
    "dsa": "DSA",
    "resume": "Resume",
    "projects": "Projects",
    "communication": "Communication",
    "aptitude": "Aptitude",
    "interview": "Interview",
}


def _seed(*parts: str) -> int:
    h = hashlib.md5("|".join(parts).encode()).hexdigest()
    return int(h[:8], 16)


def _pick(items: list, seed: int):
    return items[seed % len(items)] if items else None


def _compute_gaps(scores: dict[str, int], role: str) -> list[dict]:
    bench = BENCHMARKS.get(role, BENCHMARKS["Software Engineering"])
    gaps = []
    for key, target in bench.items():
        current = scores.get(key, scores.get(key.replace("interview", "interview"), 0))
        if key == "interview":
            current = scores.get("interview", 0)
        else:
            current = scores.get(key, 0)
        gap = max(0, target - current)
        if gap > 0:
            gaps.append({"key": key, "label": LABEL_MAP.get(key, key), "gap": gap, "current": current, "target": target})
    gaps.sort(key=lambda x: x["gap"], reverse=True)
    return gaps


def generate_personalized_plan(payload: dict[str, Any]) -> list[dict]:
    """Build a unique daily plan from full user context."""
    user_key = str(payload.get("student_id") or payload.get("email") or "user")
    date_str = payload.get("date") or date.today().isoformat()
    seed = _seed(user_key, date_str)

    role = payload.get("target_role") or payload.get("domain") or "Software Engineering"
    companies = payload.get("target_companies") or []
    completed = {t.lower().strip() for t in payload.get("completed_yesterday") or []}

    scores = {
        "dsa": int(payload.get("dsa") or 0),
        "resume": int(payload.get("resume") or 0),
        "projects": int(payload.get("projects") or 0),
        "communication": int(payload.get("communication") or 0),
        "aptitude": int(payload.get("aptitude") or 0),
        "interview": int(payload.get("interview") or 0),
    }

    gaps = _compute_gaps(scores, role)
    items: list[dict] = []

    for app in payload.get("applications") or []:
        deadline = app.get("deadline")
        status = app.get("status", "")
        if not deadline or status in ("Rejected", "Selected"):
            continue
        try:
            dl = datetime.fromisoformat(str(deadline)[:10]).date()
            days = (dl - date.today()).days
            if 0 <= days <= 3:
                items.append({
                    "text": f"Update {app.get('company')} application — deadline in {days}d",
                    "category": "Applications",
                    "priority": "high",
                    "estimatedMins": 20,
                    "why": "Pipeline deadline approaching",
                    "impact": "High",
                })
                break
        except ValueError:
            pass

    for i, g in enumerate(gaps[:2]):
        key = g["key"]
        if key == "dsa":
            t = _pick(DSA_ROTATION, seed + i)
            if t:
                co = companies[seed % len(companies)] if companies else ""
                suffix = f" ({co} OA focus)" if co else ""
                items.append({
                    "text": t["text"] + suffix,
                    "category": "DSA",
                    "priority": "high",
                    "estimatedMins": t["mins"],
                    "why": f"DSA gap {g['gap']} pts — {t['topic']}",
                    "impact": "High",
                })
        elif key == "aptitude":
            t = _pick(APTITUDE_TASKS, seed + i)
            if t:
                items.append({
                    "text": t["text"],
                    "category": "Aptitude",
                    "priority": "high",
                    "estimatedMins": t["mins"],
                    "resourceUrl": "https://www.indiabix.com/aptitude/questions-and-answers/",
                    "why": f"Aptitude gap {g['gap']} pts",
                    "impact": "High",
                })
        elif key == "communication":
            t = _pick(COMM_TASKS, seed + i)
            if t:
                items.append({
                    "text": t["text"],
                    "category": "Communication",
                    "priority": "medium",
                    "estimatedMins": t["mins"],
                    "why": f"Communication gap {g['gap']} pts",
                    "impact": "High",
                })
        elif key == "resume":
            t = _pick(RESUME_TASKS, seed + i)
            if t:
                items.append({
                    "text": t["text"],
                    "category": "Resume",
                    "priority": "medium",
                    "estimatedMins": t["mins"],
                    "resourceUrl": "https://www.jobscan.co",
                    "why": f"Resume gap {g['gap']} pts",
                    "impact": "Medium",
                })
        elif key == "projects":
            t = _pick(PROJECT_TASKS, seed + i)
            if t:
                items.append({
                    "text": t["text"],
                    "category": "Projects",
                    "priority": "medium",
                    "estimatedMins": t["mins"],
                    "why": f"Projects gap {g['gap']} pts",
                    "impact": "High",
                })

    if companies:
        picks = pick_resources(gaps, role, companies, limit=1)
        if picks:
            r = picks[0]
            items.append({
                "text": f"[{companies[seed % len(companies)]}] {r['title']}",
                "category": companies[seed % len(companies)],
                "priority": "high",
                "estimatedMins": 45,
                "resourceUrl": r.get("url"),
                "why": r.get("why", "Company-specific prep"),
                "impact": "High",
            })

    if not items:
        items.append({
            "text": "Complete Career Health assessment to unlock personalized daily tasks",
            "category": "General",
            "priority": "high",
            "estimatedMins": 30,
            "why": "Evidence required",
            "impact": "High",
        })

    seen = set()
    unique = []
    for item in items:
        if item["text"] in seen:
            continue
        seen.add(item["text"])
        if item["text"].lower().strip() not in completed:
            unique.append(item)

    return unique[:5]


def generate_weekly_plan(payload: dict[str, Any]) -> dict[str, list[dict]]:
    start = payload.get("date") or date.today().isoformat()
    base = datetime.fromisoformat(str(start)[:10]).date()
    days: dict[str, list[dict]] = {}
    for i in range(7):
        d = base + timedelta(days=i)
        day_payload = {**payload, "date": d.isoformat()}
        days[d.isoformat()] = generate_personalized_plan(day_payload)
    return days
