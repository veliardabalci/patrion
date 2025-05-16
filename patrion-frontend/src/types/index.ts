export enum UserRole {
  SYSTEM_ADMIN = 'SystemAdmin',
  COMPANY_ADMIN = 'CompanyAdmin',
  USER = 'User',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: string | null;
  company: Company | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  website: string;
  isActive: boolean;
  companyAdminId: string;
  companyAdmin: User;
  users: User[];
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export enum SensorType {
  TEMPERATURE = 'temperature',
  HUMIDITY = 'humidity',
  TEMPERATURE_HUMIDITY = 'temperature_humidity',
}

export interface SensorData {
  id: string;
  name: string;
  type: SensorType;
  value?: number;
  unit?: string;
  timestamp?: string;
  location: string;
  status?: {
    level: 'normal' | 'warning' | 'alert';
    message: string;
    temperatureStatus?: {
      level: 'normal' | 'warning' | 'alert';
      message: string;
    };
    humidityStatus?: {
      level: 'normal' | 'warning' | 'alert';
      message: string;
    };
  } | 'normal' | 'warning' | 'alert'; // For backward compatibility
  companyId: string;
  sensor_id?: string;
  description?: string;
  isActive?: boolean;
  company?: Company;
  createdAt?: string;
  updatedAt?: string;
  latestData?: {
    timestamp: string;
    temperature?: number;
    humidity?: number;
    additional_data?: any;
  };
}

export interface SensorReading {
  id: string;
  sensorId: string;
  value: number;
  timestamp: string;
}

export interface SensorLatestReading {
  id: string;
  sensor_id: string;
  timestamp: string;
  temperature?: number;
  humidity?: number;
  additional_data?: any;
  created_at: string;
}

export interface SensorCreateRequest {
  sensor_id: string;
  name: string;
  description: string;
  location: string;
  type: string;
  companyId: string;
}

export interface SensorPermission {
  id?: string;
  userId: string;
  sensorId: string;
  hasAccess?: boolean;
  canView?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  createdAt?: string;
  updatedAt?: string;
  notes?: string;
  description?: string;
  grantedBy?: string;
  grantedByName?: string;
  createdBy?: string;
} 