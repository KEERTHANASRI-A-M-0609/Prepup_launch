def generate_recovery_plan(momentum_score):

    if momentum_score >= 50:
        return [
            "Continue Current Plan"
        ]

    return [
        {
            "day": 1,
            "task": "Solve 1 Easy DSA Problem"
        },
        {
            "day": 2,
            "task": "Update Resume"
        },
        {
            "day": 3,
            "task": "Complete 5 Aptitude Questions"
        }
    ]