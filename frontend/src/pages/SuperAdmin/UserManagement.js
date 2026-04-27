import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import config from '../../config';
import LoadingScreen from '../../components/LoadingScreen';
import './UserManagement.css';

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, customer, tasker, superadmin
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${config.API_BASE_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        toast.error('Session expired. Please login again.');
        window.location.href = '/login';
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      const usersArray = Array.isArray(data) ? data : (data.users || []);
      setUsers(usersArray);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (userId, isBlocked) => {
    try {
      const token = localStorage.getItem('access_token');
      let endpoint = `${config.API_BASE_URL}/admin/users/${userId}/block`;
      let method = 'PUT';
      let body = JSON.stringify({ reason: isBlocked ? 'Unblock by admin' : 'Blocked by admin' });
      if (isBlocked) {
        endpoint = `${config.API_BASE_URL}/admin/users/${userId}/unblock`;
        body = undefined;
      }
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        ...(body ? { body } : {})
      });
      if (!response.ok) throw new Error('Failed to update user status');
      toast.success(`User ${isBlocked ? 'unblocked' : 'blocked'} successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${config.API_BASE_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete user');

      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleChangeTaskerType = async (userId, currentType, newType) => {
    if (currentType === newType) return;

    const confirmMessage = newType === 'professional' 
      ? 'This will upgrade the tasker to Professional status. Continue?'
      : 'This will downgrade the tasker to Helper status. Continue?';

    if (!window.confirm(confirmMessage)) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${config.API_BASE_URL}/admin/users/${userId}/tasker-type`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tasker_type: newType })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update tasker type');
      }

      toast.success(`Tasker type updated to ${newType} successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating tasker type:', error);
      toast.error(error.message || 'Failed to update tasker type');
    }
  };

  const filteredUsers = users.filter(user => {
    // Check if user matches the filter
    let matchesFilter = false;
    if (filter === 'all') {
      matchesFilter = true;
    } else {
      // Check both current role and available roles
      const userRoles = user.roles || [user.role];
      matchesFilter = userRoles.includes(filter);
    }
    
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getRoleColor = (role) => {
    const colors = {
      customer: '#3b82f6',
      tasker: '#10b981',
      superadmin: '#8b5cf6'
    };
    return colors[role] || '#6b7280';
  };

  const getRoleBadge = (role) => {
    const badges = {
      customer: '👤',
      tasker: '🔧',
      superadmin: '🛡️'
    };
    return badges[role] || '👤';
  };

  const renderUserRoles = (user) => {
    const roles = user.roles || [user.role];
    const uniqueRoles = [...new Set(roles)]; // Remove duplicates
    
    if (uniqueRoles.length === 1) {
      // Single role - show as before
      return (
        <span 
          className="role-badge" 
          style={{ backgroundColor: getRoleColor(uniqueRoles[0]) }}
        >
          {getRoleBadge(uniqueRoles[0])} {uniqueRoles[0]}
        </span>
      );
    }
    
    // Multiple roles - show all with primary indicator
    return (
      <div className="multi-role-container">
        {uniqueRoles.map((role, index) => (
          <span
            key={role}
            className={`role-badge ${role === user.role ? 'primary-role' : 'secondary-role'}`}
            style={{ backgroundColor: getRoleColor(role) }}
            title={role === user.role ? 'Current Active Role' : 'Available Role'}
          >
            {getRoleBadge(role)} {role}
            {role === user.role && <span className="primary-indicator">★</span>}
          </span>
        ))}
      </div>
    );
  };
  if (loading) {
    return (
      <>  <LoadingScreen message="Firing Up The Engines" />      </>
    );
  }

  return (
    <>      <div className="user-management">
        <div className="page-header">
          <h1>👥 User Management</h1>
          <p>Manage all users in the system</p>
        </div>

        <div className="controls">
          <div className="filter-tabs">
            <button
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              All Users ({users.length})
            </button>
            <button
              className={filter === 'customer' ? 'active' : ''}
              onClick={() => setFilter('customer')}
            >
              👤 Customers ({users.filter(u => (u.roles || [u.role]).includes('customer')).length})
            </button>
            <button
              className={filter === 'tasker' ? 'active' : ''}
              onClick={() => setFilter('tasker')}
            >
              🔧 Taskers ({users.filter(u => (u.roles || [u.role]).includes('tasker')).length})
            </button>
            <button
              className={filter === 'superadmin' ? 'active' : ''}
              onClick={() => setFilter('superadmin')}
            >
              🛡️ Admins ({users.filter(u => (u.roles || [u.role]).includes('superadmin')).length})
            </button>
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

      <div className="users-table-container">
        {filteredUsers.length > 0 ? (
        <table className="users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Roles</th>
              <th>Tasker Type</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user._id}>
                <td>
                  <div className="user-cell">
                    {user.profile_picture ? (
                      <img 
                        src={user.profile_picture} 
                        alt={user.name}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="user-avatar">{user.name.charAt(0)}</div>
                    )}
                    <span>{user.name}</span>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  {renderUserRoles(user)}
                </td>
                <td>
                  {user.role === 'tasker' ? (
                    <select
                      className="tasker-type-select"
                      value={user.tasker_type || 'helper'}
                      onChange={(e) => handleChangeTaskerType(user._id, user.tasker_type, e.target.value)}
                    >
                      <option value="helper">🙋 Helper</option>
                      <option value="professional">⭐ Professional</option>
                    </select>
                  ) : (
                    <span className="not-applicable">N/A</span>
                  )}
                </td>
                <td>{user.phone || 'N/A'}</td>
                <td>
                  <span className={`status-badge ${user.is_blocked ? 'blocked' : 'active'}`}>
                    {user.is_blocked ? '🚫 Blocked' : '✓ Active'}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className={`btn-action ${user.is_blocked ? 'unblock' : 'block'}`}
                      onClick={() => handleBlockUser(user._id, user.is_blocked)}
                      title={user.is_blocked ? 'Unblock user' : 'Block user'}
                    >
                      {user.is_blocked ? '🔓' : '🚫'}
                    </button>
                    <button
                      className="btn-action delete"
                      onClick={() => handleDeleteUser(user._id)}
                      title="Delete user"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        ) : (
          <div className="empty-state">
            <p>No users found</p>
          </div>
        )}
      </div>
    </div>    </>
  );
}
