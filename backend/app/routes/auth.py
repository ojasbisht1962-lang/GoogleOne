from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from app.database import get_collection
from app.models.user import User, UserRole
from app.utils.auth import create_access_token
from app.middleware.auth import get_current_user
from datetime import datetime, timedelta
from bson import ObjectId
from app.services.google_auth import get_google_user_info
from app.config import settings
import bcrypt

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Email/password authentication has been disabled
# Only Google OAuth and Guest login are supported

class GoogleLoginRequest(BaseModel):
    token: str
    role: UserRole

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

@router.post("/google-login", response_model=LoginResponse)
async def google_login(request: GoogleLoginRequest):
    from app.services.google_auth import get_google_user_info
    google_user_info = await get_google_user_info(request.token)
    if not google_user_info:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    
    # Prevent unauthorized users from logging in as superadmin
    if request.role == UserRole.SUPERADMIN:
        user_email = google_user_info["email"].lower()
        if user_email not in settings.admin_emails_list:
            raise HTTPException(
                status_code=403, 
                detail="Access denied. You are not authorized to access the admin panel."
            )
    users_collection = await get_collection("users")
    existing_user = await users_collection.find_one({
        "$or": [
            {"google_id": google_user_info["google_id"]},
            {"email": google_user_info["email"]}
        ]
    })
    if existing_user:
        if existing_user.get("is_blocked", False):
            raise HTTPException(status_code=403, detail="Your account has been blocked. Please contact support.")
        
        def normalize_role(role_value):
            if isinstance(role_value, UserRole):
                return role_value.value
            if isinstance(role_value, str):
                return role_value
            return None

        requested_role = request.role.value
        current_role = normalize_role(existing_user.get("role"))
        stored_roles = existing_user.get("roles", []) or []
        normalized_roles = {
            role
            for role in (normalize_role(r) for r in stored_roles)
            if role in {UserRole.CUSTOMER.value, UserRole.TASKER.value, UserRole.SUPERADMIN.value}
        }
        if current_role in {UserRole.CUSTOMER.value, UserRole.TASKER.value, UserRole.SUPERADMIN.value}:
            normalized_roles.add(current_role)

        # Keep the role selector deterministic: activate exactly the role the user selected.
        normalized_roles.add(requested_role)

        update_operations = {
            "$set": {
                "updated_at": datetime.utcnow(),
                "name": google_user_info["name"],
                "profile_picture": google_user_info.get("profile_picture", ""),
                "role": requested_role,
                "roles": sorted(normalized_roles)
            }
        }
        
        await users_collection.update_one({"_id": existing_user["_id"]}, update_operations)
        user_id = str(existing_user["_id"])
        user_data = await users_collection.find_one({"_id": existing_user["_id"]})
    else:
        new_user = User(
            google_id=google_user_info["google_id"],
            email=google_user_info["email"],
            name=google_user_info["name"],
            profile_picture=google_user_info.get("profile_picture", ""),
            role=request.role,
            roles=[request.role.value],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        result = await users_collection.insert_one(new_user.dict(by_alias=True, exclude={"id"}))
        user_id = str(result.inserted_id)
        user_data = await users_collection.find_one({"_id": result.inserted_id})
    access_token = create_access_token(
        data={"sub": user_id, "role": user_data["role"]},
        expires_delta=timedelta(minutes=30)
    )
    user_data["_id"] = str(user_data["_id"])
    return LoginResponse(access_token=access_token, user=user_data)

# Email/password authentication endpoints have been disabled
# Only Google OAuth authentication is supported for security

@router.post("/refresh-token")
async def refresh_token(current_user: dict = Depends(lambda: None)):
    pass

# Role switching disabled for security
# Users must register separately for different roles
# @router.post("/switch-role")
# async def switch_role(role: UserRole, current_user: dict = Depends(get_current_user)):
#     raise HTTPException(status_code=403, detail="Role switching has been disabled for security reasons. Please register separately for different roles.")

