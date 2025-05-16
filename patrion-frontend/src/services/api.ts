'use client';

import axios from 'axios';
import { AuthResponse, Company, LoginRequest, RegisterRequest, User, SensorData, SensorReading, SensorCreateRequest } from '../types';
import { getCookie, setCookie, eraseCookie } from '../utils/cookies';

const API_URL = 'http://18.184.139.251:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = getCookie('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401 responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // İsteğin retry sayısını izle
    if (!originalRequest) {
      return Promise.reject(error);
    }
    
    // Token yenileme çağrısının kendisini tekrar denemekten kaçınmak için kontrol
    if (originalRequest.url === '/auth/refresh') {
      eraseCookie('token');
      eraseCookie('refresh_token');
      window.location.href = '/login';
      return Promise.reject(error);
    }
    
    // If error is 401 and request hasn't been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Get refresh token from cookies
        const refreshToken = getCookie('refresh_token');
        
        if (!refreshToken) {
          // No refresh token available, log out
          eraseCookie('token');
          eraseCookie('refresh_token');
          window.location.href = '/login';
          return Promise.reject(new Error('No refresh token available'));
        }
        
        console.log('Attempting to refresh access token...');
        
        // Use a direct API call to avoid circular reference
        const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken
        });
        
        // Yanıttan access token ve refresh token çıkar
        const { access_token, refresh_token } = refreshResponse.data;
        
        if (!access_token || !refresh_token) {
          throw new Error('Invalid token refresh response');
        }
        
        console.log('Token refreshed successfully');
        
        // Update cookies with new tokens - daha uzun süre ile sakla
        setCookie('token', access_token, 30); 
        setCookie('refresh_token', refresh_token, 60);
        
        // Update Authorization header
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear cookies and redirect to login
        console.error('Token refresh failed:', refreshError);
        eraseCookie('token');
        eraseCookie('refresh_token');
        
        // Tarayıcı yönlendirmesini kullan
        window.location.href = '/login?session=expired';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    // Token'lar artık AuthContext içinde ayarlanacak
    return response.data;
  },
  
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data);
    // Token'lar artık AuthContext içinde ayarlanacak
    return response.data;
  },
  
  refresh: async (refreshToken: string): Promise<{ access_token: string, refresh_token: string }> => {
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },
  
  logout: async (): Promise<void> => {
    try {
      // Call the logout endpoint
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Always remove cookies, even if API call fails
      eraseCookie('token');
      eraseCookie('refresh_token');
    }
  },
  
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/users/me');
    return response.data;
  },
};

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data;
  },
  
  getCompanyUsers: async (companyId?: string): Promise<User[]> => {
    const url = companyId ? `/users/company/${companyId}` : '/users/company';
    const response = await api.get(url);
    return response.data;
  },
  
  getById: async (id: string): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  
  create: async (data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'company'>): Promise<User> => {
    const response = await api.post('/users', data);
    return response.data;
  },
  
  adminCreate: async (data: { email: string, firstName: string, lastName: string, password: string, role: string, companyId?: string }): Promise<User> => {
    const response = await api.post('/users/admin-create', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<User>): Promise<User> => {
    const response = await api.patch(`/users/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  }
};

export const companiesApi = {
  getAll: async (): Promise<Company[]> => {
    const response = await api.get('/companies');
    return response.data;
  },
  
  getById: async (id: string): Promise<Company> => {
    const response = await api.get(`/companies/${id}`);
    return response.data;
  },
  
  getMyCompany: async (): Promise<Company> => {
    const response = await api.get('/companies/my-company');
    return response.data;
  },
  
  create: async (data: Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'companyAdmin' | 'users'>): Promise<Company> => {
    const response = await api.post('/companies', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<Company>): Promise<Company> => {
    const response = await api.patch(`/companies/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/companies/${id}`);
  }
};

export default api;

export const sensorsApi = {
  getAll: async (companyId?: string): Promise<SensorData[]> => {
    const url = companyId ? `/sensors?companyId=${companyId}` : '/sensors';
    const response = await api.get(url);
    return response.data;
  },
  
  getById: async (id: string): Promise<SensorData> => {
    const response = await api.get(`/sensors/registry/${id}`);
    return response.data;
  },
  
  getReadings: async (sensorId: string, limit: number = 100): Promise<SensorReading[]> => {
    const response = await api.get(`/sensors/${sensorId}/readings?limit=${limit}`);
    return response.data;
  },
  
  getSensorRegistry: async (): Promise<SensorData[]> => {
    const response = await api.get('/sensors/registry');
    return response.data;
  },
  
  getLatestReadings: async (sensorId: string, limit: number = 30): Promise<any[]> => {
    const response = await api.get(`/sensors/${sensorId}/latest?limit=${limit}`);
    return response.data;
  },
  
  create: async (data: Omit<SensorData, 'id' | 'timestamp'>): Promise<SensorData> => {
    const response = await api.post('/sensors', data);
    return response.data;
  },
  
  createSensor: async (data: SensorCreateRequest): Promise<SensorData> => {
    const response = await api.post('/sensors', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<SensorData>): Promise<SensorData> => {
    const response = await api.patch(`/sensors/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/sensors/${id}`);
  }
};

// Sensör izinleri API
export const permissionsApi = {
  // Bir kullanıcının izinlerini getir
  getUserPermissions: async (userId: string): Promise<any[]> => {
    const response = await api.get(`/permissions/user/${userId}`);
    return response.data;
  },
  
  // Bir sensörün izinlerini getir
  getSensorPermissions: async (sensorId: string): Promise<any[]> => {
    const response = await api.get(`/permissions/sensor/${sensorId}`);
    return response.data;
  },
  
  // Şirket için tüm izinleri getir
  getCompanyPermissions: async (): Promise<any[]> => {
    const response = await api.get('/permissions/company');
    return response.data;
  },
  
  // İzin ekle veya güncelle
  updatePermission: async (data: { userId: string, sensorId: string, hasAccess: boolean }): Promise<any> => {
    const response = await api.post('/permissions', data);
    return response.data;
  },
  
  // Toplu izin güncelleme (bir kullanıcı için tüm sensörleri güncelle)
  updateBatch: async (data: { userId: string, grant: boolean }): Promise<any> => {
    const response = await api.post('/permissions/batch', data);
    return response.data;
  },
  
  // Yeni izin verme API'si
  grantAccess: async (userId: string, data: { sensorId: string, notes?: string }): Promise<any> => {
    // Eski API (artık kullanılmıyor)
    // const response = await api.post(`/sensor-access/users/${userId}/grant`, data);
    
    // Yeni API - izin verme
    const response = await api.post('/sensors/access', {
      userId,
      sensorId: data.sensorId,
      canView: true,
      canEdit: true,
      canDelete: false,
      description: data.notes || `Erişim verildi - ${new Date().toISOString()}`
    });
    return response.data;
  },
  
  // Yeni izin kaldırma API'si
  revokeAccess: async (userId: string, sensorId: string): Promise<any> => {
    // Eski API (artık kullanılmıyor)
    // const response = await api.delete(`/sensor-access/users/${userId}/revoke/${sensorId}`);
    
    // Yeni API - izin kaldırma
    const response = await api.delete('/sensors/access', {
      data: {
        userId,
        sensorId
      }
    });
    return response.data;
  },
  
  // Kullanıcının erişebildiği sensörleri getir (Admin görünümü)
  getUserAccessList: async (userId: string): Promise<any[]> => {
    const response = await api.get(`/sensors/access/user/${userId}`);
    return response.data;
  },
  
  // Giriş yapan kullanıcının erişebildiği sensörleri getir
  getMyAccessList: async (): Promise<any[]> => {
    const response = await api.get('/sensors/my-access');
    return response.data;
  }
};

// Sistem logları API
export const logsApi = {
  // Tüm logları getir
  getAll: async (): Promise<any[]> => {
    const response = await api.get('/logs');
    return response.data;
  },
  
  // Filtreli log getirme
  getFiltered: async (params: { userId?: string, sensorId?: string, action?: string, startDate?: string, endDate?: string }): Promise<any[]> => {
    try {
      const queryParams = new URLSearchParams();
      
      // Only append parameters that are defined
      if (params.userId) queryParams.append('userId', params.userId);
      if (params.sensorId) queryParams.append('sensorId', params.sensorId);
      if (params.action) queryParams.append('action', params.action);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      
      const queryString = queryParams.toString();
      const url = queryString ? `/logs?${queryString}` : '/logs';
      
      console.log('Fetching logs with URL:', url);
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching filtered logs:', error);
      return [];
    }
  },
  
  // Belirli bir sensörün loglarını getirme
  getSensorLogs: async (sensorId: string): Promise<any[]> => {
    const response = await api.get(`/logs/sensor/${sensorId}`);
    return response.data;
  },
  
  // Belirli bir kullanıcının loglarını getirme
  getUserLogs: async (userId: string): Promise<any[]> => {
    const response = await api.get(`/logs/user/${userId}`);
    return response.data;
  }
}; 