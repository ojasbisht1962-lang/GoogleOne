import React, { useState, useEffect } from 'react';
import { badgeService } from '../../services/apiService';
import { toast } from 'react-toastify';
import './Badges.css';

export default function Badges() {
  const [badgeInfo, setBadgeInfo] = useState([]);
  const [eligibility, setEligibility] = useState({});
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchBadgeInfo();
    fetchMyApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBadgeInfo = async () => {
    try {
      const data = await badgeService.getBadgeInfo();
      setBadgeInfo(data);
      
      // Check eligibility for each badge
      for (const badge of data) {
        await checkEligibility(badge.badge_type);
      }
    } catch (error) {
      console.error('Error fetching badge info:', error);
      toast.error(error.response?.data?.detail || error.message || 'Failed to load badge information');
    } finally {
      setLoading(false);
    }
  };

  const checkEligibility = async (badgeType) => {
    try {
      const data = await badgeService.checkEligibility(badgeType);
      setEligibility(prev => ({
        ...prev,
        [badgeType]: data
      }));
    } catch (error) {
      console.error(`Error checking eligibility for ${badgeType}:`, error);
      toast.error(`Failed to check eligibility for ${badgeType}`);
    }
  };

  const fetchMyApplications = async () => {
    try {
      const data = await badgeService.getMyApplications();
      setApplications(data);
    } catch (error) {
      console.error('Error fetching applications:', error);
      // Don't show error toast for applications as they might not exist yet
    }
  };

  const handleApply = async (badgeType) => {
    if (!window.confirm(`Are you sure you want to apply for ${badgeType.toUpperCase()} badge?`)) {
      return;
    }

    setApplying(true);
    try {
      await badgeService.applyForBadge(badgeType);
      toast.success('Badge application submitted successfully!');
      await fetchMyApplications();
      await checkEligibility(badgeType);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit application');
    } finally {
      setApplying(false);
      setSelectedBadge(null);
    }
  };

  const renderCriteriaChecks = (badgeType) => {
    const elig = eligibility[badgeType];
    if (!elig) return null;

    const checks = elig.criteria_details?.checks || {};
    const required = elig.criteria_details?.required || {};

    return (
      <div className="criteria-checks">
        <h4>Requirements Status:</h4>
        <div className="checks-list">
          <div className={`check-item ${checks.verification ? 'met' : 'not-met'}`}>
            <span className="check-icon">{checks.verification ? '✅' : '❌'}</span>
            <span>Background Verification: {required.verified ? 'Verified' : 'Not Verified'}</span>
          </div>
          <div className={`check-item ${checks.min_bookings ? 'met' : 'not-met'}`}>
            <span className="check-icon">{checks.min_bookings ? '✅' : '❌'}</span>
            <span>Completed Bookings: {required.bookings}</span>
          </div>
          <div className={`check-item ${checks.min_rating ? 'met' : 'not-met'}`}>
            <span className="check-icon">{checks.min_rating ? '✅' : '❌'}</span>
            <span>Average Rating: {required.rating}</span>
          </div>
          <div className={`check-item ${checks.min_reviews ? 'met' : 'not-met'}`}>
            <span className="check-icon">{checks.min_reviews ? '✅' : '❌'}</span>
            <span>Customer Reviews: {required.reviews}</span>
          </div>
          <div className={`check-item ${checks.account_age ? 'met' : 'not-met'}`}>
            <span className="check-icon">{checks.account_age ? '✅' : '❌'}</span>
            <span>Account Age: {required.account_age_days}</span>
          </div>
          <div className={`check-item ${checks.cancellation_rate ? 'met' : 'not-met'}`}>
            <span className="check-icon">{checks.cancellation_rate ? '✅' : '❌'}</span>
            <span>Cancellation Rate: {required.cancellation_rate}</span>
          </div>
          <div className={`check-item ${checks.response_time ? 'met' : 'not-met'}`}>
            <span className="check-icon">{checks.response_time ? '✅' : '❌'}</span>
            <span>Response Time: {required.response_time}</span>
          </div>
          <div className={`check-item ${checks.repeat_customers ? 'met' : 'not-met'}`}>
            <span className="check-icon">{checks.repeat_customers ? '✅' : '❌'}</span>
            <span>Repeat Customers: {required.repeat_customers}</span>
          </div>
          <div className={`check-item ${checks.on_time_completion ? 'met' : 'not-met'}`}>
            <span className="check-icon">{checks.on_time_completion ? '✅' : '❌'}</span>
            <span>On-Time Completion: {required.on_time_rate}</span>
          </div>
        </div>
      </div>
    );
  };

  const getApplicationStatus = (badgeType) => {
    const app = applications.find(a => a.badge_type === badgeType && a.status === 'pending');
    return app;
  };

  if (loading) {
    return (
      <>
        <div className="badges-container">
          <div className="loading">Loading badge information...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="badges-container">
        <div className="badges-header">
          <h1>🏆 Professional Badges</h1>
          <p>Earn badges to showcase your expertise and build customer trust</p>
        </div>

        {badgeInfo.length === 0 && !loading && (
          <div className="no-data-message">
            <p>⚠️ Unable to load badge information. Please check:</p>
            <ul>
              <li>You are logged in as a tasker</li>
              <li>Your internet connection is stable</li>
              <li>The backend server is running</li>
            </ul>
            <button onClick={fetchBadgeInfo} className="btn-retry">
              🔄 Retry Loading
            </button>
          </div>
        )}

        <div className="badges-grid">
          {badgeInfo.map((badge) => {
            const elig = eligibility[badge.badge_type];
            const pendingApp = getApplicationStatus(badge.badge_type);
            const meetsAll = elig?.meets_criteria || false;

            return (
              <div key={badge.badge_type} className={`badge-card ${badge.badge_type}`}>
                <div className="badge-icon" style={{ color: badge.info.color }}>
                  {badge.info.icon}
                </div>
                <h2>{badge.info.name}</h2>
                <div className="badge-type">{badge.badge_type.toUpperCase()}</div>

                <div className="badge-benefits">
                  <h3>Benefits:</h3>
                  <ul>
                    {badge.info.benefits.map((benefit, idx) => (
                      <li key={idx}>{benefit}</li>
                    ))}
                  </ul>
                </div>

                {elig && (
                  <div className="eligibility-status">
                    <div className={`status-badge ${meetsAll ? 'eligible' : 'not-eligible'}`}>
                      {meetsAll ? '✅ Eligible' : '⏳ Not Yet Eligible'}
                    </div>
                    
                    {selectedBadge === badge.badge_type && renderCriteriaChecks(badge.badge_type)}
                    
                    <button
                      className="btn-toggle-details"
                      onClick={() => setSelectedBadge(selectedBadge === badge.badge_type ? null : badge.badge_type)}
                    >
                      {selectedBadge === badge.badge_type ? 'Hide Details' : 'View Requirements'}
                    </button>
                  </div>
                )}

                <div className="badge-actions">
                  {pendingApp ? (
                    <div className="pending-status">
                      ⏳ Application Pending
                      <small>Submitted on {new Date(pendingApp.application_date).toLocaleDateString()}</small>
                    </div>
                  ) : (
                    <button
                      className={`btn-apply ${meetsAll ? 'eligible' : 'disabled'}`}
                      onClick={() => handleApply(badge.badge_type)}
                      disabled={!meetsAll || applying}
                    >
                      {applying ? 'Applying...' : meetsAll ? 'Apply Now' : 'Not Eligible'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {applications.length > 0 && (
          <div className="applications-history">
            <h2>📋 Application History</h2>
            <div className="applications-list">
              {applications.map((app) => (
                <div key={app._id} className={`application-item ${app.status}`}>
                  <div className="app-header">
                    <span className="app-badge">{app.badge_info?.icon} {app.badge_info?.name}</span>
                    <span className={`app-status ${app.status}`}>
                      {app.status === 'pending' && '⏳ Pending'}
                      {app.status === 'approved' && '✅ Approved'}
                      {app.status === 'rejected' && '❌ Rejected'}
                    </span>
                  </div>
                  <div className="app-details">
                    <small>Applied: {new Date(app.application_date).toLocaleDateString()}</small>
                    {app.reviewed_at && (
                      <small>Reviewed: {new Date(app.reviewed_at).toLocaleDateString()}</small>
                    )}
                    {app.admin_notes && (
                      <div className="admin-notes">
                        <strong>Admin Notes:</strong> {app.admin_notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
