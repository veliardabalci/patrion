'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { sensorsApi } from '@/services/api';
import { SensorLatestReading, SensorType, SensorData } from '@/types';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { io, Socket } from 'socket.io-client';
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
import { getCookie } from '@/utils/cookies';

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

export default function SensorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sensorId = params.sensor_id as string;
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  
  const [sensor, setSensor] = useState<SensorData | null>(null);
  const [readings, setReadings] = useState<SensorLatestReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [liveData, setLiveData] = useState<SensorLatestReading | null>(null);

  // WebSocket bağlantısı
  useEffect(() => {
    // JWT token'ı cookie'den al
    const token = getCookie('token');
    
    if (!token) {
      console.error('Token bulunamadı. WebSocket doğrulaması başarısız olabilir.');
    }
    
    // Socket.IO bağlantısı kur ve token'ı auth nesnesi olarak ekle
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
      
      // Belirli sensöre abone ol
      socket.emit('subscribe-sensor', sensorId, (response: {success: boolean}) => {
        if (response.success) {
          console.log(`${sensorId} sensörüne abone olundu`);
        } else {
          console.error(`${sensorId} sensörüne abone olunamadı`);
        }
      });
    });

    socket.on('connect_error', (err) => {
      console.error('Socket.IO bağlantı hatası:', err);
      setSocketConnected(false);
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO bağlantısı kesildi');
      setSocketConnected(false);
    });

    // Sensör verilerini dinle
    socket.on(`sensor-data-${sensorId}`, (data) => {
      console.log('Sensör verisi alındı:', data);
      setLiveData(data);
      
      // Yeni veriyi readings listesinin başına ekle ve en son 30 veriyi tut
      setReadings(prevReadings => {
        const updatedReadings = [data, ...prevReadings];
        return updatedReadings.slice(0, 50);
      });
    });

    // Sensör kayıt güncellemelerini dinle
    socket.on('sensors-update', (sensors) => {
      if (Array.isArray(sensors)) {
        console.log('Sensör güncellemeleri Socket.IO üzerinden alındı:', sensors.length);
        
        // Güncellemeler arasında bu sensör var mı kontrol et
        const updatedSensor = sensors.find(s => s.sensor_id === sensorId || s.id === id);
        if (updatedSensor) {
          console.log('Bu sensör için güncelleme bulundu:', updatedSensor);
          setSensor(prevSensor => ({...prevSensor, ...updatedSensor}));
        }
      }
    });

    // Sensör kaydı güncellemelerini dinle (tek sensör için)
    socket.on(`sensor-registry-${sensorId}`, (updatedSensor) => {
      console.log('Sensör kaydı güncellendi:', updatedSensor);
      setSensor(updatedSensor);
    });

    // Hata olaylarını dinle
    socket.on('error', (error) => {
      console.error('Socket.IO hatası:', error);
      setError('WebSocket bağlantı hatası oluştu.');
    });

    // Temizleme işlemi
    return () => {
      if (socket) {
        // Aboneliği iptal et
        socket.emit('unsubscribe-sensor', sensorId);
        socket.disconnect();
      }
    };
  }, [sensorId, id]);

  // İlk veri yüklemesi
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Sensör bilgilerini al
        const sensorData = await sensorsApi.getById(String(id));
        setSensor(sensorData);
        
        // Sensör okuma verilerini al
        const latestReadings = await sensorsApi.getLatestReadings(sensorId, 50);
        setReadings(latestReadings);
        
        setError(null);
      } catch (err) {
        console.error('Sensör verileri alınamadı:', err);
        setError('Sensör verileri yüklenirken bir hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    };

    if (sensorId) {
      fetchData();
    }
  }, [sensorId, id]);

  // Verileri ters çevir (en yeni veriler grafiğin sağında görünsün)
  const reversedData = [...readings].reverse();

  // Sıcaklık grafiği için veri hazırlama
  const temperatureChartData = {
    labels: reversedData.map(item => 
      item && item.timestamp ? 
        new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
    ),
    datasets: [
      {
        label: 'Sıcaklık (°C)',
        data: reversedData.map(item => item && typeof item.temperature === 'number' ? item.temperature : null),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: '#fff',
        pointBorderWidth: 1,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: 'rgb(239, 68, 68)',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Nem grafiği için veri hazırlama
  const humidityChartData = {
    labels: reversedData.map(item => 
      item && item.timestamp ? 
        new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
    ),
    datasets: [
      {
        label: 'Nem (%)',
        data: reversedData.map(item => item && typeof item.humidity === 'number' ? item.humidity : null),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 1,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: 'rgb(59, 130, 246)',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Sıcaklık grafiği için chart options
  const temperatureChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 12
          },
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#1f2937',
        bodyColor: '#4b5563',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          title: function(context) {
            return context[0].label ? `Zaman: ${context[0].label}` : '';
          },
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value}°C`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
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
        min: 0,
        max: 80,
        grid: {
          color: 'rgba(229, 231, 235, 0.5)',
        },
        ticks: {
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 10
          },
          color: '#6b7280',
          padding: 8,
          stepSize: 10
        }
      }
    },
    elements: {
      line: {
        tension: 0.4
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    },
    hover: {
      mode: 'index',
      intersect: false
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    }
  };

  // Nem grafiği için chart options
  const humidityChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 12
          },
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#1f2937',
        bodyColor: '#4b5563',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          title: function(context) {
            return context[0].label ? `Zaman: ${context[0].label}` : '';
          },
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value}%`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
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
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(229, 231, 235, 0.5)',
        },
        ticks: {
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 10
          },
          color: '#6b7280',
          padding: 8,
          stepSize: 20
        }
      }
    },
    elements: {
      line: {
        tension: 0.4
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    },
    hover: {
      mode: 'index',
      intersect: false
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    }
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
    <div className="space-y-6">
      {/* Geri butonu ve başlık */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.back()}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Geri
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">
          {sensor?.name || `Sensör #${sensorId}`}
          {socketConnected && (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 ml-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-1"></span>
              Canlı Veri
            </span>
          )}
        </h1>
        <div className="w-24"></div> {/* Başlığı ortalamak için boş div */}
      </div>
      
      {/* Sensör bilgileri */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Sensör Bilgileri</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Sensör detayları ve son okuma verileri</p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Sensör ID</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{sensorId}</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Konum</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{sensor?.location || 'Belirtilmemiş'}</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Tür</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {sensor?.type === SensorType.TEMPERATURE && 'Sıcaklık'}
                {sensor?.type === SensorType.HUMIDITY && 'Nem'}
                {sensor?.type === SensorType.TEMPERATURE_HUMIDITY && 'Sıcaklık ve Nem'}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Son Okuma</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {readings.length > 0 ? (
                  <div className="flex space-x-6">
                    {readings[0].temperature !== undefined && (
                      <span>Sıcaklık: <span className="font-medium">{readings[0].temperature}°C</span></span>
                    )}
                    {readings[0].humidity !== undefined && (
                      <span>Nem: <span className="font-medium">{readings[0].humidity}%</span></span>
                    )}
                    <span className="text-gray-500">
                      {new Date(readings[0].timestamp).toLocaleString()}
                    </span>
                    {liveData && socketConnected && (
                      <span className="text-emerald-600 animate-pulse">
                        Canlı veri alınıyor
                      </span>
                    )}
                  </div>
                ) : (
                  'Veri yok'
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>
      
      {/* Grafikler */}
      <div className="space-y-6">
        {/* Sıcaklık grafiği */}
        {(sensor?.type === SensorType.TEMPERATURE || sensor?.type === SensorType.TEMPERATURE_HUMIDITY) && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Sıcaklık Değişimi</h3>
              {liveData && socketConnected && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                  Canlı
                </span>
              )}
            </div>
            <div className="h-80">
              <Line options={temperatureChartOptions} data={temperatureChartData} />
            </div>
          </div>
        )}
        
        {/* Nem grafiği */}
        {(sensor?.type === SensorType.HUMIDITY || sensor?.type === SensorType.TEMPERATURE_HUMIDITY) && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Nem Değişimi</h3>
              {liveData && socketConnected && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                  Canlı
                </span>
              )}
            </div>
            <div className="h-80">
              <Line options={humidityChartOptions} data={humidityChartData} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 