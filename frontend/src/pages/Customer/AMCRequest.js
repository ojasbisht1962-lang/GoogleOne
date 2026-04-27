import React, { useState, useEffect } from 'react';
import { amcService } from '../../services/apiService';
import { toast } from 'react-toastify';
import LoadingScreen from '../../components/LoadingScreen';
import './AMCRequest.css';

export default function AMCRequest() {
  const [amcRequests, setAmcRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    service_types: [],
    description: '',
    duration_months: 12,
    frequency: 'monthly',
    preferred_days: [],
    preferred_time: '',
    estimated_budget: ''
  });

  const serviceTypes = [
    { label: 'Cleaning', value: 'cleaning' },
    { label: 'Maintenance', value: 'maintenance' },
    { label: 'Security', value: 'security' },
    { label: 'Landscaping', value: 'landscaping' },
    { label: 'Electrical', value: 'electrical' },
    { label: 'Plumbing', value: 'plumbing' },
    { label: 'AC Servicing', value: 'ac_servicing' },
    { label: 'Pest Control', value: 'pest_control' },
    { label: 'Other', value: 'other' }
  ];

  const frequencyOptions = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Bi-Weekly', value: 'bi-weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' }
  ];

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    fetchAMCRequests();
  }, []);

  const fetchAMCRequests = async () => {
    try {
      setLoading(true);
      const data = await amcService.getMyAMCRequests();
      setAmcRequests(data);
    } catch (error) {
      toast.error('Failed to load AMC requests');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      if (name === 'service_types') {
        const updatedServices = checked
          ? [...formData.service_types, value]
          : formData.service_types.filter(s => s !== value);
        setFormData(prev => ({ ...prev, service_types: updatedServices }));
      } else if (name === 'preferred_days') {
        const updatedDays = checked
          ? [...formData.preferred_days, value]
          : formData.preferred_days.filter(d => d !== value);
        setFormData(prev => ({ ...prev, preferred_days: updatedDays }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (formData.service_types.length === 0) {
      toast.error('Please select at least one service type');
      return;
    }

    try {
      // Prepare data for backend
      const submitData = {
        ...formData,
        estimated_budget: formData.estimated_budget ? parseFloat(formData.estimated_budget) : null
      };

      await amcService.createAMC(submitData);
      toast.success('AMC request submitted successfully! Our team will review it shortly.');
      setShowCreateModal(false);
      resetForm();
      fetchAMCRequests();
    } catch (error) {
      console.error('AMC creation error:', error);
      toast.error(error.response?.data?.detail || 'Failed to create AMC request');
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: '',
      contact_person: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      service_types: [],
      description: '',
      duration_months: 12,
      frequency: 'monthly',
      preferred_days: [],
      preferred_time: '',
      estimated_budget: ''
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      active: '#10b981',
      expired: '#6b7280',
      cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      active: '✓',
      expired: '🕐',
      cancelled: '❌'
    };
    return icons[status] || '📋';
  };

  if (loading) {
    return (
      <>        <LoadingScreen message="Firing Up The Engines" />      </>
    );
  }

  return (
    <>      <div className="amc-container">
        <div className="amc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>📝 AMC Requests</h1>
            <p>Manage your Annual Maintenance Contracts</p>
          </div>
          <button 
            className="btn-primary"
            style={{ padding: '10px 20px', fontSize: '16px', borderRadius: '8px', fontWeight: 'bold' }}
            onClick={() => setShowCreateModal(true)}
          >
            + Create AMC Request
          </button>
        </div>

        {amcRequests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <h2>No AMC Requests</h2>
            <p>Create your first Annual Maintenance Contract request</p>
          </div>
        ) : (
          <div className="amc-grid">
            {amcRequests.map(amc => (
              <div key={amc._id} className="amc-card">
                <div className="amc-header-badge">
                  <div 
                    className="status-badge" 
                    style={{ backgroundColor: getStatusColor(amc.status) }}
                  >
                    {getStatusIcon(amc.status)} {amc.status.toUpperCase()}
                  </div>
                  <span className="amc-id">#{amc._id.slice(-6)}</span>
                </div>

                <h3>{amc.company_name || 'AMC Request'}</h3>
                {amc.service_types && amc.service_types.length > 0 && (
                  <p style={{fontSize: '14px', color: '#6b7280', marginTop: '5px'}}>
                    {amc.service_types.join(', ')}
                  </p>
                )}

                <div className="amc-details">
                  {amc.contact_person && (
                    <div className="detail-row">
                      <span className="label">� Contact:</span>
                      <span className="value">{amc.contact_person}</span>
                    </div>
                  )}
                  {amc.contact_email && (
                    <div className="detail-row">
                      <span className="label">📧 Email:</span>
                      <span className="value">{amc.contact_email}</span>
                    </div>
                  )}
                  {amc.contact_phone && (
                    <div className="detail-row">
                      <span className="label">📞 Phone:</span>
                      <span className="value">{amc.contact_phone}</span>
                    </div>
                  )}
                  {amc.address && (
                    <div className="detail-row">
                      <span className="label">📍 Address:</span>
                      <span className="value">{amc.address}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="label">⏱️ Duration:</span>
                    <span className="value">{amc.duration_months} months</span>
                  </div>
                  {amc.frequency && (
                    <div className="detail-row">
                      <span className="label">🔄 Frequency:</span>
                      <span className="value">{amc.frequency}</span>
                    </div>
                  )}
                  {amc.start_date && (
                    <div className="detail-row">
                      <span className="label">📅 Start Date:</span>
                      <span className="value">
                        {new Date(amc.start_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {amc.end_date && (
                    <div className="detail-row">
                      <span className="label">📅 End Date:</span>
                      <span className="value">
                        {new Date(amc.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {amc.quoted_price && (
                    <div className="detail-row">
                      <span className="label">💰 Quoted Price:</span>
                      <span className="value price">₹{amc.quoted_price}</span>
                    </div>
                  )}
                </div>

                {amc.description && (
                  <div className="amc-notes">
                    <strong>Description:</strong>
                    <p>{amc.description}</p>
                  </div>
                )}

                <div className="amc-timestamp">
                  Created: {new Date(amc.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Create AMC Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create AMC Request</h2>
              <button 
                className="btn-close" 
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Company Information */}
                <div className="form-section">
                  <h3 style={{marginBottom: '15px', color: '#1f2937', fontSize: '16px'}}>Company Information</h3>
                  <div className="form-group">
                    <label>Company Name *</label>
                    <input
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleInputChange}
                      placeholder="Enter company name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Contact Person *</label>
                    <input
                      type="text"
                      name="contact_person"
                      value={formData.contact_person}
                      onChange={handleInputChange}
                      placeholder="Enter contact person name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Contact Email *</label>
                    <input
                      type="email"
                      name="contact_email"
                      value={formData.contact_email}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Contact Phone *</label>
                    <input
                      type="tel"
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Address *</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="Enter complete address"
                      required
                    />
                  </div>
                </div>

                {/* Service Details */}
                <div className="form-section">
                  <h3 style={{marginBottom: '15px', color: '#1f2937', fontSize: '16px', marginTop: '20px'}}>Service Details</h3>
                  <div className="form-group">
                    <label>Service Types * (Select at least one)</label>
                    <div className="checkbox-group" style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px'}}>
                      {serviceTypes.map(service => (
                        <label key={service.value} className="checkbox-label" style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                          <input
                            type="checkbox"
                            name="service_types"
                            value={service.value}
                            checked={formData.service_types.includes(service.value)}
                            onChange={handleInputChange}
                          />
                          {service.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Description *</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Describe your maintenance requirements in detail..."
                      rows="4"
                      required
                    />
                  </div>
                </div>

                {/* Contract Terms */}
                <div className="form-section">
                  <h3 style={{marginBottom: '15px', color: '#1f2937', fontSize: '16px', marginTop: '20px'}}>Contract Terms</h3>
                  <div className="form-group">
                    <label>Duration (Months) *</label>
                    <select
                      name="duration_months"
                      value={formData.duration_months}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="6">6 Months</option>
                      <option value="12">12 Months</option>
                      <option value="18">18 Months</option>
                      <option value="24">24 Months</option>
                      <option value="36">36 Months</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Frequency *</label>
                    <select
                      name="frequency"
                      value={formData.frequency}
                      onChange={handleInputChange}
                      required
                    >
                      {frequencyOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Preferred Days (Optional)</label>
                    <div className="checkbox-group" style={{display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px'}}>
                      {daysOfWeek.map(day => (
                        <label key={day} className="checkbox-label" style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '14px'}}>
                          <input
                            type="checkbox"
                            name="preferred_days"
                            value={day}
                            checked={formData.preferred_days.includes(day)}
                            onChange={handleInputChange}
                          />
                          {day.slice(0, 3)}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Preferred Time (Optional)</label>
                    <input
                      type="time"
                      name="preferred_time"
                      value={formData.preferred_time}
                      onChange={handleInputChange}
                      placeholder="Select preferred time"
                    />
                  </div>

                  <div className="form-group">
                    <label>Estimated Budget (₹) (Optional)</label>
                    <input
                      type="number"
                      name="estimated_budget"
                      value={formData.estimated_budget}
                      onChange={handleInputChange}
                      placeholder="Enter your estimated budget"
                      min="0"
                      step="100"
                    />
                  </div>
                </div>

                <div className="info-box">
                  <p>💡 Your AMC request will be reviewed by our team</p>
                  <p>📧 You will receive a quote within 24-48 hours</p>
                  <p>✓ Contract will be activated upon payment</p>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>    </>
  );
}