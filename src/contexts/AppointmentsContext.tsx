import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { appointmentsAPI, doctorsAPI } from '../services/api';

// Types
interface Appointment {
  _id: string;
  patientId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  doctorId: {
    _id: string;
    specialization: string;
    consultationFee: number;
    userId?: {
      _id: string;
      firstName: string;
      lastName: string;
    };
  };
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' | 'no-show';
  consultationType: 'in-person' | 'video-call' | 'phone-call';
  reason: string;
  symptoms: string[];
  medicalHistory?: string;
  currentMedications: string[];
  allergies: string[];
  diagnosis?: string;
  prescription?: any[];
  followUpRequired: boolean;
  followUpDate?: string;
  followUpNotes?: string;
  doctorNotes?: string;
  patientNotes?: string;
  payment: {
    amount: number;
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    method: string;
    transactionId?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    paidAt?: string;
  };
  cancellation?: {
    cancelledBy: 'patient' | 'doctor' | 'admin' | 'system';
    cancelledAt: string;
    reason: string;
    refundAmount: number;
    refundStatus: 'pending' | 'processed' | 'failed';
  };
  rating?: {
    score: number;
    review: string;
    ratedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Doctor {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    profileImage?: string;
  };
  licenseNumber: string;
  specialization: string;
  experience: number;
  education: any[];
  certifications: any[];
  hospitalAffiliations: any[];
  consultationFee: number;
  consultationDuration: number;
  languages: string[];
  bio: string;
  services: string[];
  awards: any[];
  publications: any[];
  rating: {
    average: number;
    count: number;
  };
  isVerified: boolean;
  profileCompleted: boolean;
  availability: any;
  createdAt: string;
  updatedAt: string;
}

interface AppointmentsState {
  appointments: Appointment[];
  upcomingAppointments: Appointment[];
  todaysAppointments: Appointment[];
  doctors: Doctor[];
  specializations: string[];
  selectedDoctor: Doctor | null;
  selectedDate: string | null;
  availableSlots: string[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

type AppointmentsAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_APPOINTMENTS'; payload: { appointments: Appointment[]; pagination: any } }
  | { type: 'SET_UPCOMING_APPOINTMENTS'; payload: Appointment[] }
  | { type: 'SET_TODAYS_APPOINTMENTS'; payload: Appointment[] }
  | { type: 'SET_DOCTORS'; payload: { doctors: Doctor[]; pagination: any } }
  | { type: 'SET_SPECIALIZATIONS'; payload: string[] }
  | { type: 'SET_SELECTED_DOCTOR'; payload: Doctor | null }
  | { type: 'SET_SELECTED_DATE'; payload: string | null }
  | { type: 'SET_AVAILABLE_SLOTS'; payload: string[] }
  | { type: 'UPDATE_APPOINTMENT'; payload: Appointment }
  | { type: 'ADD_APPOINTMENT'; payload: Appointment }
  | { type: 'REMOVE_APPOINTMENT'; payload: string };

// Initial state
const initialState: AppointmentsState = {
  appointments: [],
  upcomingAppointments: [],
  todaysAppointments: [],
  doctors: [],
  specializations: [],
  selectedDoctor: null,
  selectedDate: null,
  availableSlots: [],
  isLoading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
};

// Reducer
const appointmentsReducer = (state: AppointmentsState, action: AppointmentsAction): AppointmentsState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'SET_APPOINTMENTS':
      return {
        ...state,
        appointments: action.payload.appointments,
        pagination: action.payload.pagination,
      };
    case 'SET_UPCOMING_APPOINTMENTS':
      return {
        ...state,
        upcomingAppointments: action.payload,
      };
    case 'SET_TODAYS_APPOINTMENTS':
      return {
        ...state,
        todaysAppointments: action.payload,
      };
    case 'SET_DOCTORS':
      return {
        ...state,
        doctors: action.payload.doctors,
        pagination: action.payload.pagination,
      };
    case 'SET_SPECIALIZATIONS':
      return {
        ...state,
        specializations: action.payload,
      };
    case 'SET_SELECTED_DOCTOR':
      return {
        ...state,
        selectedDoctor: action.payload,
        availableSlots: [],
      };
    case 'SET_SELECTED_DATE':
      return {
        ...state,
        selectedDate: action.payload,
        availableSlots: [],
      };
    case 'SET_AVAILABLE_SLOTS':
      return {
        ...state,
        availableSlots: action.payload,
      };
    case 'UPDATE_APPOINTMENT':
      return {
        ...state,
        appointments: state.appointments.map(apt =>
          apt._id === action.payload._id ? action.payload : apt
        ),
        upcomingAppointments: state.upcomingAppointments.map(apt =>
          apt._id === action.payload._id ? action.payload : apt
        ),
        todaysAppointments: state.todaysAppointments.map(apt =>
          apt._id === action.payload._id ? action.payload : apt
        ),
      };
    case 'ADD_APPOINTMENT':
      return {
        ...state,
        appointments: [action.payload, ...state.appointments],
      };
    case 'REMOVE_APPOINTMENT':
      return {
        ...state,
        appointments: state.appointments.filter(apt => apt._id !== action.payload),
        upcomingAppointments: state.upcomingAppointments.filter(apt => apt._id !== action.payload),
        todaysAppointments: state.todaysAppointments.filter(apt => apt._id !== action.payload),
      };
    default:
      return state;
  }
};

// Context
interface AppointmentsContextType extends AppointmentsState {
  // Appointment actions
  fetchAppointments: (params?: any) => Promise<void>;
  fetchUpcomingAppointments: () => Promise<void>;
  fetchTodaysAppointments: () => Promise<void>;
  bookAppointment: (appointmentData: any) => Promise<Appointment>;
  cancelAppointment: (appointmentId: string, reason?: string) => Promise<void>;
  rescheduleAppointment: (appointmentId: string, newDate: string, newTime: string) => Promise<void>;
  confirmAppointment: (appointmentId: string) => Promise<void>;
  completeAppointment: (appointmentId: string, completionData: any) => Promise<void>;
  
  // Doctor actions
  fetchDoctors: (params?: any) => Promise<void>;
  fetchSpecializations: () => Promise<void>;
  fetchDoctor: (doctorId: string) => Promise<Doctor>;
  fetchDoctorAvailability: (doctorId: string, date: string) => Promise<void>;
  
  // Utility actions
  setSelectedDoctor: (doctor: Doctor | null) => void;
  setSelectedDate: (date: string | null) => void;
  clearError: () => void;
}

const AppointmentsContext = createContext<AppointmentsContextType | undefined>(undefined);

// Provider component
interface AppointmentsProviderProps {
  children: ReactNode;
}

export const AppointmentsProvider: React.FC<AppointmentsProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appointmentsReducer, initialState);

  // Fetch appointments
  const fetchAppointments = async (params: any = {}) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await appointmentsAPI.getAppointments(params);
      
      dispatch({
        type: 'SET_APPOINTMENTS',
        payload: {
          appointments: response.appointments,
          pagination: response.pagination,
        },
      });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Fetch upcoming appointments
  const fetchUpcomingAppointments = async () => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await appointmentsAPI.getUpcomingAppointments();
      
      dispatch({ type: 'SET_UPCOMING_APPOINTMENTS', payload: response.appointments });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  // Fetch today's appointments
  const fetchTodaysAppointments = async () => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await appointmentsAPI.getTodaysAppointments();
      
      dispatch({ type: 'SET_TODAYS_APPOINTMENTS', payload: response.appointments });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  // Book appointment
  const bookAppointment = async (appointmentData: any): Promise<Appointment> => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await appointmentsAPI.bookAppointment(appointmentData);
      
      dispatch({ type: 'ADD_APPOINTMENT', payload: response.appointment });
      
      return response.appointment;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Cancel appointment
  const cancelAppointment = async (appointmentId: string, reason?: string) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await appointmentsAPI.cancelAppointment(appointmentId, reason);
      
      dispatch({ type: 'UPDATE_APPOINTMENT', payload: response.appointment });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Reschedule appointment
  const rescheduleAppointment = async (appointmentId: string, newDate: string, newTime: string) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await appointmentsAPI.rescheduleAppointment(appointmentId, newDate, newTime);
      
      dispatch({ type: 'UPDATE_APPOINTMENT', payload: response.appointment });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Confirm appointment
  const confirmAppointment = async (appointmentId: string) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await appointmentsAPI.confirmAppointment(appointmentId);
      
      dispatch({ type: 'UPDATE_APPOINTMENT', payload: response.appointment });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Complete appointment
  const completeAppointment = async (appointmentId: string, completionData: any) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await appointmentsAPI.completeAppointment(appointmentId, completionData);
      
      dispatch({ type: 'UPDATE_APPOINTMENT', payload: response.appointment });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Fetch doctors
  const fetchDoctors = async (params: any = {}) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await doctorsAPI.getDoctors(params);
      
      dispatch({
        type: 'SET_DOCTORS',
        payload: {
          doctors: response.doctors,
          pagination: response.pagination,
        },
      });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Fetch specializations
  const fetchSpecializations = async () => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await doctorsAPI.getSpecializations();
      
      dispatch({ type: 'SET_SPECIALIZATIONS', payload: response.specializations });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  // Fetch doctor
  const fetchDoctor = async (doctorId: string): Promise<Doctor> => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await doctorsAPI.getDoctor(doctorId);
      
      return response.doctor;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Fetch doctor availability
  const fetchDoctorAvailability = async (doctorId: string, date: string) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await doctorsAPI.getAvailability(doctorId, date);
      
      dispatch({ type: 'SET_AVAILABLE_SLOTS', payload: response.availability.availableSlots });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  // Set selected doctor
  const setSelectedDoctor = (doctor: Doctor | null) => {
    dispatch({ type: 'SET_SELECTED_DOCTOR', payload: doctor });
  };

  // Set selected date
  const setSelectedDate = (date: string | null) => {
    dispatch({ type: 'SET_SELECTED_DATE', payload: date });
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const value: AppointmentsContextType = {
    ...state,
    fetchAppointments,
    fetchUpcomingAppointments,
    fetchTodaysAppointments,
    bookAppointment,
    cancelAppointment,
    rescheduleAppointment,
    confirmAppointment,
    completeAppointment,
    fetchDoctors,
    fetchSpecializations,
    fetchDoctor,
    fetchDoctorAvailability,
    setSelectedDoctor,
    setSelectedDate,
    clearError,
  };

  return (
    <AppointmentsContext.Provider value={value}>
      {children}
    </AppointmentsContext.Provider>
  );
};

// Hook to use appointments context
export const useAppointments = (): AppointmentsContextType => {
  const context = useContext(AppointmentsContext);
  if (context === undefined) {
    throw new Error('useAppointments must be used within an AppointmentsProvider');
  }
  return context;
};

export default AppointmentsContext;
