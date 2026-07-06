# services.py

def calculate_probability(dsa, aptitude, communication, resume, momentum):
    base = (
        communication * 0.3 +
        dsa * 0.4 +
        aptitude * 0.3
    )

    bonus = (resume * 2) + (momentum * 1.5)

    return min(round(base + bonus, 2), 100)

def get_weakness(student):
    """
    Determines the primary weakness from student metrics for legacy support.
    """
    scores = {
        "Communication": student["communication"],
        "DSA": student["dsa"],
        "Aptitude": student["aptitude"]
    }
    return min(scores, key=scores.get)

def generate_plan(weakness):
    if weakness == "DSA":
        return [
            "Solve 2 array problems",
            "Learn sliding window concept",
            "Practice 1 coding problem daily"
        ]

    if weakness == "Communication":
        return [
            "Practice self-introduction",
            "Record 2 mock interviews",
            "Speak English for 10 mins daily"
        ]

    if weakness == "Aptitude":
        return [
            "Practice 10 quant questions",
            "Revise percentages & ratios",
            "Take 1 timed test"
        ]