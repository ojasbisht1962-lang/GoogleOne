import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import './SupportTickets.css';

export default function SupportTickets() {
  const [activeTab, setActiveTab] = useState('all'); // all, ai, human, critical, complaints
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  
  // Complaint review states
  const [reviewResult, setReviewResult] = useState('refund_full');
  const [reviewNotes, setReviewNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState('');

  useEffect(() => {
    fetchStatistics();
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/support/admin/statistics');
      setStatistics(response.data.statistics);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let tier = null;
      let status = null;

      if (activeTab === 'ai') tier = 'ai';
      if (activeTab === 'human') tier = 'human';
      
      const params = new URLSearchParams();
      if (tier) params.append('tier', tier);
      if (status) params.append('status', status);

      const response = await api.get(`/support/admin/tickets/all?${params}`);
      let ticketsList = response.data.tickets || [];

      // Filter critical or complaints if needed
      if (activeTab === 'critical') {
        ticketsList = ticketsList.filter(t => t.priority === 'critical');
      }
      if (activeTab === 'complaints') {
        ticketsList = ticketsList.filter(t => t.is_complaint === true);
      }

      setTickets(ticketsList);
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
      setResolutionNotes(ticketRes.data.ticket.resolution_notes || '');
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      toast.error('Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      const updateData = { status: newStatus };
      if (newStatus === 'resolved' && resolutionNotes.trim()) {
        updateData.resolution_notes = resolutionNotes;
      }

      await api.put(`/support/admin/tickets/${selectedTicket._id}/update`, updateData);
      toast.success('Ticket status updated!');
      fetchTicketDetails(selectedTicket._id);
      fetchTickets();
      fetchStatistics();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleAssignToMe = async () => {
    try {
      await api.put(`/support/admin/tickets/${selectedTicket._id}/update`, {
        assigned_to: 'current_admin_id' // This will be set from backend
      });
      toast.success('Ticket assigned to you!');
      fetchTicketDetails(selectedTicket._id);
      fetchTickets();
    } catch (error) {
      console.error('Error assigning ticket:', error);
      toast.error('Failed to assign ticket');
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
      fetchTicketDetails(selectedTicket._id);
      toast.success('Message sent!');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleTriggerAIReview = async () => {
    if (!selectedTicket?.is_complaint) return;
    
    setLoading(true);
    try {
      await api.post(`/support/complaints/${selectedTicket._id}/ai-review`);
      toast.success('AI review completed! Check the results below.');
      fetchTicketDetails(selectedTicket._id);
    } catch (error) {
      console.error('Error triggering AI review:', error);
      toast.error('Failed to trigger AI review');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAdminReview = async (e) => {
    e.preventDefault();
    
    if (!selectedTicket?.is_complaint) return;
    if (!reviewNotes.trim()) {
      toast.error('Please add review notes');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ticket_id: selectedTicket._id,
        review_result: reviewResult,
        review_notes: reviewNotes,
        refund_amount: refundAmount ? parseFloat(refundAmount) : null,
        penalty_amount: penaltyAmount ? parseFloat(penaltyAmount) : null
      };

      await api.post(`/support/complaints/${selectedTicket._id}/admin-review`, payload);
      
      toast.success('✅ Complaint resolved! Escrow has been unfrozen.');
      setReviewNotes('');
      setRefundAmount('');
      setPenaltyAmount('');
      fetchTicketDetails(selectedTicket._id);
      fetchTickets();
      fetchStatistics();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityMeta = (priority) => {
    const priorityMeta = {
      low: { color: '#00E676', textColor: '#111827' },
      medium: { color: '#FDB913', textColor: '#111827' },
      high: { color: '#FF9800', textColor: '#111827' },
      critical: { color: '#F44336', textColor: '#FFFFFF' }
    };
    return priorityMeta[priority] || priorityMeta.low;
  };

  const getPriorityColor = (priority) => {
    return getPriorityMeta(priority).color;
  };

  const getStatusMeta = (status) => {
    const statusMeta = {
      open: { color: '#2196F3', textColor: '#FFFFFF' },
      in_progress: { color: '#FDB913', textColor: '#111827' },
      waiting_customer: { color: '#FF9800', textColor: '#111827' },
      escalated: { color: '#F44336', textColor: '#FFFFFF' },
      resolved: { color: '#00E676', textColor: '#111827' },
      closed: { color: '#666', textColor: '#FFFFFF' }
    };
    return statusMeta[status] || statusMeta.open;
  };

  const getPriorityIcon = (priority) => {
    const icons = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    };
    return icons[priority] || '🟢';
  };

  return (
    <div className="support-tickets-page">
      <div className="support-admin-container">
        <div className="admin-header">
          <h1>🎧 Support Tickets Management</h1>
          <p>Manage customer support tickets - AI & Human tiers</p>
        </div>

        {/* Statistics Dashboard */}
        {statistics && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-value">{statistics.total_tickets}</div>
                <div className="stat-label">Total Tickets</div>
              </div>
            </div>
            <div className="stat-card open">
              <div className="stat-icon">📂</div>
              <div className="stat-content">
                <div className="stat-value">{statistics.open_tickets}</div>
                <div className="stat-label">Open</div>
              </div>
            </div>
            <div className="stat-card progress">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <div className="stat-value">{statistics.in_progress}</div>
                <div className="stat-label">In Progress</div>
              </div>
            </div>
            <div className="stat-card resolved">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-value">{statistics.resolved_tickets}</div>
                <div className="stat-label">Resolved</div>
              </div>
            </div>
            <div className="stat-card ai">
              <div className="stat-icon">🤖</div>
              <div className="stat-content">
                <div className="stat-value">{statistics.ai_handled}</div>
                <div className="stat-label">AI Tier</div>
              </div>
            </div>
            <div className="stat-card human">
              <div className="stat-icon">👤</div>
              <div className="stat-content">
                <div className="stat-value">{statistics.human_escalated}</div>
                <div className="stat-label">Human Tier</div>
              </div>
            </div>
            <div className="stat-card critical">
              <div className="stat-icon">🚨</div>
              <div className="stat-content">
                <div className="stat-value">{statistics.critical_priority}</div>
                <div className="stat-label">Critical</div>
              </div>
            </div>
            <div className="stat-card escalated">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <div className="stat-value">{statistics.auto_escalated}</div>
                <div className="stat-label">Auto-Escalated</div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button
            className={`filter-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            📋 All Tickets
          </button>
          <button
            className={`filter-btn ${activeTab === 'human' ? 'active' : ''}`}
            onClick={() => setActiveTab('human')}
          >
            👤 Human Tier
          </button>
          <button
            className={`filter-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            🤖 AI Tier
          </button>
          <button
            className={`filter-btn ${activeTab === 'critical' ? 'active' : ''}`}
            onClick={() => setActiveTab('critical')}
          >
            🚨 Critical
          </button>
          <button
            className={`filter-btn ${activeTab === 'complaints' ? 'active' : ''}`}
            onClick={() => setActiveTab('complaints')}
          >
            ⚠️ Complaints
          </button>
        </div>

        {/* Tickets View */}
        <div className="admin-content">
          {/* Tickets List */}
          <div className="admin-tickets-list">
            {loading && !selectedTicket ? (
              <div className="loading">⏳ Loading...</div>
            ) : tickets.length === 0 ? (
              <div className="no-tickets">No tickets found</div>
            ) : (
              tickets.map(ticket => (
                <div
                  key={ticket._id}
                  className={`admin-ticket-card ${selectedTicket?._id === ticket._id ? 'selected' : ''}`}
                  onClick={() => fetchTicketDetails(ticket._id)}
                  style={{ borderLeftColor: getPriorityColor(ticket.priority) }}
                >
                  <div className="ticket-card-header">
                    <div>
                      <span className="ticket-num">{ticket.ticket_number}</span>
                      <span className="ticket-tier">
                        {ticket.tier === 'ai' ? '🤖' : '👤'}
                      </span>
                    </div>
                    <span
                      className="priority-indicator"
                      style={{
                        background: getPriorityMeta(ticket.priority).color,
                        color: getPriorityMeta(ticket.priority).textColor
                      }}
                    >
                      {getPriorityIcon(ticket.priority)} {ticket.priority.toUpperCase()}
                    </span>
                  </div>
                  <h4>{ticket.subject}</h4>
                  <p className="ticket-desc">{ticket.description.substring(0, 100)}...</p>
                  <div className="ticket-meta">
                    <span
                      className="status-pill"
                      style={{
                        background: getStatusMeta(ticket.status).color,
                        color: getStatusMeta(ticket.status).textColor
                      }}
                    >
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <span className="ticket-time">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {ticket.auto_escalated && (
                    <div className="auto-escalated-badge">⚠️ Auto-Escalated</div>
                  )}
                  {ticket.is_complaint && (
                    <div className="complaint-badge">⚠️ COMPLAINT</div>
                  )}
                  {ticket.escrow_frozen && (
                    <div className="escrow-frozen-badge">🔒 Escrow Frozen</div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Ticket Detail Panel */}
          {selectedTicket && (
            <div className="ticket-detail-panel">
              <div className="panel-header">
                <div>
                  <h2>{selectedTicket.ticket_number}</h2>
                  <h3>{selectedTicket.subject}</h3>
                </div>
                <div className="panel-badges">
                  <span
                    className="tier-badge"
                    style={{
                      background: selectedTicket.tier === 'ai' ? '#2196F3' : '#FDB913',
                      color: selectedTicket.tier === 'ai' ? '#FFFFFF' : '#111827'
                    }}
                  >
                    {selectedTicket.tier === 'ai' ? '🤖 AI' : '👤 Human'}
                  </span>
                  <span className="priority-badge" style={{
                    background: getPriorityMeta(selectedTicket.priority).color,
                    color: getPriorityMeta(selectedTicket.priority).textColor
                  }}>
                    {getPriorityIcon(selectedTicket.priority)} {selectedTicket.priority}
                  </span>
                </div>
              </div>

              <div className="detail-info">
                <div className="info-row">
                  <strong>Customer:</strong> {selectedTicket.user_name} ({selectedTicket.user_email})
                </div>
                <div className="info-row">
                  <strong>Category:</strong> {selectedTicket.category.replace('_', ' ')}
                </div>
                <div className="info-row">
                  <strong>Created:</strong> {new Date(selectedTicket.created_at).toLocaleString()}
                </div>
                {selectedTicket.escalation_reason && (
                  <div className="info-row escalation">
                    <strong>🚨 Escalation Reason:</strong> {selectedTicket.escalation_reason}
                  </div>
                )}
                {selectedTicket.assigned_agent_name && (
                  <div className="info-row">
                    <strong>Assigned To:</strong> {selectedTicket.assigned_agent_name}
                  </div>
                )}
              </div>

              {/* Complaint-Specific Info */}
              {selectedTicket.is_complaint && (
                <div className="complaint-info-section">
                  <h4>⚠️ Complaint Details</h4>
                  <div className="complaint-details">
                    <div className="info-row">
                      <strong>Complaint Against:</strong> {selectedTicket.complaint_against_name} (ID: {selectedTicket.complaint_against_id})
                    </div>
                    <div className="info-row">
                      <strong>Booking ID:</strong> {selectedTicket.booking_id || 'N/A'}
                    </div>
                    <div className="info-row">
                      <strong>Payment ID:</strong> {selectedTicket.payment_id_affected || 'N/A'}
                    </div>
                    <div className="info-row">
                      <strong>Escrow Status:</strong> 
                      <span className={`escrow-status ${selectedTicket.escrow_frozen ? 'frozen' : 'active'}`}>
                        {selectedTicket.escrow_frozen ? '🔒 FROZEN' : '✅ Active'}
                      </span>
                    </div>
                    {selectedTicket.evidence_urls && selectedTicket.evidence_urls.length > 0 && (
                      <div className="info-row">
                        <strong>Evidence:</strong>
                        <div className="evidence-gallery">
                          {selectedTicket.evidence_urls.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="evidence-link">
                              📎 Evidence {idx + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedTicket.evidence_description && (
                      <div className="info-row">
                        <strong>Evidence Description:</strong>
                        <p>{selectedTicket.evidence_description}</p>
                      </div>
                    )}
                  </div>

                  {/* AI Review Results */}
                  {selectedTicket.ai_review_completed && (
                    <div className="ai-review-results">
                      <h5>🤖 AI Review Results</h5>
                      <div className="review-card">
                        <div className="review-result">
                          <strong>Decision:</strong> 
                          <span className={`result-badge ${selectedTicket.ai_review_result}`}>
                            {selectedTicket.ai_review_result === 'favor_customer' && '👍 Favor Customer'}
                            {selectedTicket.ai_review_result === 'favor_provider' && '👎 Favor Provider'}
                            {selectedTicket.ai_review_result === 'needs_human' && '🤔 Needs Human Review'}
                          </span>
                        </div>
                        <div className="review-confidence">
                          <strong>Confidence:</strong> {(selectedTicket.ai_review_confidence * 100).toFixed(0)}%
                        </div>
                        <div className="review-notes">
                          <strong>Notes:</strong> {selectedTicket.ai_review_notes}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trigger AI Review Button */}
                  {!selectedTicket.ai_review_completed && (
                    <button onClick={handleTriggerAIReview} className="ai-review-btn" disabled={loading}>
                      {loading ? '⏳ Analyzing...' : '🤖 Trigger AI Review'}
                    </button>
                  )}

                  {/* Admin Review Form */}
                  {!selectedTicket.admin_review_completed && (
                    <div className="admin-review-form">
                      <h5>👨‍⚖️ Admin Final Review</h5>
                      <form onSubmit={handleSubmitAdminReview}>
                        <div className="form-group">
                          <label>Resolution Decision:</label>
                          <select
                            value={reviewResult}
                            onChange={(e) => setReviewResult(e.target.value)}
                            required
                          >
                            <option value="refund_full">💰 Full Refund to Customer</option>
                            <option value="refund_partial">💵 Partial Refund to Customer</option>
                            <option value="penalty_provider">⚠️ Penalty to Provider</option>
                            <option value="no_action">❌ No Action Required</option>
                          </select>
                        </div>

                        {(reviewResult === 'refund_full' || reviewResult === 'refund_partial') && (
                          <div className="form-group">
                            <label>Refund Amount (₹):</label>
                            <input
                              type="number"
                              value={refundAmount}
                              onChange={(e) => setRefundAmount(e.target.value)}
                              placeholder="Enter refund amount"
                              step="0.01"
                              required
                            />
                          </div>
                        )}

                        {reviewResult === 'penalty_provider' && (
                          <div className="form-group">
                            <label>Penalty Amount (₹):</label>
                            <input
                              type="number"
                              value={penaltyAmount}
                              onChange={(e) => setPenaltyAmount(e.target.value)}
                              placeholder="Enter penalty amount"
                              step="0.01"
                              required
                            />
                          </div>
                        )}

                        <div className="form-group">
                          <label>Review Notes:</label>
                          <textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder="Explain your decision..."
                            rows="4"
                            required
                          />
                        </div>

                        <button type="submit" className="submit-review-btn" disabled={loading}>
                          {loading ? '⏳ Submitting...' : '✅ Submit Final Resolution'}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Admin Review Completed */}
                  {selectedTicket.admin_review_completed && (
                    <div className="admin-review-completed">
                      <h5>✅ Admin Review Completed</h5>
                      <div className="review-card">
                        <div className="review-result">
                          <strong>Decision:</strong> 
                          <span className="result-badge">
                            {selectedTicket.admin_review_result === 'refund_full' && '💰 Full Refund'}
                            {selectedTicket.admin_review_result === 'refund_partial' && '💵 Partial Refund'}
                            {selectedTicket.admin_review_result === 'penalty_provider' && '⚠️ Provider Penalty'}
                            {selectedTicket.admin_review_result === 'no_action' && '❌ No Action'}
                          </span>
                        </div>
                        {selectedTicket.refund_amount && (
                          <div className="review-amount">
                            <strong>Refund Amount:</strong> ₹{selectedTicket.refund_amount}
                          </div>
                        )}
                        {selectedTicket.penalty_amount && (
                          <div className="review-amount">
                            <strong>Penalty Amount:</strong> ₹{selectedTicket.penalty_amount}
                          </div>
                        )}
                        <div className="review-notes">
                          <strong>Notes:</strong> {selectedTicket.admin_review_notes}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="action-buttons">
                <button onClick={handleAssignToMe} className="assign-btn">
                  👤 Assign to Me
                </button>
                <button onClick={() => handleUpdateStatus('in_progress')} className="status-btn progress">
                  ⏳ In Progress
                </button>
                <button onClick={() => handleUpdateStatus('waiting_customer')} className="status-btn waiting">
                  ⏸️ Waiting Customer
                </button>
                <button onClick={() => handleUpdateStatus('resolved')} className="status-btn resolved">
                  ✅ Resolve
                </button>
              </div>

              {/* Messages */}
              <div className="messages-section">
                <h4>💬 Conversation</h4>
                <div className="messages-box">
                  {ticketMessages.length === 0 ? (
                    <p className="no-msgs">No messages yet</p>
                  ) : (
                    ticketMessages.map(msg => (
                      <div key={msg._id} className={`msg ${msg.sender_type}`}>
                        <div className="msg-header">
                          <strong>
                            {msg.sender_type === 'agent' && '👤 '}
                            {msg.sender_type === 'ai' && '🤖 '}
                            {msg.sender_type === 'customer' && '👨‍💼 '}
                            {msg.sender_name}
                          </strong>
                          <span>{new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                        <p>{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="msg-form">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your response..."
                    rows="3"
                  />
                  <button type="submit">📤 Send</button>
                </form>
              </div>

              {/* Resolution Notes */}
              <div className="resolution-section">
                <h4>📝 Resolution Notes</h4>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Enter resolution details..."
                  rows="4"
                />
              </div>
            </div>
          )}
        </div>
      </div>    </div>
  );
}
