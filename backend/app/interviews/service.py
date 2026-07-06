RECOVERY_PLANS = {
    "DSA": [
        "Solve 3 medium LeetCode problems daily (focus on your failed topics)",
        "Review Striver A2Z sheet for the pattern you missed",
        "Time-box practice: 25 min solve + 10 min review",
    ],
    "Technical": [
        "Solve 3 medium LeetCode problems daily (focus on your failed topics)",
        "Review Striver A2Z sheet for the pattern you missed",
        "Time-box practice: 25 min solve + 10 min review",
    ],
    "Communication": [
        "Practice 3 STAR-format answers out loud daily",
        "Record yourself and count filler words",
        "Do one mock HR round with a peer this week",
    ],
    "HR": [
        "Practice 3 STAR-format answers out loud daily",
        "Record yourself and count filler words",
        "Do one mock HR round with a peer this week",
    ],
    "Poor communication": [
        "Practice 3 STAR-format answers out loud daily",
        "Record yourself and count filler words",
    ],
    "Did not know the concept": [
        "Identify the topic from the interview and study it for 45 min",
        "Solve 5 problems on that pattern from NeetCode 150",
    ],
    "Could not optimise solution": [
        "Practice time/space complexity analysis after each problem",
        "Solve 2 optimisation-focused problems daily",
    ],
    "Ran out of time": [
        "Practice with a 25-minute timer per problem",
        "Focus on pattern recognition to solve faster",
    ],
    "Nervous / anxious": [
        "Do 2 mock interviews per week on Pramp",
        "Practice breathing exercises before rounds",
    ],
    "Aptitude": [
        "Complete 20 IndiaBix quant questions daily",
        "Focus on time & work, percentages, and probability",
    ],
    "Online Assessment": [
        "Complete 20 IndiaBix quant questions daily",
        "Practice timed OA-style tests weekly",
    ],
}


def _normalize_reason(reason: str) -> str:
    r = reason.strip()
    mapping = {
        "dsa": "DSA",
        "technical": "Technical",
        "communication": "Communication",
        "hr": "HR",
        "aptitude": "Aptitude",
    }
    return mapping.get(r.lower(), r)


def analyze_failures(reasons: list[str]) -> dict:
    result: dict[str, int] = {}
    for reason in reasons:
        key = _normalize_reason(reason)
        if not key:
            continue
        result[key] = result.get(key, 0) + 1
    return result


def get_recovery_plan(largest_issue: str) -> list[str]:
    if largest_issue in RECOVERY_PLANS:
        return RECOVERY_PLANS[largest_issue]
    for key, plan in RECOVERY_PLANS.items():
        if key.lower() in largest_issue.lower():
            return plan
    return [
        "Log more rejections with root causes to unlock targeted recovery steps",
        "Review Preparation → Resources for gap-based recommendations",
        "Schedule one mock interview this week",
    ]
