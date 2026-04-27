import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import LoadingScreen from '../../components/LoadingScreen';
import './TaskerDetails.css';

export default function TaskerDetails() {
  const { taskerId } = useParams();
  const navigate = useNavigate();
  const [tasker, setTasker] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTaskerDetails = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch tasker details
      const userResponse = await api.get(`/users/${taskerId}`);
      setTasker(userResponse.data);

      // Fetch tasker's services
      const servicesResponse = await api.get(`/services?tasker_id=${taskerId}`);
      setServices(servicesResponse.data);
    } catch (error) {
      console.error('Failed to fetch tasker details:', error);
      toast.error('Failed to load tasker details');
    } finally {
      setLoading(false);
    }
  }, [taskerId]);

  useEffect(() => {
    fetchTaskerDetails();
  }, [fetchTaskerDetails]);

  const handleChatWithTasker = async () => {
    try {
      // Check if chat already exists
      const response = await api.get('/chat/conversations');
      const existingChat = response.data.find(chat => chat.tasker_id === taskerId);
      
      if (existingChat) {
        navigate(`/customer/chat/${existingChat._id}`);
      } else {
        // Create initial message to start chat
        const chatResponse = await api.post('/chat/send', {
          recipient_id: taskerId,
          content: 'Hello! I would like to discuss your services.'
        });
        
        if (chatResponse.data.chat_id) {
          navigate(`/customer/chat/${chatResponse.data.chat_id}`);
        }
      }
    } catch (error) {
      console.error('Failed to start chat:', error);
      toast.error('Failed to open chat');
    }
  };

  if (loading) {
    return (
      <>  <LoadingScreen message="Firing Up The Engines" />      </>
    );
  }

  if (!tasker) {
    return (
      <>        <div className="tasker-details-container">
          <div className="error-state">
            <h2>Tasker Not Found</h2>
            <button onClick={() => navigate('/customer/taskers')}>
              Back to Taskers
            </button>
          </div>
        </div>      </>
    );
  }

  return (
    <>      <div className="tasker-details-container">
      {/* Header */}
      <div className="tasker-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      {/* Tasker Profile Card */}
      <div className="tasker-profile-card">
        <div className="profile-top">
          <div className="profile-avatar">
            {tasker.profile_picture ? (
              <img src={tasker.profile_picture} alt={tasker.name} />
            ) : (
              <div className="avatar-placeholder">
                {tasker.name?.charAt(0) || 'T'}
              </div>
            )}
          </div>
          <div className="profile-info">
            <div className="name-section">
              <h1>{tasker.name}</h1>
              {tasker.professional_badge && (
                <span className="badge-professional">✓ Professional</span>
              )}
              {tasker.tasker_type === 'helper' && (
                <span className="badge-helper">Helper</span>
              )}
            </div>
            <p className="tagline">{tasker.tagline || 'Professional Service Provider'}</p>
            
            <div className="stats-row">
              <div className="stat-item">
                <span className="stat-value">{tasker.rating?.toFixed(1) || '5.0'}</span>
                <span className="stat-label">⭐ Rating</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{tasker.completed_jobs || 0}</span>
                <span className="stat-label">Jobs Completed</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{tasker.experience_years || 0}+</span>
                <span className="stat-label">Years Experience</span>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <button className="btn-chat" onClick={handleChatWithTasker}>
            💬 Chat with {tasker.name?.split(' ')[0]}
          </button>
        </div>
      </div>

      {/* About Section */}
      <div className="details-section">
        <h2>📝 About</h2>
        <div className="details-card">
          <p>{tasker.bio || 'No bio available.'}</p>
        </div>
      </div>

      {/* Skills Section */}
      {tasker.skills && tasker.skills.length > 0 && (
        <div className="details-section">
          <h2>🛠️ Skills</h2>
          <div className="details-card">
            <div className="skills-grid">
              {tasker.skills.map((skill, index) => (
                <div key={index} className="skill-chip">
                  {skill}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Languages Section */}
      {tasker.languages_spoken && tasker.languages_spoken.length > 0 && (
        <div className="details-section">
          <h2>🗣️ Languages</h2>
          <div className="details-card">
            <div className="languages-list">
              {tasker.languages_spoken.map((lang, index) => (
                <span key={index} className="language-chip">
                  {lang}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Contact Information */}
      <div className="details-section">
        <h2>📞 Contact Information</h2>
        <div className="details-card">
          <div className="contact-grid">
            <div className="contact-item">
              <span className="contact-label">📧 Email:</span>
              <span className="contact-value">{tasker.email}</span>
            </div>
            {tasker.phone && (
              <div className="contact-item">
                <span className="contact-label">📱 Phone:</span>
                <span className="contact-value">{tasker.phone}</span>
              </div>
            )}
            {tasker.location && (
              <div className="contact-item">
                <span className="contact-label">📍 Location:</span>
                <span className="contact-value">{tasker.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="details-section">
        <h2>🔧 Services Offered ({services.length})</h2>
        {services.length === 0 ? (
          <div className="details-card">
            <p className="empty-text">No services available yet.</p>
          </div>
        ) : (
          <div className="services-grid">
            {services.map(service => (
              <div 
                key={service._id} 
                className="service-card"
                onClick={() => navigate(`/customer/services/${service._id}`)}
              >
                <div className="service-header">
                  <h3>{service.title}</h3>
                  {service.is_active ? (
                    <span className="status-active">Active</span>
                  ) : (
                    <span className="status-inactive">Inactive</span>
                  )}
                </div>
                <p className="service-description">
                  {service.description?.substring(0, 120)}...
                </p>
                <div className="service-footer">
                  <span className="service-category">
                    {service.category?.replace('_', ' ')}
                  </span>
                  <span className="service-price">
                    ₹{service.price}/{service.price_unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>    </>
  );
}
