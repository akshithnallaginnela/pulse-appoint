import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';

// Types
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  role: 'patient' | 'doctor' | 'admin';
  isEmailVerified: boolean;
  profileImage?: string;
  address?: any;
  emergencyContact?: any;
  medicalHistory?: any[];
  allergies?: string[];
  medications?: any[];
}

interface DoctorProfile {
  id: string;
  licenseNumber: string;
  specialization: string;
  experience: number;
  consultationFee: number;
  bio?: string;
  languages?: string[];
  services?: string[];
  rating: {
    average: number;
    count: number;
  };
  isVerified: boolean;
  profileCompleted: boolean;
  availability?: any;
}

interface AuthState {
  user: User | null;
  doctorProfile: DoctorProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; doctorProfile?: DoctorProfile; token: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_CLEAR_ERROR' }
  | { type: 'AUTH_UPDATE_USER'; payload: User }
  | { type: 'AUTH_UPDATE_DOCTOR_PROFILE'; payload: DoctorProfile };

// Initial state
const initialState: AuthState = {
  user: null,
  doctorProfile: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: !!localStorage.getItem('token'),
  error: null,
};

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        doctorProfile: action.payload.doctorProfile || null,
        token: action.payload.token,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        doctorProfile: null,
        token: null,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        doctorProfile: null,
        token: null,
        error: null,
      };
    case 'AUTH_CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'AUTH_UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'AUTH_UPDATE_DOCTOR_PROFILE':
      return {
        ...state,
        doctorProfile: action.payload,
      };
    default:
      return state;
  }
};

// Context
interface AuthContextType extends AuthState {
  login: (email: string, password: string, role?: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  registerDoctor: (doctorData: any) => Promise<void>;
  logout: () => void;
  updateProfile: (profileData: any) => Promise<void>;
  updateDoctorProfile: (profileData: any) => Promise<void>;
  clearError: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          dispatch({ type: 'AUTH_START' });
          const response = await authAPI.getProfile();
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: {
              user: response.user,
              doctorProfile: response.doctorProfile,
              token,
            },
          });
        } catch (error) {
          localStorage.removeItem('token');
          dispatch({ type: 'AUTH_FAILURE', payload: 'Session expired' });
        }
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string, role?: string) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await authAPI.login({ email, password, role });
      
      localStorage.setItem('token', response.token);
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.user,
          doctorProfile: response.doctorProfile,
          token: response.token,
        },
      });
    } catch (error: any) {
      dispatch({ type: 'AUTH_FAILURE', payload: error.message });
      throw error;
    }
  };

  // Register function
  const register = async (userData: any) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await authAPI.register(userData);
      
      localStorage.setItem('token', response.token);
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.user,
          token: response.token,
        },
      });
    } catch (error: any) {
      dispatch({ type: 'AUTH_FAILURE', payload: error.message });
      throw error;
    }
  };

  // Register doctor function
  const registerDoctor = async (doctorData: any) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await authAPI.registerDoctor(doctorData);
      
      localStorage.setItem('token', response.token);
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.user,
          doctorProfile: response.doctorProfile,
          token: response.token,
        },
      });
    } catch (error: any) {
      dispatch({ type: 'AUTH_FAILURE', payload: error.message });
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'AUTH_LOGOUT' });
  };

  // Update profile function
  const updateProfile = async (profileData: any) => {
    try {
      const response = await authAPI.getProfile();
      dispatch({ type: 'AUTH_UPDATE_USER', payload: response.user });
    } catch (error: any) {
      dispatch({ type: 'AUTH_FAILURE', payload: error.message });
      throw error;
    }
  };

  // Update doctor profile function
  const updateDoctorProfile = async (profileData: any) => {
    try {
      const response = await authAPI.getProfile();
      if (response.doctorProfile) {
        dispatch({ type: 'AUTH_UPDATE_DOCTOR_PROFILE', payload: response.doctorProfile });
      }
    } catch (error: any) {
      dispatch({ type: 'AUTH_FAILURE', payload: error.message });
      throw error;
    }
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: 'AUTH_CLEAR_ERROR' });
  };

  // Refresh profile function
  const refreshProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.user,
          doctorProfile: response.doctorProfile,
          token: state.token || '',
        },
      });
    } catch (error: any) {
      dispatch({ type: 'AUTH_FAILURE', payload: error.message });
      throw error;
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    registerDoctor,
    logout,
    updateProfile,
    updateDoctorProfile,
    clearError,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
