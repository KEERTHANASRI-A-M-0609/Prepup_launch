def calculate_momentum(tasks_completed, tasks_assigned):

    if tasks_assigned == 0:
        return 0

    score = (tasks_completed / tasks_assigned) * 100

    return round(score)

def run_momentum(data: dict):

    score = data["momentum"]

    trend = "stable"

    if score > 75:
        trend = "rising"
    elif score < 50:
        trend = "declining"

    return {
        "momentum_score": score,
        "trend": trend
    }