import React from 'react';
import { useNavigate } from 'react-router-dom';
// ...existing code...
import './About.css';

export default function About() {
  const navigate = useNavigate();

  return (
    <>
      <div className="about-page">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="about-container">
        
        <section className="about-section">
          <h2>Who We Are</h2>
          <p>
            TrustedHands is India's leading marketplace connecting customers with skilled service providers.
            Whether you need home repairs, professional services, or specialized tasks, we've got you covered.
            Our platform brings together thousands of verified professionals ready to serve you.
          </p>
        </section>

        <section className="about-section">
          <h2>Our Mission</h2>
          <p>
            To create a trusted platform where customers can find reliable service providers,
            and professionals can grow their businesses while delivering exceptional service.
            We believe in empowering local talent and making quality services accessible to everyone.
          </p>
        </section>

        <section className="about-section">
          <h2>Why Choose TrustedHands</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>✓ Verified Taskers</h3>
              <p>All service providers are verified and background-checked for your safety</p>
            </div>
            <div className="feature-card">
              <h3>✓ Secure Payments</h3>
              <p>Safe and encrypted payment processing with multiple options</p>
            </div>
            <div className="feature-card">
              <h3>✓ Quality Assurance</h3>
              <p>Rating system ensures high-quality service delivery every time</p>
            </div>
            <div className="feature-card">
              <h3>✓ 24/7 Support</h3>
              <p>Customer support available whenever you need help</p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>AMC Services</h2>
          <p>
            We offer Annual Maintenance Contracts (AMC) for businesses, societies, and large organizations 
            requiring regular service maintenance. Our AMC services ensure consistent quality and dedicated 
            support throughout the year.
          </p>
        </section>

        <section className="about-section">
          <h2>Safety & Trust</h2>
          <ul className="values-list">
            <li><strong>Background verification</strong> for all professionals</li>
            <li><strong>Secure payment</strong> processing</li>
            <li><strong>Rating and review</strong> system</li>
            <li><strong>Customer support</strong> available 24/7</li>
            <li><strong>Service quality</strong> guarantee</li>
          </ul>
        </section>

        <section className="about-section">
          <h2>Contact Us</h2>
          <p><strong>Email:</strong> caretrustedhands@gmail.com</p>
          <p><strong>Phone:</strong> +91 (555) 123-4567</p>
          <p><strong>Address:</strong> Punjab Engineering College, Sector-12, Chandigarh</p>
        </section>
      </div>
    </div>    </>
  );
}
