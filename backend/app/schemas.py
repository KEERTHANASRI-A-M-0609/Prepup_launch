from pydantic import BaseModel

class DiagnosisResponse(BaseModel):
    primary_weakness: str
    secondary_weakness: str

