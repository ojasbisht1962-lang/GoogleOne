import os
import httpx
from typing import Optional, Dict
import re

class TranslationService:
    """Translation service using Google Gemini API for multilingual chat support"""
    
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            print("WARNING: GEMINI_API_KEY not found in environment variables")
            self.api_key = "AIzaSyAU7epdA4DQX1pvk09xWD42DC-ocMulaEI"  # Fallback
        self.api_url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-exp:generateContent?key={self.api_key}"
        
        # Language code to name mapping for better prompts
        self.language_names = {
            'en': 'English',
            'hi': 'Hindi',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'ja': 'Japanese',
            'zh': 'Chinese',
            'ar': 'Arabic',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'it': 'Italian',
            'ko': 'Korean',
            'bn': 'Bengali',
            'pa': 'Punjabi',
            'te': 'Telugu',
            'mr': 'Marathi',
            'ta': 'Tamil',
            'gu': 'Gujarati',
            'ur': 'Urdu',
            'kn': 'Kannada',
            'ml': 'Malayalam',
            'or': 'Odia'
        }
    
    async def detect_language(self, text: str) -> str:
        """Detect the language of the given text using Puter.js AI"""
        if not text or not text.strip():
            return 'en'
        
        prompt = f"""Detect the language of this text and respond ONLY with the ISO 639-1 two-letter language code (e.g., 'en' for English, 'hi' for Hindi, 'es' for Spanish).
Do not include any explanation, just the code.

Text: {text[:200]}"""  # Use first 200 chars for detection
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.api_url,
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.1,
                            "maxOutputTokens": 10
                        }
                    },
                    timeout=5.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    detected = result['candidates'][0]['content']['parts'][0]['text'].strip().lower()
                    # Clean up the response - extract just the language code
                    detected = re.sub(r'[^a-z]', '', detected)[:2]
                    return detected if len(detected) == 2 else 'en'
                else:
                    print(f"Language detection failed: {response.status_code}")
                    return 'en'
            except Exception as e:
                print(f"Language detection error: {e}")
                return 'en'
    
    async def translate_text(
        self, 
        text: str, 
        target_language: str, 
        source_language: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Translate text to target language using Puter.js AI
        
        Returns:
            Dict with 'translated_text', 'source_language', 'target_language'
        """
        if not text or not text.strip():
            return {
                "translated_text": text,
                "source_language": source_language or 'en',
                "target_language": target_language
            }
        
        # If source language not provided, detect it
        if not source_language:
            source_language = await self.detect_language(text)
        
        # If already in target language, return as is
        if source_language == target_language:
            return {
                "translated_text": text,
                "source_language": source_language,
                "target_language": target_language
            }
        
        target_lang_name = self.language_names.get(target_language, target_language.upper())
        source_lang_name = self.language_names.get(source_language, source_language.upper())
        
        prompt = f"""Translate the following text from {source_lang_name} to {target_lang_name}.
Return ONLY the translated text, nothing else. Maintain the tone and context of the original message.
If it's a casual chat message, keep it casual. If it's formal, keep it formal.

Text: {text}"""
        
        async with httpx.AsyncClient() as client:
            try:
                print(f"Translating from {source_lang_name} to {target_lang_name}: {text[:50]}...")
                
                response = await client.post(
                    self.api_url,
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.3,
                            "maxOutputTokens": 500
                        }
                    },
                    timeout=15.0
                )
                
                print(f"Translation API response status: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"Translation API response received")
                    # Extract the response from Gemini format
                    translated = result['candidates'][0]['content']['parts'][0]['text'].strip()
                    return {
                        "translated_text": translated,
                        "source_language": source_language,
                        "target_language": target_language
                    }
                else:
                    print(f"Translation API failed: {response.status_code}")
                    return {
                        "translated_text": text,
                        "source_language": source_language,
                        "target_language": target_language
                    }
            except Exception as e:
                print(f"Translation error: {e}")
                import traceback
                traceback.print_exc()
                return {
                    "translated_text": text,
                    "source_language": source_language,
                    "target_language": target_language
                }
    
    async def translate_batch(
        self, 
        messages: list, 
        target_language: str
    ) -> list:
        """Translate multiple messages efficiently"""
        translated_messages = []
        
        for message in messages:
            if message.get('original_language') == target_language:
                message['translated_text'] = message['content']
            else:
                # Check if translation is cached
                if target_language in message.get('translations', {}):
                    message['translated_text'] = message['translations'][target_language]
                else:
                    # Translate
                    result = await self.translate_text(
                        message['content'],
                        target_language,
                        message.get('original_language')
                    )
                    message['translated_text'] = result['translated_text']
            
            translated_messages.append(message)
        
        return translated_messages

# Singleton instance
_translation_service = None

def get_translation_service() -> TranslationService:
    """Get or create translation service instance"""
    global _translation_service
    if _translation_service is None:
        _translation_service = TranslationService()
    return _translation_service
