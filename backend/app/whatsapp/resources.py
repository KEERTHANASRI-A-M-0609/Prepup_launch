"""Curated resources keyed by skill area — aligned with frontend intelligence engine."""

RESOURCE_DB = {
    "dsa": [
        {"title": "NeetCode 150", "url": "https://neetcode.io", "why": "Structured DSA roadmap for placements"},
        {"title": "Striver A2Z DSA Sheet", "url": "https://takeuforward.org/strivers-a2z-dsa-course/", "why": "Topic-wise sheet popular in India"},
        {"title": "LeetCode Blind 75", "url": "https://leetcode.com/discuss/general-discussion/460599", "why": "High-frequency interview patterns"},
    ],
    "resume": [
        {"title": "Jobscan ATS Checker", "url": "https://www.jobscan.co", "why": "Checks resume against real ATS parsers"},
        {"title": "Resume Worded", "url": "https://resumeworded.com", "why": "Line-by-line resume feedback"},
        {"title": "Harvard Resume Template", "url": "https://www.overleaf.com/gallery/tagged/cv", "why": "Clean ATS-friendly format"},
    ],
    "projects": [
        {"title": "Full Stack Open (MOOC)", "url": "https://fullstackopen.com", "why": "Build portfolio-ready full-stack projects"},
        {"title": "Vercel Deploy", "url": "https://vercel.com", "why": "Deploy projects live — boosts credibility"},
        {"title": "System Design Primer", "url": "https://github.com/donnemartin/system-design-primer", "why": "Strong projects need system thinking"},
    ],
    "aptitude": [
        {"title": "IndiaBix Quant", "url": "https://www.indiabix.com/aptitude/questions-and-answers/", "why": "Most used aptitude platform in India"},
        {"title": "IndiaBix Logical Reasoning", "url": "https://www.indiabix.com/logical-reasoning/questions-and-answers/", "why": "Covers campus reasoning patterns"},
        {"title": "Arun Sharma Quant Book", "url": "https://www.indiabix.com/aptitude/questions-and-answers/", "why": "Gold standard for quant prep"},
    ],
    "communication": [
        {"title": "STAR Method Guide", "url": "https://www.themuse.com/advice/star-interview-method", "why": "Behavioral answer structure for HR rounds"},
        {"title": "Toastmasters", "url": "https://www.toastmasters.org", "why": "Peer feedback for speaking confidence"},
        {"title": "Speeko App", "url": "https://www.speeko.co", "why": "Daily pacing & filler word drills"},
    ],
    "interview": [
        {"title": "Pramp Mock Interviews", "url": "https://www.pramp.com", "why": "Free peer mock interviews"},
        {"title": "InterviewBit", "url": "https://www.interviewbit.com", "why": "Company-specific prep"},
        {"title": "Glassdoor Reviews", "url": "https://www.glassdoor.com", "why": "Real questions from target companies"},
    ],
}

DOMAIN_FOCUS = {
    "Software Engineering": ["dsa", "projects"],
    "Product Management": ["communication", "aptitude", "resume"],
    "Data Science": ["aptitude", "projects", "dsa"],
    "Cybersecurity": ["dsa", "projects"],
    "UI / UX Design": ["projects", "communication", "resume"],
    "AI / ML": ["aptitude", "projects", "dsa"],
    "Cloud & DevOps": ["projects", "dsa"],
    "Other": ["dsa", "resume"],
}

COMPANY_BOOSTS = {
    "Google": "interview",
    "Amazon": "communication",
    "Microsoft": "dsa",
    "Meta": "dsa",
    "Flipkart": "aptitude",
}


def pick_resources(gaps: list, domain: str, target_companies: list, limit: int = 3) -> list:
    """Pick resources from weakest gaps, boosted by domain + target company interest."""
    ordered_keys: list[str] = []

    for g in sorted(gaps, key=lambda x: x.get("gap", 0), reverse=True):
        key = g.get("key", "")
        if key and g.get("gap", 0) > 0:
            ordered_keys.append(key)

    for focus in DOMAIN_FOCUS.get(domain, DOMAIN_FOCUS["Software Engineering"]):
        if focus not in ordered_keys:
            ordered_keys.append(focus)

    for company in target_companies or []:
        boost = COMPANY_BOOSTS.get(company)
        if boost and boost not in ordered_keys:
            ordered_keys.insert(0, boost)

    if not ordered_keys:
        ordered_keys = ["dsa", "resume"]

    picks: list[dict] = []
    seen: set[str] = set()
    for key in ordered_keys:
        for item in RESOURCE_DB.get(key, []):
            uid = f"{key}:{item['title']}"
            if uid in seen:
                continue
            seen.add(uid)
            picks.append({**item, "area": key.upper()})
            if len(picks) >= limit:
                return picks
    return picks
