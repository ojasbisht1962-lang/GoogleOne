from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime
from bson import ObjectId
import uuid

from ..database import get_collection
from ..middleware.auth import get_current_user
from ..models.wallet import Wallet, Transaction, WalletAddFunds, WalletTransfer
from ..models.user import User

router = APIRouter(prefix="/api/wallet", tags=["wallet"])

# Helper functions
async def get_or_create_wallet(user_id: str) -> dict:
    """Get existing wallet or create new one"""
    wallets_collection = await get_collection("wallets")
    wallet = await wallets_collection.find_one({"user_id": user_id})
    if not wallet:
        new_wallet = {
            "user_id": user_id,
            "balance": 0.0,
            "locked_balance": 0.0,
            "total_earned": 0.0,
            "total_spent": 0.0,
            "transactions": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        wallets_collection = await get_collection("wallets")
        result = await wallets_collection.insert_one(new_wallet)
        new_wallet["_id"] = result.inserted_id
        return new_wallet
    return wallet

async def add_transaction(
    user_id: str,
    transaction_type: str,
    amount: float,
    description: str,
    booking_id: str = None,
    status: str = "completed"
):
    """Add a transaction to wallet history"""
    transaction = {
        "transaction_id": str(uuid.uuid4()),
        "type": transaction_type,
        "amount": amount,
        "description": description,
        "related_booking_id": booking_id,
        "created_at": datetime.utcnow(),
        "status": status
    }
    
    wallets_collection = await get_collection("wallets")
    await wallets_collection.update_one(
        {"user_id": user_id},
        {
            "$push": {"transactions": transaction},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    return transaction

@router.get("/my-wallet")
async def get_my_wallet(current_user: User = Depends(get_current_user)):
    """Get current user's wallet"""
    user_id = str(current_user.get('_id')) if isinstance(current_user, dict) else str(current_user.id)
    wallet = await get_or_create_wallet(user_id)
    wallet["_id"] = str(wallet["_id"])
    return wallet

@router.post("/add-funds")
async def add_funds(
    request: WalletAddFunds,
    current_user: User = Depends(get_current_user)
):
    """Add funds to wallet (simulated for now - in production integrate with payment gateway)"""
    user_id = str(current_user.get('_id')) if isinstance(current_user, dict) else str(current_user.id)
    wallet = await get_or_create_wallet(user_id)
    
    # Update balance
    new_balance = wallet["balance"] + request.amount
    
    wallets_collection = await get_collection("wallets")
    await wallets_collection.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "balance": new_balance,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Add transaction
    await add_transaction(
        user_id=user_id,
        transaction_type="credit",
        amount=request.amount,
        description=f"Added funds via {request.payment_method}"
    )
    
    return {
        "message": "Funds added successfully",
        "new_balance": new_balance,
        "amount_added": request.amount
    }

@router.post("/lock-funds")
async def lock_funds(
    amount: float,
    booking_id: str,
    current_user: User = Depends(get_current_user)
):
    """Lock funds for a booking (escrow)"""
    user_id = str(current_user.get('_id')) if isinstance(current_user, dict) else str(current_user.id)
    wallet = await get_or_create_wallet(user_id)
    
    # Check if sufficient balance
    if wallet["balance"] < amount:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Available: ₹{wallet['balance']}, Required: ₹{amount}"
        )
    
    # Lock the funds
    new_balance = wallet["balance"] - amount
    new_locked = wallet["locked_balance"] + amount
    
    wallets_collection = await get_collection("wallets")
    await wallets_collection.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "balance": new_balance,
                "locked_balance": new_locked,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Add transaction
    await add_transaction(
        user_id=user_id,
        transaction_type="lock",
        amount=amount,
        description=f"Funds locked for booking",
        booking_id=booking_id,
        status="pending"
    )
    
    return {
        "message": "Funds locked successfully",
        "locked_amount": amount,
        "available_balance": new_balance,
        "locked_balance": new_locked
    }

@router.post("/release-funds")
async def release_funds(
    booking_id: str,
    from_user_id: str,
    to_user_id: str,
    amount: float
):
    """Release locked funds from customer to tasker (called by booking completion)"""
    # Get customer wallet
    customer_wallet = await get_or_create_wallet(from_user_id)
    
    # Check if sufficient locked balance
    if customer_wallet["locked_balance"] < amount:
        raise HTTPException(
            status_code=400,
            detail="Insufficient locked balance"
        )
    
    # Deduct from customer's locked balance
    wallets_collection = await get_collection("wallets")
    await wallets_collection.update_one(
        {"user_id": from_user_id},
        {
            "$inc": {
                "locked_balance": -amount,
                "total_spent": amount
            },
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    # Add to customer transaction
    await add_transaction(
        user_id=from_user_id,
        transaction_type="debit",
        amount=amount,
        description=f"Payment released for completed booking",
        booking_id=booking_id
    )
    
    # Get or create tasker wallet
    tasker_wallet = await get_or_create_wallet(to_user_id)
    
    # Add to tasker's balance
    wallets_collection = await get_collection("wallets")
    await wallets_collection.update_one(
        {"user_id": to_user_id},
        {
            "$inc": {
                "balance": amount,
                "total_earned": amount
            },
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    # Add to tasker transaction
    await add_transaction(
        user_id=to_user_id,
        transaction_type="credit",
        amount=amount,
        description=f"Payment received for completed booking",
        booking_id=booking_id
    )
    
    return {
        "message": "Funds released successfully",
        "amount": amount,
        "from_user": from_user_id,
        "to_user": to_user_id
    }

@router.post("/refund-locked-funds")
async def refund_locked_funds(
    booking_id: str,
    user_id: str,
    amount: float
):
    """Refund locked funds back to available balance (for cancelled bookings)"""
    wallet = await get_or_create_wallet(user_id)
    
    # Check if sufficient locked balance
    if wallet["locked_balance"] < amount:
        raise HTTPException(
            status_code=400,
            detail="Insufficient locked balance for refund"
        )
    
    # Unlock the funds
    wallets_collection = await get_collection("wallets")
    await wallets_collection.update_one(
        {"user_id": user_id},
        {
            "$inc": {
                "balance": amount,
                "locked_balance": -amount
            },
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    # Add transaction
    await add_transaction(
        user_id=user_id,
        transaction_type="refund",
        amount=amount,
        description=f"Refund for cancelled booking",
        booking_id=booking_id
    )
    
    return {
        "message": "Funds refunded successfully",
        "refunded_amount": amount
    }

@router.get("/transactions")
async def get_transactions(
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """Get transaction history"""
    user_id = str(current_user.get('_id')) if isinstance(current_user, dict) else str(current_user.id)
    wallet = await get_or_create_wallet(user_id)
    
    # Get last N transactions
    transactions = wallet.get("transactions", [])[-limit:]
    transactions.reverse()  # Most recent first
    
    return {
        "transactions": transactions,
        "count": len(transactions)
    }

@router.get("/balance")
async def get_balance(current_user: User = Depends(get_current_user)):
    """Get wallet balance summary"""
    user_id = str(current_user.get('_id')) if isinstance(current_user, dict) else str(current_user.id)
    wallet = await get_or_create_wallet(user_id)
    
    return {
        "balance": wallet["balance"],
        "locked_balance": wallet["locked_balance"],
        "total_earned": wallet.get("total_earned", 0.0),
        "total_spent": wallet.get("total_spent", 0.0),
        "total_balance": wallet["balance"] + wallet["locked_balance"]
    }
