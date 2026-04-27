import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import './AIPhotoSearch.css';

export default function AIPhotoSearch({ onCategoryDetected }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB');
        return;
      }

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setResult(null);
    }
  };

  const handleCameraClick = async () => {
    // Check if device has camera
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.info('Camera not supported. Using file upload instead.');
      cameraInputRef.current?.click();
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setShowCamera(true);
      
      // Wait for video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (error) {
      console.error('Camera access error:', error);
      toast.info('Camera access denied. Using file upload instead.');
      cameraInputRef.current?.click();
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        setSelectedImage(file);
        
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
        setResult(null);
        
        // Close camera
        closeCamera();
      }
    }, 'image/jpeg', 0.95);
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      toast.error('Please select an image first');
      return;
    }

    if (!window.puter) {
      toast.error('Puter.js is not loaded. Please refresh the page.');
      return;
    }

    setAnalyzing(true);
    setResult(null);

    try {
      // Check authentication and sign in if needed
      try {
        const isSignedIn = await window.puter.auth.isSignedIn();
        if (!isSignedIn) {
          toast.info('Please sign in to use AI features');
          await window.puter.auth.signIn();
        }
      } catch (authError) {
        console.error('Authentication error:', authError);
        // Continue anyway, the AI call will handle auth if needed
      }

      // Convert image to base64 data URL
      const imageDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(selectedImage);
      });

      // Create prompt for AI
      const prompt = `
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
`;

      // Use Puter.js AI (Gemini) with base64 image data
      const aiResponse = await window.puter.ai.chat(
        prompt,
        imageDataUrl,
        { model: 'gemini-2.5-pro' }
      );
      
      // Parse the AI response - handle both string and object responses
      let parsedResult;
      try {
        let responseText = '';
        
        // Check if response is an object with nested structure
        if (typeof aiResponse === 'object' && aiResponse !== null) {
          // Try common nested structures
          if (aiResponse.choices && aiResponse.choices[0]?.message?.content) {
            responseText = aiResponse.choices[0].message.content;
          } else if (aiResponse.message?.content) {
            responseText = aiResponse.message.content;
          } else if (aiResponse.content) {
            responseText = aiResponse.content;
          } else if (aiResponse.text) {
            responseText = aiResponse.text;
          } else {
            // If still no text found, check if the response itself looks like the result
            if (aiResponse.category) {
              parsedResult = aiResponse;
            } else {
              responseText = JSON.stringify(aiResponse);
            }
          }
        } else if (typeof aiResponse === 'string') {
          responseText = aiResponse;
        } else {
          throw new Error('Unexpected response format');
        }
        
        // If parsedResult is already set, skip text parsing
        if (!parsedResult) {
          // Ensure responseText is a string
          responseText = String(responseText);
          
          // Remove markdown code blocks and fix escape sequences
          responseText = responseText
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .replace(/\\n/g, '')
            .replace(/\\"/g, '"')
            .trim();
          
          // Try to parse as direct JSON first
          try {
            parsedResult = JSON.parse(responseText);
          } catch (directParseError) {
            // If that fails, try to extract JSON from the text
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsedResult = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error('No JSON found in response');
            }
          }
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        // Fallback: extract basic info from text
        const responseStr = typeof aiResponse === 'string' ? aiResponse : JSON.stringify(aiResponse);
        parsedResult = {
          category: 'other',
          confidence: 0.5,
          description: responseStr.substring(0, 200),
          reasoning: 'Could not parse structured response'
        };
      }

      // Add display name
      const categoryDisplayMap = {
        electrician: 'Electrician',
        plumber: 'Plumber',
        carpenter: 'Carpenter',
        ac_servicing: 'AC Servicing',
        ro_servicing: 'RO Servicing',
        appliance_repair: 'Appliance Repair',
        painting: 'Painting',
        pest_control: 'Pest Control',
        car_washing: 'Car Washing',
        bathroom_cleaning: 'Bathroom Cleaning',
        home_cleaning: 'Home Cleaning',
        gardening: 'Gardening',
        pet_care: 'Pet Care',
        other: 'Other'
      };

      parsedResult.category_display = categoryDisplayMap[parsedResult.category] || parsedResult.category;
      
      setResult(parsedResult);
      toast.success('Image analyzed successfully!');
    } catch (error) {
      console.error('Error analyzing image:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'Failed to analyze image. ';
      if (error.message) {
        errorMessage += error.message;
      } else if (error.status === 401) {
        errorMessage += 'Please sign in to use AI features.';
      } else if (error.status) {
        errorMessage += `Server error (${error.status})`;
      } else {
        errorMessage += 'Please try again.';
      }
      
      toast.error(errorMessage);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUseCategory = () => {
    if (result && result.category) {
      onCategoryDetected(result.category);
      toast.success(`Searching for ${result.category_display || result.category}...`);
      handleClose();
    }
  };

  const handleClose = () => {
    closeCamera();
    setIsOpen(false);
    setSelectedImage(null);
    setImagePreview(null);
    setResult(null);
    setAnalyzing(false);
    setShowCamera(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        className="ai-search-trigger"
        onClick={() => setIsOpen(true)}
        title="AI Photo Search"
      >
        <Camera size={20} />
        <span>AI Photo Search</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="ai-modal-overlay" onClick={handleClose}>
          <div className="ai-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ai-modal-header">
              <h2>AI Photo Search</h2>
              <button className="ai-close-btn" onClick={handleClose}>
                <X size={24} />
              </button>
            </div>

            <div className="ai-modal-body">
              <p className="ai-description">
                Upload or capture a photo of your issue, and our AI will suggest the right service category for you.
              </p>

              {/* Upload Options */}
              {!imagePreview && !showCamera && (
                <div className="ai-upload-options">
                  <button className="ai-upload-btn" onClick={handleUploadClick}>
                    <Upload size={32} />
                    <span>Upload Photo</span>
                  </button>
                  <button className="ai-upload-btn" onClick={handleCameraClick}>
                    <Camera size={32} />
                    <span>Take Photo</span>
                  </button>
                </div>
              )}

              {/* Camera View */}
              {showCamera && (
                <div className="ai-camera-view">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{ width: '100%', maxHeight: '400px', borderRadius: '8px' }}
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <div className="ai-camera-controls">
                    <button className="ai-capture-btn" onClick={handleCapture}>
                      <Camera size={24} />
                      <span>Capture</span>
                    </button>
                    <button className="ai-cancel-btn" onClick={closeCamera}>
                      <X size={24} />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              {/* Image Preview */}
              {imagePreview && (
                <div className="ai-image-preview">
                  <img src={imagePreview} alt="Selected" />
                  <button 
                    className="ai-remove-image"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                      setResult(null);
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>
              )}

              {/* Analyze Button */}
              {imagePreview && !result && (
                <button 
                  className="ai-analyze-btn"
                  onClick={handleAnalyze}
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <>
                      <Loader className="spinner" size={20} />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      <span>Analyze Image</span>
                    </>
                  )}
                </button>
              )}

              {/* Result Display */}
              {result && (
                <div className="ai-result">
                  <div className="ai-result-header">
                    <CheckCircle className="success-icon" size={24} />
                    <h3>Analysis Complete</h3>
                  </div>

                  <div className="ai-result-content">
                    <div className="ai-result-item">
                      <strong>Suggested Category:</strong>
                      <span className="category-badge">{result.category_display || result.category}</span>
                    </div>

                    <div className="ai-result-item">
                      <strong>Confidence:</strong>
                      <div className="confidence-bar">
                        <div 
                          className="confidence-fill"
                          style={{ width: `${result.confidence * 100}%` }}
                        />
                        <span className="confidence-text">
                          {(result.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {result.description && (
                      <div className="ai-result-item">
                        <strong>Description:</strong>
                        <p>{result.description}</p>
                      </div>
                    )}

                    {result.reasoning && (
                      <div className="ai-result-item">
                        <strong>Reasoning:</strong>
                        <p>{result.reasoning}</p>
                      </div>
                    )}

                    {result.confidence < 0.5 && (
                      <div className="ai-warning">
                        <AlertCircle size={16} />
                        <span>Low confidence - You may want to manually select a category</span>
                      </div>
                    )}
                  </div>

                  <div className="ai-result-actions">
                    <button 
                      className="ai-use-category-btn"
                      onClick={handleUseCategory}
                    >
                      Search for {result.category_display || result.category}
                    </button>
                    <button 
                      className="ai-try-again-btn"
                      onClick={() => {
                        setSelectedImage(null);
                        setImagePreview(null);
                        setResult(null);
                      }}
                    >
                      Try Another Image
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
