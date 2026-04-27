import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import './Support.css';

export default function TaskerSupport() {
  const [activeTab, setActiveTab] = useState('create'); // create, my-tickets, ticket-detail
  const [ticketMode, setTicketMode] = useState('ticket'); // 'ticket' or 'complaint'
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [messageText, setMessageText] = useState('');

  // Create ticket form
  const [formData, setFormData] = useState({
    category: 'booking_help',
    subject: '',
    description: '',
    booking_id: '',
    payment_id: '',
    // Complaint-specific fields
    complaint_against_id: '',
    evidence_urls: [''],
    evidence_description: ''
  });

  useEffect(() => {
    if (activeTab === 'my-tickets') {
      fetchMyTickets();
    }
  }, [activeTab]);

  const fetchMyTickets = async () => {
    setLoading(true);
    try {
      const response = await api.get('/support/tickets/my-tickets');
      setTickets(response.data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (ticketId) => {
    setLoading(true);
    try {
      const [ticketRes, messagesRes] = await Promise.all([
        api.get(`/support/tickets/${ticketId}`),
        api.get(`/support/tickets/${ticketId}/messages`)
      ]);

      setSelectedTicket(ticketRes.data.ticket);
      setTicketMessages(messagesRes.data.messages || []);
      setActiveTab('ticket-detail');
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      toast.error('Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.subject.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Additional validation for complaints
    if (ticketMode === 'complaint') {
      if (!formData.booking_id) {
        toast.error('Booking ID is required for complaints');
        return;
      }
      if (!formData.complaint_against_id) {
        toast.error('Please specify the customer you are filing a complaint against');
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = ticketMode === 'complaint' 
        ? '/support/complaints/create' 
        : '/support/tickets/create';
      
      const payload = ticketMode === 'complaint'
        ? {
            ...formData,
            evidence_urls: formData.evidence_urls.filter(url => url.trim() !== '')
          }
        : formData;

      const response = await api.post(endpoint, payload);
      
      if (response.data.success) {
        if (ticketMode === 'complaint') {
          toast.success('🚨 Complaint filed! Payment will be reviewed by admin.');
        } else {
          toast.success(
            response.data.escalated 
              ? '🚨 Ticket created and escalated to human agent!' 
              : '✅ Ticket created successfully!'
          );
        }
        
        setFormData({
          category: 'booking_help',
          subject: '',
          description: '',
          booking_id: '',
          payment_id: '',
          complaint_against_id: '',
          evidence_urls: [''],
          evidence_description: ''
        });
        setTicketMode('ticket');
        setActiveTab('my-tickets');
        fetchMyTickets();
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error(error.response?.data?.detail || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageText.trim()) return;

    try {
      await api.post('/support/tickets/add-message', {
        ticket_id: selectedTicket._id,
        message: messageText
      });

      setMessageText('');
      fetchTicketDetails(selectedTicket._id); // Refresh
      toast.success('Message sent!');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleEscalate = async () => {
    try {
      await api.post(`/support/tickets/${selectedTicket._id}/escalate?reason=User requested human assistance`);
      toast.success('🚨 Ticket escalated to human agent!');
      fetchTicketDetails(selectedTicket._id);
    } catch (error) {
      console.error('Error escalating ticket:', error);
      toast.error('Failed to escalate ticket');
    }
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      low: { color: '#00E676', textColor: '#111827', icon: '🟢', text: 'Low' },
      medium: { color: '#FDB913', textColor: '#111827', icon: '🟡', text: 'Medium' },
      high: { color: '#FF9800', textColor: '#111827', icon: '🟠', text: 'High' },
      critical: { color: '#F44336', textColor: '#FFFFFF', icon: '🔴', text: 'Critical' }
    };
    const badge = badges[priority] || badges.low;
    return (
      <span className="priority-badge" style={{ background: badge.color, color: badge.textColor }}>
        {badge.icon} {badge.text}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      open: { color: '#2196F3', textColor: '#FFFFFF', text: 'Open' },
      in_progress: { color: '#FDB913', textColor: '#111827', text: 'In Progress' },
      waiting_customer: { color: '#FF9800', textColor: '#111827', text: 'Waiting Response' },
      escalated: { color: '#F44336', textColor: '#FFFFFF', text: 'Escalated' },
      resolved: { color: '#00E676', textColor: '#111827', text: 'Resolved' },
      closed: { color: '#666', textColor: '#FFFFFF', text: 'Closed' }
    };
    const badge = badges[status] || badges.open;
    return (
      <span className="status-badge" style={{ background: badge.color, color: badge.textColor }}>
        {badge.text}
      </span>
    );
  };

  const getCategoryIcon = (category) => {
    const icons = {
      booking_help: '📅',
      payment_status: '💳',
      payment_release: '💰',
      customer_issue: '👤',
      faq: '❓',
      delay: '⏱️',
      safety_issue: '🚨',
      service_dispute: '⚠️',
      account_issue: '🔐',
      technical_issue: '🔧',
      other: '📝'
    };
    return icons[category] || '📝';
  };

  return (
    <div className="tasker-support-page">
      <div className="support-container">
        <div className="support-header">
          <h1>🎧 Tasker Support Center</h1>
          <p>Get help with bookings, payments, and customer issues</p>
        </div>

        {/* Tabs */}
        <div className="support-tabs">
          <button
            className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            ➕ Create Ticket
          </button>
          <button
            className={`tab-btn ${activeTab === 'my-tickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-tickets')}
          >
            📋 My Tickets
          </button>
        </div>

        {/* Create Ticket Tab */}
        {activeTab === 'create' && (
          <div className="create-ticket-section">
            <div className="info-banner">
              <h3>🎧 Customer Support</h3>
              <p>
                Our support team will review your issue and respond as quickly as possible. Critical issues are prioritized.
              </p>
            </div>

            {/* Ticket Mode Selector */}
            <div className="mode-selector">
              <button
                className={`mode-btn ${ticketMode === 'ticket' ? 'active' : ''}`}
                onClick={() => {
                  setTicketMode('ticket');
                  setFormData({ ...formData, category: 'payment_release' });
                }}
              >
                🎫 Support Ticket
              </button>
              <button
                className={`mode-btn ${ticketMode === 'complaint' ? 'active' : ''}`}
                onClick={() => {
                  setTicketMode('complaint');
                  setFormData({ ...formData, category: 'complaint_poor_service' });
                }}
              >
                ⚠️ File Complaint
              </button>
            </div>

            {ticketMode === 'complaint' && (
              <div className="complaint-warning">
                <strong>⚠️ Filing a Complaint:</strong> File a complaint against a customer for issues like cancellation, non-payment, or inappropriate behavior. 
                Our team will review your evidence and take appropriate action.
              </div>
            )}

            <form onSubmit={handleSubmit} className="ticket-form">
              <div className="form-group">
                <label>Category <span className="required">*</span></label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  {ticketMode === 'complaint' ? (
                    <>
                      <option value="complaint_late_arrival">⏰ Customer Late / No Show</option>
                      <option value="complaint_poor_service">👎 Customer Cancelled Last Minute</option>
                      <option value="complaint_behaviour_issue">😠 Inappropriate Behavior / Harassment</option>
                      <option value="complaint_overcharging">💰 Non-Payment / Payment Issue</option>
                    </>
                  ) : (
                    <>
                      <option value="payment_release">💰 Payment Release Issue (Human)</option>
                      <option value="payment_status">💳 Payment Status (AI)</option>
                      <option value="booking_help">📅 Booking Help (AI)</option>
                      <option value="customer_issue">👤 Customer Issue (Human)</option>
                      <option value="faq">❓ FAQs (AI)</option>
                      <option value="safety_issue">🚨 Safety Issue (Human - Critical)</option>
                      <option value="service_dispute">⚠️ Service Dispute (Human)</option>
                      <option value="account_issue">🔐 Account Issue</option>
                      <option value="technical_issue">🔧 Technical Issue</option>
                      <option value="other">📝 Other</option>
                    </>
                  )}
                </select>
                <small>
                  {ticketMode === 'complaint' 
                    ? 'All complaints are escalated to human review' 
                    : 'Categories marked with (Human) are automatically escalated'}
                </small>
              </div>

              <div className="form-group">
                <label>Subject <span className="required">*</span></label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief description of your issue"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description <span className="required">*</span></label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide detailed information about your issue..."
                  rows="6"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    Booking ID 
                    {ticketMode === 'complaint' && <span className="required">*</span>}
                    {ticketMode === 'ticket' && ' (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={formData.booking_id}
                    onChange={(e) => setFormData({ ...formData, booking_id: e.target.value })}
                    placeholder="e.g., 507f1f77bcf86cd799439011"
                    required={ticketMode === 'complaint'}
                  />
                </div>

                <div className="form-group">
                  <label>Payment ID (Optional)</label>
                  <input
                    type="text"
                    value={formData.payment_id}
                    onChange={(e) => setFormData({ ...formData, payment_id: e.target.value })}
                    placeholder="e.g., 507f1f77bcf86cd799439011"
                  />
                </div>
              </div>

              {ticketMode === 'complaint' && (
                <>
                  <div className="form-group">
                    <label>Complaint Against (Customer) <span className="required">*</span></label>
                    <input
                      type="text"
                      value={formData.complaint_against_id}
                      onChange={(e) => setFormData({ ...formData, complaint_against_id: e.target.value })}
                      placeholder="Enter customer User ID"
                      required
                    />
                    <small>Enter the User ID of the customer you're filing a complaint against</small>
                  </div>

                  <div className="form-group">
                    <label>Evidence URLs (Photos, Screenshots, Chat Logs)</label>
                    {formData.evidence_urls.map((url, index) => (
                      <div key={index} className="evidence-input-row">
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => {
                            const newUrls = [...formData.evidence_urls];
                            newUrls[index] = e.target.value;
                            setFormData({ ...formData, evidence_urls: newUrls });
                          }}
                          placeholder="https://example.com/evidence.jpg"
                        />
                        {index === formData.evidence_urls.length - 1 && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, evidence_urls: [...formData.evidence_urls, ''] })}
                            className="add-evidence-btn"
                          >
                            ➕
                          </button>
                        )}
                        {formData.evidence_urls.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newUrls = formData.evidence_urls.filter((_, i) => i !== index);
                              setFormData({ ...formData, evidence_urls: newUrls });
                            }}
                            className="remove-evidence-btn"
                          >
                            ❌
                          </button>
                        )}
                      </div>
                    ))}
                    <small>Upload evidence to support your complaint (chat screenshots, photos, etc.)</small>
                  </div>

                  <div className="form-group">
                    <label>Evidence Description</label>
                    <textarea
                      value={formData.evidence_description}
                      onChange={(e) => setFormData({ ...formData, evidence_description: e.target.value })}
                      placeholder="Describe the evidence you're providing..."
                      rows="3"
                    />
                  </div>
                </>
              )}

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? '⏳ Creating...' : ticketMode === 'complaint' ? '🚨 File Complaint' : '🚀 Submit Ticket'}
              </button>
            </form>
          </div>
        )}

        {/* My Tickets Tab */}
        {activeTab === 'my-tickets' && (
          <div className="my-tickets-section">
            {loading ? (
              <div className="loading-spinner">⏳ Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="no-tickets">
                <p>📭 No support tickets yet</p>
                <button onClick={() => setActiveTab('create')} className="create-ticket-btn">
                  ➕ Create Your First Ticket
                </button>
              </div>
            ) : (
              <div className="tickets-list">
                {tickets.map(ticket => (
                  <div key={ticket._id} className="ticket-card" onClick={() => fetchTicketDetails(ticket._id)}>
                    <div className="ticket-header">
                      <div className="ticket-number">
                        {getCategoryIcon(ticket.category)} {ticket.ticket_number}
                      </div>
                      <div className="ticket-badges">
                        {getPriorityBadge(ticket.priority)}
                        {getStatusBadge(ticket.status)}
                        <span className="tier-badge">👤 Support</span>
                      </div>
                    </div>
                    <h3>{ticket.subject}</h3>
                    <p className="ticket-description">{ticket.description}</p>
                    <div className="ticket-footer">
                      <span className="ticket-date">
                        📅 {new Date(ticket.created_at).toLocaleString()}
                      </span>
                      {ticket.auto_escalated && (
                        <span className="escalated-tag">🚨 Auto-Escalated</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ticket Detail Tab */}
        {activeTab === 'ticket-detail' && selectedTicket && (
          <div className="ticket-detail-section">
            <button className="back-btn" onClick={() => setActiveTab('my-tickets')}>
              ← Back to Tickets
            </button>

            <div className="ticket-detail-header">
              <div>
                <h2>{getCategoryIcon(selectedTicket.category)} {selectedTicket.ticket_number}</h2>
                <h3>{selectedTicket.subject}</h3>
              </div>
              <div className="detail-badges">
                {getPriorityBadge(selectedTicket.priority)}
                {getStatusBadge(selectedTicket.status)}
                <span className="tier-badge">👤 Support</span>
              </div>
            </div>

            <div className="ticket-info-box">
              <p><strong>Description:</strong> {selectedTicket.description}</p>
              <p><strong>Created:</strong> {new Date(selectedTicket.created_at).toLocaleString()}</p>
              {selectedTicket.assigned_agent_name && (
                <p><strong>Assigned To:</strong> {selectedTicket.assigned_agent_name}</p>
              )}
              {selectedTicket.escalation_reason && (
                <p className="escalation-reason">
                  <strong>🚨 Escalation Reason:</strong> {selectedTicket.escalation_reason}
                </p>
              )}
            </div>

            {/* Messages */}
            <div className="messages-container">
              <h3>💬 Conversation</h3>
              <div className="messages-list">
                {ticketMessages.length === 0 ? (
                  <p className="no-messages">No messages yet. Start the conversation!</p>
                ) : (
                  ticketMessages.map(msg => (
                    <div key={msg._id} className={`message ${msg.sender_type}`}>
                      <div className="message-header">
                        <strong>
                          {msg.sender_type === 'agent' && '👤 '}
                          {msg.sender_type === 'ai' && '🤖 '}
                          {msg.sender_type === 'tasker' && '🔧 '}
                          {msg.sender_name}
                        </strong>
                        <span className="message-time">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p>{msg.message}</p>
                    </div>
                  ))
                )}
              </div>

              {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
                <form onSubmit={handleSendMessage} className="message-form">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message..."
                    rows="3"
                  />
                  <div className="message-actions">
                    <button type="submit" className="send-btn">
                      📤 Send Message
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
