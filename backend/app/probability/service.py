from app.core.evidence_engine import build_evidence

def run_probability(data: dict):

    evidence = build_evidence(data)

    base = (
        data["dsa"] * 0.3 +
        data["aptitude"] * 0.2 +
        data["communication"] * 0.2 +
        data["resume"] * 0.2 +
        data["momentum"] * 0.1
    )

    final_probability = (base * 0.6) + (evidence["evidence_score"] * 0.4)

    return {
        "base_probability": base,
        "evidence_score": evidence["evidence_score"],
        "final_probability": min(final_probability, 100),
        "signal_quality": evidence["signal_quality"]
    }