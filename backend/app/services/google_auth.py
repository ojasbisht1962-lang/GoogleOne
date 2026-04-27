from google.oauth2 import id_token
from google.auth.transport import requests
from app.config import settings
import httpx

async def verify_google_token(token: str):
    """Verify Google OAuth token"""
    try:
        idinfo = id_token.verify_oauth2_token(
            token, 
            requests.Request(), 
            settings.google_client_id
        )
        
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')
        
        return {
            "google_id": idinfo['sub'],
            "email": idinfo['email'],
            "name": idinfo.get('name', ''),
            "profile_picture": idinfo.get('picture', '')
        }
    except ValueError as e:
        return None

async def get_google_user_info(access_token: str):
    """Get user info from Google using access token"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            if response.status_code == 200:
                user_info = response.json()
                return {
                    "google_id": user_info['id'],
                    "email": user_info['email'],
                    "name": user_info.get('name', ''),
                    "profile_picture": user_info.get('picture', '')
                }
        return None
    except Exception as e:
        print(f"Error getting Google user info: {e}")
        return None
