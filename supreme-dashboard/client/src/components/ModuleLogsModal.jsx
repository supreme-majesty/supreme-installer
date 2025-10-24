import React, { useState, useEffect } from 'react';
import './ModuleLogsModal.css';

const ModuleLogsModal = ({ isOpen, onClose, module, onFetchLogs }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lines, setLines] = useState(50);

  useEffect(() => {
    if (isOpen && module && module.id) {
      fetchLogs();
    }
  }, [isOpen, module, lines]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await onFetchLogs(module.id, lines);
      setLogs(result.logs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getLogLevelColor = (level) => {
    switch (level.toLowerCase()) {
      case 'error':
        return '#ef4444';
      case 'warn':
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#10b981';
      case 'debug':
        return '#6b7280';
      default:
        return '#9ca3af';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!isOpen) return null;

  if (!module || !module.id) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Module Logs</h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <div className="error-message">
              <p>Error: Module information not available</p>
              <p>Please select a module first.</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content logs-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{module?.name} - Logs</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="logs-controls">
            <div className="form-group">
              <label>Number of lines:</label>
              <select
                value={lines}
                onChange={e => setLines(parseInt(e.target.value))}
                disabled={loading}
              >
                <option value={25}>25 lines</option>
                <option value={50}>50 lines</option>
                <option value={100}>100 lines</option>
                <option value={200}>200 lines</option>
              </select>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={fetchLogs}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="logs-container">
            {loading ? (
              <div className="logs-loading">
                <div className="loading-spinner"></div>
                <p>Loading logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="logs-empty">
                <div className="empty-icon">📋</div>
                <p>No logs available</p>
              </div>
            ) : (
              <div className="logs-list">
                {logs.map((log, index) => (
                  <div key={index} className="log-entry">
                    <div className="log-header">
                      <span
                        className="log-level"
                        style={{ color: getLogLevelColor(log.level) }}
                      >
                        {log.level.toUpperCase()}
                      </span>
                      <span className="log-timestamp">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    <div className="log-message">
                      {log.message}
                    </div>
                    {log.module && (
                      <div className="log-module">
                        Module: {log.module}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModuleLogsModal;
