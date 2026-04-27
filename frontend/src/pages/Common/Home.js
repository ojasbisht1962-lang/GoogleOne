import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PublicNavbar from '../../components/PublicNavbar';
import './Home.css';

const Home = () => {
  const { isAuthenticated, user } = useAuth();

  const services = [
  { icon: '⚡', name: 'Electrician', category: 'electrician' },
  { icon: '🔧', name: 'Plumber', category: 'plumber' },
  { icon: '🪛', name: 'Carpenter', category: 'carpenter' },
  { icon: '❄️', name: 'AC Servicing', category: 'ac_servicing' },
  { icon: '💧', name: 'RO Servicing', category: 'ro_servicing' },
  { icon: '🧹', name: 'Home Cleaning', category: 'home_cleaning' },
  { icon: '🚗', name: 'Car Washing', category: 'car_washing' },
  { icon: '📝', name: 'Assignment Writing', category: 'assignment_writing' },
  ];

  const getDashboardLink = () => {
    if (!isAuthenticated) return '/login';
    if (user?.role === 'customer') return '/customer/dashboard';
    if (user?.role === 'tasker') return '/tasker/dashboard';
    if (user?.role === 'superadmin') return '/admin/dashboard';
    return '/login';
  };

  return (
    <div className="home-page">
      {/* Navigation Bar */}
      <PublicNavbar />

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content container">
          <h1 className="hero-title fade-in">
            Find Trusted<br />
            <span className="gradient-text">Professionals</span><br />
            For Every Task
          </h1>
          <p className="hero-subtitle slide-up">
            Connect with verified professionals and skilled helpers for all your service needs
          </p>
          <div className="hero-buttons">
            {isAuthenticated ? (
              <Link to={getDashboardLink()} className="btn btn-primary btn-lg">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-primary btn-lg">
                  Get Started
                </Link>
                <Link to="/about" className="btn btn-outline btn-lg">
                  Learn More
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="services-section">
        <div className="container">
          <h2 className="section-title">Popular Services</h2>
          <div className="services-grid">
            {services.map((service, index) => (
              <Link
                key={index}
                to={isAuthenticated ? `/customer/services?category=${service.category}` : '/login'}
                className="service-card"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="service-icon">{service.icon}</div>
                <h3>{service.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Why Choose TrustedHands?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">✓</div>
              <h3>Verified Professionals</h3>
              <p>All professionals are verified through our rigorous screening process</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⭐</div>
              <h3>Rated & Reviewed</h3>
              <p>Check ratings and reviews from real customers before booking</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>Direct Communication</h3>
              <p>Chat directly with taskers to discuss your requirements</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure Payments</h3>
              <p>Safe and secure payment processing for your peace of mind</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <h2>Ready to Get Started?</h2>
          <p>Join thousands of satisfied customers and professional taskers</p>
          {!isAuthenticated && (
            <Link to="/login" className="btn btn-primary btn-lg">
              Sign Up Now
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section footer-logo-section">
              <img src="/logo.png" alt="TrustedHands" className="footer-logo" style={{ width: '220px', height: '220px', objectFit: 'contain' }} />
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                <li><Link to="/about">About Us</Link></li>
                <li><Link to="/faq">FAQs</Link></li>
                <li><Link to="/contact">Contact Us</Link></li>
                <li><Link to="/login">Login</Link></li>
                <li><Link to="/privacy-policy">Privacy Policy</Link></li>
                <li><Link to="/terms-of-service">Terms of Service</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Contact</h4>
              <p>Email: caretrustedhands@gmail.com</p>
              <p>Phone: +91 (555) 123-4567</p>
              <p>Address: Punjab Engineering College, Sector-12, Chandigarh</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 TrustedHands. All rights reserved.</p>
          </div>
        </div>
      </footer>
  {/* BharosaChatbot is rendered globally in App.js */}
    </div>
  );
};

export default Home;
