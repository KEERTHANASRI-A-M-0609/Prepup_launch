"""PrepUp ML module — scikit-learn models for placement intelligence."""

from app.ml.placement_predictor import predict_placement
from app.ml.failure_nlp import analyze_failure_clusters
from app.ml.resume_matcher import match_resume_to_role
from app.ml.interview_scorer import score_interview_ml

__all__ = [
    "predict_placement",
    "analyze_failure_clusters",
    "match_resume_to_role",
    "score_interview_ml",
]
