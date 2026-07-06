from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, JSON, ForeignKey
from app.core.db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)  # In production, use hashed passwords

class Analysis(Base):
    __tablename__ = "analysis"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    input_data = Column(JSON)
    result_data = Column(JSON)
    # timestamps can be added later

class Assessment(BaseModel):
    dsa: int
    aptitude: int
    communication: int
    resume: int
    momentum: int = 50

class MomentumRequest(BaseModel):
    tasks_completed: int
    tasks_assigned: int

class InterviewAnalysisRequest(BaseModel):
    reasons: list[str]

class ResourceRequest(BaseModel):
    skill: str

class Student(BaseModel):
    name: str
    email: str
    target_role: str
class ReviewRequest(BaseModel):
    readiness: int
    momentum: int
    completed_tasks: int

class StudentCreate(BaseModel):
    name: str
    email: str
    target_role: str

class AssessmentCreate(BaseModel):
    student_id: int
    dsa: int
    aptitude: int
    communication: int
    resume: int

class InterviewAttemptCreate(BaseModel):
    student_id: int
    company: str
    round: str
    result: str
    failure_reason: str

class DailyPlanCreate(BaseModel):
    student_id: int
    task: str
    impact: str
    time_required: str
    status: str

class FullAnalysisRequest(BaseModel):
    dsa: int
    aptitude: int
    communication: int
    resume: int
    momentum: int

class ProbabilityRequest(BaseModel):
    dsa: int
    aptitude: int
    communication: int
    resume: int
    momentum: int

class OpportunityRequest(BaseModel):
    probability: int