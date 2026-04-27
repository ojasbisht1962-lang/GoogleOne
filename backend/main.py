from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.routes import auth, users, services, bookings, chat, notifications, amc, admin, gender_preference, provider_selection, payments, support, badges, wallet, document_verification, addresses
from app.routes import admin_analytics, admin_users, admin_bookings
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app with increased body size limit for document uploads
app = FastAPI(
    title="TrustedHands API",
    description="API for TrustedHands - Freelance/Gig Services Marketplace",
    version="1.0.0"
)

# Add middleware to handle large request bodies (15MB limit for base64 encoded images)
@app.middleware("http")
async def add_cors_and_logging(request: Request, call_next):
    # Log all incoming requests
    logger.info(f"Incoming request: {request.method} {request.url.path}")
    try:
        response = await call_next(request)
        logger.info(f"Response status: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"Request failed: {str(e)}")
        raise

# Add exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error on {request.url}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )

# Log CORS configuration
logger.info(f"CORS Origins: {settings.origins_list}")

# CORS middleware - Configure before other middleware
# Using allow_origin_regex as a more permissive approach
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins temporarily to fix the issue
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Event handlers
@app.on_event("startup")
async def startup_db_client():
    """Connect to MongoDB on startup"""
    await connect_to_mongo()
    
    # Setup indexes for optimal performance
    try:
        from app.database import get_collection
        users_collection = await get_collection("users")
        
        logger.info("Setting up MongoDB indexes...")
        
        # 1. Multikey index on roles array for fast filtering
        await users_collection.create_index("roles")
        logger.info("✓ Created index on 'roles' array")
        
        # 2. Compound index on role + is_blocked
        await users_collection.create_index([("role", 1), ("is_blocked", 1)])
        logger.info("✓ Created compound index on 'role' + 'is_blocked'")
        
        # 3. Compound index on roles array + is_blocked
        await users_collection.create_index([("roles", 1), ("is_blocked", 1)])
        logger.info("✓ Created compound index on 'roles' + 'is_blocked'")
        
        # 4. Unique index on email
        try:
            await users_collection.create_index("email", unique=True)
            logger.info("✓ Created unique index on 'email'")
        except Exception as e:
            logger.info(f"Email index already exists: {e}")
        
        # 5. Sparse unique index on google_id (allows multiple null values for email users)
        try:
            await users_collection.create_index("google_id", unique=True, sparse=True)
            logger.info("✓ Created sparse unique index on 'google_id'")
        except Exception as e:
            logger.info(f"Google ID index already exists: {e}")
        
        # 6. Compound index for admin filtering
        await users_collection.create_index([
            ("roles", 1), 
            ("tasker_type", 1), 
            ("verification_status", 1)
        ])
        logger.info("✓ Created compound index for admin filtering")
        
        # 7. Index on verification_status for admin queries
        await users_collection.create_index("verification_status")
        logger.info("✓ Created index on 'verification_status'")
        
        logger.info("✅ All MongoDB indexes created successfully!")
        
        # Setup indexes for other collections
        logger.info("Setting up indexes for other collections...")
        
        # Services collection
        services_collection = await get_collection("services")
        await services_collection.create_index("tasker_id")
        await services_collection.create_index([("category", 1), ("is_active", 1)])
        await services_collection.create_index("is_active")
        logger.info("✓ Created indexes on 'services' collection")
        
        # Bookings collection
        bookings_collection = await get_collection("bookings")
        await bookings_collection.create_index("customer_id")
        await bookings_collection.create_index("tasker_id")
        await bookings_collection.create_index([("status", 1), ("scheduled_date", 1)])
        await bookings_collection.create_index("service_id")
        logger.info("✓ Created indexes on 'bookings' collection")
        
        # Notifications collection
        notifications_collection = await get_collection("notifications")
        await notifications_collection.create_index([("user_id", 1), ("is_read", 1)])
        await notifications_collection.create_index([("user_id", 1), ("created_at", -1)])
        logger.info("✓ Created indexes on 'notifications' collection")
        
        # Chats collection
        chats_collection = await get_collection("chats")
        await chats_collection.create_index([("customer_id", 1), ("tasker_id", 1)])
        await chats_collection.create_index("customer_id")
        await chats_collection.create_index("tasker_id")
        logger.info("✓ Created indexes on 'chats' collection")
        
        # AMC collection
        amc_collection = await get_collection("amc")
        await amc_collection.create_index("customer_id")
        await amc_collection.create_index("status")
        logger.info("✓ Created indexes on 'amc' collection")
        
        # Badge applications collection
        badge_applications_collection = await get_collection("badge_applications")
        await badge_applications_collection.create_index("tasker_id")
        await badge_applications_collection.create_index("status")
        await badge_applications_collection.create_index([("tasker_id", 1), ("badge_type", 1)])
        logger.info("✓ Created indexes on 'badge_applications' collection")
        
        logger.info("✅ All collection indexes created successfully!")
        
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")
        # Don't fail startup if indexes already exist

@app.on_event("shutdown")
async def shutdown_db_client():
    """Close MongoDB connection on shutdown"""
    await close_mongo_connection()


# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(services.router)
app.include_router(bookings.router)
app.include_router(chat.router)
app.include_router(notifications.router)
app.include_router(amc.router)
app.include_router(admin.router)
app.include_router(gender_preference.router)
app.include_router(provider_selection.router)
app.include_router(payments.router)
app.include_router(support.router)
app.include_router(badges.router)
app.include_router(wallet.router)
app.include_router(document_verification.router)
app.include_router(addresses.router)
# New admin routes
app.include_router(admin_analytics.router)
app.include_router(admin_users.router)
app.include_router(admin_bookings.router)
from app.routes.chatbot import router as chatbot_router
app.include_router(chatbot_router)
from app.routes.contact_message import router as contact_message_router
app.include_router(contact_message_router)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to TrustedHands API",
        "version": "1.0.0",
        "docs": "/docs",
        "cors_origins": settings.origins_list
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "cors_configured": True,
        "allowed_origins": settings.origins_list
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)

