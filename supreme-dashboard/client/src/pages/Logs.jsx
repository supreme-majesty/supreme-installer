import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Logs.css';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [lines, setLines] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filter, setFilter] = useState('');
  const logsEndRef = useRef(null);
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      fetchProjects();
    }
  }, [token]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedProject, lines]);

  useEffect(() => {
    if (token) {
      fetchLogs();
    }
  }, [selectedProject, lines, token]);

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      } else {
        console.error('Error fetching projects:', response.status);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (selectedProject) params.append('project', selectedProject);
      params.append('lines', lines.toString());
      
      const response = await fetch(`/api/logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      } else {
        setError('Failed to fetch logs');
        console.error('Error fetching logs:', response.status);
      }
    } catch (error) {
      setError('Failed to fetch logs');
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const downloadLogs = () => {
    const logContent = logs.join('\n');
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${selectedProject || 'all'}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogLevel = (logLine) => {
    if (logLine.includes('[error]') || logLine.includes('ERROR')) return 'error';
    if (logLine.includes('[warn]') || logLine.includes('WARN')) return 'warn';
    if (logLine.includes('[info]') || logLine.includes('INFO')) return 'info';
    if (logLine.includes('[debug]') || logLine.includes('DEBUG')) return 'debug';
    return 'default';
  };

  const formatLogLine = (logLine) => {
    // Try to parse timestamp and message
    const timestampMatch = logLine.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
    if (timestampMatch) {
      const timestamp = timestampMatch[1];
      const message = logLine.substring(timestamp.length).trim();
      return { timestamp, message };
    }
    return { timestamp: null, message: logLine };
  };

  const filteredLogs = logs.filter(logLine => {
    if (!filter) return true;
    return logLine.toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <div className="logs">
      <div className="page-header">
        <h1 className="page-title">Logs Viewer</h1>
        <p className="page-subtitle">Monitor Apache and application logs in real-time</p>
      </div>

      {/* Controls */}
      <div className="logs-controls">
        <div className="control-group">
          <label htmlFor="project-select">Project:</label>
          <select
            id="project-select"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="control-select"
          >
            <option value="">All Projects (Apache Error Log)</option>
            {projects.map(project => (
              <option key={project.name} value={project.name}>
                {project.name} ({project.type})
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="lines-select">Lines:</label>
          <select
            id="lines-select"
            value={lines}
            onChange={(e) => setLines(parseInt(e.target.value))}
            className="control-select"
          >
            <option value={50}>50 lines</option>
            <option value={100}>100 lines</option>
            <option value={200}>200 lines</option>
            <option value={500}>500 lines</option>
            <option value={1000}>1000 lines</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="filter-input">Filter:</label>
          <input
            id="filter-input"
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter logs..."
            className="control-input"
          />
        </div>

        <div className="control-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span className="checkbox-text">Auto-refresh (5s)</span>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="logs-actions">
        <button 
          onClick={fetchLogs} 
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? '⏳' : '🔄'} Refresh
        </button>
        
        <button 
          onClick={scrollToBottom} 
          className="btn btn-secondary"
        >
          ⬇️ Scroll to Bottom
        </button>
        
        <button 
          onClick={clearLogs} 
          className="btn btn-warning"
        >
          🗑️ Clear
        </button>
        
        <button 
          onClick={downloadLogs} 
          className="btn btn-info"
          disabled={logs.length === 0}
        >
          💾 Download
        </button>
      </div>

      {/* Logs Display */}
      <div className="logs-container">
        {error ? (
          <div className="logs-error">
            <div className="error-icon">⚠️</div>
            <h3>Error Loading Logs</h3>
            <p>{error}</p>
            <button onClick={fetchLogs} className="btn btn-primary">
              Try Again
            </button>
          </div>
        ) : (
          <div className="logs-content">
            {loading && logs.length === 0 ? (
              <div className="logs-loading">
                <div className="loading-spinner"></div>
                <p>Loading logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="no-logs">
                <div className="no-logs-icon">📄</div>
                <h3>No Logs Found</h3>
                <p>
                  {filter 
                    ? 'No logs match your filter criteria.'
                    : 'No logs available for the selected project.'
                  }
                </p>
                {filter && (
                  <button 
                    onClick={() => setFilter('')} 
                    className="btn btn-secondary"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            ) : (
              <div className="logs-list">
                {filteredLogs.map((logLine, index) => {
                  const { timestamp, message } = formatLogLine(logLine);
                  const level = getLogLevel(logLine);
                  
                  return (
                    <div key={index} className={`log-line log-${level}`}>
                      {timestamp && (
                        <span className="log-timestamp">
                          {timestamp}
                        </span>
                      )}
                      <span className="log-message">
                        {message}
                      </span>
                    </div>
                  );
                })}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Log Stats */}
      {logs.length > 0 && (
        <div className="logs-stats">
          <div className="stat-item">
            <span className="stat-label">Total Lines:</span>
            <span className="stat-value">{logs.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Filtered:</span>
            <span className="stat-value">{filteredLogs.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Errors:</span>
            <span className="stat-value">
              {logs.filter(log => getLogLevel(log) === 'error').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Warnings:</span>
            <span className="stat-value">
              {logs.filter(log => getLogLevel(log) === 'warn').length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logs;
