import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import './DocumentVerification.css';

const DocumentVerification = () => {
  const { user } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('pan');
  const [previewUrl, setPreviewUrl] = useState(null);

  const documentTypes = [
    { value: 'pan', label: 'PAN Card', icon: '🪪' },
    { value: 'aadhaar', label: 'Aadhaar Card', icon: '🆔' },
    { value: 'driving_license', label: 'Driving License', icon: '🚗' },
    { value: 'voter_id', label: 'Voter ID', icon: '🗳️' },
    { value: 'passport', label: 'Passport', icon: '🛂' }
  ];

  useEffect(() => {
    fetchVerificationStatus();
    fetchDocuments();
    
    // Cleanup: revoke object URL when component unmounts
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/document-verification/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVerificationStatus(data);
      } else {
        console.error('Failed to fetch verification status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  };

  const testBackendConnection = async () => {
    toast.info('Testing backend connection...');
    
    try {
      const xhr = new XMLHttpRequest();
      const testPromise = new Promise((resolve, reject) => {
        xhr.open('GET', 'http://127.0.0.1:8000/api/document-verification/status', true);
        xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('access_token')}`);
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ status: xhr.status, data: xhr.responseText });
          } else {
            reject(new Error(`Status: ${xhr.status}`));
          }
        };
        
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.ontimeout = () => reject(new Error('Timeout'));
        xhr.timeout = 5000;
        xhr.send();
      });
      
      const result = await testPromise;
      toast.success(`Backend is reachable! Status: ${result.status}`);
      return true;
    } catch (error) {
      console.error('❌ Backend connection failed:', error);
      toast.error(`Cannot reach backend: ${error.message}. Check Windows Firewall or try disabling antivirus.`);
      return false;
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/document-verification/my-documents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    
    if (!file) {
      return;
    }


    // More permissive file type check
    const isImage = file.type.startsWith('image/') || 
                    file.name.match(/\.(jpg|jpeg|png|webp|gif|bmp)$/i);
    
    if (!isImage) {
      console.error('Invalid file type:', file.type);
      toast.error('Please select an image file (PNG, JPG, JPEG, WEBP)');
      event.target.value = ''; // Reset input
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      console.error('File too large:', file.size);
      toast.error('File size must be less than 10MB');
      event.target.value = ''; // Reset input
      return;
    }

    setSelectedFile(file);
    toast.success(`✓ Selected: ${file.name}`);
    
    // Create preview using Object URL (bypasses FileReader permission issues)
    try {
      // Revoke previous object URL to prevent memory leaks
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      
      // Create new object URL (doesn't read file data, just creates reference)
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      toast.info('Preview ready! Click "Upload & Verify" to process.');
    } catch (error) {
      console.error('Failed to create object URL:', error);
      toast.warning('Preview unavailable, but file is selected. You can still upload.');
      // File is still selected, just no preview
    }
  };

  const handleUpload = async () => {
    
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('You must be logged in to upload documents');
      }
      
      // Step 1: Use Puter.js AI to extract name from document
      toast.info('🤖 AI is analyzing your document...');
      
      let extractedName = null;
      let aiConfidence = 0.0;
      
      if (window.puter) {
        try {
          // Convert image to base64 for Puter.js
          const imageDataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(selectedFile);
          });
          
          const docTypeLabels = {
            'pan': 'PAN Card',
            'aadhaar': 'Aadhaar Card',
            'driving_license': 'Driving License',
            'voter_id': 'Voter ID Card',
            'passport': 'Passport'
          };
          
          const docLabel = docTypeLabels[documentType] || documentType.toUpperCase();
          
          const prompt = `
Analyze this ${docLabel} and extract the person's FULL NAME.

Rules:
- Extract the complete name as it appears on the document
- Clean up extra spaces and special characters
- If the name is unclear or you cannot find it, set confidence to 0

Respond in this exact JSON format:
{
  "name": "Full Name As On Document",
  "confidence": 0.95
}

Only respond with the JSON, no additional text.
`;
          
          const aiResponse = await window.puter.ai.chat(
            prompt,
            imageDataUrl,
            { model: 'gemini-2.5-pro' }
          );
          
          
          // Parse the response
          let responseText = '';
          if (typeof aiResponse === 'object' && aiResponse !== null) {
            if (aiResponse.message?.content) {
              responseText = aiResponse.message.content;
            } else if (aiResponse.content) {
              responseText = aiResponse.content;
            } else {
              responseText = JSON.stringify(aiResponse);
            }
          } else {
            responseText = String(aiResponse);
          }
          
          // Remove markdown code blocks
          if (responseText.startsWith('```json')) {
            responseText = responseText.substring(7);
          }
          if (responseText.startsWith('```')) {
            responseText = responseText.substring(3);
          }
          if (responseText.endsWith('```')) {
            responseText = responseText.substring(0, responseText.length - 3);
          }
          responseText = responseText.trim();
          
          const result = JSON.parse(responseText);
          extractedName = result.name;
          aiConfidence = parseFloat(result.confidence || 0);
          
          
          if (aiConfidence > 0) {
            toast.success(`✓ AI detected name: ${extractedName} (${Math.round(aiConfidence * 100)}%)`);
          } else {
            toast.warning('⚠️ AI could not detect name clearly. Document will be sent for admin review.');
          }
          
        } catch (aiError) {
          console.error('Puter.js AI error:', aiError);
          toast.warning('AI analysis failed. Document will be sent for admin review.');
          // Continue with upload even if AI fails
        }
      } else {
        console.warn('Puter.js not loaded, skipping AI extraction');
        toast.warning('AI not available. Document will be sent for admin review.');
      }
      
      // Step 2: Upload document with AI results to backend
      toast.info('Uploading document...');
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('document_type', documentType);
      formData.append('extracted_name', extractedName || '');
      formData.append('ai_confidence', aiConfidence.toString());
      
      
      // Use XMLHttpRequest with FormData - Windows allows this better than JSON
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise((resolve, reject) => {
        // Using port 8000 for backend connection
        xhr.open('POST', 'http://127.0.0.1:8000/api/document-verification/upload', true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        // Don't set Content-Type - let browser set it with boundary for FormData
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (e) {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.detail || `Upload failed with status ${xhr.status}`));
            } catch (e) {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        };
        
        xhr.onerror = () => {
          console.error('XHR network error');
          reject(new Error('Network error - cannot connect to backend. Please check if backend is running on port 8000.'));
        };
        
        xhr.ontimeout = () => {
          reject(new Error('Upload timeout - file may be too large or connection is slow'));
        };
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
          }
        };
        
        xhr.timeout = 60000; // 60 second timeout
        xhr.send(formData); // Send FormData instead of JSON
      });
      
      const data = await uploadPromise;

      toast.success(data.message);
      
      // Show AI results if available
      if (data.extracted_name) {
        toast.info(
          `AI detected name: ${data.extracted_name} (${Math.round(data.ai_confidence * 100)}% confidence)`,
          { autoClose: 5000 }
        );
      }

      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);

      // Refresh data
      await fetchVerificationStatus();
      await fetchDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      
      // Provide specific error messages based on error type
      if (error.message) {
        toast.error(error.message);
      } else if (error instanceof TypeError) {
        toast.error('Cannot connect to server. Make sure the backend is running on port 8000.');
      } else {
        toast.error('Failed to upload document. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/document-verification/documents/${documentId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        }
      );

      if (response.ok) {
        toast.success('Document deleted successfully');
        await fetchDocuments();
        await fetchVerificationStatus();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      verified: { label: 'Verified ✓', className: 'status-verified' },
      pending: { label: 'Pending Review', className: 'status-pending' },
      rejected: { label: 'Rejected ✗', className: 'status-rejected' },
      ai_processing: { label: 'AI Processing...', className: 'status-processing' },
      name_mismatch: { label: 'Name Mismatch', className: 'status-mismatch' }
    };

    const badge = badges[status] || { label: status, className: 'status-unknown' };
    return <span className={`status-badge ${badge.className}`}>{badge.label}</span>;
  };

  const getDocumentTypeLabel = (type) => {
    const doc = documentTypes.find(d => d.value === type);
    return doc ? `${doc.icon} ${doc.label}` : type;
  };

  if (loading) {
    return (
      <div className="document-verification-container">
        <div className="loading">Loading verification status...</div>
      </div>
    );
  }

  return (
    <div className="document-verification-container">
      <div className="verification-header">
        <h1>Professional Verification</h1>
        <p>Two-step verification process: AI auto-verification → Admin manual review (if needed)</p>
        
        {/* Connection Test Button */}
        <div style={{ marginTop: '10px' }}>
          <button 
            onClick={testBackendConnection}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔌 Test Backend Connection
          </button>
        </div>
        
        <div className="verification-steps">
          <div className="step-card">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>🤖 AI Verification</h3>
              <p>Upload document → AI extracts & verifies name → Instant approval if match ≥70%</p>
            </div>
          </div>
          <div className="step-arrow">→</div>
          <div className="step-card">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>👤 Admin Review</h3>
              <p>If AI uncertain or fails → Manual admin review → Decision within 24-48 hours</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      {verificationStatus && (
        <div className="status-overview">
          <div className="status-card">
            <div className="status-icon">
              {verificationStatus.is_professional ? '✓' : '⏳'}
            </div>
            <div className="status-info">
              <h3>Professional Status</h3>
              <p className={verificationStatus.is_professional ? 'text-success' : 'text-warning'}>
                {verificationStatus.is_professional ? 'Verified Professional' : 'Not Yet Verified'}
              </p>
            </div>
          </div>

          {/* Process Timeline */}
          <div className="process-timeline">
            <div className={`process-step ${verificationStatus.total_documents > 0 ? 'active' : 'inactive'} ${verificationStatus.verified_documents > 0 || verificationStatus.pending_documents > 0 ? 'completed' : ''}`}>
              <div className="step-indicator">
                {verificationStatus.verified_documents > 0 || verificationStatus.pending_documents > 0 ? '✓' : '1'}
              </div>
              <div className="step-details">
                <h4>🤖 AI Verification</h4>
                <p className="step-status">
                  {verificationStatus.verified_documents > 0 && '✓ AI Verified'}
                  {verificationStatus.pending_documents > 0 && !verificationStatus.verified_documents && '⏳ Processing...'}
                  {verificationStatus.total_documents === 0 && 'Upload document to start'}
                </p>
              </div>
            </div>

            <div className="timeline-arrow">→</div>

            <div className={`process-step ${verificationStatus.pending_documents > 0 ? 'active' : 'inactive'} ${verificationStatus.is_professional ? 'completed' : ''}`}>
              <div className="step-indicator">
                {verificationStatus.is_professional ? '✓' : verificationStatus.pending_documents > 0 ? '⏳' : '2'}
              </div>
              <div className="step-details">
                <h4>👤 Admin Review</h4>
                <p className="step-status">
                  {verificationStatus.is_professional && '✓ Approved'}
                  {verificationStatus.rejected_documents > 0 && !verificationStatus.is_professional && '✗ Rejected'}
                  {verificationStatus.pending_documents > 0 && !verificationStatus.is_professional && !verificationStatus.rejected_documents && '⏳ Awaiting Review'}
                  {verificationStatus.total_documents === 0 && 'Pending Step 1'}
                  {verificationStatus.verified_documents > 0 && !verificationStatus.pending_documents && verificationStatus.total_documents > 0 && !verificationStatus.is_professional && 'Not Required (AI Verified)'}
                </p>
              </div>
            </div>
          </div>
          
          {verificationStatus.total_documents === 0 && (
            <div className="no-documents-notice">
              <p>📄 No documents uploaded yet. Upload your first document below to start the verification process!</p>
            </div>
          )}
        </div>
      )}

      {/* Upload Section */}
      <div className="upload-section">
        <h2>Upload New Document</h2>
        
        {/* Privacy Notice */}
        <div className="privacy-notice">
          <div className="privacy-icon">🔒</div>
          <div className="privacy-content">
            <h4>Privacy Notice - Mask Sensitive Information</h4>
            <p>
              <strong>⚠️ IMPORTANT:</strong> Before uploading, please <strong>blur or mask sensitive information</strong> on your document:
            </p>
            <ul>
              <li>Document numbers (Aadhaar, PAN, License numbers)</li>
              <li>Date of birth</li>
              <li>Address details</li>
              <li>QR codes or barcodes</li>
            </ul>
            <p>
              <strong>Keep visible:</strong> Your name (for AI verification). All other details should be hidden for your privacy.
            </p>
            <p className="privacy-assurance">
              🔐 Your document image is <strong>NOT stored</strong> on our servers. Only verification results are kept.
            </p>
          </div>
        </div>
        
        <div className="document-type-selector">{documentTypes.map((doc) => (
            <button
              key={doc.value}
              className={`doc-type-btn ${documentType === doc.value ? 'active' : ''}`}
              onClick={() => setDocumentType(doc.value)}
            >
              <span className="doc-icon">{doc.icon}</span>
              <span className="doc-label">{doc.label}</span>
            </button>
          ))}
        </div>

        <div className="file-upload-area">
          {previewUrl ? (
            <div className="file-preview">
              <img src={previewUrl} alt="Document preview" />
              <button
                className="btn-remove-preview"
                onClick={() => {
                  // Revoke object URL to free memory
                  if (previewUrl && previewUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(previewUrl);
                  }
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="upload-wrapper">
              <div className="upload-icon">📤</div>
              <p><strong>Click here or drag and drop your document</strong></p>
              <p className="upload-hint">PNG, JPG or JPEG (max 10MB)</p>
              <div className="upload-note">
                <p><strong>⚠️ Windows Upload Issues? Try:</strong></p>
                <ul style={{ textAlign: 'left', paddingLeft: '1.5rem', margin: '0.5rem 0', fontSize: '0.85rem' }}>
                  <li><strong>✅ Best:</strong> Drag and drop the image from Windows Explorer onto this box</li>
                  <li><strong>📁 Copy file to Desktop first</strong> (avoid Downloads/Documents folders)</li>
                  <li>Close the image file if it's open in another program</li>
                  <li>If file picker opens, double-click the image file (don't use Open button)</li>
                  <li>Temporarily disable ransomware protection (Windows Security → Controlled folder access)</li>
                </ul>
              </div>
              <input
                type="file"
                onChange={(e) => {
                  handleFileSelect(e);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    e.target.files = e.dataTransfer.files;
                    handleFileSelect({ target: { files: e.dataTransfer.files } });
                  }
                }}
                className="file-input-styled"
                title="Click to select or drag and drop a file"
              />
            </div>
          )}
        </div>

        {selectedFile && (
          <button
            className="btn-upload"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <span className="spinner"></span>
                Processing with AI...
              </>
            ) : (
              <>
                <span>🤖</span>
                Upload & Verify with AI
              </>
            )}
          </button>
        )}

        <div className="upload-info">
          <p><strong>🔒 Privacy:</strong> Your document image is processed by AI and is <strong>NOT stored</strong>.</p>
          <p><strong>⚡ Two-Step Process:</strong></p>
          <ul>
            <li><strong>Step 1:</strong> AI auto-verifies (instant if successful)</li>
            <li><strong>Step 2:</strong> Admin reviews (24-48 hrs if AI uncertain)</li>
          </ul>
          <p><strong>📝 Tip:</strong> Clear, well-lit photos increase AI success rate!</p>
        </div>
      </div>

      {/* Uploaded Documents */}
      <div className="documents-list">
        <h2>Uploaded Documents</h2>
        
        {documents.length === 0 ? (
          <div className="no-documents">
            <p>No documents uploaded yet</p>
            <p className="hint">Upload your first document to start the verification process</p>
          </div>
        ) : (
          <div className="documents-grid">
            {documents.map((doc) => (
              <div key={doc._id} className="document-card">
                <div className="document-header">
                  <span className="document-type">
                    {getDocumentTypeLabel(doc.document_type)}
                  </span>
                  {getStatusBadge(doc.verification_status)}
                </div>
                
                <div className="document-details">
                  {doc.extracted_name && (
                    <div className="detail-row">
                      <span className="detail-label">Extracted Name:</span>
                      <span className="detail-value">{doc.extracted_name}</span>
                    </div>
                  )}
                  
                  {doc.ai_confidence !== null && (
                    <div className="detail-row">
                      <span className="detail-label">AI Confidence:</span>
                      <span className="detail-value">
                        {Math.round(doc.ai_confidence * 100)}%
                      </span>
                    </div>
                  )}
                  
                  <div className="detail-row">
                    <span className="detail-label">Uploaded:</span>
                    <span className="detail-value">
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </span>
                  </div>

                  {doc.verified_at && (
                    <div className="detail-row">
                      <span className="detail-label">Verified:</span>
                      <span className="detail-value">
                        {new Date(doc.verified_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {doc.rejection_reason && (
                    <div className="rejection-reason">
                      <strong>Reason:</strong> {doc.rejection_reason}
                    </div>
                  )}

                  {doc.admin_notes && (
                    <div className="admin-notes">
                      <strong>Notes:</strong> {doc.admin_notes}
                    </div>
                  )}
                </div>

                {doc.verification_status !== 'verified' && (
                  <button
                    className="btn-delete-doc"
                    onClick={() => handleDeleteDocument(doc._id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentVerification;
