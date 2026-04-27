from datetime import datetime
from typing import Optional, Dict, Any, List
from bson import ObjectId
from app.database import get_collection
import re


class SupportService:
    """Service for handling customer support with AI and human tiers"""
    
    # Keywords that trigger auto-escalation to human agent
    CRITICAL_KEYWORDS = [
        "safety", "danger", "threat", "harass", "assault", "abuse",
        "scam", "fraud", "steal", "cheat", "illegal", "police",
        "emergency", "urgent", "serious", "critical", "lawsuit"
    ]
    
    HIGH_PRIORITY_KEYWORDS = [
        "dispute", "refund", "complaint", "angry", "unsatisfied",
        "poor service", "damage", "injury", "accident", "lost",
        "missing", "wrong", "error", "problem"
    ]
    
    async def _get_tickets_collection(self):
        return await get_collection("support_tickets")
    
    async def _get_messages_collection(self):
        return await get_collection("ticket_messages")
    
    async def _get_bookings_collection(self):
        return await get_collection("bookings")
    
    async def _get_payments_collection(self):
        return await get_collection("payments")
    
    def _generate_ticket_number(self) -> str:
        """Generate unique ticket number"""
        from datetime import datetime
        now = datetime.utcnow()
        # Format: TH-YYYY-NNNN
        import random
        number = random.randint(1000, 9999)
        return f"TH-{now.year}-{number}"
    
    def _analyze_severity(self, category: str, subject: str, description: str, is_complaint: bool = False) -> Dict[str, Any]:
        """Analyze ticket severity and determine if auto-escalation is needed"""
        text = f"{subject} {description}".lower()
        
        # Check for critical keywords
        critical_match = any(keyword in text for keyword in self.CRITICAL_KEYWORDS)
        high_priority_match = any(keyword in text for keyword in self.HIGH_PRIORITY_KEYWORDS)
        
        # Complaint categories - always high priority and human tier
        complaint_categories = [
            "complaint_late_arrival",
            "complaint_poor_service",
            "complaint_behaviour_issue",
            "complaint_overcharging"
        ]
        
        # Category-based escalation
        critical_categories = ["safety_issue", "service_dispute"]
        high_priority_categories = ["payment_status", "delay"]
        
        # ALL TICKETS GO TO HUMAN TIER - AI tier removed
        # Complaints always get critical priority
        if is_complaint or category in complaint_categories:
            return {
                "tier": "human",
                "priority": "critical" if category in ["complaint_behaviour_issue", "complaint_overcharging"] else "high",
                "auto_escalated": True,
                "escalation_reason": "Complaint/dispute requires immediate human review and escrow freeze"
            }
        # Determine priority only (all go to human tier)
        elif critical_match or category in critical_categories:
            return {
                "tier": "human",
                "priority": "critical",
                "auto_escalated": True,
                "escalation_reason": "Critical keywords detected or safety-related issue"
            }
        elif high_priority_match or category in high_priority_categories:
            return {
                "tier": "human",
                "priority": "high",
                "auto_escalated": True,
                "escalation_reason": "High priority issue requiring human attention"
            }
        else:
            return {
                "tier": "human",
                "priority": "medium",
                "auto_escalated": False,
                "escalation_reason": None
            }
    
    async def create_ticket(
        self,
        user_id: str,
        user_name: str,
        user_email: str,
        user_role: str,
        category: str,
        subject: str,
        description: str,
        booking_id: Optional[str] = None,
        payment_id: Optional[str] = None,
        is_complaint: bool = False,
        complaint_against_id: Optional[str] = None,
        evidence_urls: Optional[List[str]] = None,
        evidence_description: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new support ticket with auto-escalation logic"""
        
        tickets_collection = await self._get_tickets_collection()
        
        # Analyze severity
        severity_analysis = self._analyze_severity(category, subject, description, is_complaint)
        
        # Generate ticket number
        ticket_number = self._generate_ticket_number()
        
        # Get complaint target name if complaint
        complaint_against_name = None
        if is_complaint and complaint_against_id:
            users_collection = await get_collection("users")
            target_user = await users_collection.find_one({"_id": ObjectId(complaint_against_id)})
            if target_user:
                complaint_against_name = target_user.get("name", "Unknown")
        
        # Create ticket
        ticket_data = {
            "ticket_number": ticket_number,
            "user_id": user_id,
            "user_name": user_name,
            "user_email": user_email,
            "user_role": user_role,
            "category": category,
            "priority": severity_analysis["priority"],
            "tier": severity_analysis["tier"],
            "status": "open",
            "subject": subject,
            "description": description,
            "booking_id": booking_id,
            "payment_id": payment_id,
            "ai_handled": False,
            "auto_escalated": severity_analysis["auto_escalated"],
            "escalation_reason": severity_analysis["escalation_reason"],
            "escalated_at": datetime.utcnow() if severity_analysis["auto_escalated"] else None,
            # Complaint-specific fields
            "is_complaint": is_complaint,
            "complaint_against_id": complaint_against_id,
            "complaint_against_name": complaint_against_name,
            "evidence_urls": evidence_urls or [],
            "evidence_description": evidence_description,
            "escrow_frozen": False,
            "ai_review_completed": False,
            "admin_review_completed": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # If complaint, freeze escrow immediately
        if is_complaint and payment_id:
            await self._freeze_escrow(payment_id, ticket_number)
            ticket_data["escrow_frozen"] = True
            ticket_data["escrow_frozen_at"] = datetime.utcnow()
            ticket_data["payment_id_affected"] = payment_id
        
        result = await tickets_collection.insert_one(ticket_data)
        ticket = await tickets_collection.find_one({"_id": result.inserted_id})
        ticket["_id"] = str(ticket["_id"])
        
        return ticket
    
    async def get_ticket_by_id(self, ticket_id: str) -> Optional[Dict[str, Any]]:
        """Get ticket by ID"""
        tickets_collection = await self._get_tickets_collection()
        ticket = await tickets_collection.find_one({"_id": ObjectId(ticket_id)})
        if ticket:
            ticket["_id"] = str(ticket["_id"])
        return ticket
    
    async def get_user_tickets(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all tickets for a user"""
        tickets_collection = await self._get_tickets_collection()
        cursor = tickets_collection.find({"user_id": user_id}).sort("created_at", -1)
        tickets = await cursor.to_list(length=100)
        for ticket in tickets:
            ticket["_id"] = str(ticket["_id"])
        return tickets
    
    async def get_all_tickets(self, tier: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all tickets with optional filters"""
        tickets_collection = await self._get_tickets_collection()
        
        query = {}
        if tier:
            query["tier"] = tier
        if status:
            query["status"] = status
        
        cursor = tickets_collection.find(query).sort("priority", -1).sort("created_at", -1)
        tickets = await cursor.to_list(length=500)
        for ticket in tickets:
            ticket["_id"] = str(ticket["_id"])
        return tickets
    
    async def update_ticket(
        self,
        ticket_id: str,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        assigned_to: Optional[str] = None,
        assigned_agent_name: Optional[str] = None,
        resolution_notes: Optional[str] = None,
        resolved_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update ticket status and details"""
        tickets_collection = await self._get_tickets_collection()
        
        update_data = {"updated_at": datetime.utcnow()}
        
        if status:
            update_data["status"] = status
            if status == "resolved":
                update_data["resolved_at"] = datetime.utcnow()
                if resolved_by:
                    update_data["resolved_by"] = resolved_by
        
        if priority:
            update_data["priority"] = priority
        
        if assigned_to:
            update_data["assigned_to"] = assigned_to
            update_data["assigned_at"] = datetime.utcnow()
            if assigned_agent_name:
                update_data["assigned_agent_name"] = assigned_agent_name
        
        if resolution_notes:
            update_data["resolution_notes"] = resolution_notes
        
        await tickets_collection.update_one(
            {"_id": ObjectId(ticket_id)},
            {"$set": update_data}
        )
        
        ticket = await tickets_collection.find_one({"_id": ObjectId(ticket_id)})
        ticket["_id"] = str(ticket["_id"])
        return ticket
    
    async def escalate_to_human(self, ticket_id: str, reason: str) -> Dict[str, Any]:
        """Manually escalate ticket to human agent"""
        tickets_collection = await self._get_tickets_collection()
        
        update_data = {
            "tier": "human",
            "priority": "high",
            "auto_escalated": False,  # Manual escalation
            "escalation_reason": reason,
            "escalated_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await tickets_collection.update_one(
            {"_id": ObjectId(ticket_id)},
            {"$set": update_data}
        )
        
        ticket = await tickets_collection.find_one({"_id": ObjectId(ticket_id)})
        ticket["_id"] = str(ticket["_id"])
        return ticket
    
    async def add_message(
        self,
        ticket_id: str,
        sender_id: str,
        sender_name: str,
        sender_type: str,
        message: str,
        attachments: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Add message to ticket conversation"""
        messages_collection = await self._get_messages_collection()
        
        message_data = {
            "ticket_id": ticket_id,
            "sender_id": sender_id,
            "sender_name": sender_name,
            "sender_type": sender_type,
            "message": message,
            "attachments": attachments or [],
            "created_at": datetime.utcnow()
        }
        
        result = await messages_collection.insert_one(message_data)
        msg = await messages_collection.find_one({"_id": result.inserted_id})
        msg["_id"] = str(msg["_id"])
        
        # Update ticket timestamp
        tickets_collection = await self._get_tickets_collection()
        await tickets_collection.update_one(
            {"_id": ObjectId(ticket_id)},
            {"$set": {"updated_at": datetime.utcnow()}}
        )
        
        return msg
    
    async def _freeze_escrow(self, payment_id: str, reason: str) -> bool:
        """Freeze escrow payment when complaint is filed"""
        try:
            payments_collection = await self._get_payments_collection()
            
            update_result = await payments_collection.update_one(
                {"_id": ObjectId(payment_id)},
                {
                    "$set": {
                        "escrow_frozen": True,
                        "escrow_frozen_reason": reason,
                        "escrow_frozen_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            return update_result.modified_count > 0
        except Exception as e:
            print(f"Error freezing escrow: {e}")
            return False
    
    async def _unfreeze_escrow(self, payment_id: str) -> bool:
        """Unfreeze escrow after complaint resolution"""
        try:
            payments_collection = await self._get_payments_collection()
            
            update_result = await payments_collection.update_one(
                {"_id": ObjectId(payment_id)},
                {
                    "$set": {
                        "escrow_frozen": False,
                        "escrow_unfrozen_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            return update_result.modified_count > 0
        except Exception as e:
            print(f"Error unfreezing escrow: {e}")
            return False
    
    async def perform_ai_review(self, ticket_id: str) -> Dict[str, Any]:
        """AI review of complaint/dispute"""
        tickets_collection = await self._get_tickets_collection()
        ticket = await tickets_collection.find_one({"_id": ObjectId(ticket_id)})
        
        if not ticket or not ticket.get("is_complaint"):
            raise ValueError("Invalid ticket or not a complaint")
        
        # Simple AI logic - can be enhanced with actual ML model
        category = ticket["category"]
        evidence_count = len(ticket.get("evidence_urls", []))
        description = ticket["description"].lower()
        
        # Decision logic
        if evidence_count >= 2:
            result = "favor_customer"
            confidence = 0.8
            notes = "Multiple pieces of evidence support customer claim"
        elif "late" in description and category == "complaint_late_arrival":
            result = "favor_customer"
            confidence = 0.7
            notes = "Late arrival complaint with supporting description"
        elif "rude" in description or "behave" in description:
            result = "needs_human"
            confidence = 0.5
            notes = "Behavior issues require human judgment"
        else:
            result = "needs_human"
            confidence = 0.6
            notes = "Insufficient evidence for automatic decision"
        
        # Update ticket with AI review
        await tickets_collection.update_one(
            {"_id": ObjectId(ticket_id)},
            {
                "$set": {
                    "ai_review_completed": True,
                    "ai_review_result": result,
                    "ai_review_confidence": confidence,
                    "ai_review_notes": notes,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        updated_ticket = await tickets_collection.find_one({"_id": ObjectId(ticket_id)})
        updated_ticket["_id"] = str(updated_ticket["_id"])
        return updated_ticket
    
    async def admin_review_complaint(
        self,
        ticket_id: str,
        review_result: str,
        review_notes: str,
        refund_amount: Optional[float] = None,
        penalty_amount: Optional[float] = None,
        admin_id: str = None
    ) -> Dict[str, Any]:
        """Admin reviews and resolves complaint/dispute"""
        tickets_collection = await self._get_tickets_collection()
        ticket = await tickets_collection.find_one({"_id": ObjectId(ticket_id)})
        
        if not ticket or not ticket.get("is_complaint"):
            raise ValueError("Invalid ticket or not a complaint")
        
        # Determine resolution action
        resolution_action = review_result
        
        # Update ticket
        update_data = {
            "admin_review_completed": True,
            "admin_review_result": review_result,
            "admin_review_notes": review_notes,
            "resolution_action": resolution_action,
            "status": "resolved",
            "resolved_at": datetime.utcnow(),
            "resolved_by": admin_id,
            "updated_at": datetime.utcnow()
        }
        
        if refund_amount:
            update_data["refund_amount"] = refund_amount
        
        if penalty_amount:
            update_data["penalty_amount"] = penalty_amount
        
        await tickets_collection.update_one(
            {"_id": ObjectId(ticket_id)},
            {"$set": update_data}
        )
        
        # Process the resolution
        payment_id = ticket.get("payment_id_affected")
        if payment_id:
            if review_result == "refund_full" or review_result == "refund_partial":
                # Initiate refund
                await self._process_refund(payment_id, refund_amount or 0, ticket_id)
            elif review_result == "penalty_provider":
                # Apply penalty to provider
                await self._apply_penalty(ticket["complaint_against_id"], penalty_amount or 0, ticket_id)
            
            # Unfreeze escrow
            await self._unfreeze_escrow(payment_id)
        
        updated_ticket = await tickets_collection.find_one({"_id": ObjectId(ticket_id)})
        updated_ticket["_id"] = str(updated_ticket["_id"])
        return updated_ticket
    
    async def _process_refund(self, payment_id: str, refund_amount: float, reason: str) -> bool:
        """Process refund for complaint resolution"""
        try:
            payments_collection = await self._get_payments_collection()
            
            await payments_collection.update_one(
                {"_id": ObjectId(payment_id)},
                {
                    "$set": {
                        "status": "refunded",
                        "refund_amount": refund_amount,
                        "refund_reason": f"Complaint resolution: {reason}",
                        "refunded_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            return True
        except Exception as e:
            print(f"Error processing refund: {e}")
            return False
    
    async def _apply_penalty(self, provider_id: str, penalty_amount: float, reason: str) -> bool:
        """Apply penalty to provider for complaint"""
        try:
            users_collection = await get_collection("users")
            
            # Add penalty record (could be stored in a penalties collection)
            await users_collection.update_one(
                {"_id": ObjectId(provider_id)},
                {
                    "$inc": {"penalty_count": 1, "total_penalties": penalty_amount},
                    "$push": {
                        "penalties": {
                            "amount": penalty_amount,
                            "reason": reason,
                            "date": datetime.utcnow()
                        }
                    },
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            return True
        except Exception as e:
            print(f"Error applying penalty: {e}")
            return False
    
    async def get_ticket_messages(self, ticket_id: str) -> List[Dict[str, Any]]:
        """Get all messages for a ticket"""
        messages_collection = await self._get_messages_collection()
        cursor = messages_collection.find({"ticket_id": ticket_id}).sort("created_at", 1)
        messages = await cursor.to_list(length=500)
        for msg in messages:
            msg["_id"] = str(msg["_id"])
        return messages
    
    async def rate_ticket(self, ticket_id: str, rating: int, feedback: Optional[str] = None) -> Dict[str, Any]:
        """Customer rates resolved ticket"""
        tickets_collection = await self._get_tickets_collection()
        
        update_data = {
            "customer_rating": rating,
            "customer_feedback": feedback,
            "updated_at": datetime.utcnow()
        }
        
        await tickets_collection.update_one(
            {"_id": ObjectId(ticket_id)},
            {"$set": update_data}
        )
        
        ticket = await tickets_collection.find_one({"_id": ObjectId(ticket_id)})
        ticket["_id"] = str(ticket["_id"])
        return ticket
    
    async def get_statistics(self) -> Dict[str, Any]:
        """Get support statistics for admin dashboard"""
        tickets_collection = await self._get_tickets_collection()
        
        total_tickets = await tickets_collection.count_documents({})
        open_tickets = await tickets_collection.count_documents({"status": "open"})
        in_progress = await tickets_collection.count_documents({"status": "in_progress"})
        resolved = await tickets_collection.count_documents({"status": "resolved"})
        
        ai_handled = await tickets_collection.count_documents({"tier": "ai"})
        human_escalated = await tickets_collection.count_documents({"tier": "human"})
        auto_escalated = await tickets_collection.count_documents({"auto_escalated": True})
        
        critical = await tickets_collection.count_documents({"priority": "critical"})
        high = await tickets_collection.count_documents({"priority": "high"})
        
        return {
            "total_tickets": total_tickets,
            "open_tickets": open_tickets,
            "in_progress": in_progress,
            "resolved_tickets": resolved,
            "ai_handled": ai_handled,
            "human_escalated": human_escalated,
            "auto_escalated": auto_escalated,
            "critical_priority": critical,
            "high_priority": high
        }


# Create singleton instance
support_service = SupportService()
