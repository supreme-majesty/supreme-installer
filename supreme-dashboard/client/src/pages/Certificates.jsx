import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Certificates.css';

const Certificates = () => {
  const [sslStatus, setSslStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { token, isAuthenticated } = useAuth();

  useEffect(() => {
    if (token) {
      fetchSslStatus();
    } else {
      setLoading(false);
      setError('Authentication required. Please log in to view SSL status.');
    }
  }, [token]);

  const fetchSslStatus = async () => {
    try {
      if (!token) {
        setError('Authentication required. Please log in to view SSL status.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/ssl/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSslStatus(data);
      } else if (response.status === 401) {
        setError('Authentication failed. Please log in again.');
        // Clear invalid token
        localStorage.removeItem('supreme_token');
        window.location.reload();
      } else {
        setError(`Failed to fetch SSL status (${response.status})`);
        console.error('Error fetching SSL status:', response.status);
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
      console.error('Error fetching SSL status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSslAction = async (action) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/ssl/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      
      if (result.success) {
        await fetchSslStatus();
        alert(`SSL ${action} successful!`);
      } else {
        alert(`Failed to ${action} SSL: ${result.error}`);
      }
    } catch (error) {
      alert(`Error ${action}ing SSL: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const getDaysUntilExpiry = (days) => {
    if (days === null || days === undefined) return { text: 'Unknown', class: 'unknown' };
    if (days < 0) return { text: 'Expired', class: 'expired' };
    if (days < 30) return { text: `${days} days`, class: 'warning' };
    if (days < 90) return { text: `${days} days`, class: 'caution' };
    return { text: `${days} days`, class: 'good' };
  };

  if (loading) {
    return (
      <div className="certificates-loading">
        <div className="loading-spinner"></div>
        <p>Loading SSL certificate information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="certificates-error">
        <div className="error-icon">⚠️</div>
        <h3>Error Loading SSL Information</h3>
        <p>{error}</p>
        <div className="error-actions">
          <button onClick={fetchSslStatus} className="btn btn-primary">
            Try Again
          </button>
          {error.includes('Authentication') && (
            <button 
              onClick={() => window.location.href = '/login'} 
              className="btn btn-secondary"
            >
              Go to Login
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="certificates">
      <div className="page-header">
        <h1 className="page-title">Certificate Manager</h1>
        <p className="page-subtitle">Manage SSL certificates and HTTPS settings</p>
      </div>

      {/* SSL Status Overview */}
      <div className="ssl-overview">
        <div className="ssl-status-card">
          <div className="status-header">
            <div className="status-icon">
              {sslStatus?.enabled ? '🔒' : '🔓'}
            </div>
            <div className="status-info">
              <h3>HTTPS Status</h3>
              <p className={`status-text ${sslStatus?.enabled ? 'enabled' : 'disabled'}`}>
                {sslStatus?.enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
          
          <div className="status-actions">
            {sslStatus?.enabled ? (
              <button 
                onClick={() => handleSslAction('disable')}
                className="btn btn-danger"
                disabled={actionLoading}
              >
                {actionLoading ? '⏳' : '🔓'} Disable HTTPS
              </button>
            ) : (
              <button 
                onClick={() => handleSslAction('enable')}
                className="btn btn-success"
                disabled={actionLoading}
              >
                {actionLoading ? '⏳' : '🔒'} Enable HTTPS
              </button>
            )}
          </div>
        </div>

        {sslStatus?.certificate && sslStatus.certificate !== null && (
          <div className="certificate-info-card">
            <div className="cert-header">
              <h3>Wildcard Certificate</h3>
              <span className="cert-domain">*.{sslStatus.tld}</span>
            </div>
            
            <div className="cert-details">
              <div className="cert-detail">
                <span className="detail-label">Valid From:</span>
                <span className="detail-value">
                  {formatDate(sslStatus.certificate.notBefore)}
                </span>
              </div>
              
              <div className="cert-detail">
                <span className="detail-label">Valid Until:</span>
                <span className="detail-value">
                  {formatDate(sslStatus.certificate.notAfter)}
                </span>
              </div>
              
              <div className="cert-detail">
                <span className="detail-label">Days Until Expiry:</span>
                <span className={`detail-value ${getDaysUntilExpiry(sslStatus.certificate.daysUntilExpiry).class}`}>
                  {getDaysUntilExpiry(sslStatus.certificate.daysUntilExpiry).text}
                </span>
              </div>
            </div>

            <div className="cert-actions">
              <button 
                onClick={() => handleSslAction('renew')}
                className="btn btn-primary"
                disabled={actionLoading}
              >
                {actionLoading ? '⏳' : '🔄'} Renew Certificate
              </button>
            </div>
          </div>
        )}

        {!sslStatus?.certificate && sslStatus?.enabled && (
          <div className="no-certificate-card">
            <div className="no-cert-icon">⚠️</div>
            <h3>No Certificate Found</h3>
            <p>HTTPS is enabled but no wildcard certificate was found. This may cause SSL errors.</p>
            <button 
              onClick={() => handleSslAction('renew')}
              className="btn btn-primary"
              disabled={actionLoading}
            >
              {actionLoading ? '⏳' : '🔧'} Generate Certificate
            </button>
          </div>
        )}
      </div>

      {/* Certificate Information */}
      {sslStatus?.certificate && sslStatus.certificate !== null && (
        <div className="certificate-details">
          <h3>Certificate Details</h3>
          
          <div className="cert-grid">
            <div className="cert-item">
              <div className="cert-item-header">
                <span className="cert-item-icon">📅</span>
                <span className="cert-item-title">Validity Period</span>
              </div>
              <div className="cert-item-content">
                <div className="validity-bar">
                  <div 
                    className="validity-progress"
                    style={{ 
                      width: `${Math.max(0, Math.min(100, (sslStatus.certificate.daysUntilExpiry / 365) * 100))}%` 
                    }}
                  ></div>
                </div>
                <div className="validity-text">
                  {sslStatus.certificate.daysUntilExpiry > 0 
                    ? `${sslStatus.certificate.daysUntilExpiry} days remaining`
                    : 'Certificate expired'
                  }
                </div>
              </div>
            </div>

            <div className="cert-item">
              <div className="cert-item-header">
                <span className="cert-item-icon">🌐</span>
                <span className="cert-item-title">Domain Coverage</span>
              </div>
              <div className="cert-item-content">
                <div className="domain-list">
                  <div className="domain-item">
                    <span className="domain-wildcard">*.{sslStatus.tld}</span>
                    <span className="domain-status">✅ Covered</span>
                  </div>
                  <div className="domain-item">
                    <span className="domain-root">{sslStatus.tld}</span>
                    <span className="domain-status">✅ Covered</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="cert-item">
              <div className="cert-item-header">
                <span className="cert-item-icon">🔧</span>
                <span className="cert-item-title">Certificate Type</span>
              </div>
              <div className="cert-item-content">
                <div className="cert-type-info">
                  <div className="type-item">
                    <span className="type-label">Type:</span>
                    <span className="type-value">mkcert Generated</span>
                  </div>
                  <div className="type-item">
                    <span className="type-label">CA:</span>
                    <span className="type-value">Local Development</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button 
            onClick={() => handleSslAction('renew')}
            className="btn btn-primary"
            disabled={actionLoading}
          >
            {actionLoading ? '⏳' : '🔄'} Renew All Certificates
          </button>
          
          <button 
            onClick={fetchSslStatus}
            className="btn btn-secondary"
          >
            🔄 Refresh Status
          </button>
          
          <button 
            onClick={() => window.open('https://mkcert.dev/', '_blank')}
            className="btn btn-info"
          >
            📖 mkcert Documentation
          </button>
        </div>
      </div>

      {/* Help Section */}
      <div className="help-section">
        <h3>SSL Certificate Help</h3>
        <div className="help-content">
          <div className="help-item">
            <h4>🔒 What is mkcert?</h4>
            <p>mkcert is a simple tool for making locally-trusted development certificates. It automatically creates and installs a local CA in the system root store.</p>
          </div>
          
          <div className="help-item">
            <h4>🌐 Wildcard Certificates</h4>
            <p>Wildcard certificates (*.{sslStatus?.tld || 'test'}) allow you to use HTTPS with any subdomain of your chosen TLD for local development.</p>
          </div>
          
          <div className="help-item">
            <h4>⚠️ Certificate Expiry</h4>
            <p>Certificates are valid for 825 days. You'll be notified when they're close to expiry, and you can renew them with one click.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Certificates;
