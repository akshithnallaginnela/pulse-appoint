// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

console.log('API_BASE_URL:', API_BASE_URL);
console.log('Environment variables:', import.meta.env);

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Helper function to make API requests
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const fullUrl = `${API_BASE_URL}${endpoint}`;
  console.log('Making API request to:', fullUrl);
  console.log('Request config:', config);

  try {
    const response = await fetch(fullUrl, config);

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API error response:', errorData);
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('API response data:', data);
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  // Register a new user
  register: async (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
    role?: string;
  }) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Register a new doctor
  registerDoctor: async (doctorData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
    licenseNumber: string;
    specialization: string;
    experience: number;
    consultationFee: number;
  }) => {
    return apiRequest('/auth/register-doctor', {
      method: 'POST',
      body: JSON.stringify(doctorData),
    });
  },

  // Login user
  login: async (credentials: { email: string; password: string }) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  // Get current user profile
  getProfile: async () => {
    return apiRequest('/auth/me');
  },

  // Refresh token
  refreshToken: async () => {
    return apiRequest('/auth/refresh', {
      method: 'POST',
    });
  },

  // Logout
  logout: async () => {
    return apiRequest('/auth/logout', {
      method: 'POST',
    });
  },

  // Forgot password
  forgotPassword: async (email: string) => {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Reset password
  resetPassword: async (token: string, newPassword: string) => {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },
};

// Users API
export const usersAPI = {
  // Get user profile
  getProfile: async () => {
    return apiRequest('/users/profile');
  },

  // Update user profile
  updateProfile: async (profileData: any) => {
    return apiRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string) => {
    return apiRequest('/users/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // Get user appointments
  getAppointments: async (page = 1, limit = 10) => {
    return apiRequest(`/users/appointments?page=${page}&limit=${limit}`);
  },

  // Get specific appointment
  getAppointment: async (appointmentId: string) => {
    return apiRequest(`/users/appointments/${appointmentId}`);
  },

  // Cancel appointment
  cancelAppointment: async (appointmentId: string, reason?: string) => {
    return apiRequest(`/users/appointments/${appointmentId}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  },

  // Reschedule appointment
  rescheduleAppointment: async (appointmentId: string, newDate: string, newTime: string) => {
    return apiRequest(`/users/appointments/${appointmentId}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ newDate, newTime }),
    });
  },

  // Rate appointment
  rateAppointment: async (appointmentId: string, score: number, review?: string) => {
    return apiRequest(`/users/appointments/${appointmentId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ score, review }),
    });
  },

  // Get medical history
  getMedicalHistory: async () => {
    return apiRequest('/users/medical-history');
  },

  // Update medical history
  updateMedicalHistory: async (medicalData: any) => {
    return apiRequest('/users/medical-history', {
      method: 'PUT',
      body: JSON.stringify(medicalData),
    });
  },
};

// Doctors API
export const doctorsAPI = {
  // Get all doctors with filtering
  getDoctors: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    specialization?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    return apiRequest(`/doctors?${queryParams.toString()}`);
  },

  // Get available specializations
  getSpecializations: async () => {
    return apiRequest('/doctors/specializations');
  },

  // Get doctor by ID
  getDoctor: async (doctorId: string) => {
    return apiRequest(`/doctors/${doctorId}`);
  },

  // Get doctor availability
  getAvailability: async (doctorId: string, date: string) => {
    return apiRequest(`/doctors/${doctorId}/availability?date=${date}`);
  },

  // Get doctor reviews
  getReviews: async (doctorId: string, page = 1, limit = 10) => {
    return apiRequest(`/doctors/${doctorId}/reviews?page=${page}&limit=${limit}`);
  },

  // Get doctor profile (for doctors)
  getProfile: async () => {
    return apiRequest('/doctors/profile/me');
  },

  // Update doctor profile
  updateProfile: async (profileData: any) => {
    return apiRequest('/doctors/profile/me', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Get doctor appointments
  getAppointments: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    date?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    return apiRequest(`/doctors/appointments/me?${queryParams.toString()}`);
  },

  // Update appointment status
  updateAppointmentStatus: async (appointmentId: string, status: string, notes?: string) => {
    return apiRequest(`/doctors/appointments/${appointmentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  // Add diagnosis to appointment
  addDiagnosis: async (appointmentId: string, diagnosisData: any) => {
    return apiRequest(`/doctors/appointments/${appointmentId}/diagnosis`, {
      method: 'PUT',
      body: JSON.stringify(diagnosisData),
    });
  },

  // Get dashboard statistics
  getDashboardStats: async () => {
    return apiRequest('/doctors/dashboard/stats');
  },
};

// Appointments API
export const appointmentsAPI = {
  // Book new appointment
  bookAppointment: async (appointmentData: {
    doctorId: string;
    appointmentDate: string;
    appointmentTime: string;
    reason: string;
    consultationType?: string;
    symptoms?: string[];
    medicalHistory?: string;
    currentMedications?: string[];
    allergies?: string[];
  }) => {
    return apiRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  },

  // Get appointments
  getAppointments: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    date?: string;
    doctorId?: string;
    patientId?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    return apiRequest(`/appointments?${queryParams.toString()}`);
  },

  // Get specific appointment
  getAppointment: async (appointmentId: string) => {
    return apiRequest(`/appointments/${appointmentId}`);
  },

  // Confirm appointment
  confirmAppointment: async (appointmentId: string) => {
    return apiRequest(`/appointments/${appointmentId}/confirm`, {
      method: 'PUT',
    });
  },

  // Cancel appointment
  cancelAppointment: async (appointmentId: string, reason?: string) => {
    return apiRequest(`/appointments/${appointmentId}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  },

  // Reschedule appointment
  rescheduleAppointment: async (appointmentId: string, newDate: string, newTime: string, reason?: string) => {
    return apiRequest(`/appointments/${appointmentId}/reschedule`, {
      method: 'PUT',
      body: JSON.stringify({ newDate, newTime, reason }),
    });
  },

  // Complete appointment
  completeAppointment: async (appointmentId: string, completionData: any) => {
    return apiRequest(`/appointments/${appointmentId}/complete`, {
      method: 'PUT',
      body: JSON.stringify(completionData),
    });
  },

  // Get upcoming appointments
  getUpcomingAppointments: async () => {
    return apiRequest('/appointments/upcoming/me');
  },

  // Get today's appointments
  getTodaysAppointments: async () => {
    return apiRequest('/appointments/today/me');
  },
};

// Payments API
export const paymentsAPI = {
  // Create Razorpay order
  createOrder: async (appointmentId: string) => {
    return apiRequest('/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({ appointmentId }),
    });
  },

  // Verify payment
  verifyPayment: async (paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    appointmentId: string;
  }) => {
    return apiRequest('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },

  // Process refund
  processRefund: async (appointmentId: string, reason?: string) => {
    return apiRequest('/payments/refund', {
      method: 'POST',
      body: JSON.stringify({ appointmentId, reason }),
    });
  },

  // Get payment history
  getPaymentHistory: async (page = 1, limit = 10) => {
    return apiRequest(`/payments/history?page=${page}&limit=${limit}`);
  },

  // Get payment statistics
  getPaymentStats: async () => {
    return apiRequest('/payments/stats');
  },
};

// Admin API
export const adminAPI = {
  // Get dashboard statistics
  getDashboardStats: async () => {
    return apiRequest('/admin/dashboard/stats');
  },

  // Get all users
  getUsers: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    return apiRequest(`/admin/users?${queryParams.toString()}`);
  },

  // Get specific user
  getUser: async (userId: string) => {
    return apiRequest(`/admin/users/${userId}`);
  },

  // Update user status
  updateUserStatus: async (userId: string, isActive: boolean) => {
    return apiRequest(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    });
  },

  // Get all doctors
  getDoctors: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    specialization?: string;
    isVerified?: boolean;
    isActive?: boolean;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    return apiRequest(`/admin/doctors?${queryParams.toString()}`);
  },

  // Verify doctor
  verifyDoctor: async (doctorId: string, isVerified: boolean) => {
    return apiRequest(`/admin/doctors/${doctorId}/verify`, {
      method: 'PUT',
      body: JSON.stringify({ isVerified }),
    });
  },

  // Get all appointments
  getAppointments: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    doctorId?: string;
    patientId?: string;
    date?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    return apiRequest(`/admin/appointments?${queryParams.toString()}`);
  },

  // Update appointment status
  updateAppointmentStatus: async (appointmentId: string, status: string, reason?: string) => {
    return apiRequest(`/admin/appointments/${appointmentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, reason }),
    });
  },

  // Get revenue reports
  getRevenueReport: async (period = 'month', startDate?: string, endDate?: string) => {
    const queryParams = new URLSearchParams();
    queryParams.append('period', period);
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    return apiRequest(`/admin/reports/revenue?${queryParams.toString()}`);
  },

  // Get appointment reports
  getAppointmentReport: async (period = 'month', startDate?: string, endDate?: string) => {
    const queryParams = new URLSearchParams();
    queryParams.append('period', period);
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    return apiRequest(`/admin/reports/appointments?${queryParams.toString()}`);
  },
};

// Health check API
export const healthAPI = {
  check: async () => {
    return apiRequest('/health');
  },
};

export default {
  authAPI,
  usersAPI,
  doctorsAPI,
  appointmentsAPI,
  paymentsAPI,
  adminAPI,
  healthAPI,
};

