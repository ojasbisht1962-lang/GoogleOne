from pydantic import BaseModel, Field, GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import core_schema
from typing import Optional, Literal, Any, List
from datetime import datetime
from bson import ObjectId

class PyObjectId(str):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, _source_type: Any, _handler: Any
    ) -> core_schema.CoreSchema:
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.chain_schema([
                    core_schema.str_schema(),
                    core_schema.no_info_plain_validator_function(cls.validate),
                ])
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str) and ObjectId.is_valid(v):
            return ObjectId(v)
        raise ValueError("Invalid ObjectId")

    @classmethod
    def __get_pydantic_json_schema__(
        cls, _core_schema: core_schema.CoreSchema, handler: GetJsonSchemaHandler
    ) -> JsonSchemaValue:
        return {"type": "string"}


class SupportTicket(BaseModel):
    """Support ticket model for customer support system"""
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    
    # Ticket Information
    ticket_number: str  # Auto-generated: e.g., TH-2024-0001
    user_id: str
    user_name: str
    user_email: str
    user_role: str  # customer, tasker
    
    # Ticket Details
    category: Literal[
        "booking_help",
        "payment_status", 
        "faq",
        "delay",
        "safety_issue",
        "service_dispute",
        "account_issue",
        "technical_issue",
        "complaint_late_arrival",
        "complaint_poor_service",
        "complaint_behaviour_issue",
        "complaint_overcharging",
        "other"
    ]
    
    priority: Literal["low", "medium", "high", "critical"] = "low"
    
    # Tier System
    tier: Literal["ai", "human"] = "ai"
    
    # Status
    status: Literal[
        "open",
        "in_progress", 
        "waiting_customer",
        "escalated",
        "resolved",
        "closed"
    ] = "open"
    
    # Content
    subject: str
    description: str
    
    # Related Entities (optional)
    booking_id: Optional[str] = None
    payment_id: Optional[str] = None
    
    # AI Handling
    ai_handled: bool = False
    ai_response: Optional[str] = None
    ai_confidence: Optional[float] = None  # 0-1 score
    
    # Auto-escalation
    auto_escalated: bool = False
    escalation_reason: Optional[str] = None
    escalated_at: Optional[datetime] = None
    
    # Human Agent Assignment
    assigned_to: Optional[str] = None  # admin user_id
    assigned_agent_name: Optional[str] = None
    assigned_at: Optional[datetime] = None
    
    # Resolution
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None  # admin user_id
    
    # Complaint/Dispute Specific Fields
    is_complaint: bool = False
    complaint_against_id: Optional[str] = None  # tasker_id for complaints
    complaint_against_name: Optional[str] = None
    evidence_urls: Optional[List[str]] = []  # Photos, screenshots, etc.
    evidence_description: Optional[str] = None
    
    # Escrow Management
    escrow_frozen: bool = False
    escrow_frozen_at: Optional[datetime] = None
    payment_id_affected: Optional[str] = None
    
    # AI Review
    ai_review_completed: bool = False
    ai_review_result: Optional[str] = None  # "favor_customer", "favor_provider", "needs_human"
    ai_review_confidence: Optional[float] = None
    ai_review_notes: Optional[str] = None
    
    # Admin Review
    admin_review_completed: bool = False
    admin_review_result: Optional[str] = None  # "refund_full", "refund_partial", "penalty_provider", "no_action"
    admin_review_notes: Optional[str] = None
    
    # Resolution Actions
    refund_amount: Optional[float] = None
    penalty_amount: Optional[float] = None
    resolution_action: Optional[str] = None  # "refund", "penalty", "warning", "no_action"
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Customer Feedback
    customer_rating: Optional[int] = None  # 1-5
    customer_feedback: Optional[str] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class TicketMessage(BaseModel):
    """Messages within a support ticket"""
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    ticket_id: str
    sender_id: str
    sender_name: str
    sender_type: Literal["customer", "agent", "ai"]
    message: str
    attachments: Optional[List[str]] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


# Request/Response Models
class CreateTicketRequest(BaseModel):
    category: str
    subject: str
    description: str
    booking_id: Optional[str] = None
    payment_id: Optional[str] = None
    # Complaint specific fields
    is_complaint: Optional[bool] = False
    complaint_against_id: Optional[str] = None
    evidence_urls: Optional[List[str]] = []
    evidence_description: Optional[str] = None


class CreateComplaintRequest(BaseModel):
    """Specific request for filing complaints"""
    category: Literal[
        "complaint_late_arrival",
        "complaint_poor_service", 
        "complaint_behaviour_issue",
        "complaint_overcharging"
    ]
    subject: str
    description: str
    booking_id: str  # Required for complaints
    payment_id: Optional[str] = None
    complaint_against_id: str  # tasker_id
    evidence_urls: Optional[List[str]] = []
    evidence_description: Optional[str] = None


class UpdateTicketRequest(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None


class ReviewComplaintRequest(BaseModel):
    """Admin review of complaint/dispute"""
    ticket_id: str
    review_result: Literal["refund_full", "refund_partial", "penalty_provider", "no_action"]
    review_notes: str
    refund_amount: Optional[float] = None
    penalty_amount: Optional[float] = None


class AddMessageRequest(BaseModel):
    ticket_id: str
    message: str
    attachments: Optional[List[str]] = []


class RateTicketRequest(BaseModel):
    ticket_id: str
    rating: int
    feedback: Optional[str] = None
