def calculate_streak(days):

    if days >= 30:
        badge = "Unstoppable"

    elif days >= 14:
        badge = "Consistent"

    else:
        badge = "Getting Started"

    return {
        "current_streak": days,
        "badge": badge
    }