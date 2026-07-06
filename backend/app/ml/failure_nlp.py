"""NLP failure analysis — TF-IDF + K-Means clustering on rejection reasons."""

from __future__ import annotations

import re
from collections import Counter

from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer


def _normalize_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def analyze_failure_clusters(
    reasons: list[str],
    reflections: list[str] | None = None,
) -> dict:
    texts = [_normalize_text(r) for r in reasons if r and r.strip()]
    if reflections:
        texts.extend(_normalize_text(r) for r in reflections if r and r.strip())
    texts = list(dict.fromkeys(texts))

    if not texts:
        return {
            "model": "TF-IDF + KMeans",
            "clusters": [],
            "top_topics": [],
            "largest_cluster": "Insufficient data",
            "insight": "Log more rejections with detailed reasons to unlock ML pattern detection.",
        }

    if len(texts) == 1:
        return {
            "model": "TF-IDF + KMeans",
            "clusters": [{"label": "Cluster 1", "size": 1, "keywords": texts[0].split()[:5], "samples": texts}],
            "top_topics": texts[0].split()[:3],
            "largest_cluster": texts[0][:60],
            "insight": f"Primary failure theme: **{texts[0]}**. Add more entries for clustering.",
        }

    k = min(3, len(texts))
    vectorizer = TfidfVectorizer(max_features=64, ngram_range=(1, 2), stop_words="english")
    matrix = vectorizer.fit_transform(texts)
    labels = KMeans(n_clusters=k, random_state=42, n_init=10).fit_predict(matrix)
    vocab = vectorizer.get_feature_names_out()

    clusters = []
    for cid in range(k):
        idxs = [i for i, lb in enumerate(labels) if lb == cid]
        if not idxs:
            continue
        sub = matrix[idxs].mean(axis=0).A1
        top_kw_idx = sub.argsort()[-5:][::-1]
        keywords = [vocab[i] for i in top_kw_idx if sub[i] > 0][:5]
        clusters.append({
            "label": f"Cluster {cid + 1}",
            "size": len(idxs),
            "keywords": keywords or ["general"],
            "samples": [texts[i][:80] for i in idxs[:2]],
        })

    clusters.sort(key=lambda c: -c["size"])
    largest = clusters[0] if clusters else None
    topic_counter: Counter[str] = Counter()
    for c in clusters:
        for kw in c.get("keywords", []):
            topic_counter[kw] += c["size"]

    return {
        "model": "TF-IDF + KMeans",
        "clusters": clusters,
        "top_topics": [t for t, _ in topic_counter.most_common(5)],
        "largest_cluster": largest["keywords"][0] if largest and largest.get("keywords") else "mixed",
        "insight": (
            f"ML detected **{len(clusters)} failure pattern(s)**. "
            f"Dominant theme: **{largest['keywords'][0] if largest and largest.get('keywords') else 'mixed'}** "
            f"({largest['size'] if largest else 0} similar rejections)."
        ),
    }
