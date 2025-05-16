export enum SensorStatusLevel {
  NORMAL = 'normal',
  WARNING = 'warning',
  ALERT = 'alert',
  UNKNOWN = 'unknown'
}

export interface SensorStatus {
  level: SensorStatusLevel;
  message: string;
  temperatureStatus?: {
    level: SensorStatusLevel;
    message: string;
  };
  humidityStatus?: {
    level: SensorStatusLevel;
    message: string;
  };
}

export interface SensorThresholds {
  temperature: {
    minNormal: number;
    maxNormal: number;
    minWarning: number;
    maxWarning: number;
  };
  humidity: {
    minNormal: number;
    maxNormal: number;
    minWarning: number;
    maxWarning: number;
  };
}

// Varsayılan eşik değerleri
export const DEFAULT_THRESHOLDS: SensorThresholds = {
  temperature: {
    minNormal: 18,    // Normal oda sıcaklığı alt sınırı
    maxNormal: 30,    // Normal oda sıcaklığı üst sınırı
    minWarning: 26,   // Alt uyarı sınırı
    maxWarning: 38    // Üst uyarı sınırı
  },
  humidity: {
    minNormal: 40,    // Normal oda nemi alt sınırı
    maxNormal: 60,    // Normal oda nemi üst sınırı
    minWarning: 30,   // Alt uyarı sınırı 
    maxWarning: 70    // Üst uyarı sınırı
  }
}; 