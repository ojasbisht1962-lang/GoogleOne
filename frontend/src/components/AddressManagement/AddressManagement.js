import React, { useState, useEffect } from 'react';
import { addressService } from '../../services/addressService';
import { toast } from 'react-toastify';
import './AddressManagement.css';

export default function AddressManagement({ onSelect, selectionMode = false }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState({
    label: 'Home',
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    is_default: false
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const data = await addressService.getAddresses();
      setAddresses(data);
    } catch (error) {
      toast.error('Failed to load addresses');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAddress) {
        await addressService.updateAddress(editingAddress._id, formData);
        toast.success('Address updated successfully');
      } else {
        await addressService.createAddress(formData);
        toast.success('Address added successfully');
      }
      
      setShowForm(false);
      setEditingAddress(null);
      resetForm();
      fetchAddresses();
    } catch (error) {
      toast.error('Failed to save address');
      console.error(error);
    }
  };

  const handleEdit = (address) => {
    setEditingAddress(address);
    setFormData({
      label: address.label,
      full_name: address.full_name,
      phone: address.phone,
      address_line1: address.address_line1,
      address_line2: address.address_line2 || '',
      landmark: address.landmark || '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      is_default: address.is_default
    });
    setShowForm(true);
  };

  const handleDelete = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    
    try {
      await addressService.deleteAddress(addressId);
      toast.success('Address deleted successfully');
      fetchAddresses();
    } catch (error) {
      toast.error('Failed to delete address');
      console.error(error);
    }
  };

  const handleSetDefault = async (addressId) => {
    try {
      await addressService.setDefaultAddress(addressId);
      toast.success('Default address updated');
      fetchAddresses();
    } catch (error) {
      toast.error('Failed to set default address');
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      label: 'Home',
      full_name: '',
      phone: '',
      address_line1: '',
      address_line2: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      is_default: false
    });
  };

  const handleAddNew = () => {
    setEditingAddress(null);
    resetForm();
    setShowForm(true);
  };

  const handleSelectAddress = (address) => {
    if (onSelect) {
      onSelect(address);
    }
  };

  if (loading) {
    return (
      <div className="address-loading">
        <div className="spinner"></div>
        <p>Loading addresses...</p>
      </div>
    );
  }

  return (
    <div className="address-management-container">
      <div className="address-header">
        <h2>📍 My Addresses</h2>
        <button className="btn-add-address" onClick={handleAddNew}>
          + Add New Address
        </button>
      </div>

      {addresses.length === 0 && !showForm ? (
        <div className="empty-addresses">
          <div className="empty-icon">📭</div>
          <h3>No Saved Addresses</h3>
          <p>Add your first address to make bookings easier</p>
          <button className="btn-primary" onClick={handleAddNew}>
            Add Address
          </button>
        </div>
      ) : (
        <div className="addresses-grid">
          {addresses.map(address => (
            <div 
              key={address._id} 
              className={`address-card ${address.is_default ? 'default' : ''} ${selectionMode ? 'selectable' : ''}`}
              onClick={() => selectionMode && handleSelectAddress(address)}
            >
              {address.is_default && (
                <div className="default-badge">✓ Default</div>
              )}
              
              <div className="address-label-icon">
                {address.label === 'Home' && '🏠'}
                {address.label === 'Work' && '💼'}
                {address.label === 'Other' && '📍'}
              </div>
              
              <h3>{address.label}</h3>
              <p className="address-name">{address.full_name}</p>
              <p className="address-phone">📱 {address.phone}</p>
              
              <div className="address-details">
                <p>{address.address_line1}</p>
                {address.address_line2 && <p>{address.address_line2}</p>}
                {address.landmark && <p className="landmark">Near: {address.landmark}</p>}
                <p>{address.city}, {address.state} - {address.pincode}</p>
              </div>

              {!selectionMode && (
                <div className="address-actions">
                  <button className="btn-edit" onClick={() => handleEdit(address)}>
                    Edit
                  </button>
                  <button className="btn-delete" onClick={() => handleDelete(address._id)}>
                    Delete
                  </button>
                  {!address.is_default && (
                    <button 
                      className="btn-set-default" 
                      onClick={() => handleSetDefault(address._id)}
                    >
                      Set as Default
                    </button>
                  )}
                </div>
              )}

              {selectionMode && (
                <div className="select-indicator">Select</div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="address-form-overlay">
          <div className="address-form-modal">
            <div className="modal-header">
              <h3>{editingAddress ? 'Edit Address' : 'Add New Address'}</h3>
              <button className="btn-close" onClick={() => {
                setShowForm(false);
                setEditingAddress(null);
                resetForm();
              }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Address Label *</label>
                  <select name="label" value={formData.label} onChange={handleInputChange} required>
                    <option value="Home">🏠 Home</option>
                    <option value="Work">💼 Work</option>
                    <option value="Other">📍 Other</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    placeholder="Enter recipient name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="10-digit mobile number"
                    pattern="[0-9]{10}"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Flat / House No / Building *</label>
                <input
                  type="text"
                  name="address_line1"
                  value={formData.address_line1}
                  onChange={handleInputChange}
                  placeholder="e.g., House No. 123, Building Name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Area / Street / Sector / Village</label>
                <input
                  type="text"
                  name="address_line2"
                  value={formData.address_line2}
                  onChange={handleInputChange}
                  placeholder="e.g., Sector 17, MG Road"
                />
              </div>

              <div className="form-group">
                <label>Landmark (Optional)</label>
                <input
                  type="text"
                  name="landmark"
                  value={formData.landmark}
                  onChange={handleInputChange}
                  placeholder="e.g., Near City Mall"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Enter city"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>State *</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="Enter state"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Pincode *</label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    placeholder="6-digit PIN"
                    pattern="[0-9]{6}"
                    required
                  />
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="is_default"
                    checked={formData.is_default}
                    onChange={handleInputChange}
                  />
                  Set as default address
                </label>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => {
                    setShowForm(false);
                    setEditingAddress(null);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  {editingAddress ? 'Update Address' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
