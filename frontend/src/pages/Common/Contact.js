import React, { useState } from 'react';
import config from '../../config';
import { useNavigate } from 'react-router-dom';
import './Contact.css';

export default function Contact() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      
      // If user is logged in, create a support ticket
      if (token) {
        const res = await fetch(`${config.API_BASE_URL}/support/tickets/create`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            category: 'general',
            subject: formData.subject,
            description: formData.message,
            is_complaint: false
          })
        });
        if (!res.ok) throw new Error('Failed to send message');
      } else {
        // If not logged in, create as contact message (anonymous)
        const res = await fetch(`${config.API_BASE_URL}/contact-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error('Failed to send message');
      }
      
      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      alert('Failed to send message. Please try again later.');
    }
  };

  return (
    <>
      <div className="contact-page">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="contact-container">
          <div className="contact-content">
            <div className="info-card">
              <div className="info-icon">📧</div>
              <h3>Email</h3>
              <p>caretrustedhands@gmail.com</p>
              <p className="info-note">We'll respond within 24 hours</p>
            </div>
            <div className="info-card">
              <div className="info-icon">📞</div>
              <h3>Phone</h3>
              <p>+91 (555) 123-4567</p>
              <p className="info-note">Available 24/7</p>
            </div>
            <div className="info-card">
              <div className="info-icon">📍</div>
              <h3>Address</h3>
              <p>Punjab Engineering College, Sector-12, Chandigarh</p>
            </div>
            <div className="info-card">
              <div className="info-icon">🕐</div>
              <h3>Business Hours</h3>
              <p>Monday - Friday: 9am - 6pm</p>
              <p>Weekend: 10am - 4pm</p>
            </div>
          </div>
          <div className="contact-form-section">
            <h2>Send us a Message</h2>
            {submitted ? (
              <div className="success-message">
                <div className="success-icon">✓</div>
                <h3>Thank you for contacting us!</h3>
                <p>We've received your message and will get back to you soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contact-form">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Your full name"
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="your.email@example.com"
                  />
                </div>
                <div className="form-group">
                  <label>Subject *</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    placeholder="How can we help?"
                  />
                </div>
                <div className="form-group">
                  <label>Message *</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows="6"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>
                <button type="submit" className="submit-button">
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>    </>
  );
}
