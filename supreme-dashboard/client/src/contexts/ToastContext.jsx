import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/Toast';
import './ToastContext.css';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      type: 'info',
      duration: 5000,
      autoClose: true,
      clickable: false,
      ...toast
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods for different toast types
  const success = useCallback((message, options = {}) => {
    return addToast({
      type: 'success',
      title: 'Success',
      message,
      ...options
    });
  }, [addToast]);

  const error = useCallback((message, options = {}) => {
    return addToast({
      type: 'error',
      title: 'Error',
      message,
      duration: 7000, // Longer duration for errors
      ...options
    });
  }, [addToast]);

  const warning = useCallback((message, options = {}) => {
    return addToast({
      type: 'warning',
      title: 'Warning',
      message,
      ...options
    });
  }, [addToast]);

  const info = useCallback((message, options = {}) => {
    return addToast({
      type: 'info',
      title: 'Info',
      message,
      ...options
    });
  }, [addToast]);

  // API response handler
  const handleApiResponse = useCallback((response, options = {}) => {
    if (response.success) {
      return success(response.message || 'Operation completed successfully', options);
    } else {
      return error(response.error || 'Operation failed', options);
    }
  }, [success, error]);

  // Network error handler
  const handleNetworkError = useCallback((error, options = {}) => {
    const message = error.message || 'Network error. Please try again.';
    return error(message, {
      duration: 8000,
      clickable: true,
      ...options
    });
  }, [error]);

  // Loading toast with promise handling
  const promise = useCallback(async (promise, messages = {}) => {
    const loadingId = addToast({
      type: 'info',
      title: 'Loading...',
      message: messages.loading || 'Please wait...',
      autoClose: false,
      duration: 0
    });

    try {
      const result = await promise;
      removeToast(loadingId);
      
      if (messages.success) {
        success(messages.success);
      }
      
      return result;
    } catch (err) {
      removeToast(loadingId);
      
      if (messages.error) {
        error(messages.error);
      } else {
        handleNetworkError(err);
      }
      
      throw err;
    }
  }, [addToast, removeToast, success, error, handleNetworkError]);

  const value = {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
    handleApiResponse,
    handleNetworkError,
    promise
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, onRemove }) => {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

export default ToastContext;
