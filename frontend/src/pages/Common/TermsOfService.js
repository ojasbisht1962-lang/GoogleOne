import React from 'react';
import { useNavigate } from 'react-router-dom';
import './TermsOfService.css';

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <>
      <div className="terms-of-service-page">
        <div className="terms-container">
          <button className="btn-back" onClick={() => navigate(-1)}>
            ← Back
          </button>

          <section className="terms-section">
            <h2>1. Agreement to Terms</h2>
            <p>
              By accessing or using this platform, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this platform.
            </p>
          </section>

          <section className="terms-section">
            <h2>2. Description of Service</h2>
            <p>
              TrustedHands is a marketplace platform that connects customers with service providers (taskers) for various tasks and services. The Platform facilitates the booking process but does not directly provide the services. We are not responsible for the quality or outcome of services provided by taskers.
            </p>
          </section>

          <section className="terms-section">
            <h2>3. User Accounts</h2>
            <ul>
              <li>You must be at least 18 years old to use this Platform</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You agree to provide accurate, current, and complete information during registration</li>
              <li>You are responsible for all activities that occur under your account</li>
              <li>You must notify us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>5. Bookings and Payments</h2>
            <ul>
              <li>All bookings are subject to availability and confirmation</li>
              <li>Payment terms are established at the time of booking</li>
              <li>Cancellation policies apply as specified at booking time</li>
              <li>The Platform may charge service fees for facilitating transactions</li>
              <li>Refunds are handled according to our refund policy</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>6. Prohibited Activities</h2>
            <p>Users are strictly prohibited from:</p>
            <ul>
              <li>Violating any laws or regulations</li>
              <li>Providing false or misleading information</li>
              <li>Harassing, threatening, or discriminating against other users</li>
              <li>Attempting to circumvent the Platform for direct transactions</li>
              <li>Using the Platform for illegal activities</li>
              <li>Posting inappropriate, offensive, or harmful content</li>
              <li>Attempting to hack or compromise Platform security</li>
              <li>Creating multiple accounts to manipulate the system</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>7. Content and Intellectual Property</h2>
            <ul>
              <li>The Platform and its original content remain the property of TrustedHands</li>
              <li>Users retain ownership of content they post but grant us a license to use it</li>
              <li>You may not use our trademarks, logos, or branding without permission</li>
              <li>User-generated content must not infringe on others' intellectual property rights</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>8. Verification and Background Checks</h2>
            <p>
              We may conduct verification and background checks on taskers. However, we do not guarantee the 
              accuracy or completeness of such checks. Users should exercise their own judgment when engaging 
              with other users on the Platform.
            </p>
          </section>

          <section className="terms-section">
            <h2>9. Disputes</h2>
            <ul>
              <li>Users are encouraged to resolve disputes directly with each other first</li>
              <li>The Platform may provide mediation assistance but is not obligated to do so</li>
              <li>We reserve the right to suspend or terminate accounts involved in disputes</li>
              <li>Legal disputes should be handled through appropriate legal channels</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>10. Limitation of Liability</h2>
            <p>
              TrustedHands is not liable for:
            </p>
            <ul>
              <li>The quality, safety, or legality of services provided by taskers</li>
              <li>The accuracy of information provided by users</li>
              <li>Disputes between customers and taskers</li>
              <li>Any indirect, incidental, special, or consequential damages</li>
              <li>Loss of profits, data, or business opportunities</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>11. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless TrustedHands, its officers, directors, employees, and 
              agents from any claims, damages, losses, liabilities, and expenses arising from your use of the 
              Platform or violation of these Terms.
            </p>
          </section>

          <section className="terms-section">
            <h2>12. Termination</h2>
            <p>
              We reserve the right to terminate or suspend your account at any time, without prior notice, 
              for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, 
              or for any other reason at our sole discretion.
            </p>
          </section>

          <section className="terms-section">
            <h2>13. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of any material 
              changes by posting the new Terms on this page and updating the "Last Updated" date. Your continued 
              use of the Platform after such changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section className="terms-section">
            <h2>14. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction 
              in which TrustedHands operates, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="terms-section">
            <h2>15. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p>
              <strong>Email:</strong> caretrustedhands@gmail.com<br />
              <strong>Phone:</strong> +91 (555) 123-4567
            </p>
          </section>
        </div>
      </div>    </>
  );
}
