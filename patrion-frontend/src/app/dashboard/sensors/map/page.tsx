'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SensorMap from '@/components/sensors/SensorMap';
import { useAuth } from '@/context/AuthContext';
import { UserRole, SensorType, SensorData } from '@/types';
import { sensorsApi } from '@/services/api';

export default function SensorMapPage() {
  const [sensors, setSensors] = useState<SensorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchSensors = async () => {
      try {
        setIsLoading(true);
        
        // Sensör kayıt API'sini kullan
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
        setSensors([]);
        setError('Sensörler yüklenirken bir hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSensors();
  }, []);

  const handleSensorSelect = (sensor: SensorData) => {
    // Sensör detay sayfasına yönlendir
    router.push(`/dashboard/sensors/${sensor.sensor_id}?id=${sensor.id}`);
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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Sensör Haritası</h1>
        <p className="mt-1 text-gray-500">
          Tüm sensörlerin konumlarını ve durumlarını görsel olarak izleyin.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-4 mb-8">
        {/* Sensör dizisinin geçerli olduğundan emin ol */}
        {(() => {
          const sensorArray = Array.isArray(sensors) ? sensors : [];
          return (
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
              <div className="bg-gray-100 p-3 rounded-md text-center">
                <div className="font-medium text-gray-900">Toplam</div>
                <div className="text-2xl font-semibold text-indigo-600">{sensorArray.length}</div>
              </div>
              
              <div className="bg-green-100 p-3 rounded-md text-center">
                <div className="font-medium text-gray-900">Normal</div>
                <div className="text-2xl font-semibold text-green-600">
                  {sensorArray.filter(s => {
                    // Yeni status formatını kontrol et
                    if (s && s.status) {
                      if (typeof s.status === 'string') {
                        return s.status === 'normal';
                      } else if (typeof s.status === 'object' && s.status.level) {
                        return s.status.level === 'normal';
                      }
                    }
                    return true; // Status tanımlı değilse normal kabul et
                  }).length}
                </div>
              </div>
              
              <div className="bg-yellow-100 p-3 rounded-md text-center">
                <div className="font-medium text-gray-900">Uyarı</div>
                <div className="text-2xl font-semibold text-yellow-600">
                  {sensorArray.filter(s => {
                    if (s && s.status) {
                      if (typeof s.status === 'string') {
                        return s.status === 'warning';
                      } else if (typeof s.status === 'object' && s.status.level) {
                        return s.status.level === 'warning';
                      }
                    }
                    return false;
                  }).length}
                </div>
              </div>
              
              <div className="bg-red-100 p-3 rounded-md text-center">
                <div className="font-medium text-gray-900">Alarm</div>
                <div className="text-2xl font-semibold text-red-600">
                  {sensorArray.filter(s => {
                    if (s && s.status) {
                      if (typeof s.status === 'string') {
                        return s.status === 'alert';
                      } else if (typeof s.status === 'object' && s.status.level) {
                        return s.status.level === 'alert';
                      }
                    }
                    return false;
                  }).length}
                </div>
              </div>
              
              <div className="bg-blue-100 p-3 rounded-md text-center">
                <div className="font-medium text-gray-900">Sıcaklık</div>
                <div className="text-2xl font-semibold text-blue-600">
                  {sensorArray.filter(s => s && s.type === SensorType.TEMPERATURE).length}
                </div>
              </div>
              
              <div className="bg-purple-100 p-3 rounded-md text-center">
                <div className="font-medium text-gray-900">Nem</div>
                <div className="text-2xl font-semibold text-purple-600">
                  {sensorArray.filter(s => s && s.type === SensorType.HUMIDITY).length}
                </div>
              </div>
            </div>
          );
        })()}
        
        <div className="text-sm text-gray-500">
          Sensörlere tıklayarak detaylı bilgilere erişebilirsiniz.
        </div>
      </div>
      
      <SensorMap 
        sensors={(Array.isArray(sensors) ? sensors : []).filter(sensor => sensor && sensor.id && sensor.type)} 
        onSensorSelect={handleSensorSelect} 
      />
    </div>
  );
} 