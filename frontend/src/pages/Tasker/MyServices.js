import React, { useState, useEffect } from 'react';
import { serviceJobService } from '../../services/serviceJobService';
import { toast } from 'react-toastify';
import LoadingScreen from '../../components/LoadingScreen';
import './MyServices.css';

export default function MyServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    price_unit: 'per hour',
    location: '',
    is_active: true,
  });

  const CATEGORIES = [
    { label: 'Electrician', value: 'electrician' },
    { label: 'Plumber', value: 'plumber' },
    { label: 'Carpenter', value: 'carpenter' },
    { label: 'AC Servicing', value: 'ac_servicing' },
    { label: 'RO Servicing', value: 'ro_servicing' },
    { label: 'Appliance Repair', value: 'appliance_repair' },
    { label: 'Painting', value: 'painting' },
    { label: 'Pest Control', value: 'pest_control' },
    { label: 'Car Washing', value: 'car_washing' },
    { label: 'Bathroom Cleaning', value: 'bathroom_cleaning' },
    { label: 'Home Cleaning', value: 'home_cleaning' },
    { label: 'Assignment Writing', value: 'assignment_writing' },
    { label: 'Project Making', value: 'project_making' },
    { label: 'Tutoring', value: 'tutoring' },
    { label: 'Pet Care', value: 'pet_care' },
    { label: 'Gardening', value: 'gardening' },
    { label: 'Delivery', value: 'delivery' },
    { label: 'Other', value: 'other' }
  ];

  const ALLOWED_FOR_HELPERS = [
    'car_washing',
    'assignment_writing',
    'project_making',
    'other'
  ];

  const getCategoryLabel = (categoryValue) => {
    const category = CATEGORIES.find(cat => cat.value === categoryValue);
    return category ? category.label : categoryValue;
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const data = await serviceJobService.getMyServices();
      setServices(data);
    } catch (error) {
      toast.error('Failed to load services');
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

  const getCurrentUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = getCurrentUser();
    // Restrict helpers and pending professionals from posting in restricted categories
    if (user?.tasker_type === 'helper' && !ALLOWED_FOR_HELPERS.includes(formData.category)) {
      toast.error('Failed to post job. Apply for professional badge to post jobs in this category.');
      return;
    }
    if (user?.tasker_type === 'professional' && user?.verification_status === 'pending' && !ALLOWED_FOR_HELPERS.includes(formData.category)) {
      toast.error('Failed to post your job. Your professional badge status is pending.');
      return;
    }
    try {
      if (editingService) {
        await serviceJobService.createServiceJob(formData.category, formData);
        toast.success('Service updated successfully!');
      } else {
        await serviceJobService.createServiceJob(formData.category, formData);
        toast.success('Service created successfully!');
      }
      setShowAddModal(false);
      setEditingService(null);
      resetForm();
      fetchServices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save service');
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      title: service.title,
      description: service.description,
      category: service.category,
      price: service.price,
      price_unit: service.price_unit || 'per hour',
      location: service.location || '',
      is_active: service.is_active,
    });
    setShowAddModal(true);
  };

  const handleDelete = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    
    try {
      await serviceJobService.deleteService(serviceId);
      toast.success('Service deleted successfully!');
      fetchServices();
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  const toggleStatus = async (serviceId, currentStatus) => {
    try {
      await serviceJobService.updateService(serviceId, { is_active: !currentStatus });
      toast.success(`Service ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchServices();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      price: '',
      price_unit: 'per hour',
      location: '',
      is_active: true,
    });
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingService(null);
    resetForm();
  };

  if (loading) {
    return (
      <>
        <LoadingScreen message="Firing Up The Engines" />
      </>
    );
  }

  return (
    <>
      <div className="my-services-container">
      <div className="services-header">
        <div>
          <h1>🛠️ My Services</h1>
          <p>Manage the services you offer to customers</p>
        </div>
        <button className="btn-add-service" onClick={() => setShowAddModal(true)}>
          + Add New Service
        </button>
      </div>

      {services.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h2>No Services Yet</h2>
          <p>Start by adding your first service to receive bookings</p>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            + Add Your First Service
          </button>
        </div>
      ) : (
        <div className="services-grid">
          {services.map(service => {
            // Commission split logic
            const isTechnical = [
              'electrician','plumber','carpenter','ac_servicing','ro_servicing','appliance_repair','painting','pest_control'
            ].includes(service.category);
            const commissionRate = isTechnical ? 15 : 10;
            const split = commissionRate === 15 ? 7.5 : 5;
            return (
              <div key={service._id} className={`service-card ${!service.is_active ? 'inactive' : ''}`}>
                <div className="service-header">
                  <div className="service-category-badge">{getCategoryLabel(service.category)}</div>
                  <div className={`status-badge ${service.is_active ? 'active' : 'inactive'}`}>
                    {service.is_active ? '🟢 Active' : '🔴 Inactive'}
                  </div>
                </div>
                
                <h3>{service.title}</h3>
                <p className="service-description">{service.description}</p>
                
                <div className="service-details">
                  <div className="detail-item">
                    <span className="detail-label">Price:</span>
                    <span className="detail-value price">₹{service.price} {service.price_unit || 'per hour'}</span>
                  </div>
                  {service.location && (
                    <div className="detail-item">
                      <span className="detail-label">Location:</span>
                      <span className="detail-value">📍 {service.location}</span>
                    </div>
                  )}
                  {/* Commission Split Display for Tasker */}
                  <div className="detail-item">
                    <span className="detail-label">Facilitation Commission:</span>
                    <span className="detail-value commission">{split}% (from you, Tasker)</span>
                  </div>
                </div>
                
                <div className="service-actions">
                  <button 
                    className="btn-edit"
                    onClick={() => handleEdit(service)}
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    className={`btn-toggle ${service.is_active ? 'deactivate' : 'activate'}`}
                    onClick={() => toggleStatus(service._id, service.is_active)}
                  >
                    {service.is_active ? '⏸️ Deactivate' : '▶️ Activate'}
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={() => handleDelete(service._id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Service Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingService ? 'Edit Service' : 'Add New Service'}</h2>
              <button className="btn-close" onClick={handleCloseModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Service Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Professional House Cleaning"
                />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows="4"
                  placeholder="Describe your service in detail..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Price (₹) *</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    min="0"
                    placeholder="500"
                  />
                </div>

                <div className="form-group">
                  <label>Price Unit</label>
                  <select
                    name="price_unit"
                    value={formData.price_unit}
                    onChange={handleInputChange}
                  >
                    <option value="per hour">Per Hour</option>
                    <option value="per job">Per Job</option>
                    <option value="per day">Per Day</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Service Location *</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Noida, Delhi NCR"
                />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                  />
                  <span>Make this service active immediately</span>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  {editingService ? 'Update Service' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
