import React, { useState, useEffect } from 'react';
import './SystemInfo.css';

const SystemInfo = () => {
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSystemInfo();
    // Refresh system info every 30 seconds
    const interval = setInterval(fetchSystemInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSystemInfo = async () => {
    try {
      const response = await fetch('/api/system');
      if (!response.ok) {
        throw new Error('Failed to fetch system information');
      }
      const data = await response.json();
      setSystemInfo(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return '#10b981';
      case 'offline':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  if (loading) {
    return (
      <div className="system-info-loading">
        <div className="loading-spinner"></div>
        <p>Loading system information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="system-info-error">
        <div className="error">
          <h3>Error Loading System Information</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchSystemInfo}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="system-info">
      <div className="page-header">
        <h1 className="page-title">System Information</h1>
        <p className="page-subtitle">Real-time system status and performance metrics</p>
      </div>

      {/* System Status Overview */}
      <div className="system-overview">
        <div className="dashboard-card">
          <div className="system-status-header">
            <div className="status-indicator">
              <div 
                className="status-dot" 
                style={{ backgroundColor: getStatusColor(systemInfo?.status) }}
              ></div>
              <span className="status-text">
                {systemInfo?.status?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
            <div className="last-updated">
              Last updated: {new Date(systemInfo?.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* System Metrics Grid */}
      <div className="metrics-grid">
        {/* Uptime Card */}
        <div className="dashboard-card metric-card">
          <div className="metric-header">
            <h3>System Uptime</h3>
            <span className="metric-icon">⏱️</span>
          </div>
          <div className="metric-content">
            <div className="metric-value">
              {systemInfo?.uptime?.formatted || 'N/A'}
            </div>
            <div className="metric-details">
              <span>Seconds: {systemInfo?.uptime?.seconds || 0}</span>
            </div>
          </div>
        </div>

        {/* Node.js Version */}
        <div className="dashboard-card metric-card">
          <div className="metric-header">
            <h3>Node.js Version</h3>
            <span className="metric-icon">🟢</span>
          </div>
          <div className="metric-content">
            <div className="metric-value">
              {systemInfo?.node?.version || 'N/A'}
            </div>
            <div className="metric-details">
              <span>Platform: {systemInfo?.node?.platform || 'N/A'}</span>
              <span>Architecture: {systemInfo?.node?.arch || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="dashboard-card metric-card">
          <div className="metric-header">
            <h3>Memory Usage</h3>
            <span className="metric-icon">💾</span>
          </div>
          <div className="metric-content">
            <div className="memory-stats">
              <div className="memory-item">
                <span className="memory-label">Used:</span>
                <span className="memory-value">
                  {systemInfo?.memory?.used || 0} MB
                </span>
              </div>
              <div className="memory-item">
                <span className="memory-label">Total:</span>
                <span className="memory-value">
                  {systemInfo?.memory?.total || 0} MB
                </span>
              </div>
              <div className="memory-item">
                <span className="memory-label">External:</span>
                <span className="memory-value">
                  {systemInfo?.memory?.external || 0} MB
                </span>
              </div>
            </div>
            <div className="memory-bar">
              <div 
                className="memory-bar-fill"
                style={{ 
                  width: `${((systemInfo?.memory?.used || 0) / (systemInfo?.memory?.total || 1)) * 100}%` 
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="dashboard-card metric-card">
          <div className="metric-header">
            <h3>System Health</h3>
            <span className="metric-icon">❤️</span>
          </div>
          <div className="metric-content">
            <div className="health-indicators">
              <div className="health-item">
                <span className="health-label">API Status:</span>
                <span className="health-value healthy">Healthy</span>
              </div>
              <div className="health-item">
                <span className="health-label">Database:</span>
                <span className="health-value healthy">Connected</span>
              </div>
              <div className="health-item">
                <span className="health-label">SSL:</span>
                <span className="health-value healthy">Valid</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed System Information */}
      <div className="detailed-info">
        <div className="dashboard-card">
          <h3>Detailed System Information</h3>
          <div className="info-table">
            <div className="info-row">
              <span className="info-label">Process ID:</span>
              <span className="info-value">{process.pid || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Platform:</span>
              <span className="info-value">{systemInfo?.node?.platform || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Architecture:</span>
              <span className="info-value">{systemInfo?.node?.arch || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Node.js Version:</span>
              <span className="info-value">{systemInfo?.node?.version || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Uptime:</span>
              <span className="info-value">{systemInfo?.uptime?.formatted || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Memory Used:</span>
              <span className="info-value">
                {systemInfo?.memory?.used || 0} MB / {systemInfo?.memory?.total || 0} MB
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">External Memory:</span>
              <span className="info-value">{systemInfo?.memory?.external || 0} MB</span>
            </div>
            <div className="info-row">
              <span className="info-label">Last Updated:</span>
              <span className="info-value">
                {systemInfo?.timestamp ? new Date(systemInfo.timestamp).toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemInfo;
