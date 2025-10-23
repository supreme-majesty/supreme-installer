import React, { useState, useEffect } from 'react';
import './Modules.css';

const Modules = () => {
  const [modules, setModules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await fetch('/api/modules');
      if (!response.ok) {
        throw new Error('Failed to fetch modules');
      }
      const data = await response.json();
      setModules(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return '🟢';
      case 'inactive':
        return '🔴';
      default:
        return '🟡';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'inactive':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  const filteredModules = modules?.modules?.filter(module => {
    if (filter === 'all') return true;
    return module.status === filter;
  }) || [];

  const handleModuleAction = async (moduleId, action) => {
    // In a real application, this would make an API call
    console.log(`Performing ${action} on module ${moduleId}`);
    // For now, just show an alert
    alert(`${action} action performed on module ${moduleId}`);
  };

  if (loading) {
    return (
      <div className="modules-loading">
        <div className="loading-spinner"></div>
        <p>Loading modules...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modules-error">
        <div className="error">
          <h3>Error Loading Modules</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchModules}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modules">
      <div className="page-header">
        <h1 className="page-title">Modules</h1>
        <p className="page-subtitle">Manage installed modules and plugins</p>
      </div>

      {/* Module Statistics */}
      <div className="module-stats">
        <div className="dashboard-card stat-card">
          <div className="stat-value">{modules?.total || 0}</div>
          <div className="stat-label">Total Modules</div>
        </div>
        <div className="dashboard-card stat-card">
          <div className="stat-value">{modules?.active || 0}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="dashboard-card stat-card">
          <div className="stat-value">{modules?.inactive || 0}</div>
          <div className="stat-label">Inactive</div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="module-controls">
        <div className="dashboard-card">
          <div className="controls-row">
            <div className="filter-group">
              <label htmlFor="status-filter">Filter by status:</label>
              <select
                id="status-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="form-input"
              >
                <option value="all">All Modules</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
            <div className="search-group">
              <input
                type="text"
                placeholder="Search modules..."
                className="form-input"
                style={{ maxWidth: '300px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modules Table */}
      <div className="modules-table">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Version</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredModules.map((module) => (
                <tr key={module.id}>
                  <td>
                    <div className="module-info">
                      <div className="module-name">{module.name}</div>
                      <div className="module-description">{module.description}</div>
                    </div>
                  </td>
                  <td>
                    <span className="version-badge">{module.version}</span>
                  </td>
                  <td>
                    <div className="status-cell">
                      <span className="status-icon">
                        {getStatusIcon(module.status)}
                      </span>
                      <span 
                        className="status-badge"
                        style={{ color: getStatusColor(module.status) }}
                      >
                        {module.status}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="last-updated">
                      {new Date(module.lastUpdated).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <div className="module-actions">
                      {module.status === 'active' ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleModuleAction(module.id, 'disable')}
                        >
                          Disable
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleModuleAction(module.id, 'enable')}
                        >
                          Enable
                        </button>
                      )}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleModuleAction(module.id, 'configure')}
                      >
                        Configure
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Module Details Modal Placeholder */}
      <div className="module-details">
        <div className="dashboard-card">
          <h3>Module Information</h3>
          <p>Click on a module to view detailed information, configuration options, and dependencies.</p>
          <div className="info-placeholder">
            <div className="placeholder-icon">📋</div>
            <p>Select a module to view details</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modules;
