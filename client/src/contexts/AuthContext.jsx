import { createContext, useContext, useState, useEffect } from 'react';
import api, { waitForApiBaseURL } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    checkAuth();
    
    // Fallback: force loading to false after 10 seconds
    const fallbackTimer = setTimeout(() => {
      if (loading) {
        console.warn('Auth check taking too long, proceeding without auth');
        setLoading(false);
      }
    }, 10000);

    return () => clearTimeout(fallbackTimer);
  }, []);

  const checkAuth = async () => {
    try {
      // Wait for API base URL to be resolved
      await waitForApiBaseURL();
      
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await api.get('/auth/profile');
          setUser(response.data.user);
        } catch (error) {
          console.error('[Auth] Profile fetch failed:', error?.message || error);
          setApiError(error?.message || 'Failed to fetch profile');
          localStorage.removeItem('token');
        }
      }
    } catch (error) {
      console.error('[Auth] Initialization failed:', error?.message || error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      return user;
    } catch (err) {
      console.error('[Auth] login error', err?.message || err);
      throw err;
    }
  };

  const register = async (userData) => {
    const response = await api.post('/auth/register', userData);
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    apiError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};