from app.core.normalizer import normalize_input
from app.diagnosis.engine import run_diagnosis
from app.probability.service import run_probability
from app.recommendation.service import run_recommendation
from app.momentum.service import run_momentum
from app.ml.placement_predictor import predict_placement

def run_full_analysis(data: dict):

    clean_data = normalize_input(data)

    diagnosis = run_diagnosis(clean_data)
    probability = run_probability(clean_data)
    recommendation = run_recommendation(clean_data)
    momentum = run_momentum(clean_data)
    ml_placement = predict_placement(clean_data)

    return {
        "input": clean_data,
        "diagnosis": diagnosis,
        "probability": probability,
        "recommendation": recommendation,
        "momentum": momentum,
        "ml_placement": ml_placement,
        "system_version": "phase_6_ai_ml_engine"
    }