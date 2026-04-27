"""
AI Service for analyzing images using Google Gemini API
"""
import os
import json
import requests
import base64
import logging
from typing import Dict, Optional
from io import BytesIO
from PIL import Image
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        # Use Gemini API for server-side AI (Puter.js is client-side only)
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        
        if not self.gemini_api_key:
            logger.error("GEMINI_API_KEY not found in environment variables!")
            logger.error("AI document verification will not work without API key.")
            logger.error("Please set GEMINI_API_KEY in your environment or .env file")
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        # Using Gemini 2.0 Flash for fast document processing
        self.gemini_api_url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-exp:generateContent?key={self.gemini_api_key}"
        logger.info(f"AI Service initialized with Gemini API")
        logger.info(f"API Key present: {self.gemini_api_key[:10]}...")
    
    async def analyze_issue_image(self, image_data: bytes) -> Dict[str, any]:
        """
        Analyze an image to determine the type of service/worker needed
        
        Args:
            image_data: Image bytes
            
        Returns:
            Dictionary with suggested category and confidence
        """
        try:
            # Convert image to base64
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            # Create a detailed prompt for the AI
            prompt = """
            Analyze this image carefully and determine what type of home service or maintenance issue it shows.
            
            Based on the image, classify the issue into ONE of these categories:
            - electrician: Electrical issues, wiring, switches, outlets, electrical appliances
            - plumber: Plumbing issues, water leaks, pipes, taps, drainage
            - carpenter: Wood work, furniture repair, doors, windows
            - ac_servicing: Air conditioner repair or maintenance
            - ro_servicing: Water purifier or RO system issues
            - appliance_repair: General appliance repairs (washing machine, fridge, etc.)
            - painting: Wall painting, repainting needs
            - pest_control: Pest infestations, insects, rodents
            - car_washing: Car cleaning or washing needs
            - bathroom_cleaning: Bathroom cleaning requirements
            - home_cleaning: General home cleaning
            - gardening: Garden maintenance, plants, lawn care
            - pet_care: Pet-related services
            - other: If none of the above categories fit
            
            Respond in this exact JSON format:
            {
                "category": "category_name",
                "confidence": 0.85,
                "description": "Brief description of what you see",
                "reasoning": "Why you chose this category"
            }
            
            Make sure confidence is between 0 and 1. Only respond with the JSON, no additional text.
            """
            
            # Prepare the request payload
            payload = {
                "contents": [{
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": image_base64
                            }
                        }
                    ]
                }]
            }
            
            # Make the API request
            response = requests.post(self.gemini_api_url, json=payload, timeout=30)
            response.raise_for_status()
            
            # Parse the response
            response_data = response.json()
            result_text = response_data['candidates'][0]['content']['parts'][0]['text'].strip()
            
            # Remove markdown code blocks if present
            if result_text.startswith("```json"):
                result_text = result_text[7:]
            if result_text.startswith("```"):
                result_text = result_text[3:]
            if result_text.endswith("```"):
                result_text = result_text[:-3]
            result_text = result_text.strip()
            
            # Try to parse as JSON
            result = json.loads(result_text)
            
            # Validate the result
            if "category" not in result:
                raise ValueError("AI response missing category field")
            
            # Ensure confidence is present and valid
            if "confidence" not in result:
                result["confidence"] = 0.5
            
            return {
                "success": True,
                "category": result.get("category", "other"),
                "confidence": float(result.get("confidence", 0.5)),
                "description": result.get("description", ""),
                "reasoning": result.get("reasoning", ""),
                "raw_response": result_text
            }
            
        except json.JSONDecodeError as e:
            # If JSON parsing fails, try to extract category from text
            return {
                "success": False,
                "error": "Failed to parse AI response",
                "raw_response": result_text if 'result_text' in locals() else str(e)
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def extract_name_from_document(self, image_data: bytes, document_type: str) -> dict:
        """
        Extract name from identity document using Gemini AI
        (Puter.js is client-side only, so we use Gemini API on backend)
        
        Args:
            image_data: Image bytes of the document
            document_type: Type of document (pan, aadhaar, etc.)
            
        Returns:
            Dictionary with extracted name and confidence
        """
        try:
            # Convert image to base64
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            # Create prompt based on document type
            document_instructions = {
                "pan": "PAN Card. Look for the name field which is typically labeled as 'Name' or appears prominently. Extract the full name in capital letters.",
                "aadhaar": "Aadhaar Card. Extract the name from the card. The name is usually displayed prominently near the top of the card.",
                "driving_license": "Driving License. Extract the holder's name. Look for fields like 'Name' or 'Holder's Name'.",
                "voter_id": "Voter ID Card. Extract the cardholder's name from the card.",
                "passport": "Passport. Extract the surname and given names. Combine them into full name."
            }
            
            doc_instruction = document_instructions.get(
                document_type, 
                f"{document_type.upper()} document. Extract the person's name from this document."
            )
            
            prompt = f"""
            You are an AI document verification assistant. Analyze this {doc_instruction}
            
            Your task:
            1. Identify and extract the person's FULL NAME from the document
            2. Return ONLY the name as it appears on the document
            3. Clean up the name (remove extra spaces, special characters)
            4. Provide a confidence score (0-1) indicating how certain you are
            
            Important rules:
            - Extract the complete name (first name, middle name, last name if present)
            - Preserve the order as shown on document
            - Do not include document numbers, addresses, or other information
            - If name is in multiple languages, prefer English/Latin script
            - If you cannot find a clear name, return confidence 0
            
            Respond in this exact JSON format:
            {{
                "name": "Full Name As On Document",
                "confidence": 0.95,
                "document_type_detected": "{document_type}",
                "notes": "Any observations about the extraction"
            }}
            
            Only respond with the JSON, no additional text.
            """
            
            # Prepare the request payload
            payload = {
                "contents": [{
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": image_base64
                            }
                        }
                    ]
                }]
            }
            
            # Make the API request (same as analyze_issue_image)
            logger.info(f"Calling Gemini API for document: {document_type}")
            response = requests.post(self.gemini_api_url, json=payload, timeout=30)
            
            if response.status_code != 200:
                logger.error(f"Gemini API returned status {response.status_code}: {response.text}")
                response.raise_for_status()
            
            # Parse the response
            response_data = response.json()
            logger.info(f"Gemini API response received, parsing...")
            
            if 'candidates' not in response_data or not response_data['candidates']:
                logger.error(f"No candidates in Gemini response: {response_data}")
                return {
                    "name": None,
                    "confidence": 0.0,
                    "error": "Gemini API returned no candidates"
                }
            
            result_text = response_data['candidates'][0]['content']['parts'][0]['text'].strip()
            logger.info(f"Raw AI response: {result_text[:200]}...")
            
            # Remove markdown code blocks if present
            if result_text.startswith("```json"):
                result_text = result_text[7:]
            if result_text.startswith("```"):
                result_text = result_text[3:]
            if result_text.endswith("```"):
                result_text = result_text[:-3]
            result_text = result_text.strip()
            
            # Try to parse as JSON
            result = json.loads(result_text)
            
            # Validate and clean the name
            extracted_name = result.get("name", "").strip()
            confidence = float(result.get("confidence", 0.0))
            
            # Basic validation
            if not extracted_name or len(extracted_name) < 2:
                return {
                    "name": None,
                    "confidence": 0.0,
                    "error": "No valid name found in document"
                }
            
            return {
                "name": extracted_name,
                "confidence": confidence,
                "document_type_detected": result.get("document_type_detected", document_type),
                "notes": result.get("notes", ""),
                "raw_response": result_text
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error in document extraction: {str(e)}")
            return {
                "name": None,
                "confidence": 0.0,
                "error": "Failed to parse AI response",
                "raw_response": result_text if 'result_text' in locals() else str(e)
            }
        except Exception as e:
            logger.error(f"Document name extraction error: {str(e)}")
            return {
                "name": None,
                "confidence": 0.0,
                "error": str(e)
            }
    
    def get_category_display_name(self, category: str) -> str:
        """Convert category code to display name"""
        category_map = {
            "electrician": "Electrician",
            "plumber": "Plumber",
            "carpenter": "Carpenter",
            "ac_servicing": "AC Servicing",
            "ro_servicing": "RO Servicing",
            "appliance_repair": "Appliance Repair",
            "painting": "Painting",
            "pest_control": "Pest Control",
            "car_washing": "Car Washing",
            "bathroom_cleaning": "Bathroom Cleaning",
            "home_cleaning": "Home Cleaning",
            "assignment_writing": "Assignment Writing",
            "project_making": "Project Making",
            "tutoring": "Tutoring",
            "pet_care": "Pet Care",
            "gardening": "Gardening",
            "delivery": "Delivery",
            "other": "Other"
        }
        return category_map.get(category, category.replace("_", " ").title())

# Create a function to get AI service instance (lazy loading)
_ai_service_instance = None

def get_ai_service():
    global _ai_service_instance
    if _ai_service_instance is None:
        _ai_service_instance = AIService()
    return _ai_service_instance
