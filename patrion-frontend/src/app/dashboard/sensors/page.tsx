'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { sensorsApi, permissionsApi } from '@/services/api';
import { SensorData, SensorType, UserRole } from '@/types';
import SensorCard from '@/components/sensors/SensorCard';
import { useAuth } from '@/context/AuthContext';
import { DeviceTabletIcon, ChartBarIcon, PlusIcon, KeyIcon } from '@heroicons/react/24/outline';
import { io, Socket } from 'socket.io-client';
import { getCookie } from '@/utils/cookies';

export default function SensorsPage() {
  const [sensors, setSensors] = useState<SensorData[]>([]);
  const [filteredSensors, setFilteredSensors] = useState<SensorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // WebSocket bağlantısını kur ve sensör verilerini dinle
  useEffect(() => {
    const setupSocket = () => {
      try {
        // JWT token'ı cookie'den al
        const token = getCookie('token');
        
        if (!token) {
          console.error('Token bulunamadı. WebSocket doğrulaması başarısız olabilir.');
        }
        
        // WebSocket URL ve auth token
        const socket = io('ws://localhost:3001/sensors', {
          auth: {
            token // JWT token'ı auth nesnesi içinde gönder
          },
          transports: ['websocket'], // WebSocket'i tercih et
          reconnectionAttempts: 5, // Bağlantı kesilirse 5 kez yeniden deneme yap
          reconnectionDelay: 1000 // Denemeler arasında 1 saniye bekle
        });
        
        socketRef.current = socket;

        // Bağlantı olayları
        socket.on('connect', () => {
          console.log('Socket.IO bağlantısı kuruldu');
          setSocketConnected(true);
          setError(null);
        });

        socket.on('connect_error', (err) => {
          console.error('Socket.IO bağlantı hatası:', err);
          setSocketConnected(false);
          // WebSocket bağlantısı kurulamadığında API'den veri çek
          fetchSensorsFromAPI();
        });

        socket.on('disconnect', () => {
          console.log('Socket.IO bağlantısı kesildi');
          setSocketConnected(false);
        });

        // Sensör verilerini dinle
        socket.on('sensors-registry', (data: SensorData[]) => {
          if (Array.isArray(data)) {
            console.log('Sensör verileri Socket.IO üzerinden alındı:', data.length);
            setSensors(data);
            setIsLoading(false);
          } else {
            console.error('Geçersiz sensör verisi formatı:', data);
          }
        });

        // Sensör güncellemelerini dinle
        socket.on('sensors-update', (data: SensorData[]) => {
          if (Array.isArray(data)) {
            console.log('Sensör güncellemeleri Socket.IO üzerinden alındı:', data.length);
            setSensors(prevSensors => {
              // Mevcut sensörleri koru, güncellenen sensörleri ekle/güncelle
              const updatedSensors = [...prevSensors];
              
              // Her güncellenen sensör için mevcut sensörleri güncelle
              data.forEach(updatedSensor => {
                const index = updatedSensors.findIndex(s => s.id === updatedSensor.id);
                if (index !== -1) {
                  // Sensör zaten varsa güncelle
                  updatedSensors[index] = { ...updatedSensors[index], ...updatedSensor };
                } else {
                  // Yoksa ekle
                  updatedSensors.push(updatedSensor);
                }
              });
              
              return updatedSensors;
            });
          } else {
            console.error('Geçersiz sensör güncelleme formatı:', data);
          }
        });

        // Hata olaylarını dinle
        socket.on('error', (error) => {
          console.error('Socket.IO hatası:', error);
          setError('WebSocket bağlantı hatası oluştu.');
        });

        return () => {
          // Temizleme işlemi
          if (socket) {
            socket.disconnect();
            socketRef.current = null;
          }
        };
      } catch (err) {
        console.error('Socket.IO kurulumu hatası:', err);
        // Hata durumunda API'den veri çek
        fetchSensorsFromAPI();
        return () => {};
      }
    };

    // API'den sensör verilerini çekme fonksiyonu
    const fetchSensorsFromAPI = async () => {
      try {
        setIsLoading(true);
        console.log('API üzerinden sensör verileri alınıyor...');
        const data = await sensorsApi.getSensorRegistry();
        if (Array.isArray(data)) {
          setSensors(data);
          setError(null);
        } else {
          console.error('API bir dizi döndürmedi:', data);
          setSensors([]);
          setError('Sensör verileri geçersiz format içeriyor.');
        }
      } catch (err) {
        console.error('Sensör verileri alınamadı:', err);
        setError('Sensörler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        setSensors([]);
      } finally {
        setIsLoading(false);
      }
    };

    // WebSocket bağlantısı kur
    const cleanup = setupSocket();
    
    // Bileşen unmount olduğunda temizleme işlemi yap
    return cleanup;
  }, []);

  // Sensörleri kullanıcı izinlerine göre filtrele
  useEffect(() => {
    const filterSensorsByPermissions = async () => {
      // Eğer kullanıcı admin ise tüm sensörleri göster
      if (user?.role === UserRole.SYSTEM_ADMIN || user?.role === UserRole.COMPANY_ADMIN) {
        setFilteredSensors(sensors);
        return;
      }
      
      // Kullanıcı normal ise, sadece izni olan sensörleri göster
      if (user?.id) {
        try {
          // Kullanıcının erişebileceği sensörleri getir
          const accessList = await permissionsApi.getMyAccessList();
          console.log('Kullanıcı erişim listesi alındı:', accessList);
          
          // Erişimi olan sensör ID'lerini çıkar
          const allowedSensorIds = accessList.map(access => access.sensorId);
          
          // İzinli sensörleri filtrele
          const userSensors = sensors.filter(sensor => 
            allowedSensorIds.includes(sensor.id)
          );
          
          setFilteredSensors(userSensors);
        } catch (err) {
          console.error('Kullanıcı erişim listesi alınamadı:', err);
          console.log('Eski izin yöntemi deneniyor...');
          
          try {
            // Eski yöntem - Şirket izinlerini al ve kullanıcıya göre filtrele
            const allPermissions = await permissionsApi.getCompanyPermissions();
            // Bu kullanıcının erişim yetkisi olan sensörleri filtrele
            const userPermissions = allPermissions.filter(p => p.userId === user.id && p.hasAccess);
            
            // İzinli sensörleri filtrele
            const allowedSensorIds = userPermissions.map(p => p.sensorId);
              
            const userSensors = sensors.filter(sensor => 
              allowedSensorIds.includes(sensor.id)
            );
            
            setFilteredSensors(userSensors);
          } catch (innerErr) {
            console.error('İzinler alınamadı, tüm sensörleri gösteriyorum:', innerErr);
            // API henüz hazır değilse, tüm sensörleri göster (geliştirme aşamasında)
            setFilteredSensors(sensors);
          }
        }
      } else {
        setFilteredSensors([]);
      }
    };
    
    filterSensorsByPermissions();
  }, [sensors, user]);

  // İstatistik hesaplama
  const sensorArray = Array.isArray(sensors) ? sensors : [];
  
  // Helper function to get sensor value based on type and latestData
  const getSensorValue = (sensor: SensorData, valueType: 'temperature' | 'humidity'): number => {
    // If value is directly available, use it (for backward compatibility)
    if (typeof sensor.value === 'number') {
      return sensor.value;
    }
    
    // If latestData is available, get the appropriate value
    if (sensor.latestData) {
      if (valueType === 'temperature' && typeof sensor.latestData.temperature === 'number') {
        return sensor.latestData.temperature;
      } else if (valueType === 'humidity' && typeof sensor.latestData.humidity === 'number') {
        return sensor.latestData.humidity;
      }
    }
    
    // Default value if nothing is available
    return 0;
  };
  
  // Helper function to get status level from new status structure or old format
  const getStatusLevel = (status: any): 'normal' | 'warning' | 'alert' => {
    if (!status) return 'normal';
    
    // If status is a string (old format)
    if (typeof status === 'string') {
      return status as 'normal' | 'warning' | 'alert';
    }
    
    // If status is an object (new format)
    if (typeof status === 'object' && status.level) {
      return status.level as 'normal' | 'warning' | 'alert';
    }
    
    return 'normal';
  };
  
  const stats = {
    total: sensorArray.length,
    temperature: sensorArray.filter(s => s && s.type === SensorType.TEMPERATURE).length,
    humidity: sensorArray.filter(s => s && s.type === SensorType.HUMIDITY).length,
    temperatureHumidity: sensorArray.filter(s => s && s.type === SensorType.TEMPERATURE_HUMIDITY).length,
    alerts: sensorArray.filter(s => {
      if (s && getStatusLevel(s.status) === 'alert') return true;
      
      // If status is not explicitly set, determine based on values
      if (s && (s.type === SensorType.TEMPERATURE || s.type === SensorType.TEMPERATURE_HUMIDITY)) {
        const tempValue = getSensorValue(s, 'temperature');
        if (tempValue > 30) return true;
      } else if (s && s.type === SensorType.HUMIDITY) {
        const humValue = getSensorValue(s, 'humidity');
        if (humValue > 70) return true;
      }
      
      return false;
    }).length,
    avgTemperature: sensorArray
      .filter(s => s && (s.type === SensorType.TEMPERATURE || s.type === SensorType.TEMPERATURE_HUMIDITY))
      .reduce((sum, sensor) => sum + getSensorValue(sensor, 'temperature'), 0) / 
      (sensorArray.filter(s => s && (s.type === SensorType.TEMPERATURE || s.type === SensorType.TEMPERATURE_HUMIDITY)).length || 1),
    avgHumidity: sensorArray
      .filter(s => s && (s.type === SensorType.HUMIDITY || s.type === SensorType.TEMPERATURE_HUMIDITY))
      .reduce((sum, sensor) => sum + getSensorValue(sensor, 'humidity'), 0) / 
      (sensorArray.filter(s => s && (s.type === SensorType.HUMIDITY || s.type === SensorType.TEMPERATURE_HUMIDITY)).length || 1),
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-6">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        
        {/* Butonlar */}
        <div className="flex space-x-4">
          {/* Sensör Ekleme Butonu - Sadece adminlere göster */}
          {(user?.role === UserRole.SYSTEM_ADMIN || user?.role === UserRole.COMPANY_ADMIN) && (
            <Link
              href="/dashboard/sensors/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" aria-hidden="true" />
              Yeni Sensör
            </Link>
          )}
          
          {/* İzinler Butonu - Sadece adminlere göster */}
          {(user?.role === UserRole.SYSTEM_ADMIN || user?.role === UserRole.COMPANY_ADMIN) && (
            <Link
              href="/dashboard/permissions"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <KeyIcon className="h-5 w-5 mr-2" aria-hidden="true" />
              Sensör İzinleri
            </Link>
          )}
        </div>
      </div>
      
      {/* Özet İstatistikler */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                <DeviceTabletIcon className="h-6 w-6 text-indigo-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Toplam Sensör</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                <ChartBarIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Alarm Durumunda</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.alerts}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                <span className="h-6 w-6 text-yellow-600 text-xl">🌡️</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Ort. Sıcaklık</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.avgTemperature.toFixed(1)}°C</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <span className="h-6 w-6 text-blue-600 text-xl">💧</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Ort. Nem</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.avgHumidity.toFixed(1)}%</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bağlantılar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link 
          href="/dashboard/sensors/map"
          className="block p-6 bg-white shadow rounded-lg hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-lg font-medium text-gray-900 mb-2">Sensör Haritası</h2>
          <p className="text-gray-500">Tüm sensörlerin yerleşim planını görüntüleyin</p>
        </Link>
        
        <Link 
          href="/dashboard/sensors/monitor"
          className="block p-6 bg-white shadow rounded-lg hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-lg font-medium text-gray-900 mb-2">Gerçek Zamanlı İzleme</h2>
          <p className="text-gray-500">Sensör verilerini gerçek zamanlı olarak izleyin</p>
        </Link>
      </div>
      
      {/* Sensör Listesi */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-medium text-gray-900">Tüm Sensörler</h2>
        {socketConnected && (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-1"></span>
            Canlı Veri
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(filteredSensors) && filteredSensors
          .filter(sensor => sensor && sensor.id) // Sadece geçerli sensörleri göster
          .map(sensor => (
            <Link key={sensor.id} href={`/dashboard/sensors/${sensor.sensor_id}?id=${sensor.id}`}>
              <SensorCard sensor={sensor} />
            </Link>
          ))
        }
        
        {(!Array.isArray(filteredSensors) || filteredSensors.length === 0) && (
          <div className="col-span-3 bg-gray-50 p-6 text-center rounded-lg border border-gray-200">
            <p className="text-gray-500">
              {user?.role === UserRole.USER 
                ? 'Görüntüleme izniniz olan sensör bulunmamaktadır. Lütfen yöneticinize başvurun.'
                : 'Henüz sensör bulunmamaktadır.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 