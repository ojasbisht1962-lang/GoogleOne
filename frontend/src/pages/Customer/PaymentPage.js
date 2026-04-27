import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import './PaymentPage.css';

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingData = location.state?.booking;

  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('upi_qr');
  const [transactionId, setTransactionId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState(null);

  useEffect(() => {
    if (!bookingData) {
      toast.error('No booking data found');
      navigate('/customer/bookings');
      return;
    }
    fetchPaymentSettings();
    initiatePayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPaymentSettings = async () => {
    try {
      const response = await api.get('/payments/settings/current');
      setPaymentSettings(response.data.settings);
    } catch (error) {
      console.error('Error fetching payment settings:', error);
      toast.error('Failed to load payment settings');
    }
  };

  const initiatePayment = async () => {
    setLoading(true);
    try {
      const response = await api.post('/payments/initiate', {
        booking_id: bookingData._id,
        payment_method: paymentMethod
      });

      setPayment(response.data.payment);
      toast.success('Payment initiated. Please complete the payment.');
    } catch (error) {
      console.error('Error initiating payment:', error);
      toast.error(error.response?.data?.detail || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
  };

  const handleVerifyPayment = async () => {
    if (!transactionId.trim()) {
      toast.error('Please enter UPI Transaction ID');
      return;
    }

    setVerifying(true);
    try {
      // Simulate auto-verification after 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000));

      const response = await api.post(`/payments/auto-verify/${payment._id}?upi_transaction_id=${transactionId}`);

      if (response.data.success) {
        toast.success('✅ Payment verified successfully!');
        setTimeout(() => {
          navigate('/customer/bookings', {
            state: { paymentSuccess: true }
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error(error.response?.data?.detail || 'Payment verification failed');
    } finally {
      setVerifying(false);
    }
  };

  // Keeping for potential future use
  // const handleManualVerify = async () => {
  //   if (!transactionId.trim()) {
  //     toast.error('Please enter UPI Transaction ID');
  //     return;
  //   }

  //   setVerifying(true);
  //   try {
  //     const response = await api.post('/payments/verify', {
  //       payment_id: payment._id,
  //       upi_transaction_id: transactionId,
  //       upi_reference_number: referenceNumber
  //     });

  //     if (response.data.success) {
  //       toast.success('✅ Payment verified successfully!');
  //       setTimeout(() => {
  //         navigate('/customer/bookings');
  //       }, 2000);
  //     }
  //   } catch (error) {
  //     console.error('Error verifying payment:', error);
  //     toast.error(error.response?.data?.detail || 'Payment verification failed');
  //   } finally {
  //     setVerifying(false);
  //   }
  // };

  if (loading || !payment || !paymentSettings) {
    return (
      <>        <div className="payment-page-loading">
          <div className="loading-spinner">⏳</div>
          <p>Initializing payment...</p>
        </div>      </>
    );
  }

  return (
    <div className="payment-page">
      <div className="payment-container">
        <div className="payment-header">
          <h1>💳 Complete Your Payment</h1>
          <p>Secure Escrow Payment - Your money is safe until service completion</p>
        </div>

        <div className="payment-content">
          {/* Booking Summary */}
          <div className="booking-summary-card">
            <h2>📋 Booking Summary</h2>
            <div className="summary-details">
              <div className="detail-row">
                <span className="label">Service:</span>
                <span className="value">{bookingData.service?.title || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="label">Provider:</span>
                <span className="value">{bookingData.tasker?.name || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="label">Date:</span>
                <span className="value">{new Date(bookingData.scheduled_date).toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <span className="label">Time:</span>
                <span className="value">{bookingData.scheduled_time}</span>
              </div>
              <div className="detail-row total-row">
                <span className="label">Total Amount:</span>
                <span className="value">₹{bookingData.total_price}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="payment-method-card">
            <h2>🔐 Select Payment Method</h2>
            
            <div className="payment-methods">
              <button
                className={`method-btn ${paymentMethod === 'upi_qr' ? 'active' : ''}`}
                onClick={() => handlePaymentMethodChange('upi_qr')}
              >
                <span className="method-icon">📱</span>
                <span className="method-name">UPI QR Code</span>
                <span className="method-desc">Scan & Pay</span>
              </button>

              <button
                className={`method-btn ${paymentMethod === 'upi_id' ? 'active' : ''}`}
                onClick={() => handlePaymentMethodChange('upi_id')}
              >
                <span className="method-icon">💳</span>
                <span className="method-name">UPI ID</span>
                <span className="method-desc">Direct Transfer</span>
              </button>
            </div>
          </div>

          {/* Payment Details */}
          <div className="payment-details-card">
            {paymentMethod === 'upi_qr' ? (
              <div className="qr-payment-section">
                <h3>📱 Scan QR Code to Pay</h3>
                <div className="qr-code-container">
                  {payment.admin_qr_code_url ? (
                    <img 
                      src={payment.admin_qr_code_url} 
                      alt="UPI QR Code" 
                      className="qr-code-image"
                    />
                  ) : (
                    <div className="qr-code-placeholder">
                      <div className="qr-placeholder-content">
                        <span className="qr-icon">📱</span>
                        <p>QR Code Will Appear Here</p>
                        <small>Contact admin to set up QR code</small>
                      </div>
                    </div>
                  )}
                </div>
                <div className="payment-instructions">
                  <h4>How to Pay:</h4>
                  <ol>
                    <li>Open your UPI app (Google Pay, PhonePe, Paytm, etc.)</li>
                    <li>Scan the QR code above</li>
                    <li>Enter amount: ₹{payment.amount}</li>
                    <li>Complete the payment</li>
                    <li>Enter transaction ID below</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="upi-id-payment-section">
                <h3>💳 Pay to UPI ID</h3>
                <div className="upi-id-display">
                  <label>UPI ID:</label>
                  <div className="upi-id-box">
                    <span className="upi-id">{payment.admin_upi_id}</span>
                    <button 
                      className="copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(payment.admin_upi_id);
                        toast.success('UPI ID copied!');
                      }}
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
                <div className="payment-instructions">
                  <h4>How to Pay:</h4>
                  <ol>
                    <li>Open your UPI app</li>
                    <li>Select "Send Money" or "Pay"</li>
                    <li>Enter UPI ID: <strong>{payment.admin_upi_id}</strong></li>
                    <li>Enter amount: ₹{payment.amount}</li>
                    <li>Complete the payment</li>
                    <li>Enter transaction ID below</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Amount Display */}
            <div className="amount-display">
              <h3>Amount to Pay</h3>
              <div className="amount-value">₹{payment.amount}</div>
            </div>
          </div>

          {/* Verification Section */}
          <div className="verification-card">
            <h2>✅ Verify Your Payment</h2>
            <p className="verification-note">
              After completing the payment, enter your transaction details below for automatic verification.
            </p>

            <div className="verification-form">
              <div className="form-group">
                <label htmlFor="transactionId">
                  UPI Transaction ID <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="transactionId"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g., 123456789012"
                  disabled={verifying}
                />
                <small>12-digit transaction ID from your UPI app</small>
              </div>

              <div className="form-group">
                <label htmlFor="referenceNumber">
                  Reference Number (Optional)
                </label>
                <input
                  type="text"
                  id="referenceNumber"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g., 987654321"
                  disabled={verifying}
                />
              </div>

              <button
                className="verify-btn"
                onClick={handleVerifyPayment}
                disabled={verifying || !transactionId.trim()}
              >
                {verifying ? (
                  <>
                    <span className="spinner">⏳</span> Verifying Payment...
                  </>
                ) : (
                  <>
                    ✅ Verify & Confirm Payment
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Escrow Info */}
          <div className="escrow-info-card">
            <h3>🔒 Your Money is Safe with Escrow</h3>
            <div className="escrow-steps">
              <div className="escrow-step">
                <span className="step-number">1</span>
                <div className="step-content">
                  <h4>You Pay</h4>
                  <p>Payment is locked in escrow</p>
                </div>
              </div>
              <div className="escrow-arrow">→</div>
              <div className="escrow-step">
                <span className="step-number">2</span>
                <div className="step-content">
                  <h4>Service Completed</h4>
                  <p>Provider completes the work</p>
                </div>
              </div>
              <div className="escrow-arrow">→</div>
              <div className="escrow-step">
                <span className="step-number">3</span>
                <div className="step-content">
                  <h4>You Confirm</h4>
                  <p>Confirm service satisfaction</p>
                </div>
              </div>
              <div className="escrow-arrow">→</div>
              <div className="escrow-step">
                <span className="step-number">4</span>
                <div className="step-content">
                  <h4>Provider Paid</h4>
                  <p>Money released to provider</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>    </div>
  );
}
