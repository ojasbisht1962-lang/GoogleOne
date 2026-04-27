from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

class Transaction(BaseModel):
    """Transaction record in wallet"""
    transaction_id: str
    type: str  # 'credit', 'debit', 'lock', 'unlock', 'refund'
    amount: float
    description: str
    related_booking_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = 'completed'  # 'completed', 'pending', 'failed'
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class Wallet(BaseModel):
    """User wallet model with escrow functionality"""
    user_id: str
    balance: float = 0.0  # Available balance
    locked_balance: float = 0.0  # Locked/Escrowed amount (for customers with pending bookings)
    total_earned: float = 0.0  # Total earnings (for taskers)
    total_spent: float = 0.0  # Total spent (for customers)
    transactions: List[Transaction] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            ObjectId: lambda v: str(v)
        }

class WalletAddFunds(BaseModel):
    """Request model for adding funds to wallet"""
    amount: float = Field(..., gt=0, description="Amount to add (must be positive)")
    payment_method: str = Field(..., description="Payment method used")

class WalletTransfer(BaseModel):
    """Request model for transferring funds between wallets"""
    from_user_id: str
    to_user_id: str
    amount: float = Field(..., gt=0)
    description: str
    booking_id: Optional[str] = None
