import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export const useApi = () => {
  const { token } = useAuth();
  const { promise, success, error, warning, info } = useToast();

  const apiCall = useCallback(async (url, options = {}, messages = {}) => {
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    return promise(
      fetch(url, defaultOptions).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      }),
      {
        loading: messages.loading || 'Loading...',
        success: messages.success || 'Request completed',
        error: messages.error || 'Request failed'
      }
    );
  }, [token, promise]);

  const get = useCallback((url, messages = {}) => {
    return apiCall(url, { method: 'GET' }, messages);
  }, [apiCall]);

  const post = useCallback((url, data, messages = {}) => {
    return apiCall(url, {
      method: 'POST',
      body: JSON.stringify(data)
    }, messages);
  }, [apiCall]);

  const put = useCallback((url, data, messages = {}) => {
    return apiCall(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    }, messages);
  }, [apiCall]);

  const del = useCallback((url, messages = {}) => {
    return apiCall(url, { method: 'DELETE' }, messages);
  }, [apiCall]);

  const patch = useCallback((url, data, messages = {}) => {
    return apiCall(url, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }, messages);
  }, [apiCall]);

  return {
    apiCall,
    get,
    post,
    put,
    del,
    patch,
    success,
    error,
    warning,
    info
  };
};

export default useApi;
