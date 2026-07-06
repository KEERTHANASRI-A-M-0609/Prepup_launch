"""ML communication fluency scorer."""

from __future__ import annotations

import re

import numpy as np
from sklearn.ensemble import RandomForestRegressor

_MODEL: RandomForestRegressor | None = None
FILLERS = {"um", "uh", "like", "basically", "actually", "you know", "sort of", "kind of", "so", "right"}


def _train() -> RandomForestRegressor:
    rng = np.random.default_rng(99)
    n = 1200
    wc = rng.integers(20, 250, n)
    wpm = rng.uniform(80, 180, n)
    fillers = rng.integers(0, 25, n)
    dur = rng.integers(30, 180, n)
    X = np.column_stack([wc, wpm, fillers, dur])
    y = np.clip(wc * 0.35 + wpm * 0.2 - fillers * 3 + dur * 0.1 + rng.normal(0, 5, n), 20, 95)
    m = RandomForestRegressor(n_estimators=60, random_state=99)
    m.fit(X, y)
    return m


def _model() -> RandomForestRegressor:
    global _MODEL
    if _MODEL is None:
        _MODEL = _train()
    return _MODEL


def score_communication_ml(transcript: str, duration_secs: int) -> dict:
    words = re.findall(r"[a-z']+", (transcript or "").lower())
    wc = len(words)
    dur = max(duration_secs, 1)
    wpm = round((wc / dur) * 60, 1)
    fillers = sum(1 for w in words if w in FILLERS)
    unique_ratio = len(set(words)) / max(wc, 1)

    fluency = float(_model().predict(np.array([[wc, wpm, fillers, dur]]))[0])
    fluency = int(max(20, min(98, round(fluency))))

    feedback: list[str] = []
    if wpm < 100:
        feedback.append("Speak slightly faster — aim for 120–150 WPM in interviews.")
    elif wpm > 170:
        feedback.append("Slow down slightly for clarity and confidence.")
    if fillers > 6:
        feedback.append(f"Reduce filler words ({fillers} detected) — pause instead.")
    if wc < 50:
        feedback.append("Expand your answer — interviewers expect 60+ words minimum.")
    if unique_ratio < 0.45:
        feedback.append("Vary vocabulary — avoid repeating the same phrases.")
    if not feedback:
        feedback.append("Strong fluency profile — practice harder prompts next.")

    return {
        "model": "RandomForestRegressor",
        "fluency": fluency,
        "wpm": wpm,
        "fillerCount": fillers,
        "wordCount": wc,
        "vocabularyRichness": round(unique_ratio * 100, 1),
        "feedback": feedback,
        "clarity": int(min(100, fluency * 0.9 + (10 if 110 <= wpm <= 160 else 0))),
        "confidence": int(min(100, wc * 0.8 + (15 if fillers < 4 else 0))),
    }
