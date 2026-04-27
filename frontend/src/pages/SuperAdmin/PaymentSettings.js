import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import './PaymentSettings.css';

export default function PaymentSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    admin_upi_id: '',
    admin_upi_name: '',
    admin_qr_code_url: '',
    escrow_enabled: true,
    auto_release_days: 3,
    payment_gateway_enabled: false,
    gateway_api_key: '',
    is_active: true
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/payments/settings/current');
      if (response.data.settings) {
        setSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!settings.admin_upi_id || !settings.admin_upi_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const response = await api.put('/payments/settings/update', settings);
      if (response.data.success) {
        toast.success('Payment settings updated successfully!');
        setSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error(error.response?.data?.detail || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="payment-settings-loading">
          <div className="spinner">⏳</div>
          <p>Loading payment settings...</p>
        </div>
      </>
    );
  }

  return (
    <div className="payment-settings-page">

      <div className="payment-settings-container">
        <div className="settings-header">
          <h1>💳 Payment & Escrow Settings</h1>
          <p>Configure UPI payment details and escrow system</p>
        </div>

        <form onSubmit={handleSubmit} className="settings-form">
          {/* UPI Configuration */}
          <div className="settings-section">
            <h2>🔐 UPI Configuration</h2>
            
            <div className="form-group">
              <label htmlFor="admin_upi_id">
                Admin UPI ID <span className="required">*</span>
              </label>
              <input
                type="text"
                id="admin_upi_id"
                name="admin_upi_id"
                value={settings.admin_upi_id}
                onChange={handleInputChange}
                placeholder="yourname@upi"
                required
              />
              <small>The UPI ID where customers will send payments</small>
            </div>

            <div className="form-group">
              <label htmlFor="admin_upi_name">
                Account Holder Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="admin_upi_name"
                name="admin_upi_name"
                value={settings.admin_upi_name}
                onChange={handleInputChange}
                placeholder="Business Name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="admin_qr_code_url">
                UPI QR Code URL
              </label>
              <input
                type="url"
                id="admin_qr_code_url"
                name="admin_qr_code_url"
                value={settings.admin_qr_code_url}
                onChange={handleInputChange}
                placeholder="https://example.com/qr-code.png"
              />
              <small>Upload QR code image and paste the URL here</small>
            </div>

            {settings.admin_qr_code_url && (
              <div className="qr-preview">
                <h4>QR Code Preview:</h4>
                <img 
                  src={settings.admin_qr_code_url} 
                  alt="UPI QR Code" 
                  className="qr-preview-image"
                />
              </div>
            )}
          </div>

          {/* Escrow Settings */}
          <div className="settings-section">
            <h2>🔒 Escrow Settings</h2>
            
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="escrow_enabled"
                  checked={settings.escrow_enabled}
                  onChange={handleInputChange}
                />
                <span>Enable Escrow System</span>
              </label>
              <small>When enabled, payments are held until service completion</small>
            </div>

            <div className="form-group">
              <label htmlFor="auto_release_days">
                Auto-Release After (Days)
              </label>
              <input
                type="number"
                id="auto_release_days"
                name="auto_release_days"
                value={settings.auto_release_days}
                onChange={handleInputChange}
                min="1"
                max="30"
              />
              <small>Automatically release payment after this many days of service completion</small>
            </div>
          </div>

          {/* Payment Gateway */}
          <div className="settings-section">
            <h2>💰 Payment Gateway (Optional)</h2>
            
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="payment_gateway_enabled"
                  checked={settings.payment_gateway_enabled}
                  onChange={handleInputChange}
                />
                <span>Enable Payment Gateway Integration</span>
              </label>
              <small>For automatic payment verification (requires gateway API)</small>
            </div>

            {settings.payment_gateway_enabled && (
              <div className="form-group">
                <label htmlFor="gateway_api_key">
                  Gateway API Key
                </label>
                <input
                  type="password"
                  id="gateway_api_key"
                  name="gateway_api_key"
                  value={settings.gateway_api_key}
                  onChange={handleInputChange}
                  placeholder="Your payment gateway API key"
                />
              </div>
            )}
          </div>

          {/* Status */}
          <div className="settings-section">
            <h2>⚙️ System Status</h2>
            
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={settings.is_active}
                  onChange={handleInputChange}
                />
                <span>Payment System Active</span>
              </label>
              <small>Enable/disable the entire payment system</small>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => fetchSettings()}
              disabled={saving}
            >
              Reset Changes
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner">⏳</span> Saving...
                </>
              ) : (
                <>💾 Save Settings</>
              )}
            </button>
          </div>
        </form>

        {/* Help Section */}
        <div className="help-section">
          <h3>📚 How It Works</h3>
          <div className="help-steps">
            <div className="help-step">
              <span className="step-number">1</span>
              <div className="step-content">
                <h4>Customer Books Service</h4>
                <p>Customer selects a service and creates a booking</p>
              </div>
            </div>
            <div className="help-step">
              <span className="step-number">2</span>
              <div className="step-content">
                <h4>Payment to Admin UPI</h4>
                <p>Customer pays to your configured UPI ID/QR code</p>
              </div>
            </div>
            <div className="help-step">
              <span className="step-number">3</span>
              <div className="step-content">
                <h4>Money Locked in Escrow</h4>
                <p>Payment is held securely until service completion</p>
              </div>
            </div>
            <div className="help-step">
              <span className="step-number">4</span>
              <div className="step-content">
                <h4>Service Completed</h4>
                <p>Provider completes the work</p>
              </div>
            </div>
            <div className="help-step">
              <span className="step-number">5</span>
              <div className="step-content">
                <h4>Payment Released</h4>
                <p>Admin releases payment to provider's account</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
