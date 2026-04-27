from pydantic import BaseModel, Field, GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import core_schema
from typing import Optional, Literal, Any
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

class Payment(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    booking_id: str
    customer_id: str
    provider_id: str
    amount: float
    
    # Payment Method
    payment_method: Literal["upi_qr", "upi_id"] = "upi_qr"
    
    # UPI Details
    upi_transaction_id: Optional[str] = None
    upi_reference_number: Optional[str] = None
    
    # Escrow Status
    status: Literal["pending", "locked", "released", "refunded", "failed"] = "pending"
    
    # Payment Flow
    paid_at: Optional[datetime] = None
    locked_at: Optional[datetime] = None
    released_at: Optional[datetime] = None
    refunded_at: Optional[datetime] = None
    
    # Admin Control
    admin_upi_id: Optional[str] = None
    admin_qr_code_url: Optional[str] = None
    
    # Verification
    is_verified: bool = False
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None  # admin user_id
    
    # Notes
    payment_notes: Optional[str] = None
    refund_reason: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class PaymentSettings(BaseModel):
    """Admin-controlled payment settings"""
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    
    # UPI Configuration
    admin_upi_id: str
    admin_upi_name: str
    admin_qr_code_url: Optional[str] = None
    
    # Escrow Settings
    escrow_enabled: bool = True
    auto_release_days: int = 3  # Days after service completion
    
    # Payment Gateway
    payment_gateway_enabled: bool = False
    gateway_api_key: Optional[str] = None
    
    # Status
    is_active: bool = True
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class InitiatePaymentRequest(BaseModel):
    booking_id: str
    payment_method: Literal["upi_qr", "upi_id"] = "upi_qr"


class VerifyPaymentRequest(BaseModel):
    payment_id: str
    upi_transaction_id: str
    upi_reference_number: Optional[str] = None


class ReleasePaymentRequest(BaseModel):
    payment_id: str
    release_notes: Optional[str] = None


class RefundPaymentRequest(BaseModel):
    payment_id: str
    refund_reason: str


class PaymentResponse(BaseModel):
    payment_id: str
    booking_id: str
    amount: float
    status: str
    payment_method: str
    admin_upi_id: Optional[str] = None
    admin_qr_code_url: Optional[str] = None
    is_verified: bool
    created_at: datetime
