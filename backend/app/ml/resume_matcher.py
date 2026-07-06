"""Resume–role semantic matching via TF-IDF cosine similarity."""

from __future__ import annotations

import re

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

ROLE_PROFILES: dict[str, str] = {
    "Software Engineering": (
        "data structures algorithms python java system design rest api microservices "
        "object oriented programming git docker kubernetes sql react node projects internship"
    ),
    "Data Science": (
        "python pandas numpy machine learning statistics regression classification "
        "tensorflow pytorch sklearn data visualization sql jupyter feature engineering"
    ),
    "AI / ML": (
        "deep learning neural networks pytorch tensorflow nlp computer vision transformer "
        "llm fine tuning mlops model training evaluation precision recall"
    ),
    "Cloud & DevOps": (
        "aws azure gcp docker kubernetes ci cd terraform linux networking automation "
        "monitoring infrastructure as code deployment pipeline"
    ),
    "UI / UX Design": (
        "figma wireframe prototype user research design system usability accessibility "
        "user experience portfolio case study interaction design"
    ),
}


def _normalize_domain(domain: str) -> str:
    d = (domain or "").strip()
    for key in ROLE_PROFILES:
        if key.lower() in d.lower() or d.lower() in key.lower():
            return key
    if "data" in d.lower():
        return "Data Science"
    if "devops" in d.lower() or "cloud" in d.lower():
        return "Cloud & DevOps"
    return "Software Engineering"


def match_resume_to_role(resume_text: str, target_role: str = "", domain: str = "Software Engineering") -> dict:
    text = re.sub(r"\s+", " ", (resume_text or "").lower().strip())
    if len(text) < 40:
        return {
            "model": "TF-IDF Cosine Similarity",
            "similarity_pct": 0,
            "matched_keywords": [],
            "missing_keywords": [],
            "ai_summary": "Resume text too short for semantic matching. Upload a fuller resume.",
        }

    resolved = _normalize_domain(domain or target_role)
    profile = ROLE_PROFILES.get(resolved, ROLE_PROFILES["Software Engineering"])
    corpus = [text, profile]
    if target_role:
        corpus.append(target_role.lower())

    vec = TfidfVectorizer(ngram_range=(1, 2), stop_words="english", max_features=500)
    matrix = vec.fit_transform(corpus)
    sim = float(cosine_similarity(matrix[0:1], matrix[1:2])[0][0])
    similarity_pct = round(max(0, min(1, sim)) * 100, 1)

    profile_tokens = set(profile.split())
    resume_tokens = set(re.findall(r"[a-z]{3,}", text))
    matched = sorted(profile_tokens & resume_tokens)[:12]
    missing = sorted(profile_tokens - resume_tokens)[:8]

    return {
        "model": "TF-IDF Cosine Similarity",
        "domain": resolved,
        "similarity_pct": similarity_pct,
        "matched_keywords": matched,
        "missing_keywords": missing,
        "ai_summary": (
            f"Resume–role semantic match: **{similarity_pct}%** for {resolved}. "
            f"Strong alignment on: {', '.join(matched[:5]) or 'limited overlap'}. "
            f"Consider adding: {', '.join(missing[:4]) or 'more role-specific projects'}."
        ),
    }
