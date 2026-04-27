import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import config from '../../config';
import LoadingScreen from '../../components/LoadingScreen';
import './VerificationManagement.css';

export default function VerificationManagement() {
  const navigate = useNavigate();
  const [taskers, setTaskers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchTaskers();
  }, []);

  const fetchTaskers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      // Fetch pending verifications with document details
      const response = await fetch(`${config.API_BASE_URL}/admin/taskers/pending-verification`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        toast.error('Session expired. Please login again.');
        window.location.href = '/login';
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch taskers');
      
      const pendingTaskers = await response.json();
      
      // Also fetch all users to show approved/rejected
      const allResponse = await fetch(`${config.API_BASE_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const allData = await allResponse.json();
      const allUsersArray = Array.isArray(allData) ? allData : (allData.users || []);
      const allTaskersOnly = allUsersArray.filter(u => u.role === 'tasker');
      
      // Combine pending taskers with document details and other taskers
      const combinedTaskers = allTaskersOnly.map(tasker => {
        const pendingInfo = pendingTaskers.find(p => p._id === tasker._id);
        if (pendingInfo) {
          return { ...tasker, ...pendingInfo };
        }
        return tasker;
      });
      
      setTaskers(combinedTaskers);
    } catch (error) {
      console.error('Error fetching taskers:', error);
      toast.error('Failed to load taskers');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (taskerId, status, notes = '') => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${config.API_BASE_URL}/admin/taskers/${taskerId}/verification`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status: status,
          notes: notes || (status === 'approved' ? 'Verified by admin (Step 2)' : 'Did not meet verification criteria')
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update verification');
      }

      toast.success(`✓ STEP 2 COMPLETE: Tasker ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      fetchTaskers();
    } catch (error) {
      console.error('Error updating verification:', error);
      toast.error(error.message || 'Failed to update verification status');
    }
  };

  const filteredTaskers = taskers.filter(tasker => {
    if (filter === 'all') return true;
    return tasker.verification_status === filter;
  });

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      approved: '#10b981',
      rejected: '#ef4444',
      not_applied: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  if (loading) {
    return (
      <>  <LoadingScreen message="Firing Up The Engines" />      </>
    );
  }

  return (
    <>      <div className="verification-management">
        <div className="page-header">
          <button className="btn-back" onClick={() => navigate('/admin/dashboard')}>
            ← Back to Dashboard
          </button>
          <h1>✓ Verification Management</h1>
          <p>Review and verify tasker applications</p>
        </div>

        <div className="filter-tabs">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
            All Taskers ({taskers.length})
          </button>
          <button className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>
            ⏳ Pending ({taskers.filter(t => t.verification_status === 'pending').length})
          </button>
        <button className={filter === 'approved' ? 'active' : ''} onClick={() => setFilter('approved')}>
          ✓ Verified ({taskers.filter(t => t.verification_status === 'approved').length})
        </button>
        <button className={filter === 'rejected' ? 'active' : ''} onClick={() => setFilter('rejected')}>
          ❌ Rejected ({taskers.filter(t => t.verification_status === 'rejected').length})
        </button>
      </div>

      {filteredTaskers.length > 0 ? (
      <div className="taskers-grid">
        {filteredTaskers.map(tasker => (
          <div key={tasker._id} className="tasker-card">
            <div className="tasker-header">
              {tasker.profile_picture ? (
                <img src={tasker.profile_picture} alt={tasker.name} className="tasker-avatar" />
              ) : (
                <div className="tasker-avatar-placeholder">{tasker.name.charAt(0)}</div>
              )}
              <div className="tasker-info">
                <h3>{tasker.name}</h3>
                <p>{tasker.email}</p>
              </div>
              <span 
                className="status-badge" 
                style={{ backgroundColor: getStatusColor(tasker.verification_status) }}
              >
                {tasker.verification_status?.toUpperCase() || 'PENDING'}
              </span>
            </div>

            <div className="tasker-details">
              <div className="detail-row">
                <span className="label">📞 Phone:</span>
                <span className="value">{tasker.phone || 'Not provided'}</span>
              </div>
              <div className="detail-row">
                <span className="label">👤 Tasker Type:</span>
                <span className="value">{tasker.tasker_type || 'helper'}</span>
              </div>
              
              {/* TWO-STEP VERIFICATION INFO */}
              {tasker.verification_method && (
                <div className="detail-row verification-method">
                  <span className="label">🔄 Verification Method:</span>
                  <span className="value">
                    {tasker.verification_method === 'ai_auto_verified' && '✓ Step 1: AI Auto-Verified'}
                    {tasker.verification_method === 'pending_admin_review' && '⏳ Step 1→Step 2: Pending Admin Review'}
                    {tasker.verification_method === 'admin_manual_review' && '✓ Step 2: Admin Manual Review'}
                    {!tasker.verification_method && 'Not specified'}
                  </span>
                </div>
              )}
              
              {/* DOCUMENT VERIFICATION DETAILS (Step 1 Results) */}
              {tasker.pending_documents && tasker.pending_documents.length > 0 && (
                <div className="documents-section">
                  <div className="detail-row">
                    <span className="label">📄 Documents Submitted:</span>
                    <span className="value">{tasker.document_count} document(s)</span>
                  </div>
                  {tasker.pending_documents.map((doc, idx) => (
                    <div key={idx} className="document-card-mini">
                      <div className="doc-header">
                        <strong>
                          {doc.document_type === 'pan' && '🪪 PAN Card'}
                          {doc.document_type === 'aadhaar' && '🆔 Aadhaar Card'}
                          {doc.document_type === 'driving_license' && '🚗 Driving License'}
                          {doc.document_type === 'voter_id' && '🗳️ Voter ID'}
                          {doc.document_type === 'passport' && '🛂 Passport'}
                        </strong>
                        <span className={`doc-status ${doc.verification_status}`}>
                          {doc.verification_status}
                        </span>
                      </div>
                      {doc.extracted_name && (
                        <div className="doc-detail">
                          <span className="doc-label">AI Extracted Name:</span>
                          <span className="doc-value">{doc.extracted_name}</span>
                        </div>
                      )}
                      {doc.ai_confidence !== null && (
                        <div className="doc-detail">
                          <span className="doc-label">AI Confidence:</span>
                          <span className="doc-value confidence-bar">
                            <div className="confidence-fill" style={{width: `${doc.ai_confidence * 100}%`}}></div>
                            <span className="confidence-text">{Math.round(doc.ai_confidence * 100)}%</span>
                          </span>
                        </div>
                      )}
                      <div className="doc-detail">
                        <span className="doc-label">Registered Name:</span>
                        <span className="doc-value">{tasker.name}</span>
                      </div>
                      <div className="doc-detail">
                        <span className="doc-label">Uploaded:</span>
                        <span className="doc-value">{new Date(doc.uploaded_at).toLocaleString()}</span>
                      </div>
                      {doc.verified_by_ai && (
                        <div className="ai-badge">🤖 AI Verified</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {tasker.skills && tasker.skills.length > 0 && (
                <div className="detail-row">
                  <span className="label">💼 Skills:</span>
                  <span className="value">{tasker.skills.join(', ')}</span>
                </div>
              )}
              {tasker.experience_years && (
                <div className="detail-row">
                  <span className="label">⏱️ Experience:</span>
                  <span className="value">{tasker.experience_years} years</span>
                </div>
              )}
              {tasker.bio && (
                <div className="detail-row">
                  <span className="label">📝 Bio:</span>
                  <span className="value">{tasker.bio}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="label">📅 Joined:</span>
                <span className="value">{new Date(tasker.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {tasker.verification_status === 'pending' && (
              <div className="verification-actions">
                <div className="step-2-notice">
                  <strong>📋 STEP 2: Admin Manual Review</strong>
                  <p>Review the AI results above and approve/reject this tasker</p>
                </div>
                <button 
                  className="btn-verify"
                  onClick={() => handleVerification(tasker._id, 'approved')}
                >
                  ✓ Approve as Professional
                </button>
                <button 
                  className="btn-reject"
                  onClick={() => handleVerification(tasker._id, 'rejected')}
                >
                  ❌ Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      ) : (
        <div className="no-data">
          <p>No taskers found</p>
        </div>
      )}
      </div>    </>
  );
}
