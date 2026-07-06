from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from dotenv import load_dotenv
from pathlib import Path

# backend/.env (uvicorn cwd is often project root)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from app.core.db import engine, get_db, Base
from app.models import (
    User, Analysis,
    Assessment,
    MomentumRequest,
    InterviewAnalysisRequest,
    Student,
    StudentCreate,
    AssessmentCreate,
    InterviewAttemptCreate,
    DailyPlanCreate,
    ProbabilityRequest,
    OpportunityRequest,
    ReviewRequest,
    ResourceRequest,
    FullAnalysisRequest
)
from app.database_models import (
    StudentDB,
    AssessmentDB,
    InterviewAttemptDB,
    DailyPlanDB
)
from app.assessment_modules.models import AssessmentModuleDB, MockInterviewDB

from app.diagnosis.engine import run_diagnosis
from app.career_twin.model import CareerTwin
from app.career_twin.service import calculate_readiness
from app.recommendation.service import run_recommendation
from app.execution.service import generate_daily_plan
from app.simulator.service import placement_stage
from app.momentum.service import calculate_momentum
from app.recovery.service import generate_recovery_plan
from app.interviews.service import analyze_failures
from app.resources.service import get_resource
from app.review.service import generate_review
from app.opportunity.service import get_opportunities
from app.auth.service import create_token
from app.orchestrator.service import run_full_analysis
from app.services import calculate_probability, get_weakness
from app.planner.intelligence import generate_personalized_plan, generate_weekly_plan

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

student_data = {
    "communication": 60,
    "dsa": 40,
    "aptitude": 70,
    "mock_interviews": 2,
    "tasks_completed": 5
}

@app.get("/")
def home():
    return {
        "message": "Placement Execution System Running"
    }

class LoginRequest(BaseModel):
    email: str
    password: str = ""

@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    student = db.query(StudentDB).filter(StudentDB.email == data.email.lower()).first()
    if not student:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="No account found. Please register first.")
    if not data.password or len(data.password) < 6:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "token": create_token({"email": data.email, "user_id": student.id})
    }

@app.post("/diagnose")
def diagnosis(data: Assessment):
    return run_diagnosis(data.dict())

@app.post("/career-twin")
def career_twin(data: CareerTwin):

    readiness = calculate_readiness(data)

    return {
        "role": data.target_role,
        "readiness_score": readiness
    }

@app.post("/recommend")
def recommend(data: Assessment):
    payload = data.dict()
    diagnosis_result = run_diagnosis(payload)
    recommendation_result = run_recommendation(payload)

    return {
        "patterns": diagnosis_result["patterns"],
        "roadmap": recommendation_result["roadmap"]
    }

@app.post("/execution-plan")
def execution_plan(data: Assessment):
    payload = data.dict()
    diagnosis_result = run_diagnosis(payload)

    plan = generate_daily_plan(
        diagnosis_result["patterns"][0] if diagnosis_result["patterns"] else "General Improvement"
    )

    return {
        "patterns": diagnosis_result["patterns"],
        "plan": plan
    }

@app.post("/placement-gps")
def placement_gps(data: CareerTwin):

    readiness = calculate_readiness(data)

    stage = placement_stage(readiness)

    return {
        "readiness": readiness,
        "stage": stage
    }

@app.post("/momentum")
def momentum(data: MomentumRequest):

    score = calculate_momentum(
        data.tasks_completed,
        data.tasks_assigned
    )

    if score >= 80:
        status = "Excellent"

    elif score >= 50:
        status = "Average"

    else:
        status = "Drop Risk"

    return {
        "momentum_score": score,
        "status": status
    }
@app.post("/recovery")
def recovery(data: MomentumRequest):

    score = calculate_momentum(
        data.tasks_completed,
        data.tasks_assigned
    )

    plan = generate_recovery_plan(score)

    return {
        "momentum_score": score,
        "recovery_plan": plan
    }

@app.post("/failure-intelligence")
def failure_intelligence(data: InterviewAnalysisRequest):
    from app.interviews.service import get_recovery_plan
    from app.ml.failure_nlp import analyze_failure_clusters

    analysis = analyze_failures(data.reasons)
    ml_insights = analyze_failure_clusters(data.reasons)

    if not analysis:
        return {
            "failure_breakdown": {},
            "largest_issue": "Insufficient data",
            "recovery_plan": get_recovery_plan(""),
            "ml_insights": ml_insights,
        }

    largest_issue = max(analysis, key=analysis.get)
    recovery = get_recovery_plan(largest_issue)
    if ml_insights.get("top_topics"):
        recovery = [
            f"[ML] Focus area: {ml_insights['largest_cluster']}",
            *recovery[:4],
        ]

    return {
        "failure_breakdown": analysis,
        "largest_issue": largest_issue,
        "recovery_plan": recovery,
        "ml_insights": ml_insights,
    }

@app.post("/weekly-review")
def weekly_review(data: ReviewRequest):

    return generate_review(
        data.readiness,
        data.momentum,
        data.completed_tasks
    )

@app.post("/student")
def create_student(
    data: StudentCreate,
    db: Session = Depends(get_db)
):

    student = StudentDB(
        name=data.name,
        email=data.email,
        target_role=data.target_role
    )

    db.add(student)
    db.commit()
    db.refresh(student)

    return {
        "id": student.id,
        "message": "Student Created"
    }

@app.get("/students")
def get_students(
    db: Session = Depends(get_db)
):

    students = db.query(StudentDB).all()

    return students

@app.post("/assessment")
def create_assessment(
    data: AssessmentCreate,
    db: Session = Depends(get_db)
):

    assessment = AssessmentDB(
        student_id=data.student_id,
        dsa=data.dsa,
        aptitude=data.aptitude,
        communication=data.communication,
        resume=data.resume
    )

    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    return {
        "assessment_id": assessment.id,
        "message": "Assessment Saved"
    }
@app.get("/assessments")
def get_assessments(
    db: Session = Depends(get_db)
):

    return db.query(AssessmentDB).all()

@app.post("/interview")
def create_interview(
    data: InterviewAttemptCreate,
    db: Session = Depends(get_db)
):

    interview = InterviewAttemptDB(
        student_id=data.student_id,
        company=data.company,
        round=data.round,
        result=data.result,
        failure_reason=data.failure_reason
    )

    db.add(interview)
    db.commit()
    db.refresh(interview)

    return {
        "id": interview.id,
        "message": "Interview Saved"
    }

@app.get("/interviews")
def get_interviews(
    db: Session = Depends(get_db)
):

    return db.query(
        InterviewAttemptDB
    ).all()

@app.post("/daily-plan")
def create_daily_plan(
    data: DailyPlanCreate,
    db: Session = Depends(get_db)
):

    plan = DailyPlanDB(
        student_id=data.student_id,
        task=data.task,
        impact=data.impact,
        time_required=data.time_required,
        status=data.status
    )

    db.add(plan)
    db.commit()
    db.refresh(plan)

    return {
        "id": plan.id,
        "message": "Daily Plan Saved"
    }

@app.get("/daily-plans")
def get_daily_plans(
    db: Session = Depends(get_db)
):

    return db.query(DailyPlanDB).all()

@app.post("/full-analysis")
def full_analysis(data: FullAnalysisRequest, user_id: int = 1, db: Session = Depends(get_db)):
    """
    End-to-end placement intelligence analysis.
    """
    payload = data.dict()
    result = run_full_analysis(payload)
    
    # In Phase 4 we will automate saving this to the 'analysis' table here.
    
    return result

@app.get("/placement-probability")
def placement_probability(
    dsa: int,
    aptitude: int,
    communication: int,
    resume: int,
    momentum: int
):
    probability = calculate_probability(
        dsa,
        aptitude,
        communication,
        resume,
        momentum
    )

    return {
        "placement_probability": probability
    }
@app.get("/health")
def health():
    return {"status": "running"}

@app.post("/opportunity-radar")
def opportunity_radar(data: OpportunityRequest):

    return get_opportunities(data.probability)

@app.get("/student-dashboard/{student_id}")
def student_dashboard(student_id: int, db: Session = Depends(get_db)):
    student = db.query(StudentDB).filter(StudentDB.id == student_id).first()
    if not student:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Student not found")

    latest_assessment = (
        db.query(AssessmentDB)
        .filter(AssessmentDB.student_id == student_id)
        .order_by(AssessmentDB.id.desc())
        .first()
    )

    if latest_assessment:
        dsa = latest_assessment.dsa
        aptitude = latest_assessment.aptitude
        communication = latest_assessment.communication
        resume = latest_assessment.resume
        momentum = 50
        probability = calculate_probability(dsa, aptitude, communication, resume, momentum)
        weakness = get_weakness({"dsa": dsa, "aptitude": aptitude, "communication": communication})
        opportunities = get_opportunities(int(probability))
        from datetime import date as date_cls
        plan_items = generate_personalized_plan({
            "student_id": student_id,
            "email": student.email,
            "target_role": student.target_role,
            "dsa": dsa,
            "aptitude": aptitude,
            "communication": communication,
            "resume": resume,
            "projects": getattr(latest_assessment, "projects", 0) or 0,
            "interview": getattr(latest_assessment, "interview", 0) or 0,
            "date": date_cls.today().isoformat(),
            "target_companies": [],
        })
        daily_plan = [t["text"] for t in plan_items]
    else:
        probability = 0
        weakness = "DSA"
        opportunities = get_opportunities(0)
        daily_plan = ["Complete your assessment first"]

    return {
        "student_id": student_id,
        "name": student.name,
        "target_role": student.target_role,
        "placement_probability": probability,
        "weakness": weakness,
        "daily_plan": daily_plan,
        "opportunities": opportunities,
    }


class PlannerRequest(BaseModel):
    student_id: int | None = None
    email: str | None = None
    date: str | None = None
    mode: str = "daily"
    target_role: str | None = None
    domain: str | None = None
    target_companies: list[str] = []
    dsa: int = 0
    resume: int = 0
    projects: int = 0
    communication: int = 0
    aptitude: int = 0
    interview: int = 0
    weekly_hours: str | None = None
    completed_yesterday: list[str] = []
    applications: list[dict] = []
    activity_log: list[dict] = []

@app.post("/planner/generate")
def planner_generate(data: PlannerRequest):
    payload = data.dict()
    if data.mode == "weekly":
        return {"days": generate_weekly_plan(payload)}
    tasks = generate_personalized_plan(payload)
    return {"date": data.date, "tasks": tasks}

class StudentUpsert(BaseModel):
    name: str
    email: str
    target_role: str

@app.post("/upsert-student")
def upsert_student(data: StudentUpsert, db: Session = Depends(get_db)):
    existing = db.query(StudentDB).filter(StudentDB.email == data.email).first()
    if existing:
        existing.name = data.name
        existing.target_role = data.target_role
        db.commit()
        db.refresh(existing)
        return {"id": existing.id, "message": "Student updated"}
    student = StudentDB(name=data.name, email=data.email, target_role=data.target_role)
    db.add(student)
    db.commit()
    db.refresh(student)
    return {"id": student.id, "message": "Student created"}


class AssessmentModuleSave(BaseModel):
    student_id: int
    module: str
    data: dict = {}


class MockInterviewSave(BaseModel):
    student_id: int
    id: str = ""
    date: str = ""
    type: str = "mixed"
    score: int = 0
    problemSolving: int = 0
    communication: int = 0
    technicalDepth: int = 0
    confidence: int = 0
    feedback: list[str] = []
    questions: list[str] = []
    transcript: str = ""


@app.post("/assessment/module")
def save_assessment_module(data: AssessmentModuleSave, db: Session = Depends(get_db)):
    import json
    row = AssessmentModuleDB(
        student_id=data.student_id,
        module=data.module,
        evidence_json=json.dumps(data.data),
    )
    db.add(row)
    db.commit()
    return {"status": "saved", "module": data.module}


@app.post("/assessment/mock-interview")
def save_mock_interview(data: MockInterviewSave, db: Session = Depends(get_db)):
    import json
    payload = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    row = MockInterviewDB(student_id=data.student_id, session_json=json.dumps(payload))
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"status": "saved", "id": row.id}


@app.get("/assessment/priority/{student_id}")
def get_assessment_priority(student_id: int, db: Session = Depends(get_db)):
    latest = (
        db.query(AssessmentDB)
        .filter(AssessmentDB.student_id == student_id)
        .order_by(AssessmentDB.id.desc())
        .first()
    )
    modules_done = db.query(AssessmentModuleDB).filter(AssessmentModuleDB.student_id == student_id).all()
    done_names = {m.module for m in modules_done}

    priority_map = [
        ("resume", "Resume Intelligence", "Resume evidence unlocks ATS-based readiness scoring", 12),
        ("coding", "Coding Intelligence", "DSA score is unknown without LeetCode connection", 11),
        ("communication", "Communication Assessment", "Communication contributes 15% of readiness and is currently unknown", 10),
        ("aptitude", "Aptitude Assessment", "Campus OAs require quant and logical reasoning evidence", 9),
        ("github", "GitHub Intelligence", "Project readiness needs GitHub activity evidence", 8),
        ("interview", "Mock Interview", "Simulated interviews reveal blind spots before real rounds", 6),
    ]

    for key, title, reason, impact in priority_map:
        if key not in done_names:
            return {"priority": title, "reason": reason, "impact": impact, "module_id": key}

    return {"priority": "All core modules complete", "reason": "Maintain momentum with weekly mock interviews", "impact": 4, "module_id": "interview"}


# ── WhatsApp Intelligence via Twilio ───────────────────────────────────────────
from typing import Optional
from fastapi import Form
from fastapi.responses import Response

from app.whatsapp.client import normalize_whatsapp_phone, send_whatsapp
from app.whatsapp.service import handle_inbound, send_application_alert, send_digest, send_weekly_report, sync_profile


class WhatsAppNotify(BaseModel):
    phone: str
    message: str


class WhatsAppGap(BaseModel):
    key: str
    label: str
    current: int
    target: int
    gap: int


class WhatsAppApplication(BaseModel):
    company: str
    role: str = ""
    status: str = ""
    days_to_deadline: Optional[int] = None


class WhatsAppProfileSync(BaseModel):
    phone: str
    name: str = ""
    email: str = ""
    domain: str = "Software Engineering"
    goal: str = "placement"
    target_companies: list[str] = []
    assessed: bool = False
    overall_readiness: Optional[int] = None
    streak: int = 0
    days_inactive: Optional[int] = None
    scores: dict = {}
    gaps: list[WhatsAppGap] = []
    applications: list[WhatsAppApplication] = []
    weekly_stats: dict = {}


class WhatsAppApplicationAlert(BaseModel):
    phone: str
    company: str
    role: str = ""
    status: str = "Wishlist"
    deadline: str = ""
    days_to_deadline: Optional[int] = None
    profile: Optional[dict] = None


@app.post("/notify/whatsapp")
def notify_whatsapp(data: WhatsAppNotify):
    return send_whatsapp(data.phone, data.message)


@app.post("/whatsapp/sync")
def whatsapp_sync(data: WhatsAppProfileSync):
    """Store profile snapshot so inbound WhatsApp commands return live status."""
    payload = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    return sync_profile(payload)


@app.post("/whatsapp/digest")
def whatsapp_digest(data: WhatsAppProfileSync):
    """Send daily digest: status + weakness-based resources + deadlines."""
    payload = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    return send_digest(payload)


@app.post("/whatsapp/weekly-report")
def whatsapp_weekly_report(data: WhatsAppProfileSync):
    """Send Sunday weekly report: progress, resources, pipeline."""
    payload = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    return send_weekly_report(payload)


@app.post("/whatsapp/application-alert")
def whatsapp_application_alert(data: WhatsAppApplicationAlert):
    """Notify when a new application (with deadline) is added."""
    payload = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    return send_application_alert(payload)


@app.post("/whatsapp/webhook")
async def whatsapp_webhook(Body: str = Form(default=""), From: str = Form(default="")):
    """
    Twilio inbound webhook — users reply STATUS, RESOURCES, PLAN, HELP.
    Configure in Twilio Console → WhatsApp Sandbox → "When a message comes in":
    POST https://<your-ngrok-url>/whatsapp/webhook
    """
    phone = From.replace("whatsapp:", "") if From else ""
    result = handle_inbound(phone, Body)
    # Twilio expects 200; empty TwiML avoids duplicate auto-replies
    from twilio.twiml.messaging_response import MessagingResponse
    resp = MessagingResponse()
    return Response(content=str(resp), media_type="application/xml")


@app.get("/whatsapp/commands")
def whatsapp_commands():
    return {
        "commands": [
            {"cmd": "STATUS", "desc": "Readiness scores and biggest gap"},
            {"cmd": "RESOURCES", "desc": "Personalized resources for your weaknesses + role"},
            {"cmd": "PLAN", "desc": "Today's priority action"},
            {"cmd": "WEEKLY", "desc": "Weekly progress report"},
            {"cmd": "HELP", "desc": "Command menu"},
        ],
        "webhook_path": "/whatsapp/webhook",
        "note": "Point Twilio sandbox webhook to this URL (use ngrok for local dev).",
    }


# ─── AI / ML Intelligence Layer ─────────────────────────────────────────────

class AIChatRequest(BaseModel):
    message: str
    context: dict = {}


class InterviewAIRequest(BaseModel):
    transcript: str
    interview_type: str = "mixed"
    questions: list[str] = []


class CommunicationAIRequest(BaseModel):
    transcript: str
    duration_secs: int = 60


class ResumeAIRequest(BaseModel):
    resume_text: str
    domain: str = "Software Engineering"
    local_score: int | None = None


class GapNarrativeRequest(BaseModel):
    gaps: list[dict] = []
    role: str = "Software Engineer"
    companies: list[str] = []


class FailureMLRequest(BaseModel):
    reasons: list[str] = []
    reflections: list[str] = []


class PlacementMLRequest(BaseModel):
    dsa: float = 0
    aptitude: float = 0
    communication: float = 0
    resume: float = 0
    projects: float = 0
    interview: float = 0
    momentum: float = 0
    applications: float = 0
    selections: float = 0


@app.get("/ai/status")
def ai_status_route():
    from app.ai.llm_service import ai_status
    return ai_status()


@app.post("/ai/chat")
def ai_chat(data: AIChatRequest):
    from app.ai.llm_service import chat_with_ai
    return chat_with_ai(data.message, data.context)


@app.post("/ai/interview-score")
def ai_interview_score(data: InterviewAIRequest):
    from app.ai.llm_service import interview_feedback_ai
    return interview_feedback_ai(data.transcript, data.interview_type, data.questions)


@app.post("/ai/communication-score")
def ai_communication_score(data: CommunicationAIRequest):
    from app.ai.llm_service import communication_feedback_ai
    return communication_feedback_ai(data.transcript, data.duration_secs)


@app.post("/ai/resume-insights")
def ai_resume_insights(data: ResumeAIRequest):
    from app.ai.llm_service import resume_insights_ai
    return resume_insights_ai(data.resume_text, data.domain, data.local_score)


@app.post("/ai/gap-narrative")
def ai_gap_narrative(data: GapNarrativeRequest):
    from app.ai.llm_service import gap_narrative_ai
    return gap_narrative_ai(data.gaps, data.role, data.companies)


@app.post("/ml/placement-predict")
def ml_placement_predict(data: PlacementMLRequest):
    from app.ml.placement_predictor import predict_placement
    return predict_placement(data.dict())


@app.post("/ml/failure-cluster")
def ml_failure_cluster(data: FailureMLRequest):
    from app.ml.failure_nlp import analyze_failure_clusters
    return analyze_failure_clusters(data.reasons, data.reflections)
