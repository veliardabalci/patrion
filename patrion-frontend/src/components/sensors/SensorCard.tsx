import { SensorData, SensorType } from "@/types";

interface SensorCardProps {
  sensor: SensorData;
}

export default function SensorCard({ sensor }: SensorCardProps) {
  // Get sensor value based on type and latestData
  const getSensorValue = (sensor: SensorData): number => {
    // If value is directly available, use it
    if (typeof sensor.value === 'number') {
      return sensor.value;
    }
    
    // If latestData is available, get the appropriate value based on sensor type
    if (sensor.latestData) {
      if (sensor.type === SensorType.TEMPERATURE || sensor.type === SensorType.TEMPERATURE_HUMIDITY) {
        return sensor.latestData.temperature || 0;
      } else if (sensor.type === SensorType.HUMIDITY) {
        return sensor.latestData.humidity || 0;
      }
    }
    
    // Default value if nothing is available
    return 0;
  };

  // Get appropriate value based on sensor type (temperature or humidity)
  const getDisplayValue = (sensor: SensorData): { value: number, unit: string } => {
    // For combined sensors, show temperature by default (can be enhanced with a toggle)
    if (sensor.type === SensorType.TEMPERATURE_HUMIDITY) {
      return {
        value: sensor.latestData?.temperature || 0,
        unit: '°C'
      };
    } else if (sensor.type === SensorType.TEMPERATURE) {
      return {
        value: sensor.latestData?.temperature || 0,
        unit: '°C'
      };
    } else if (sensor.type === SensorType.HUMIDITY) {
      return {
        value: sensor.latestData?.humidity || 0,
        unit: '%'
      };
    }
    
    // Default
    return { value: 0, unit: '' };
  };

  // Get temperature color based on value
  const getTemperatureColor = (value: number) => {
    if (value > 50) return { bg: 'bg-red-600', text: 'text-white' }; // Çok yüksek sıcaklık (kritik)
    if (value > 40) return { bg: 'bg-red-500', text: 'text-white' }; // Yüksek sıcaklık (alert)
    if (value > 30) return { bg: 'bg-orange-500', text: 'text-white' }; // Orta sıcaklık (warning)
    if (value < 10) return { bg: 'bg-blue-500', text: 'text-white' }; // Düşük sıcaklık (soğuk)
    return { bg: 'bg-emerald-500', text: 'text-white' }; // Normal sıcaklık
  };

  // Get humidity color based on value
  const getHumidityColor = (value: number) => {
    if (value > 70) return { bg: 'bg-red-500', text: 'text-white' }; // Çok yüksek nem (alert)
    if (value > 60) return { bg: 'bg-orange-500', text: 'text-white' }; // Yüksek nem (warning)
    if (value < 30) return { bg: 'bg-orange-500', text: 'text-white' }; // Düşük nem (warning)
    return { bg: 'bg-emerald-500', text: 'text-white' }; // Normal nem
  };

  // Sensör tipine göre renk ve ikon belirleme
  const getColorAndIcon = (type: string, value: number) => {
    if (type === SensorType.TEMPERATURE || type === SensorType.TEMPERATURE_HUMIDITY) {
      // Sıcaklık için renkler
      if (value > 50) return { color: 'bg-red-600', textColor: 'text-white', icon: '🔥' }; // Çok yüksek sıcaklık
      if (value > 30) return { color: 'bg-red-500', textColor: 'text-white', icon: '🔥' }; // Alert
      if (value > 25) return { color: 'bg-orange-500', textColor: 'text-white', icon: '🌡️' }; // Warning
      if (value < 10) return { color: 'bg-blue-500', textColor: 'text-white', icon: '❄️' }; // Soğuk
      return { color: 'bg-emerald-500', textColor: 'text-white', icon: '🌡️' }; // Normal
    } else if (type === SensorType.HUMIDITY) {
      // Nem için renkler
      if (value > 70) return { color: 'bg-red-500', textColor: 'text-white', icon: '💧' }; // Alert
      if (value > 60) return { color: 'bg-orange-500', textColor: 'text-white', icon: '💧' }; // Warning
      if (value < 30) return { color: 'bg-orange-500', textColor: 'text-white', icon: '🏜️' }; // Warning (düşük nem)
      return { color: 'bg-emerald-500', textColor: 'text-white', icon: '💦' }; // Normal
    } else {
      // Varsayılan
      return { color: 'bg-slate-500', textColor: 'text-white', icon: '📊' };
    }
  };

  // Get status level from new status structure or old format
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

  // Sensör durumuna göre renk ve etiket belirleme
  const getStatusInfo = (status: any) => {
    const level = getStatusLevel(status);
    
    switch (level) {
      case 'normal': return { 
        bg: 'bg-emerald-100', 
        text: 'text-emerald-800', 
        label: 'Normal',
        message: typeof status === 'object' && status !== null ? status.message : 'Normal seviyede' 
      };
      case 'warning': return { 
        bg: 'bg-orange-100', 
        text: 'text-orange-800', 
        label: 'Uyarı',
        message: typeof status === 'object' && status !== null ? status.message : 'Dikkat! Değerler normal aralığın dışında' 
      };
      case 'alert': return { 
        bg: 'bg-red-100', 
        text: 'text-red-800', 
        label: 'Alarm',
        message: typeof status === 'object' && status !== null ? status.message : 'Uyarı! Değerler kritik seviyede' 
      };
      default: return { 
        bg: 'bg-slate-100', 
        text: 'text-slate-800', 
        label: 'Bilinmiyor',
        message: 'Durum bilgisi yok' 
      };
    }
  };

  // Determine sensor status based on values if not explicitly provided
  const determineStatus = (sensor: SensorData): 'normal' | 'warning' | 'alert' => {
    if (sensor.status) return getStatusLevel(sensor.status);
    
    const value = getSensorValue(sensor);
    
    if (sensor.type === SensorType.TEMPERATURE || sensor.type === SensorType.TEMPERATURE_HUMIDITY) {
      if (value > 30) return 'alert';
      if (value > 27) return 'warning';
      return 'normal';
    } else if (sensor.type === SensorType.HUMIDITY) {
      if (value > 70) return 'alert';
      if (value > 60) return 'warning';
      return 'normal';
    }
    
    return 'normal';
  };

  // Sensör verilerinin geçerli olup olmadığını kontrol et
  if (!sensor || !sensor.id) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center text-gray-500">
          Geçersiz sensör verisi
        </div>
      </div>
    );
  }

  // Varsayılan değerler
  const displayData = getDisplayValue(sensor);
  const sensorValue = displayData.value;
  const sensorUnit = displayData.unit;
  const sensorType = sensor.type || 'unknown';
  const sensorName = sensor.name || sensor.sensor_id || 'İsimsiz Sensör';
  const sensorLocation = sensor.location || 'Konum belirtilmemiş';
  const sensorTimestamp = sensor.latestData?.timestamp || sensor.timestamp || sensor.updatedAt || new Date().toISOString();
  const statusInfo = getStatusInfo(sensor.status);

  const { color, textColor, icon } = getColorAndIcon(sensorType, sensorValue);

  // Format sensor value differently based on type
  const formattedValue = sensor.type === SensorType.TEMPERATURE || 
                         sensor.type === SensorType.TEMPERATURE_HUMIDITY 
                         ? `${sensorValue.toFixed(1)}${sensorUnit}` 
                         : `${sensorValue.toFixed(0)}${sensorUnit}`;

  // Show both temperature and humidity for combined sensors if available
  const showCombinedValues = sensor.type === SensorType.TEMPERATURE_HUMIDITY && 
                            sensor.latestData?.temperature !== undefined && 
                            sensor.latestData?.humidity !== undefined;

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 truncate" title={sensorName}>
            {sensorName}
          </h3>
          <span className="text-2xl">{icon}</span>
        </div>
        
        <div className="flex justify-between items-center mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 truncate" title={sensorLocation}>
              {sensorLocation}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(sensorTimestamp).toLocaleString()}
            </p>
          </div>
          
          {showCombinedValues ? (
            <div className="flex flex-col items-end ml-3">
              <div className={`${getTemperatureColor(sensor.latestData?.temperature || 0).bg} rounded-full px-3 py-1 mb-1`}>
                <span className={`text-lg font-bold ${getTemperatureColor(sensor.latestData?.temperature || 0).text}`}>
                  {sensor.latestData?.temperature?.toFixed(1)}°C
                </span>
              </div>
              <div className={`${getHumidityColor(sensor.latestData?.humidity || 0).bg} rounded-full px-3 py-1`}>
                <span className={`text-lg font-bold ${getHumidityColor(sensor.latestData?.humidity || 0).text}`}>
                  {sensor.latestData?.humidity?.toFixed(0)}%
                </span>
              </div>
            </div>
          ) : (
            <div className={`${color} rounded-full px-4 py-2 ml-3`}>
              <span className={`text-2xl font-bold ${textColor}`}>
                {formattedValue}
              </span>
            </div>
          )}
        </div>
        
        {/* Show detailed status message if available */}
        {typeof sensor.status === 'object' && sensor.status !== null && sensor.status.message && (
          <p className={`text-xs mt-2 ${statusInfo.text}`}>
            {sensor.status.message}
          </p>
        )}
      </div>
      
      {/* Sensör durumu */}
      <div className={`${statusInfo.bg} px-6 py-2 border-t`}>
        <div className="flex justify-between items-center">
          <span className={`text-xs font-medium ${statusInfo.text}`}>
            {statusInfo.label}
          </span>
          <span className="text-xs text-gray-500">
            {sensor.sensor_id || sensor.id}
          </span>
        </div>
      </div>
    </div>
  );
} 