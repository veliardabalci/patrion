import { useState, useEffect } from 'react';
import { SensorData, SensorType } from '@/types';

interface SensorMapProps {
  sensors: SensorData[];
  onSensorSelect?: (sensor: SensorData) => void;
}

export default function SensorMap({ sensors, onSensorSelect }: SensorMapProps) {
  const [selectedSensor, setSelectedSensor] = useState<SensorData | null>(null);

  // Sensör tipine göre ikon
  const getSensorIcon = (type: SensorType) => {
    switch (type) {
      case SensorType.TEMPERATURE:
        return '🌡️';
      case SensorType.HUMIDITY:
        return '💧';
      case SensorType.TEMPERATURE_HUMIDITY:
        return '🌡️💧';
      default:
        return '📊';
    }
  };

  // Duruma göre renk sınıfı
  const getStatusClass = (status: any) => {
    // Status string veya obje olabilir
    if (!status) return 'bg-gray-500';
    
    if (typeof status === 'string') {
      switch (status) {
        case 'normal': return 'bg-green-500';
        case 'warning': return 'bg-yellow-500';
        case 'alert': return 'bg-red-500';
        default: return 'bg-gray-500';
      }
    } else if (typeof status === 'object' && status.level) {
      switch (status.level) {
        case 'normal': return 'bg-green-500';
        case 'warning': return 'bg-yellow-500';
        case 'alert': return 'bg-red-500';
        default: return 'bg-gray-500';
      }
    }
    
    return 'bg-gray-500';
  };
  
  // Helper function to get sensor value based on type and latestData
  const getSensorValue = (sensor: SensorData) => {
    if (typeof sensor.value === 'number') {
      return `${sensor.value}${sensor.unit || ''}`;
    }
    
    if (sensor.latestData) {
      if (sensor.type === SensorType.TEMPERATURE && typeof sensor.latestData.temperature === 'number') {
        return `${sensor.latestData.temperature}°C`;
      } else if (sensor.type === SensorType.HUMIDITY && typeof sensor.latestData.humidity === 'number') {
        return `${sensor.latestData.humidity}%`;
      } else if (sensor.type === SensorType.TEMPERATURE_HUMIDITY) {
        const temp = typeof sensor.latestData.temperature === 'number' ? `${sensor.latestData.temperature}°C` : '';
        const hum = typeof sensor.latestData.humidity === 'number' ? `${sensor.latestData.humidity}%` : '';
        
        if (temp && hum) {
          return `${temp} / ${hum}`;
        } else {
          return temp || hum || 'Veri yok';
        }
      }
    }
    
    return 'Veri yok';
  };
  
  // Sensör seçildiğinde
  const handleSensorClick = (sensor: SensorData) => {
    setSelectedSensor(sensor);
    if (onSensorSelect) {
      onSensorSelect(sensor);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-5 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Sensör Haritası</h3>
        <p className="text-sm text-gray-500">Bina yerleşimi üzerinde sensörlerin konumu</p>
      </div>
      
      <div className="relative" style={{ height: '600px' }}>
        {/* Bina planı */}
        <div className="absolute inset-0 p-4">
          <div className="border-2 border-gray-300 rounded-lg h-full w-full bg-gray-50 relative">
            {/* Oda ve bölümleri çiz */}
            {/* Ana koridor */}
            <div className="absolute left-[15%] top-[5%] w-[70%] h-[90%] bg-gray-100 border border-gray-300"></div>
            
            {/* Odalar - Sol taraf */}
            <div className="absolute left-[15%] top-[5%] w-[30%] h-[25%] bg-blue-50 border border-gray-300">
              <div className="p-2 text-xs font-medium text-gray-500">Toplantı Odası</div>
            </div>
            <div className="absolute left-[15%] top-[35%] w-[30%] h-[25%] bg-green-50 border border-gray-300">
              <div className="p-2 text-xs font-medium text-gray-500">Ofis Alanı</div>
            </div>
            <div className="absolute left-[15%] top-[65%] w-[30%] h-[30%] bg-yellow-50 border border-gray-300">
              <div className="p-2 text-xs font-medium text-gray-500">Depo</div>
            </div>
            
            {/* Odalar - Sağ taraf */}
            <div className="absolute left-[55%] top-[5%] w-[30%] h-[20%] bg-purple-50 border border-gray-300">
              <div className="p-2 text-xs font-medium text-gray-500">Sunucu Odası</div>
            </div>
            <div className="absolute left-[55%] top-[30%] w-[30%] h-[20%] bg-red-50 border border-gray-300">
              <div className="p-2 text-xs font-medium text-gray-500">Mutfak</div>
            </div>
            <div className="absolute left-[55%] top-[55%] w-[30%] h-[20%] bg-indigo-50 border border-gray-300">
              <div className="p-2 text-xs font-medium text-gray-500">Yönetim</div>
            </div>
            <div className="absolute left-[55%] top-[80%] w-[30%] h-[15%] bg-pink-50 border border-gray-300">
              <div className="p-2 text-xs font-medium text-gray-500">Giriş</div>
            </div>
            
            {/* Sensörleri yerleştir - alan bazlı yerleştirme */}
            {sensors.map((sensor, index) => {
              // Sensörleri alanlara göre yerleştir - burada mantıklı bir dağılım yapmak için 
              // sensor.location değerini kullanabilirdik ama olmadığı için basit bir algoritma
              const locations = [
                { left: '30%', top: '15%', area: 'Toplantı Odası' }, // Toplantı odası
                { left: '30%', top: '45%', area: 'Ofis Alanı' },     // Ofis alanı
                { left: '30%', top: '75%', area: 'Depo' },           // Depo
                { left: '70%', top: '15%', area: 'Sunucu Odası' },   // Sunucu odası
                { left: '70%', top: '40%', area: 'Mutfak' },         // Mutfak
                { left: '70%', top: '65%', area: 'Yönetim' },        // Yönetim
                { left: '70%', top: '85%', area: 'Giriş' },          // Giriş
              ];
              
              // Sensör tipine göre mantıklı yerleştirme
              let locationIndex = index % locations.length;
              
              // Sıcaklık sensörlerini daha sık sıcak alanlara (sunucu, mutfak) yerleştir
              if (sensor.type === SensorType.TEMPERATURE || sensor.type === SensorType.TEMPERATURE_HUMIDITY) {
                locationIndex = index % 2 === 0 ? 3 : 4; // Sunucu odası ve mutfak
              }
              
              // Nem sensörlerini daha çok ofis ve giriş alanlara yerleştir
              if (sensor.type === SensorType.HUMIDITY) {
                locationIndex = index % 2 === 0 ? 1 : 6; // Ofis ve giriş
              }
              
              const location = locations[locationIndex];
              
              return (
                <div 
                  key={sensor.id}
                  className={`absolute h-8 w-8 rounded-full ${getStatusClass(sensor.status)} flex items-center justify-center text-white cursor-pointer transform hover:scale-110 transition-transform duration-150 shadow-lg`}
                  style={{
                    left: location.left,
                    top: location.top,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10
                  }}
                  onClick={() => handleSensorClick(sensor)}
                  title={`${sensor.name} (${location.area})`}
                >
                  <span>{getSensorIcon(sensor.type)}</span>
                </div>
              );
            })}
            
            {/* Açıklama */}
            <div className="absolute bottom-3 right-3 bg-white p-3 rounded-md shadow-md z-20">
              <div className="text-sm font-medium mb-2">Sensör Durumu</div>
              <div className="flex items-center mb-1">
                <div className="h-4 w-4 rounded-full bg-green-500 mr-2"></div>
                <span className="text-xs text-gray-600">Normal</span>
              </div>
              <div className="flex items-center mb-1">
                <div className="h-4 w-4 rounded-full bg-yellow-500 mr-2"></div>
                <span className="text-xs text-gray-600">Uyarı</span>
              </div>
              <div className="flex items-center mb-3">
                <div className="h-4 w-4 rounded-full bg-red-500 mr-2"></div>
                <span className="text-xs text-gray-600">Alarm</span>
              </div>
              <div className="text-sm font-medium mb-2">Sensör Tipi</div>
              <div className="flex items-center mb-1">
                <div className="text-sm mr-2">🌡️</div>
                <span className="text-xs text-gray-600">Sıcaklık</span>
              </div>
              <div className="flex items-center mb-1">
                <div className="text-sm mr-2">💧</div>
                <span className="text-xs text-gray-600">Nem</span>
              </div>
              <div className="flex items-center">
                <div className="text-sm mr-2">🌡️💧</div>
                <span className="text-xs text-gray-600">Sıcaklık ve Nem</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Seçilen sensör detayları */}
      {selectedSensor && (
        <div className="p-5 border-t border-gray-200">
          <div className="flex justify-between">
            <div>
              <h4 className="font-medium text-gray-900">{selectedSensor.name}</h4>
              <p className="text-sm text-gray-500">
                {selectedSensor.type === SensorType.TEMPERATURE && 'Sıcaklık Sensörü'}
                {selectedSensor.type === SensorType.HUMIDITY && 'Nem Sensörü'}
                {selectedSensor.type === SensorType.TEMPERATURE_HUMIDITY && 'Sıcaklık ve Nem Sensörü'}
              </p>
              <p className="text-xs text-gray-400">{selectedSensor.location}</p>
            </div>
            <div className={`px-4 py-1.5 rounded-full ${getStatusClass(selectedSensor.status)} bg-opacity-20`}>
              <span className="text-sm font-medium text-gray-900">
                {getSensorValue(selectedSensor)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 