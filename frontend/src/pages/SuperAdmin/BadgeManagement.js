import React, { useState, useEffect } from 'react';
import { badgeService } from '../../services/apiService';
import { toast } from 'react-toastify';
import './BadgeManagement.css';

export default function BadgeManagement() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedApp, setSelectedApp] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const data = await badgeService.getAllApplications(filter);
      setApplications(data);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (applicationId, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this application?`)) {
      return;
    }

    setProcessing(true);
    try {
      await badgeService.reviewApplication(applicationId, action, adminNotes);
      toast.success(`Application ${action}d successfully!`);
      setSelectedApp(null);
      setAdminNotes('');
      await fetchApplications();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action} application`);
    } finally {
      setProcessing(false);
    }
  };

  const getBadgeIcon = (badgeType) => {
    const icons = {
      bronze: '🥉',
      silver: '🥈',
      gold: '🥇'
    };
    return icons[badgeType] || '🏆';
  };

  const getBadgeName = (badgeType) => {
    const names = {
      bronze: 'Verified Professional',
      silver: 'Trusted Expert',
      gold: 'Elite Professional'
    };
    return names[badgeType] || badgeType;
  };

  if (loading) {
    return (
      <>
        <div className="badge-management-container">
          <div className="loading">Loading applications...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="badge-management-container">
        <div className="page-header">
          <h1>🏆 Badge Applications Management</h1>
          <p>Review and approve professional badge applications</p>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button
            className={`tab ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending ({applications.filter(a => a.status === 'pending').length})
          </button>
          <button
            className={`tab ${filter === 'approved' ? 'active' : ''}`}
            onClick={() => setFilter('approved')}
          >
            Approved
          </button>
          <button
            className={`tab ${filter === 'rejected' ? 'active' : ''}`}
            onClick={() => setFilter('rejected')}
          >
            Rejected
          </button>
          <button
            className={`tab ${filter === '' ? 'active' : ''}`}
            onClick={() => setFilter('')}
          >
            All
          </button>
        </div>

        {/* Applications List */}
        <div className="applications-container">
          {applications.length === 0 ? (
            <div className="no-applications">
              <p>No {filter} applications found</p>
            </div>
          ) : (
            <div className="applications-grid">
              {applications.map((app) => (
                <div key={app._id} className={`application-card ${app.status}`}>
                  <div className="card-header">
                    <div className="badge-info">
                      <span className="badge-icon">{getBadgeIcon(app.badge_type)}</span>
                      <div>
                        <h3>{getBadgeName(app.badge_type)}</h3>
                        <p className="badge-type">{app.badge_type.toUpperCase()}</p>
                      </div>
                    </div>
                    <span className={`status-badge ${app.status}`}>
                      {app.status}
                    </span>
                  </div>

                  <div className="tasker-info">
                    <h4>Tasker Information</h4>
                    <p><strong>Name:</strong> {app.tasker_name}</p>
                    <p><strong>Email:</strong> {app.tasker_email}</p>
                  </div>

                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-label">Bookings</span>
                      <span className="stat-value">{app.total_bookings}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Rating</span>
                      <span className="stat-value">⭐ {app.average_rating}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Reviews</span>
                      <span className="stat-value">{app.total_reviews}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Account Age</span>
                      <span className="stat-value">{app.account_age_days}d</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Cancel Rate</span>
                      <span className="stat-value">{app.cancellation_rate}%</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">On-Time</span>
                      <span className="stat-value">{app.on_time_completion_rate}%</span>
                    </div>
                  </div>

                  <div className="eligibility-status">
                    <span className={`eligibility-badge ${app.meets_criteria ? 'met' : 'not-met'}`}>
                      {app.meets_criteria ? '✅ Meets All Criteria' : '⚠️ Missing Some Criteria'}
                    </span>
                  </div>

                  <div className="dates">
                    <small>Applied: {new Date(app.application_date).toLocaleString()}</small>
                    {app.reviewed_at && (
                      <small>Reviewed: {new Date(app.reviewed_at).toLocaleString()}</small>
                    )}
                  </div>

                  {app.admin_notes && (
                    <div className="admin-notes">
                      <strong>Admin Notes:</strong> {app.admin_notes}
                    </div>
                  )}

                  {app.status === 'pending' && (
                    <div className="actions">
                      <button
                        className="btn-expand"
                        onClick={() => setSelectedApp(selectedApp === app._id ? null : app._id)}
                      >
                        {selectedApp === app._id ? 'Hide Details' : 'Review Application'}
                      </button>

                      {selectedApp === app._id && (
                        <div className="review-form">
                          <textarea
                            placeholder="Admin notes (optional)"
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            rows="3"
                          />
                          <div className="review-buttons">
                            <button
                              className="btn-approve"
                              onClick={() => handleReview(app._id, 'approve')}
                              disabled={processing}
                            >
                              ✅ Approve
                            </button>
                            <button
                              className="btn-reject"
                              onClick={() => handleReview(app._id, 'reject')}
                              disabled={processing}
                            >
                              ❌ Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
