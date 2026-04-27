from app.database import get_collection
from app.models.favorite_provider import FavoriteProvider, SortBy, FilterOptions, ProviderSearchRequest
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from bson import ObjectId
import logging
import math

logger = logging.getLogger(__name__)


class ProviderSelectionService:
    """Service for provider selection, filtering, sorting, and favorites"""
    
    def __init__(self):
        self.favorites_collection_name = "favorite_providers"
        self.users_collection_name = "users"
        self.bookings_collection_name = "bookings"
        self.services_collection_name = "services"
    
    async def add_favorite_provider(
        self, 
        customer_id: str, 
        provider_id: str, 
        notes: Optional[str] = None
    ) -> Dict:
        """Add a provider to customer's favorites"""
        try:
            favorites_collection = await get_collection(self.favorites_collection_name)
            
            # Check if already favorited
            existing = await favorites_collection.find_one({
                "customer_id": customer_id,
                "provider_id": provider_id
            })
            
            if existing:
                return {
                    "success": False,
                    "message": "Provider already in favorites",
                    "favorite_id": str(existing["_id"])
                }
            
            # Get booking history with this provider
            bookings_collection = await get_collection(self.bookings_collection_name)
            booking_history = await bookings_collection.find({
                "customer_id": customer_id,
                "tasker_id": provider_id,
                "status": {"$in": ["completed", "confirmed"]}
            }).to_list(length=None)
            
            total_bookings = len(booking_history)
            last_booked = max([b.get("created_at") for b in booking_history], default=None)
            
            favorite = FavoriteProvider(
                customer_id=customer_id,
                provider_id=provider_id,
                notes=notes,
                total_bookings=total_bookings,
                last_booked_at=last_booked,
                added_at=datetime.utcnow()
            )
            
            result = await favorites_collection.insert_one(
                favorite.dict(by_alias=True, exclude={"id"})
            )
            
            return {
                "success": True,
                "message": "Provider added to favorites",
                "favorite_id": str(result.inserted_id)
            }
            
        except Exception as e:
            logger.error(f"Error adding favorite provider: {e}")
            raise
    
    async def remove_favorite_provider(self, customer_id: str, provider_id: str) -> Dict:
        """Remove a provider from favorites"""
        try:
            favorites_collection = await get_collection(self.favorites_collection_name)
            
            result = await favorites_collection.delete_one({
                "customer_id": customer_id,
                "provider_id": provider_id
            })
            
            if result.deleted_count > 0:
                return {"success": True, "message": "Provider removed from favorites"}
            else:
                return {"success": False, "message": "Favorite not found"}
                
        except Exception as e:
            logger.error(f"Error removing favorite provider: {e}")
            raise
    
    async def get_favorite_providers(self, customer_id: str) -> List[Dict]:
        """Get all favorite providers for a customer with full details"""
        try:
            favorites_collection = await get_collection(self.favorites_collection_name)
            users_collection = await get_collection(self.users_collection_name)
            
            favorites = await favorites_collection.find(
                {"customer_id": customer_id}
            ).to_list(length=None)
            
            # Enrich with provider details
            enriched_favorites = []
            for fav in favorites:
                provider = await users_collection.find_one(
                    {"_id": ObjectId(fav["provider_id"])}
                )
                
                if provider:
                    enriched_favorites.append({
                        "favorite_id": str(fav["_id"]),
                        "provider": {
                            "id": str(provider["_id"]),
                            "name": provider.get("name"),
                            "email": provider.get("email"),
                            "rating": provider.get("rating", 0),
                            "total_jobs": provider.get("total_jobs", 0),
                            "professional_badge": provider.get("professional_badge", False),
                            "skills": provider.get("skills", []),
                            "location": provider.get("address"),
                            "profile_picture": provider.get("profile_picture"),
                            "gender": provider.get("gender")
                        },
                        "notes": fav.get("notes"),
                        "total_bookings": fav.get("total_bookings", 0),
                        "last_booked_at": fav.get("last_booked_at"),
                        "added_at": fav.get("added_at")
                    })
            
            return enriched_favorites
            
        except Exception as e:
            logger.error(f"Error getting favorite providers: {e}")
            raise
    
    async def is_favorite(self, customer_id: str, provider_id: str) -> bool:
        """Check if a provider is in customer's favorites"""
        try:
            favorites_collection = await get_collection(self.favorites_collection_name)
            
            favorite = await favorites_collection.find_one({
                "customer_id": customer_id,
                "provider_id": provider_id
            })
            
            return favorite is not None
            
        except Exception as e:
            logger.error(f"Error checking favorite status: {e}")
            return False
    
    def calculate_distance(
        self, 
        lat1: float, 
        lon1: float, 
        lat2: float, 
        lon2: float
    ) -> float:
        """Calculate distance between two coordinates in km using Haversine formula"""
        R = 6371  # Earth's radius in km
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = (math.sin(delta_lat / 2) ** 2 +
             math.cos(lat1_rad) * math.cos(lat2_rad) *
             math.sin(delta_lon / 2) ** 2)
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c
    
    async def search_and_filter_providers(
        self, 
        customer_id: str, 
        search_request: ProviderSearchRequest
    ) -> Tuple[List[Dict], int]:
        """Search and filter providers with sorting"""
        try:
            users_collection = await get_collection(self.users_collection_name)
            bookings_collection = await get_collection(self.bookings_collection_name)
            favorites_collection = await get_collection(self.favorites_collection_name)
            services_collection = await get_collection(self.services_collection_name)
            
            # Build query
            query = {"roles": "tasker"}
            
            # Apply filters
            if search_request.filters:
                filters = search_request.filters
                
                if filters.min_rating is not None:
                    query["rating"] = {"$gte": filters.min_rating}
                
                if filters.verified_only:
                    query["professional_badge"] = True
                
                if filters.categories:
                    query["skills"] = {"$in": filters.categories}
                
                if filters.gender_preference:
                    query["gender"] = filters.gender_preference
            
            # Get providers
            providers = await users_collection.find(query).to_list(length=None)
            
            # Get favorites list
            favorites = await favorites_collection.find(
                {"customer_id": customer_id}
            ).to_list(length=None)
            favorite_ids = {fav["provider_id"] for fav in favorites}
            
            # Get previously hired providers
            previous_bookings = await bookings_collection.find({
                "customer_id": customer_id,
                "status": {"$in": ["completed", "confirmed"]}
            }).to_list(length=None)
            previously_hired_ids = {booking["tasker_id"] for booking in previous_bookings}
            
            # Enrich provider data
            enriched_providers = []
            for provider in providers:
                provider_id = str(provider["_id"])
                
                # Apply favorites filter
                if search_request.filters and search_request.filters.favorites_only:
                    if provider_id not in favorite_ids:
                        continue
                
                # Apply previously hired filter
                if search_request.filters and search_request.filters.previously_hired:
                    if provider_id not in previously_hired_ids:
                        continue
                
                # Calculate distance if coordinates provided
                distance = None
                provider_lat = None
                provider_lng = None
                
                # Get provider coordinates from service_location
                if provider.get("service_location") and provider["service_location"].get("coordinates"):
                    provider_lat = provider["service_location"]["coordinates"].get("lat")
                    provider_lng = provider["service_location"]["coordinates"].get("lng")
                
                if (search_request.latitude and search_request.longitude and
                    provider_lat and provider_lng):
                    distance = self.calculate_distance(
                        search_request.latitude,
                        search_request.longitude,
                        provider_lat,
                        provider_lng
                    )
                    
                    # Apply distance filter
                    if (search_request.filters and 
                        search_request.filters.max_distance is not None and
                        distance > search_request.filters.max_distance):
                        continue
                
                # Get provider's services
                provider_services = await services_collection.find({
                    "tasker_id": provider_id,
                    "is_active": True
                }).to_list(length=None)
                
                # Apply service filter if specified
                if search_request.filters and search_request.filters.service_id:
                    has_service = any(str(s["_id"]) == search_request.filters.service_id for s in provider_services)
                    if not has_service:
                        continue
                
                # Calculate booking count with customer
                customer_bookings = [b for b in previous_bookings if b["tasker_id"] == provider_id]
                
                enriched_provider = {
                    "id": provider_id,
                    "name": provider.get("name"),
                    "email": provider.get("email"),
                    "phone": provider.get("phone"),
                    "bio": provider.get("bio"),
                    "rating": provider.get("rating", 0),
                    "total_jobs": provider.get("total_jobs", 0),
                    "professional_badge": provider.get("professional_badge", False),
                    "verified": provider.get("professional_badge", False),
                    "skills": provider.get("skills", []),
                    "location": provider.get("address"),
                    "service_location": provider.get("service_location"),
                    "profile_picture": provider.get("profile_picture"),
                    "gender": provider.get("gender"),
                    "distance": distance,
                    "is_favorite": provider_id in favorite_ids,
                    "previously_hired": provider_id in previously_hired_ids,
                    "bookings_with_customer": len(customer_bookings),
                    "last_booked_at": max([b.get("created_at") for b in customer_bookings], default=None),
                    "services": [{
                        "id": str(s["_id"]),
                        "title": s.get("title"),
                        "category": s.get("category"),
                        "price": s.get("price"),
                        "price_unit": s.get("price_unit")
                    } for s in provider_services],
                    "availability_score": provider.get("total_jobs", 0)  # Higher jobs = more available
                }
                
                enriched_providers.append(enriched_provider)
            
            # Sort providers
            enriched_providers = self._sort_providers(enriched_providers, search_request.sort_by)
            
            # Pagination
            total_count = len(enriched_providers)
            start_idx = (search_request.page - 1) * search_request.limit
            end_idx = start_idx + search_request.limit
            paginated_providers = enriched_providers[start_idx:end_idx]
            
            return paginated_providers, total_count
            
        except Exception as e:
            logger.error(f"Error searching providers: {e}")
            raise
    
    def _sort_providers(self, providers: List[Dict], sort_by: SortBy) -> List[Dict]:
        """Sort providers based on sort option"""
        if sort_by == SortBy.RATING_HIGH:
            return sorted(providers, key=lambda p: p["rating"], reverse=True)
        elif sort_by == SortBy.RATING_LOW:
            return sorted(providers, key=lambda p: p["rating"])
        elif sort_by == SortBy.DISTANCE_NEAR:
            return sorted(providers, key=lambda p: p["distance"] or float('inf'))
        elif sort_by == SortBy.DISTANCE_FAR:
            return sorted(providers, key=lambda p: p["distance"] or 0, reverse=True)
        elif sort_by == SortBy.MOST_BOOKED:
            return sorted(providers, key=lambda p: p["total_jobs"], reverse=True)
        elif sort_by == SortBy.RECENTLY_HIRED:
            return sorted(
                providers, 
                key=lambda p: p["last_booked_at"] or datetime.min, 
                reverse=True
            )
        elif sort_by == SortBy.AVAILABILITY_FAST:
            return sorted(providers, key=lambda p: p["availability_score"], reverse=True)
        else:
            return providers
    
    async def quick_rebook(
        self, 
        customer_id: str, 
        provider_id: str,
        service_id: str,
        booking_data: Dict
    ) -> Dict:
        """Quick rebook with a favorite provider using previous preferences"""
        try:
            bookings_collection = await get_collection(self.bookings_collection_name)
            
            # Get last booking with this provider
            last_booking = await bookings_collection.find_one(
                {
                    "customer_id": customer_id,
                    "tasker_id": provider_id,
                    "status": {"$in": ["completed", "confirmed"]}
                },
                sort=[("created_at", -1)]
            )
            
            # Use previous preferences if requested
            if booking_data.get("use_previous_preferences") and last_booking:
                booking_data["gender_preference"] = last_booking.get("gender_preference")
                booking_data["household_type"] = last_booking.get("household_type")
                if not booking_data.get("notes"):
                    booking_data["notes"] = last_booking.get("additional_notes", "")
            
            # Update favorite provider stats
            favorites_collection = await get_collection(self.favorites_collection_name)
            await favorites_collection.update_one(
                {
                    "customer_id": customer_id,
                    "provider_id": provider_id
                },
                {
                    "$set": {"last_booked_at": datetime.utcnow()},
                    "$inc": {"total_bookings": 1}
                }
            )
            
            return {
                "success": True,
                "message": "Quick rebook successful",
                "booking_data": booking_data
            }
            
        except Exception as e:
            logger.error(f"Error in quick rebook: {e}")
            raise
