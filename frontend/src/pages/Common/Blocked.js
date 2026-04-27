import React from 'react';
import './Blocked.css';

const Blocked = () => (
  <div className="blocked-container">
    <div className="blocked-box">
      <h1>🚫 Your account has been blocked</h1>
      <p>Please contact customer care for assistance.</p>
      <div className="blocked-contact">
  <span>Email: <a href="mailto:caretrustedhands@gmail.com">caretrustedhands@gmail.com</a></span>
        <span>Phone: <a href="tel:+911234567890">+91 12345 67890</a></span>
      </div>
    </div>
  </div>
);

export default Blocked;
