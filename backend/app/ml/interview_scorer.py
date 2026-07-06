"""ML interview scorer — Random Forest on transcript linguistic features."""

from __future__ import annotations

import re

import numpy as np
from sklearn.ensemble import RandomForestRegressor

_MODEL: RandomForestRegressor | None = None

FILLERS = {"um", "uh", "like", "basically", "actually", "you know", "sort of", "kind of"}
TECH_TERMS = {
    "algorithm", "complexity", "design", "implement", "optimize", "database", "api",
    "system", "scale", "cache", "queue", "stack", "tree", "graph", "hash", "oop",
    "microservice", "kubernetes", "docker", "sql", "nosql", "latency", "throughput",
}


def _extract_features(transcript: str, interview_type: str, num_questions: int) -> np.ndarray:
    text = (transcript or "").lower()
    words = re.findall(r"[a-z']+", text)
    wc = len(words)
    sentences = [s for s in re.split(r"[.!?]+", transcript) if s.strip()]
    avg_sent_len = wc / max(len(sentences), 1)
    fillers = sum(1 for w in words if w in FILLERS)
    tech_hits = sum(1 for t in TECH_TERMS if t in text)
    star = sum(1 for kw in ("situation", "task", "action", "result", "because", "achieved") if kw in text)
    type_bonus = 1.0 if interview_type == "technical" else 0.5 if interview_type == "mixed" else 0.2
    return np.array([[wc, avg_sent_len, fillers, tech_hits, star, num_questions, type_bonus]])


def _train_model() -> RandomForestRegressor:
    rng = np.random.default_rng(7)
    n = 1500
    X = np.column_stack([
        rng.integers(30, 400, n),
        rng.uniform(4, 25, n),
        rng.integers(0, 30, n),
        rng.integers(0, 12, n),
        rng.integers(0, 6, n),
        rng.integers(2, 6, n),
        rng.choice([0.2, 0.5, 1.0], n),
    ])
    y = np.clip(
        X[:, 0] * 0.12 + X[:, 3] * 6 + X[:, 4] * 8 - X[:, 2] * 1.5 + X[:, 5] * 4 + X[:, 6] * 10
        + rng.normal(0, 5, n),
        15, 98,
    )
    reg = RandomForestRegressor(n_estimators=80, max_depth=6, random_state=7)
    reg.fit(X, y)
    return reg


def _get_model() -> RandomForestRegressor:
    global _MODEL
    if _MODEL is None:
        _MODEL = _train_model()
    return _MODEL


def score_interview_ml(transcript: str, interview_type: str = "mixed", num_questions: int = 4) -> dict:
    feats = _extract_features(transcript, interview_type, num_questions)
    model = _get_model()
    score = float(model.predict(feats)[0])
    score = round(max(15, min(98, score)), 1)

    words = re.findall(r"[a-z']+", (transcript or "").lower())
    fillers = sum(1 for w in words if w in FILLERS)
    tech_hits = sum(1 for t in TECH_TERMS if t in (transcript or "").lower())

    problem_solving = round(min(100, score * 0.9 + tech_hits * 4), 0)
    communication = round(min(100, score * 0.85 - fillers * 2 + 20), 0)
    technical_depth = round(min(100, tech_hits * 12 + (20 if interview_type != "behavioral" else 5)), 0)
    confidence = round(min(100, len(words) / 2.5), 0)

    feedback: list[str] = []
    if fillers > 8:
        feedback.append("Reduce filler words — practice pausing instead of um/like.")
    if tech_hits < 3 and interview_type != "behavioral":
        feedback.append("Use more technical vocabulary (complexity, trade-offs, scalability).")
    if len(words) < 80:
        feedback.append("Expand answers using STAR format — aim for 60+ words per question.")
    if not feedback:
        feedback.append("Strong ML-scored performance — try a harder mock next.")

    return {
        "model": "RandomForestRegressor",
        "score": int(score),
        "problemSolving": int(problem_solving),
        "communication": int(communication),
        "technicalDepth": int(technical_depth),
        "confidence": int(confidence),
        "feedback": feedback,
        "features_used": ["word_count", "sentence_length", "filler_count", "tech_terms", "star_keywords"],
    }
