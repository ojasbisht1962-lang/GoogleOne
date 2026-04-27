from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from bson import ObjectId
from app.database import get_collection

class PaymentService:
    """Service for handling escrow-style UPI payments"""
    
    async def _get_payments_collection(self):
        return await get_collection("payments")
    
    async def _get_settings_collection(self):
        return await get_collection("payment_settings")
    
    async def _get_bookings_collection(self):
        return await get_collection("bookings")
    
    async def get_payment_settings(self) -> Optional[Dict[str, Any]]:
        """Get admin payment settings"""
        settings_collection = await self._get_settings_collection()
        settings = await settings_collection.find_one({"is_active": True})
        if settings:
            settings["_id"] = str(settings["_id"])
        return settings
    
    async def update_payment_settings(self, settings_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update admin payment settings"""
        settings_collection = await self._get_settings_collection()
        settings_data["updated_at"] = datetime.utcnow()
        
        # Check if settings exist
        existing = await settings_collection.find_one({"is_active": True})
        
        if existing:
            await settings_collection.update_one(
                {"_id": existing["_id"]},
                {"$set": settings_data}
            )
            result = await settings_collection.find_one({"_id": existing["_id"]})
        else:
            settings_data["created_at"] = datetime.utcnow()
            settings_data["is_active"] = True
            result = await settings_collection.insert_one(settings_data)
            result = await settings_collection.find_one({"_id": result.inserted_id})
        
        result["_id"] = str(result["_id"])
        return result
    
    async def initiate_payment(
        self, 
        booking_id: str, 
        customer_id: str,
        provider_id: str,
        amount: float,
        payment_method: str = "upi_qr"
    ) -> Dict[str, Any]:
        """Initiate a new payment for a booking"""
        
        payments_collection = await self._get_payments_collection()
        bookings_collection = await self._get_bookings_collection()
        
        # Get payment settings (optional - use defaults if not configured)
        settings = await self.get_payment_settings()
        
        # Use default UPI details if settings not configured
        admin_upi_id = settings.get("admin_upi_id") if settings else "admin@upi"
        admin_qr_code_url = settings.get("admin_qr_code_url") if settings else None
        
        # Check if payment already exists for this booking
        existing = await payments_collection.find_one({"booking_id": booking_id})
        if existing:
            existing["_id"] = str(existing["_id"])
            return existing
        
        # Create payment record
        payment_data = {
            "booking_id": booking_id,
            "customer_id": customer_id,
            "provider_id": provider_id,
            "amount": amount,
            "payment_method": payment_method,
            "status": "pending",
            "is_verified": False,
            "admin_upi_id": admin_upi_id,
            "admin_qr_code_url": admin_qr_code_url,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await payments_collection.insert_one(payment_data)
        payment = await payments_collection.find_one({"_id": result.inserted_id})
        payment["_id"] = str(payment["_id"])
        
        # Update booking payment status
        await bookings_collection.update_one(
            {"_id": ObjectId(booking_id)},
            {"$set": {"payment_status": "pending", "payment_id": str(result.inserted_id)}}
        )
        
        return payment
    
    async def verify_payment(
        self,
        payment_id: str,
        upi_transaction_id: str,
        upi_reference_number: Optional[str] = None,
        verified_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """Verify and lock payment in escrow"""
        
        payments_collection = await self._get_payments_collection()
        bookings_collection = await self._get_bookings_collection()
        wallets_collection = await get_collection("wallets")
        
        payment = await payments_collection.find_one({"_id": ObjectId(payment_id)})
        if not payment:
            raise ValueError("Payment not found")
        
        if payment["status"] != "pending":
            raise ValueError(f"Payment already {payment['status']}")
        
        # Lock funds in customer wallet
        customer_wallet = await wallets_collection.find_one({"user_id": payment["customer_id"]})
        if not customer_wallet:
            # Create wallet if doesn't exist and add funds
            await wallets_collection.insert_one({
                "user_id": payment["customer_id"],
                "balance": payment["amount"],
                "locked_balance": 0.0,
                "total_earned": 0.0,
                "total_spent": 0.0,
                "transactions": [],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            customer_wallet = await wallets_collection.find_one({"user_id": payment["customer_id"]})
        
        # Check sufficient balance
        if customer_wallet["balance"] < payment["amount"]:
            # Add funds to wallet automatically from UPI payment
            await wallets_collection.update_one(
                {"user_id": payment["customer_id"]},
                {"$inc": {"balance": payment["amount"]}}
            )
        
        # Lock the funds
        await wallets_collection.update_one(
            {"user_id": payment["customer_id"]},
            {
                "$inc": {
                    "balance": -payment["amount"],
                    "locked_balance": payment["amount"]
                },
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        # Add transaction record
        transaction = {
            "transaction_id": upi_transaction_id,
            "type": "lock",
            "amount": payment["amount"],
            "description": f"Funds locked for booking",
            "related_booking_id": payment["booking_id"],
            "created_at": datetime.utcnow(),
            "status": "pending"
        }
        await wallets_collection.update_one(
            {"user_id": payment["customer_id"]},
            {"$push": {"transactions": transaction}}
        )
        
        # In production, verify with payment gateway API
        # For now, we'll mark as verified and locked
        update_data = {
            "upi_transaction_id": upi_transaction_id,
            "upi_reference_number": upi_reference_number,
            "is_verified": True,
            "verified_at": datetime.utcnow(),
            "verified_by": verified_by,
            "status": "locked",
            "paid_at": datetime.utcnow(),
            "locked_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await payments_collection.update_one(
            {"_id": ObjectId(payment_id)},
            {"$set": update_data}
        )
        
        # Update booking payment status (keep booking status as is - let tasker accept/reject)
        await bookings_collection.update_one(
            {"_id": ObjectId(payment["booking_id"])},
            {"$set": {"payment_status": "paid"}}
        )
        
        updated_payment = await payments_collection.find_one({"_id": ObjectId(payment_id)})
        updated_payment["_id"] = str(updated_payment["_id"])
        return updated_payment
    
    async def auto_verify_payment(
        self,
        payment_id: str,
        upi_transaction_id: str
    ) -> Dict[str, Any]:
        """Auto-verify payment (simulated for demo purposes)"""
        
        # Simulate automatic verification
        # In production, this would call payment gateway API
        import asyncio
        await asyncio.sleep(2)  # Simulate API call delay
        
        return await self.verify_payment(
            payment_id=payment_id,
            upi_transaction_id=upi_transaction_id,
            verified_by="system_auto"
        )
    
    async def release_payment(
        self,
        payment_id: str,
        release_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Release payment from escrow to provider"""
        
        payments_collection = await self._get_payments_collection()
        bookings_collection = await self._get_bookings_collection()
        wallets_collection = await get_collection("wallets")
        
        payment = await payments_collection.find_one({"_id": ObjectId(payment_id)})
        if not payment:
            raise ValueError("Payment not found")
        
        if payment["status"] != "locked":
            raise ValueError(f"Payment not in escrow. Current status: {payment['status']}")
        
        # Release funds from customer wallet and transfer to tasker
        customer_wallet = await wallets_collection.find_one({"user_id": payment["customer_id"]})
        if customer_wallet and customer_wallet["locked_balance"] >= payment["amount"]:
            # Deduct from customer's locked balance
            await wallets_collection.update_one(
                {"user_id": payment["customer_id"]},
                {
                    "$inc": {
                        "locked_balance": -payment["amount"],
                        "total_spent": payment["amount"]
                    },
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            # Add debit transaction for customer
            customer_transaction = {
                "transaction_id": f"release_{payment_id}",
                "type": "debit",
                "amount": payment["amount"],
                "description": f"Payment released for completed booking",
                "related_booking_id": payment["booking_id"],
                "created_at": datetime.utcnow(),
                "status": "completed"
            }
            await wallets_collection.update_one(
                {"user_id": payment["customer_id"]},
                {"$push": {"transactions": customer_transaction}}
            )
        
        # Get or create tasker wallet
        tasker_wallet = await wallets_collection.find_one({"user_id": payment["provider_id"]})
        if not tasker_wallet:
            await wallets_collection.insert_one({
                "user_id": payment["provider_id"],
                "balance": 0.0,
                "locked_balance": 0.0,
                "total_earned": 0.0,
                "total_spent": 0.0,
                "transactions": [],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
        
        # Add to tasker's balance
        await wallets_collection.update_one(
            {"user_id": payment["provider_id"]},
            {
                "$inc": {
                    "balance": payment["amount"],
                    "total_earned": payment["amount"]
                },
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        # Add credit transaction for tasker
        tasker_transaction = {
            "transaction_id": f"receive_{payment_id}",
            "type": "credit",
            "amount": payment["amount"],
            "description": f"Payment received for completed booking",
            "related_booking_id": payment["booking_id"],
            "created_at": datetime.utcnow(),
            "status": "completed"
        }
        await wallets_collection.update_one(
            {"user_id": payment["provider_id"]},
            {"$push": {"transactions": tasker_transaction}}
        )
        
        # Release payment
        update_data = {
            "status": "released",
            "released_at": datetime.utcnow(),
            "payment_notes": release_notes,
            "updated_at": datetime.utcnow()
        }
        
        await payments_collection.update_one(
            {"_id": ObjectId(payment_id)},
            {"$set": update_data}
        )
        
        # Update booking payment status
        await bookings_collection.update_one(
            {"_id": ObjectId(payment["booking_id"])},
            {"$set": {"payment_status": "released"}}
        )
        
        updated_payment = await payments_collection.find_one({"_id": ObjectId(payment_id)})
        updated_payment["_id"] = str(updated_payment["_id"])
        return updated_payment
    
    async def refund_payment(
        self,
        payment_id: str,
        refund_reason: str
    ) -> Dict[str, Any]:
        """Refund payment to customer"""
        
        import logging
        logger = logging.getLogger(__name__)
        
        payments_collection = await self._get_payments_collection()
        bookings_collection = await self._get_bookings_collection()
        wallets_collection = await get_collection("wallets")
        
        payment = await payments_collection.find_one({"_id": ObjectId(payment_id)})
        if not payment:
            raise ValueError("Payment not found")
        
        logger.info(f"Refunding payment {payment_id}, status: {payment['status']}, amount: {payment['amount']}")
        
        if payment["status"] not in ["locked", "pending"]:
            raise ValueError(f"Cannot refund payment with status: {payment['status']}")
        
        # If payment was locked, unlock the funds in customer's wallet
        if payment["status"] == "locked":
            customer_wallet = await wallets_collection.find_one({"user_id": payment["customer_id"]})
            logger.info(f"Customer wallet found: {customer_wallet is not None}, locked_balance: {customer_wallet.get('locked_balance') if customer_wallet else 'N/A'}")
            
            if customer_wallet:
                if customer_wallet["locked_balance"] >= payment["amount"]:
                    # Unlock the funds (move from locked back to available balance)
                    await wallets_collection.update_one(
                        {"user_id": payment["customer_id"]},
                        {
                            "$inc": {
                                "locked_balance": -payment["amount"],
                                "balance": payment["amount"]
                            },
                            "$set": {"updated_at": datetime.utcnow()}
                        }
                    )
                    logger.info(f"✅ Unlocked {payment['amount']} from customer wallet")
                    
                    # Add refund transaction for customer
                    refund_transaction = {
                        "transaction_id": f"refund_{payment_id}",
                        "type": "refund",
                        "amount": payment["amount"],
                        "description": f"Refund: {refund_reason}",
                        "related_booking_id": payment["booking_id"],
                        "created_at": datetime.utcnow(),
                        "status": "completed"
                    }
                    await wallets_collection.update_one(
                        {"user_id": payment["customer_id"]},
                        {"$push": {"transactions": refund_transaction}}
                    )
                    logger.info(f"✅ Added refund transaction to customer wallet")
                else:
                    logger.error(f"❌ Insufficient locked balance: {customer_wallet['locked_balance']} < {payment['amount']}")
            else:
                logger.error(f"❌ Customer wallet not found for user {payment['customer_id']}")
        elif payment["status"] == "pending":
            # Payment was never verified, so no funds were locked - nothing to refund
            logger.info(f"ℹ️ Payment is in pending status - no funds were locked, skipping wallet refund")
        
        # Process refund
        update_data = {
            "status": "refunded",
            "refunded_at": datetime.utcnow(),
            "refund_reason": refund_reason,
            "updated_at": datetime.utcnow()
        }
        
        await payments_collection.update_one(
            {"_id": ObjectId(payment_id)},
            {"$set": update_data}
        )
        
        # Update booking payment status only (don't override booking status)
        await bookings_collection.update_one(
            {"_id": ObjectId(payment["booking_id"])},
            {"$set": {"payment_status": "refunded"}}
        )
        
        updated_payment = await payments_collection.find_one({"_id": ObjectId(payment_id)})
        updated_payment["_id"] = str(updated_payment["_id"])
        return updated_payment
    
    async def get_payment_by_booking(self, booking_id: str) -> Optional[Dict[str, Any]]:
        """Get payment details for a booking"""
        payments_collection = await self._get_payments_collection()
        payment = await payments_collection.find_one({"booking_id": booking_id})
        if payment:
            payment["_id"] = str(payment["_id"])
        return payment
    
    async def get_payment_by_id(self, payment_id: str) -> Optional[Dict[str, Any]]:
        """Get payment by ID"""
        payments_collection = await self._get_payments_collection()
        payment = await payments_collection.find_one({"_id": ObjectId(payment_id)})
        if payment:
            payment["_id"] = str(payment["_id"])
        return payment
    
    async def check_payment_status(self, payment_id: str) -> Dict[str, Any]:
        """Check current payment status"""
        payment = await self.get_payment_by_id(payment_id)
        if not payment:
            raise ValueError("Payment not found")
        
        return {
            "payment_id": payment_id,
            "status": payment["status"],
            "is_verified": payment.get("is_verified", False),
            "amount": payment["amount"],
            "paid_at": payment.get("paid_at"),
            "locked_at": payment.get("locked_at"),
            "released_at": payment.get("released_at")
        }

payment_service = PaymentService()

