def run_recommendation(data: dict):

    roadmap = []

    if data["dsa"] < 70:
        roadmap.append({
            "area": "DSA",
            "action": "Solve 3 problems daily (arrays + recursion)"
        })

    if data["aptitude"] < 70:
        roadmap.append({
            "area": "Aptitude",
            "action": "Focus on ratios, percentages, probability"
        })

    if data["communication"] < 70:
        roadmap.append({
            "area": "Communication",
            "action": "Mock interviews + speaking practice daily"
        })

    if data["resume"] < 70:
        roadmap.append({
            "area": "Resume",
            "action": "Add 2 strong projects with impact metrics"
        })

    return {
        "roadmap": roadmap,
        "priority_focus": len(roadmap)
    }