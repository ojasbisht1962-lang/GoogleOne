from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
from bson import ObjectId

class DocumentType(str, Enum):
    PAN = "pan"
    AADHAAR = "aadhaar"
    DRIVING_LICENSE = "driving_license"
    VOTER_ID = "voter_id"
    PASSPORT = "passport"

class DocumentVerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    AI_PROCESSING = "ai_processing"
    NAME_MISMATCH = "name_mismatch"

class VerificationDocument(BaseModel):
    user_id: str
    document_type: DocumentType
    document_number: Optional[str] = None
    document_url: str  # S3 or local file path
    extracted_name: Optional[str] = None
    ai_confidence: Optional[float] = None
    verification_status: DocumentVerificationStatus = DocumentVerificationStatus.PENDING
    verified_by_ai: bool = False
    verified_by_admin: bool = False
    admin_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    verified_at: Optional[datetime] = None
    
    class Config:
        use_enum_values = True

class DocumentUploadRequest(BaseModel):
    document_type: DocumentType

class DocumentVerificationResponse(BaseModel):
    document_id: str
    document_type: str
    verification_status: str
    extracted_name: Optional[str] = None
    ai_confidence: Optional[float] = None
    name_match: Optional[bool] = None
    message: str
