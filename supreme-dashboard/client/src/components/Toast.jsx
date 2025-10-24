import React, { useEffect, useState } from 'react';
import './Toast.css';

const Toast = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (toast.autoClose !== false) {
      const timer = setTimeout(() => {
        handleClose();
      }, toast.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, toast.autoClose]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300); // Match CSS transition duration
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return 'ℹ';
    }
  };

  const getProgressColor = () => {
    switch (toast.type) {
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      default:
        return '#3b82f6';
    }
  };

  return (
    <div
      className={`toast ${toast.type} ${isVisible ? 'visible' : ''} ${isLeaving ? 'leaving' : ''}`}
      onClick={toast.clickable ? handleClose : undefined}
      style={{ cursor: toast.clickable ? 'pointer' : 'default' }}
    >
      <div className="toast-content">
        <div className="toast-icon">
          {toast.icon || getIcon()}
        </div>
        <div className="toast-body">
          <div className="toast-title">
            {toast.title}
          </div>
          {toast.message && (
            <div className="toast-message">
              {toast.message}
            </div>
          )}
        </div>
        <button
          className="toast-close"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
      
      {toast.autoClose !== false && (
        <div className="toast-progress">
          <div
            className="toast-progress-bar"
            style={{
              backgroundColor: getProgressColor(),
              animationDuration: `${toast.duration || 5000}ms`
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Toast;
