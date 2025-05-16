'use client';

import { useState, useEffect, useRef } from 'react';
import { sensorsApi, permissionsApi } from '@/services/api';
import { SensorData, SensorType, UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { getCookie } from '@/utils/cookies';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Chart.js kaydı
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function SensorMonitorPage() {
  const [sensors, setSensors] = useState<SensorData[]>([]);
  const [filteredSensors, setFilteredSensors] = useState<SensorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // API'den sensör verilerini çekme fonksiyonu
  const fetchSensorsFromAPI = async () => {
    try {
      setIsLoading(true);
      console.log('API üzerinden sensör verileri alınıyor...');
      const data = await sensorsApi.getSensorRegistry();
      if (Array.isArray(data)) {
        setSensors(data);
        setLastUpdate(new Date());
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
        const socket = io('ws://http://18.184.139.251:3001/sensors', {
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
            setLastUpdate(new Date());
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
              
              setLastUpdate(new Date());
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

  // Yenileme işlemi
  const handleRefresh = () => {
    fetchSensorsFromAPI();
  };

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

  // Sensör verileri için geçmiş değerler
  const [sensorHistory, setSensorHistory] = useState<{ [sensorId: string]: any[] }>({});

  // Sensör verisi eklendiğinde geçmişi güncelle
  useEffect(() => {
    // Sensörlerin güncel verileriyle geçmişi güncelle
    const updateSensorHistory = () => {
      const newHistory = { ...sensorHistory };

      filteredSensors.forEach(sensor => {
        if (!sensor.id || !sensor.latestData) return;

        // Her sensör için geçmiş oluştur veya güncelle
        if (!newHistory[sensor.id]) {
          newHistory[sensor.id] = [];
        }

        // Son veriyi geçmişe ekle (maksimum 30 veri noktası)
        const sensorData = {
          timestamp: sensor.latestData.timestamp || new Date().toISOString(),
          temperature: sensor.latestData.temperature,
          humidity: sensor.latestData.humidity
        };

        // Aynı zaman damgası varsa ekleme
        const lastEntry = newHistory[sensor.id].length > 0 ? 
          newHistory[sensor.id][newHistory[sensor.id].length - 1] : null;
          
        if (!lastEntry || lastEntry.timestamp !== sensorData.timestamp) {
          newHistory[sensor.id].push(sensorData);
          
          // Maksimum 30 veri noktası sakla
          if (newHistory[sensor.id].length > 30) {
            newHistory[sensor.id].shift();
          }
        }
      });

      setSensorHistory(newHistory);
    };

    updateSensorHistory();
  }, [filteredSensors]);

  // Grafik seçenekleri
  const getChartOptions = (title: string, unit: string, color: string, min: number, max: number): ChartOptions<'line'> => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: title,
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          titleColor: '#1f2937',
          bodyColor: '#4b5563',
          borderColor: '#e5e7eb',
          borderWidth: 1,
          padding: 12,
          boxPadding: 8,
          usePointStyle: true,
          callbacks: {
            title: function(context) {
              return context[0].label ? `${context[0].label}` : '';
            },
            label: function(context) {
              const value = context.parsed.y;
              return `${value.toFixed(1)}${unit}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              family: 'Inter, system-ui, sans-serif',
              size: 10
            },
            color: '#6b7280'
          }
        },
        y: {
          min: min,
          max: max,
          grid: {
            color: 'rgba(229, 231, 235, 0.5)'
          },
          ticks: {
            font: {
              family: 'Inter, system-ui, sans-serif',
              size: 11
            },
            color: '#6b7280',
            callback: function(value) {
              return `${value}${unit}`;
            },
            stepSize: unit === '°C' ? 10 : 20
          }
        }
      },
      animation: {
        duration: 800,
        easing: 'easeOutQuart'
      },
      elements: {
        line: {
          tension: 0.4,
          borderWidth: 2
        },
        point: {
          radius: 3,
          hoverRadius: 5,
          backgroundColor: color
        }
      },
      interaction: {
        mode: 'index',
        intersect: false
      },
      hover: {
        mode: 'index',
        intersect: false
      }
    };
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

  // Kritik sensörleri ve normal sensörleri ayır
  const criticalSensors = filteredSensors.filter(s => getStatusLevel(s.status) === 'alert' || getStatusLevel(s.status) === 'warning');
  const normalSensors = filteredSensors.filter(s => getStatusLevel(s.status) === 'normal' || !s.status);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Gerçek Zamanlı Sensör İzleme</h1>
          <p className="mt-1 text-gray-500">
            Tüm sensörlerinizi canlı olarak izleyin ve anlık verileri görüntüleyin.
          </p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Yenile
          </button>
        </div>
      </div>
      
      {/* Bağlantı Durumu */}
      <div className={`p-4 mb-6 rounded-lg flex items-center justify-between ${socketConnected ? 'bg-emerald-50 border border-emerald-200' : 'bg-orange-50 border border-orange-200'}`}>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`}></div>
          <span className={socketConnected ? 'text-emerald-700' : 'text-orange-700'}>
            {socketConnected ? 'Canlı Veri Bağlantısı Aktif' : 'Canlı Veri Bağlantısı Devre Dışı'}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {lastUpdate && `Son güncelleme: ${lastUpdate.toLocaleTimeString()}`}
        </div>
      </div>

      {/* Kritik Sensörler */}
      {criticalSensors.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-medium text-gray-900 mb-4 flex items-center">
            Kritik Sensörler
            <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
              {criticalSensors.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            {criticalSensors.map(sensor => (
              <div key={sensor.id} className="bg-white shadow rounded-lg overflow-hidden">
                <div className={`border-l-4 px-4 py-3 flex justify-between items-center ${
                  getStatusLevel(sensor.status) === 'alert' ? 'border-red-500' : 'border-orange-500'
                }`}>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {sensor.name || sensor.sensor_id || 'İsimsiz Sensör'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {sensor.location || 'Konum belirtilmemiş'} - 
                      {sensor.type === SensorType.TEMPERATURE ? ' Sıcaklık Sensörü' : 
                       sensor.type === SensorType.HUMIDITY ? ' Nem Sensörü' : 
                       sensor.type === SensorType.TEMPERATURE_HUMIDITY ? ' Sıcaklık & Nem Sensörü' : 
                       ' Sensör'}
                    </p>
                  </div>
                  
                  <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    getStatusLevel(sensor.status) === 'alert' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {getStatusLevel(sensor.status) === 'alert' ? 'Alarm' : 'Uyarı:'} 
                    {sensor.type === SensorType.TEMPERATURE || sensor.type === SensorType.TEMPERATURE_HUMIDITY ? 
                      ` ${sensor.latestData?.temperature?.toFixed(1) || '0.0'}°C` : 
                      ` ${sensor.latestData?.humidity?.toFixed(0) || '0'}%`
                    }
                  </div>
                </div>
                
                <div className="p-4">
                  {/* Grafikler */}
                  <div className="h-64">
                    {sensorHistory[sensor.id] && sensorHistory[sensor.id].length > 0 ? (
                      <div className="h-full">
                        {/* Sensör tipine göre grafik göster */}
                        {sensor.type === SensorType.TEMPERATURE && (
                          <Line 
                            options={getChartOptions('Sıcaklık Değişimi', '°C', 'rgb(239, 68, 68)', 0, 80)}
                            data={{
                              labels: sensorHistory[sensor.id].map(item => 
                                new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})
                              ),
                              datasets: [
                                {
                                  label: 'Sıcaklık',
                                  data: sensorHistory[sensor.id].map(item => item.temperature),
                                  borderColor: 'rgb(239, 68, 68)',
                                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                  fill: true
                                }
                              ]
                            }}
                          />
                        )}
                        {sensor.type === SensorType.HUMIDITY && (
                          <Line 
                            options={getChartOptions('Nem Değişimi', '%', 'rgb(59, 130, 246)', 0, 100)}
                            data={{
                              labels: sensorHistory[sensor.id].map(item => 
                                new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})
                              ),
                              datasets: [
                                {
                                  label: 'Nem',
                                  data: sensorHistory[sensor.id].map(item => item.humidity),
                                  borderColor: 'rgb(59, 130, 246)',
                                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                  fill: true
                                }
                              ]
                            }}
                          />
                        )}
                        {sensor.type === SensorType.TEMPERATURE_HUMIDITY && (
                          <Line 
                            options={getChartOptions(`${sensor.name || 'Sensör'} - Değişim`, '', 'rgb(59, 130, 246)', 0, 100)}
                            data={{
                              labels: sensorHistory[sensor.id].map(item => 
                                new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})
                              ),
                              datasets: [
                                {
                                  label: 'Sıcaklık (°C)',
                                  data: sensorHistory[sensor.id].map(item => item.temperature),
                                  borderColor: 'rgb(239, 68, 68)',
                                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                  borderDash: [],
                                  yAxisID: 'y'
                                },
                                {
                                  label: 'Nem (%)',
                                  data: sensorHistory[sensor.id].map(item => item.humidity),
                                  borderColor: 'rgb(59, 130, 246)',
                                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                  borderDash: [],
                                  yAxisID: 'y'
                                }
                              ]
                            }}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex justify-center items-center">
                        <p className="text-gray-400">Veri bekleniyor...</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Durum Mesajı */}
                  {typeof sensor.status === 'object' && sensor.status?.message && (
                    <div className="mt-4">
                      <p className={`p-3 rounded ${
                        getStatusLevel(sensor.status) === 'alert' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
                      }`}>
                        <strong>{getStatusLevel(sensor.status) === 'alert' ? 'Alarm:' : 'Uyarı:'}</strong> {sensor.status.message}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Son güncelleme zamanı */}
                <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 text-right">
                  Son güncelleme: {new Date(sensor.latestData?.timestamp || sensor.updatedAt || '').toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Tüm Sensörler */}
      <div>
        <h2 className="text-xl font-medium text-gray-900 mb-4 flex items-center">
          Tüm Sensörler
          <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
            {filteredSensors.length}
          </span>
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSensors.map(sensor => (
            <div key={sensor.id} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="border-b border-gray-200 px-4 py-3 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {sensor.name || sensor.sensor_id || 'İsimsiz Sensör'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {sensor.location || 'Konum belirtilmemiş'} - 
                    {sensor.type === SensorType.TEMPERATURE ? ' Sıcaklık Sensörü' : 
                     sensor.type === SensorType.HUMIDITY ? ' Nem Sensörü' : 
                     sensor.type === SensorType.TEMPERATURE_HUMIDITY ? ' Sıcaklık & Nem Sensörü' : 
                     ' Sensör'}
                  </p>
                </div>
                
                <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  getStatusLevel(sensor.status) === 'normal' ? 'bg-green-100 text-green-800' :
                  getStatusLevel(sensor.status) === 'warning' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {sensor.type === SensorType.TEMPERATURE ? 
                    `${sensor.latestData?.temperature?.toFixed(1) || '0.0'}°C` : 
                    sensor.type === SensorType.HUMIDITY ?
                    `${sensor.latestData?.humidity?.toFixed(0) || '0'}%` :
                    `${sensor.latestData?.temperature?.toFixed(1) || '0.0'}°C / ${sensor.latestData?.humidity?.toFixed(0) || '0'}%`
                  }
                </div>
              </div>
              
              <div className="p-4">
                {/* Grafikler */}
                <div className="h-64">
                  {sensorHistory[sensor.id] && sensorHistory[sensor.id].length > 0 ? (
                    <div className="h-full">
                      {/* Sensör tipine göre grafik göster */}
                      {sensor.type === SensorType.TEMPERATURE && (
                        <Line 
                          options={getChartOptions('Sıcaklık Değişimi', '°C', 'rgb(239, 68, 68)', 0, 80)}
                          data={{
                            labels: sensorHistory[sensor.id].map(item => 
                              new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})
                            ),
                            datasets: [
                              {
                                label: 'Sıcaklık',
                                data: sensorHistory[sensor.id].map(item => item.temperature),
                                borderColor: 'rgb(239, 68, 68)',
                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                fill: true
                              }
                            ]
                          }}
                        />
                      )}
                      {sensor.type === SensorType.HUMIDITY && (
                        <Line 
                          options={getChartOptions('Nem Değişimi', '%', 'rgb(59, 130, 246)', 0, 100)}
                          data={{
                            labels: sensorHistory[sensor.id].map(item => 
                              new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})
                            ),
                            datasets: [
                              {
                                label: 'Nem',
                                data: sensorHistory[sensor.id].map(item => item.humidity),
                                borderColor: 'rgb(59, 130, 246)',
                                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                fill: true
                              }
                            ]
                          }}
                        />
                      )}
                      {sensor.type === SensorType.TEMPERATURE_HUMIDITY && (
                        <Line 
                          options={getChartOptions(`${sensor.name || 'Sensör'} - Değişim`, '', 'rgb(59, 130, 246)', 0, 100)}
                          data={{
                            labels: sensorHistory[sensor.id].map(item => 
                              new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})
                            ),
                            datasets: [
                              {
                                label: 'Sıcaklık (°C)',
                                data: sensorHistory[sensor.id].map(item => item.temperature),
                                borderColor: 'rgb(239, 68, 68)',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                borderDash: [],
                                yAxisID: 'y'
                              },
                              {
                                label: 'Nem (%)',
                                data: sensorHistory[sensor.id].map(item => item.humidity),
                                borderColor: 'rgb(59, 130, 246)',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                borderDash: [],
                                yAxisID: 'y'
                              }
                            ]
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex justify-center items-center">
                      <p className="text-gray-400">Veri bekleniyor...</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Son güncelleme zamanı */}
              <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 text-right">
                Son güncelleme: {new Date(sensor.latestData?.timestamp || sensor.updatedAt || '').toLocaleString()}
              </div>
            </div>
          ))}
          
          {filteredSensors.length === 0 && (
            <div className="col-span-2 bg-gray-50 p-6 text-center rounded-lg border border-gray-200">
              <p className="text-gray-500">
                {user?.role === UserRole.USER 
                  ? 'Görüntüleme izniniz olan sensör bulunmamaktadır. Lütfen yöneticinize başvurun.'
                  : 'Henüz sensör bulunmamaktadır.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 