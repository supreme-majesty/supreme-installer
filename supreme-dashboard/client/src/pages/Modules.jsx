import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ModuleConfigModal from '../components/ModuleConfigModal';
import ModuleLogsModal from '../components/ModuleLogsModal';
import './Modules.css';

const Modules = () => {
  const [modules, setModules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedModule, setSelectedModule] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const { token } = useAuth();
  const { success, error: showError, warning, info, promise } = useToast();

  useEffect(() => {
    if (token) {
      fetchModules();
    }
  }, [token]);

  const fetchModules = async () => {
    try {
      const response = await fetch('/api/modules', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
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
    setActionLoading(prev => ({ ...prev, [moduleId]: true }));
    
    try {
      let response;
      const actionMessages = {
        enable: { loading: 'Enabling module...', success: 'Module enabled successfully', error: 'Failed to enable module' },
        disable: { loading: 'Disabling module...', success: 'Module disabled successfully', error: 'Failed to disable module' },
        test: { loading: 'Testing module...', success: 'Module test completed', error: 'Module test failed' },
        health: { loading: 'Checking module health...', success: 'Health check completed', error: 'Health check failed' },
        logs: { loading: 'Loading module logs...', success: 'Logs loaded successfully', error: 'Failed to load logs' },
        config: { loading: 'Loading module configuration...', success: 'Configuration loaded', error: 'Failed to load configuration' }
      };

      const messages = actionMessages[action] || { loading: 'Processing...', success: 'Action completed', error: 'Action failed' };

      switch (action) {
        case 'enable':
          response = await promise(
            fetch(`/api/modules/${moduleId}/enable`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            }),
            messages
          );
          break;
        case 'disable':
          response = await promise(
            fetch(`/api/modules/${moduleId}/disable`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            }),
            messages
          );
          break;
        case 'test':
          response = await promise(
            fetch(`/api/modules/${moduleId}/test`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            }),
            messages
          );
          break;
        case 'health':
          response = await promise(
            fetch(`/api/modules/${moduleId}/health`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }),
            messages
          );
          break;
        case 'logs':
          response = await promise(
            fetch(`/api/modules/${moduleId}/logs`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }),
            messages
          );
          break;
        case 'config':
          response = await fetch(`/api/modules/${moduleId}/config`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch module configuration');
          }
          
          const configData = await response.json();
          // Find the module in the current modules list to get the full module data
          const currentModule = modules?.modules?.find(m => m.id === moduleId);
          if (currentModule) {
            setSelectedModule({
              ...currentModule,
              configuration: configData.configuration
            });
          } else {
            // Fallback if module not found in current state
            setSelectedModule({
              id: moduleId,
              configuration: configData.configuration
            });
          }
          setShowConfig(true);
          response = null; // Prevent double reading
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      if (response && response.ok) {
        const data = await response.json();
        
        if (action === 'enable' || action === 'disable') {
          // Refresh modules list
          await fetchModules();
        } else if (action === 'logs') {
          // For logs, we need to set the selected module first
          // Find the module in the current modules list
          const currentModule = modules?.modules?.find(m => m.id === moduleId);
          if (currentModule) {
            setSelectedModule(currentModule);
            setShowLogs(true);
          } else {
            // If module not found in current state, fetch it
            await handleModuleSelect(moduleId);
            setShowLogs(true);
          }
        } else if (action !== 'config') {
          setSelectedModule(data);
        }
      } else if (response) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Action failed');
        } catch (parseError) {
          throw new Error(`Action failed with status ${response.status}`);
        }
      }
    } catch (err) {
      showError(err.message);
      setError(err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [moduleId]: false }));
    }
  };

  const handleModuleSelect = async (moduleId) => {
    try {
      const response = await fetch(`/api/modules/${moduleId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch module details');
      }
      
      const module = await response.json();
      setSelectedModule(module);
    } catch (err) {
      showError(err.message);
      setError(err.message);
    }
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
                <tr 
                  key={module.id} 
                  className={selectedModule?.id === module.id ? 'selected' : ''}
                  onClick={() => handleModuleSelect(module.id)}
                >
                  <td>
                    <div className="module-info">
                      <div className="module-name">{module.name}</div>
                      <div className="module-description">{module.description}</div>
                      {module.features && (
                        <div className="module-features">
                          {module.features.slice(0, 2).map((feature, idx) => (
                            <span key={idx} className="feature-tag">{feature}</span>
                          ))}
                          {module.features.length > 2 && (
                            <span className="feature-more">+{module.features.length - 2} more</span>
                          )}
                        </div>
                      )}
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
                      {module.health && (
                        <span className={`health-indicator ${module.health}`}>
                          {module.health === 'healthy' ? '✓' : 
                           module.health === 'error' ? '✗' : 
                           module.health === 'disabled' ? '⏸️' : 
                           module.health === 'unknown' ? '❓' : '?'}
                        </span>
                      )}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleModuleAction(module.id, 'disable');
                          }}
                          disabled={actionLoading[module.id]}
                        >
                          {actionLoading[module.id] ? '...' : 'Disable'}
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleModuleAction(module.id, 'enable');
                          }}
                          disabled={actionLoading[module.id]}
                        >
                          {actionLoading[module.id] ? '...' : 'Enable'}
                        </button>
                      )}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleModuleAction(module.id, 'config');
                        }}
                      >
                        Configure
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleModuleAction(module.id, 'test');
                        }}
                        disabled={actionLoading[module.id]}
                      >
                        Test
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleModuleAction(module.id, 'logs');
                        }}
                      >
                        Logs
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Module Details */}
      <div className="module-details">
        <div className="dashboard-card">
          <h3>Module Information</h3>
          {selectedModule ? (
            <div className="module-detail-content">
              <div className="module-header">
                <h4>{selectedModule.name}</h4>
                <span className="version-badge">{selectedModule.version}</span>
                <span className={`status-badge ${selectedModule.status}`}>
                  {selectedModule.status}
                </span>
              </div>
              
              <div className="module-description">
                <p>{selectedModule.description}</p>
              </div>

              {selectedModule.features && (
                <div className="module-features-list">
                  <h5>Features:</h5>
                  <ul>
                    {selectedModule.features.map((feature, idx) => (
                      <li key={idx}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedModule.dependencies && selectedModule.dependencies.length > 0 && (
                <div className="module-dependencies">
                  <h5>Dependencies:</h5>
                  <div className="dependency-list">
                    {selectedModule.dependencies.map((dep, idx) => (
                      <span key={idx} className="dependency-tag">{dep}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedModule.dependencyStatus && (
                <div className="dependency-status">
                  <h5>Dependency Status:</h5>
                  <div className="dependency-status-list">
                    {Object.entries(selectedModule.dependencyStatus).map(([dep, status]) => (
                      <div key={dep} className={`dependency-item ${status.status}`}>
                        <span className="dependency-name">{dep}</span>
                        <span className={`status-indicator ${status.status}`}>
                          {status.installed ? '✓' : '✗'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="module-actions-detail">
                <button
                  className="btn btn-primary"
                  onClick={() => handleModuleAction(selectedModule.id, 'health')}
                >
                  Check Health
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleModuleAction(selectedModule.id, 'test')}
                >
                  Run Tests
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleModuleAction(selectedModule.id, 'logs')}
                >
                  View Logs
                </button>
              </div>
            </div>
          ) : (
            <div className="info-placeholder">
              <div className="placeholder-icon">📋</div>
              <p>Select a module to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Module Configuration Modal */}
      <ModuleConfigModal
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
        module={selectedModule}
        onSave={async (moduleId, config) => {
          try {
            console.log('Saving configuration for module:', moduleId, config);
            const response = await fetch(`/api/modules/${moduleId}/config`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(config)
            });
            
            console.log('Configuration save response:', response.status, response.statusText);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('Configuration save error:', errorText);
              throw new Error(`Failed to save configuration: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            const result = await response.json();
            console.log('Configuration save result:', result);
            success('Configuration saved successfully');
            
            return result;
          } catch (error) {
            console.error('Configuration save error:', error);
            showError(error.message);
            throw error;
          }
        }}
      />

      {/* Module Logs Modal */}
      <ModuleLogsModal
        isOpen={showLogs}
        onClose={() => setShowLogs(false)}
        module={selectedModule}
        onFetchLogs={async (moduleId, lines) => {
          const response = await fetch(`/api/modules/${moduleId}/logs?lines=${lines}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch logs');
          }
          
          return await response.json();
        }}
      />
    </div>
  );
};

export default Modules;
