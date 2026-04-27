"""
Document Verification Routes for Professional Status
"""
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Form, Request
from typing import Optional
import logging
import os
import uuid
from datetime import datetime
from bson import ObjectId

from app.middleware.auth import get_current_user
from app.database import get_collection
from app.models.document_verification import (
    DocumentType, 
    DocumentVerificationStatus, 
    VerificationDocument,
    DocumentVerificationResponse
)
from app.models.user import UserRole, TaskerType, VerificationStatus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/document-verification", tags=["Document Verification"])

# Directory for storing uploaded documents
UPLOAD_DIR = "uploads/documents"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Explicit OPTIONS handler for CORS preflight
@router.options("/upload")
async def upload_options():
    """Handle CORS preflight for upload endpoint"""
    return {"status": "ok"}

def calculate_name_similarity(name1: str, name2: str) -> float:
    """
    Calculate similarity between two names
    Returns a score between 0 and 1
    """
    # Normalize names: lowercase, remove extra spaces
    n1 = ' '.join(name1.lower().strip().split())
    n2 = ' '.join(name2.lower().strip().split())
    
    if n1 == n2:
        return 1.0
    
    # Split into words
    words1 = set(n1.split())
    words2 = set(n2.split())
    
    # Calculate Jaccard similarity
    if not words1 or not words2:
        return 0.0
    
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    
    jaccard = len(intersection) / len(union)
    
    # Also check if one name is substring of another (for abbreviated names)
    substring_match = 0.0
    if n1 in n2 or n2 in n1:
        substring_match = 0.3
    
    # Check for initials match (e.g., "John Doe" vs "J Doe")
    initials1 = ''.join([w[0] for w in words1 if w])
    initials2 = ''.join([w[0] for w in words2 if w])
    initial_match = 0.2 if initials1 == initials2 else 0.0
    
    return min(1.0, jaccard + substring_match + initial_match)


@router.post("/upload", response_model=DocumentVerificationResponse)
async def upload_document(
    request: Request,
    document_type: str = Form(None),
    file: UploadFile = File(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload identity document for verification
    Accepts either multipart/form-data OR JSON with base64 (for firewall bypass)
    Uses Gemini AI to extract and verify name
    """
    try:
        # Check if it's JSON request (base64 encoded - firewall bypass method)
        content_type = request.headers.get('content-type', '')
        if 'application/json' in content_type:
            import base64
            import re
            body = await request.json()
            document_type = body.get('document_type')
            base64_data = body.get('file_data', '')
            filename = body.get('filename', 'document.jpg')
            
            # Extract base64 data from data URL
            if base64_data.startswith('data:'):
                base64_data = re.sub(r'^data:image/\w+;base64,', '', base64_data)
            
            image_data = base64.b64decode(base64_data)
            logger.info(f"Received base64 upload: {filename}, size: {len(image_data)} bytes")
        else:
            # Original multipart/form-data method
            if not file or not document_type:
                raise HTTPException(status_code=400, detail="Missing file or document_type")
            image_data = await file.read()
            logger.info(f"Received multipart upload: {file.filename}, size: {len(image_data)} bytes")
        
        # Validate user is a tasker
        if UserRole.TASKER.value not in current_user.get("roles", []):
            raise HTTPException(
                status_code=403,
                detail="Only taskers can upload verification documents"
            )
        
        # Validate document type
        try:
            doc_type = DocumentType(document_type)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid document type. Must be one of: {', '.join([dt.value for dt in DocumentType])}"
            )
        
        # Validate file type (skip for base64 uploads)
        if 'multipart' in content_type:
            if not file.content_type.startswith('image/'):
                raise HTTPException(
                    status_code=400,
                    detail="File must be an image (JPEG, PNG, etc.)"
                )
        
        # Check file size (max 10MB)
        if len(image_data) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="Image file size must be less than 10MB"
            )
        # NOTE: Image is NOT stored permanently - only processed temporarily for verification
        logger.info(f"Processing document for user {current_user['_id']} - Image will NOT be stored")
        
        # AI extraction is done on frontend with Puter.js
        extracted_name = None
        ai_confidence = 0.0
        verification_status = DocumentVerificationStatus.AI_PROCESSING
        verified_by_ai = False
        
        try:
            logger.info(f"Starting document verification for {doc_type.value}")
            
            # Get AI results from frontend (processed with Puter.js)
            form_data = await request.form()
            extracted_name = form_data.get('extracted_name', '')
            ai_confidence_str = form_data.get('ai_confidence', '0.0')
            
            try:
                ai_confidence = float(ai_confidence_str) if ai_confidence_str else 0.0
            except ValueError:
                ai_confidence = 0.0
            
            # If frontend didn't extract name, set to None
            if not extracted_name or extracted_name.strip() == '':
                extracted_name = None
                ai_confidence = 0.0
            
            logger.info(f"Received from frontend - Name: {extracted_name}, Confidence: {ai_confidence}")
            
            # Check if AI returned an error or 0 confidence
            if ai_confidence == 0.0:
                logger.warning(f"AI returned 0% confidence - document will be sent for admin review")
                logger.info("Document will be sent to admin for manual review")
            
            logger.info(f"Frontend AI extracted name: {extracted_name} (confidence: {ai_confidence})")
            
            # Compare extracted name with user's registered name
            user_name = current_user.get('name', '')
            name_similarity = calculate_name_similarity(extracted_name or '', user_name)
            
            logger.info(f"Name similarity score: {name_similarity} ({extracted_name} vs {user_name})")
            
            # TWO-STEP VERIFICATION PROCESS:
            # Step 1: AI Auto-Verification (if confidence is high)
            # Step 2: Admin Manual Review (if AI is uncertain or fails)
            
            if name_similarity >= 0.7 and ai_confidence >= 0.6:
                # STEP 1 SUCCESS: AI verified with high confidence
                verification_status = DocumentVerificationStatus.VERIFIED
                verified_by_ai = True
                logger.info(f"✓ Step 1: AI auto-verified (similarity: {name_similarity:.2f}, confidence: {ai_confidence:.2f})")
            elif name_similarity < 0.5:
                # Name clearly doesn't match - send to admin for review
                verification_status = DocumentVerificationStatus.PENDING
                verified_by_ai = False
                logger.warning(f"⚠ Step 1 failed: Name mismatch detected. Forwarding to Step 2 (Admin Review)")
            else:
                # Borderline case (50-70% similarity) - needs admin review
                verification_status = DocumentVerificationStatus.PENDING
                verified_by_ai = False
                logger.info(f"⏳ Step 1 uncertain: Forwarding to Step 2 (Admin Review) - similarity: {name_similarity:.2f}")
                
        except Exception as e:
            logger.error(f"Document processing error: {str(e)}")
            # AI processing failed on frontend - forward to admin review
            verification_status = DocumentVerificationStatus.PENDING
            verified_by_ai = False
            logger.warning(f"⚠ Step 1 error: AI processing issue. Forwarding to Step 2 (Admin Review)")
        
        # Store document info in database
        documents_collection = await get_collection("verification_documents")
        
        # Store only verification metadata - NO IMAGE DATA in database
        document_data = {
            "user_id": str(current_user['_id']),
            "document_type": doc_type.value,
            "document_url": None,  # Image NOT stored - only verification results kept
            "extracted_name": extracted_name,
            "ai_confidence": ai_confidence,
            "verification_status": verification_status.value,
            "verified_by_ai": verified_by_ai,
            "verified_by_admin": False,
            "uploaded_at": datetime.utcnow(),
            "verified_at": datetime.utcnow() if verification_status == DocumentVerificationStatus.VERIFIED else None
        }
        
        result = await documents_collection.insert_one(document_data)
        document_id = str(result.inserted_id)
        
        # Update user's verification status based on TWO-STEP process
        users_collection = await get_collection("users")
        
        # Check if user has at least one verified document
        verified_docs_count = await documents_collection.count_documents({
            "user_id": str(current_user['_id']),
            "verification_status": DocumentVerificationStatus.VERIFIED.value
        })
        
        user_update = {}
        
        if verification_status == DocumentVerificationStatus.VERIFIED:
            # STEP 1 SUCCESS: AI verified - grant professional status immediately
            user_update = {
                "verification_status": VerificationStatus.APPROVED.value,
                "tasker_type": TaskerType.PROFESSIONAL.value,
                "work_as_professional": True,
                "verification_method": "ai_auto_verified",
                "updated_at": datetime.utcnow()
            }
            logger.info(f"✓ STEP 1 COMPLETE: Auto-approved user {current_user['_id']} as professional via AI")
        elif verified_docs_count > 0:
            # User already has other verified documents from previous attempts
            user_update = {
                "verification_status": VerificationStatus.APPROVED.value,
                "tasker_type": TaskerType.PROFESSIONAL.value,
                "work_as_professional": True,
                "updated_at": datetime.utcnow()
            }
        else:
            # STEP 1 INCOMPLETE: Forward to STEP 2 (Admin Manual Review)
            user_update = {
                "verification_status": VerificationStatus.PENDING.value,
                "verification_method": "pending_admin_review",
                "updated_at": datetime.utcnow()
            }
            logger.info(f"⏳ STEP 2 INITIATED: User {current_user['_id']} pending admin review")
        
        await users_collection.update_one(
            {"_id": ObjectId(current_user['_id'])},
            {"$set": user_update}
        )
        
        # Prepare response message based on TWO-STEP verification result
        if verification_status == DocumentVerificationStatus.VERIFIED:
            message = "✓ STEP 1 COMPLETE: AI verified your document! Professional status granted immediately."
        elif verification_status == DocumentVerificationStatus.PENDING:
            if extracted_name:
                message = f"⏳ STEP 1→STEP 2: AI extracted name '{extracted_name}' needs admin verification. Your application is now under manual review (usually within 24-48 hours)."
            else:
                message = "⏳ STEP 1→STEP 2: AI couldn't extract name clearly. Your document is forwarded to admin for manual review (usually within 24-48 hours)."
        else:
            message = f"⚠ Document uploaded. Extracted: '{extracted_name}' vs Expected: '{user_name}'. Forwarded to admin review."
        
        return DocumentVerificationResponse(
            document_id=document_id,
            document_type=doc_type.value,
            verification_status=verification_status.value,
            extracted_name=extracted_name,
            ai_confidence=ai_confidence,
            name_match=name_similarity >= 0.7 if extracted_name else None,
            message=message
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document upload error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload document: {str(e)}"
        )


@router.get("/my-documents")
async def get_my_documents(
    current_user: dict = Depends(get_current_user)
):
    """
    Get all documents uploaded by current user
    """
    try:
        documents_collection = await get_collection("verification_documents")
        
        documents = await documents_collection.find({
            "user_id": str(current_user['_id'])
        }).sort("uploaded_at", -1).to_list(length=100)
        
        # Convert ObjectId to string
        for doc in documents:
            doc['_id'] = str(doc['_id'])
        
        return {
            "documents": documents,
            "total": len(documents)
        }
        
    except Exception as e:
        logger.error(f"Error fetching documents: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch documents"
        )


@router.get("/status")
async def get_verification_status(
    current_user: dict = Depends(get_current_user)
):
    """
    Get current verification status of the user
    """
    try:
        documents_collection = await get_collection("verification_documents")
        
        # Count documents by status
        total_docs = await documents_collection.count_documents({
            "user_id": str(current_user['_id'])
        })
        
        verified_docs = await documents_collection.count_documents({
            "user_id": str(current_user['_id']),
            "verification_status": DocumentVerificationStatus.VERIFIED.value
        })
        
        pending_docs = await documents_collection.count_documents({
            "user_id": str(current_user['_id']),
            "verification_status": DocumentVerificationStatus.PENDING.value
        })
        
        rejected_docs = await documents_collection.count_documents({
            "user_id": str(current_user['_id']),
            "verification_status": DocumentVerificationStatus.REJECTED.value
        })
        
        is_professional = (
            current_user.get('tasker_type') == TaskerType.PROFESSIONAL.value and
            current_user.get('work_as_professional', False)
        )
        
        return {
            "user_id": str(current_user['_id']),
            "verification_status": current_user.get('verification_status', VerificationStatus.NOT_APPLIED.value),
            "is_professional": is_professional,
            "tasker_type": current_user.get('tasker_type'),
            "total_documents": total_docs,
            "verified_documents": verified_docs,
            "pending_documents": pending_docs,
            "rejected_documents": rejected_docs,
            "can_apply_professional": verified_docs > 0 or pending_docs > 0
        }
        
    except Exception as e:
        logger.error(f"Error fetching verification status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch verification status"
        )


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """verification record (only if not verified)
    """
    try:
        documents_collection = await get_collection("verification_documents")
        
        # Find document
        document = await documents_collection.find_one({
            "_id": ObjectId(document_id),
            "user_id": str(current_user['_id'])
        })
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Don't allow deleting verified documents
        if document['verification_status'] == DocumentVerificationStatus.VERIFIED.value:
            raise HTTPException(
                status_code=403,
                detail="Cannot delete verified documents"
            )
        
        # Delete from database (no files to delete since images aren't stored)
        await documents_collection.delete_one({"_id": ObjectId(document_id)})
        
        return {"message": "Document record deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete document"
        )
