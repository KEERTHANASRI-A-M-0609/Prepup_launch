"""Random Forest placement probability predictor (trained on synthetic campus-placement data)."""

from __future__ import annotations

import numpy as np
from sklearn.ensemble import RandomForestClassifier

_MODEL: RandomForestClassifier | None = None


def _train_model() -> RandomForestClassifier:
    rng = np.random.default_rng(42)
    n = 2000
    dsa = rng.integers(20, 100, n)
    aptitude = rng.integers(20, 100, n)
    communication = rng.integers(20, 100, n)
    resume = rng.integers(20, 100, n)
    projects = rng.integers(10, 100, n)
    interview = rng.integers(0, 100, n)
    momentum = rng.integers(0, 100, n)
    apps = rng.integers(0, 25, n)
    selected = rng.integers(0, 5, n)

    X = np.column_stack([dsa, aptitude, communication, resume, projects, interview, momentum, apps, selected])
    weighted = (
        dsa * 0.28 + aptitude * 0.15 + communication * 0.14 + resume * 0.13
        + projects * 0.12 + interview * 0.10 + momentum * 0.08
    )
    placement_score = weighted + selected * 8 + apps * 0.5
    noise = rng.normal(0, 6, n)
    y = (placement_score + noise >= 62).astype(int)

    clf = RandomForestClassifier(n_estimators=120, max_depth=8, random_state=42)
    clf.fit(X, y)
    return clf


def _get_model() -> RandomForestClassifier:
    global _MODEL
    if _MODEL is None:
        _MODEL = _train_model()
    return _MODEL


def predict_placement(data: dict) -> dict:
    """Predict placement likelihood using Random Forest on assessment features."""
    model = _get_model()
    features = np.array([[
        float(data.get("dsa", 0)),
        float(data.get("aptitude", 0)),
        float(data.get("communication", 0)),
        float(data.get("resume", 0)),
        float(data.get("projects", data.get("resume", 0) * 0.8)),
        float(data.get("interview", 0)),
        float(data.get("momentum", 0)),
        float(data.get("applications", 0)),
        float(data.get("selections", 0)),
    ]])
    proba = model.predict_proba(features)[0]
    placed_prob = float(proba[1]) if len(proba) > 1 else float(proba[0])
    importances = model.feature_importances_
    names = ["DSA", "Aptitude", "Communication", "Resume", "Projects", "Interview", "Momentum", "Applications", "Selections"]
    top_idx = int(np.argmax(importances))
    drivers = sorted(zip(names, importances.tolist()), key=lambda x: -x[1])[:3]

    return {
        "model": "RandomForestClassifier",
        "placement_probability_pct": round(placed_prob * 100, 1),
        "confidence": "high" if placed_prob > 0.75 or placed_prob < 0.25 else "medium",
        "top_feature": names[top_idx],
        "feature_importance": [{"feature": n, "weight": round(w, 3)} for n, w in drivers],
        "signal": "strong" if placed_prob >= 0.65 else "moderate" if placed_prob >= 0.4 else "weak",
    }
