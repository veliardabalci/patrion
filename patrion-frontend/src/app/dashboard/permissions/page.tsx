'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { sensorsApi, permissionsApi } from '@/services/api';
import { usersApi } from '@/services/api';
import { SensorData, User, UserRole, SensorType, SensorPermission } from '@/types';
import { UserPlusIcon, UserMinusIcon } from '@heroicons/react/24/outline';

export default function SensorPermissionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [sensors, setSensors] = useState<SensorData[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<SensorPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Kullanıcının şirket ID'sini ayarla
  useEffect(() => {
    if (user?.companyId) {
      setCompanyId(user.companyId);
    }
  }, [user]);

  // Sensörleri ve izinleri getir
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Sadece şirket admini veya sistem admini erişebilir
        if (user?.role !== UserRole.COMPANY_ADMIN && user?.role !== UserRole.SYSTEM_ADMIN) {
          router.push('/dashboard');
          return;
        }
        
        // Sensörleri çek
        const sensorsData = await sensorsApi.getSensorRegistry();
        setSensors(Array.isArray(sensorsData) ? sensorsData : []);
        
        // İzinleri çek
        try {
          const permissionsData = await permissionsApi.getCompanyPermissions();
          setPermissions(permissionsData);
        } catch (permErr) {
          console.error('İzinler alınamadı:', permErr);
          // Backend henüz hazır değilse boş dizi kullan
          setPermissions([]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Veriler alınamadı:', err);
        setError('Veriler yüklenirken bir hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, router]);

  // Şirket kullanıcılarını getir
  const fetchCompanyUsers = async () => {
    if (!companyId) return; // Şirket ID yoksa getirme
    
    try {
      const data = await usersApi.getCompanyUsers(companyId);
      // Sadece USER rolündeki kullanıcıları filtrele
      setUsers(data.filter(u => u.role === UserRole.USER));
    } catch (err) {
      console.error('Şirket kullanıcıları alınamadı:', err);
      setError('Kullanıcı listesi yüklenirken bir hata oluştu.');
    }
  };

  // companyId değiştiğinde kullanıcıları getir
  useEffect(() => {
    if (companyId) {
      fetchCompanyUsers();
    }
  }, [companyId]);

  // Kullanıcı seçildiğinde çağrılacak fonksiyon
  const handleUserSelect = (userId: string) => {
    setSelectedUser(userId);
    
    // Kullanıcının izinlerini güncelle
    fetchUserPermissions(userId);
  };

  // Kullanıcı izinlerini getir
  const fetchUserPermissions = async (userId: string) => {
    try {
      // Yeni API ile kullanıcı erişim listesini al
      try {
        const accessList = await permissionsApi.getUserAccessList(userId);
        console.log('Kullanıcı erişim listesi alındı:', accessList);
        
        // Erişim listesini permissions state'ine dönüştürerek ekle
        const userPermissions = accessList.map(access => ({
          userId: access.userId,
          sensorId: access.sensorId,
          hasAccess: access.canView, // canView değerini hasAccess olarak kullan
          canEdit: access.canEdit,
          canDelete: access.canDelete,
          description: access.description,
          createdAt: access.createdAt,
          updatedAt: access.updatedAt,
          createdBy: access.createdBy
        }));
        
        // İzinleri permissions state'ine ekle, var olanları güncelle
        setPermissions(prev => {
          // Kullanıcıya ait izinleri kaldır
          const filteredPermissions = prev.filter(p => p.userId !== userId);
          
          // Yeni izinleri ekle
          return [...filteredPermissions, ...userPermissions];
        });
      } catch (e) {
        console.warn('Yeni erişim API bağlantısı denendi ama başarısız:', e);
        
        // Eski yöntem ile devam et - önce şirket izinlerini al, sonra filtrele
        try {
          const allPermissions = await permissionsApi.getCompanyPermissions();
          const userPermissions = allPermissions.filter(p => p.userId === userId);
          
          // İzinleri permissions state'ine ekle, var olanları güncelle
          setPermissions(prev => {
            // Kullanıcıya ait izinleri kaldır
            const filteredPermissions = prev.filter(p => p.userId !== userId);
            
            // Yeni izinleri ekle
            return [...filteredPermissions, ...userPermissions];
          });
        } catch (e2) {
          console.warn('Şirket izinleri alınamadı, en son çare olarak getUserPermissions deneniyor');
          
          // En son çare - eski API ile getUserPermissions deneyelim
          const userPermissions = await permissionsApi.getUserPermissions(userId);
          
          // İzinleri permissions state'ine ekle, var olanları güncelle
          setPermissions(prev => {
            // Kullanıcıya ait izinleri kaldır
            const filteredPermissions = prev.filter(p => p.userId !== userId);
            
            // Yeni izinleri ekle
            return [...filteredPermissions, ...userPermissions];
          });
        }
      }
    } catch (err) {
      console.error('Kullanıcı izinleri alınamadı:', err);
      setError('Kullanıcı izinleri alınamadı.');
    }
  };

  // İzin durumunu kontrol et
  const hasPermission = (userId: string, sensorId: string): boolean => {
    const permission = permissions.find(
      p => p.userId === userId && p.sensorId === sensorId
    );
    return permission ? Boolean(permission.hasAccess || permission.canView) : false;
  };

  // Sensör izinlerini toggle etmek için fonksiyon
  const togglePermission = async (userId: string, sensorId: string) => {
    // Mevcut izin durumunu bul
    const currentPermission = permissions.find(
      p => p.userId === userId && p.sensorId === sensorId
    );
    const hasAccess = currentPermission ? (currentPermission.hasAccess || currentPermission.canView) : false;
    
    try {
      if (hasAccess) {
        // İzni kaldır
        await permissionsApi.revokeAccess(userId, sensorId);
        console.log(`${userId} kullanıcısından ${sensorId} sensörü için erişim kaldırıldı`);
      } else {
        // İzin ver
        await permissionsApi.grantAccess(userId, { 
          sensorId,
          notes: `Yönetici tarafından erişim verildi - ${new Date().toISOString()}`
        });
        console.log(`${userId} kullanıcısına ${sensorId} sensörü için erişim verildi`);
      }
      
      // İzin değişikliğinden sonra kullanıcı izinlerini yeniden çek
      await fetchUserPermissions(userId);
    } catch (err) {
      console.error('İzin güncellenirken hata oluştu:', err);
      
      // Eski API ile deneyelim
      try {
        console.warn('Eski API ile izin güncellemeyi deniyorum');
        await permissionsApi.updatePermission({ 
          userId, 
          sensorId, 
          hasAccess: !hasAccess 
        });
        
        // İzin listesini yerel olarak güncelle
        setPermissions(prev => {
          // Eğer bu izin daha önce tanımlanmışsa, güncelle
          if (currentPermission) {
            return prev.map(p => 
              p.userId === userId && p.sensorId === sensorId 
                ? { ...p, hasAccess: !hasAccess } 
                : p
            );
          }
          // Yoksa yeni izin ekle
          return [...prev, { userId, sensorId, hasAccess: true }];
        });
      } catch (fallbackErr) {
        console.error('İzin güncellenemedi (fallback da başarısız):', fallbackErr);
        setError('İzin güncellenirken bir hata oluştu.');
      }
    }
  };

  // Bir kullanıcı için tüm sensörlere izin ver/kaldır
  const toggleAllPermissions = async (userId: string, grant: boolean) => {
    try {
      // Tüm sensörler için izinleri güncelle
      for (const sensor of sensors) {
        try {
          if (grant) {
            // İzin ver
            await permissionsApi.grantAccess(userId, { 
              sensorId: sensor.id,
              notes: `Toplu erişim - ${new Date().toISOString()}`
            });
          } else {
            // İzni kaldır
            await permissionsApi.revokeAccess(userId, sensor.id);
          }
        } catch (e) {
          console.warn(`Sensör ${sensor.id} için izin güncellenirken hata:`, e);
        }
      }
      
      // İşlem tamamlandıktan sonra kullanıcı izinlerini yeniden çek
      await fetchUserPermissions(userId);
    } catch (err) {
      console.error('Toplu izin işlemi başarısız:', err);
      
      // Eski API ile deneyelim
      try {
        console.warn('Eski API ile toplu izin güncellemeyi deniyorum');
        await permissionsApi.updateBatch({ userId, grant });
        
        // İzinleri yerel olarak güncelle
        setPermissions(prev => {
          const newPermissions = [...prev];
          
          // Mevcut izinleri kaldır
          const filteredPermissions = newPermissions.filter(p => p.userId !== userId);
          
          // Eğer izin veriliyorsa tüm sensörler için yeni izinler ekle
          if (grant) {
            sensors.forEach(sensor => {
              filteredPermissions.push({ userId, sensorId: sensor.id, hasAccess: true });
            });
          }
          
          return filteredPermissions;
        });
      } catch (fallbackErr) {
        console.error('Toplu izin işlemi başarısız (fallback da başarısız):', fallbackErr);
        setError('İzinler güncellenirken bir hata oluştu.');
      }
    }
  };

  // Yükleme durumu
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  // Hata durumu
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
        <h1 className="text-2xl font-semibold text-gray-900">Sensör İzinleri</h1>
        <p className="mt-1 text-gray-500">
          Kullanıcıların hangi sensörleri görebileceğini yönetin.
        </p>
      </div>

      {/* Kullanıcı listesi */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Kullanıcılar</h2>
        
        {users.length === 0 ? (
          <p className="text-gray-500">Henüz kullanıcı bulunmuyor.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map(user => (
              <div
                key={user.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedUser === user.id 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                }`}
                onClick={() => handleUserSelect(user.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-900">{user.firstName} {user.lastName}</h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAllPermissions(user.id, true);
                      }}
                      className="p-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200"
                      title="Tüm Sensörlere İzin Ver"
                    >
                      <UserPlusIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAllPermissions(user.id, false);
                      }}
                      className="p-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200"
                      title="Tüm İzinleri Kaldır"
                    >
                      <UserMinusIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seçilen kullanıcı için sensör izinleri */}
      {selectedUser && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Sensör İzinleri: {users.find(u => u.id === selectedUser)?.firstName} {users.find(u => u.id === selectedUser)?.lastName}
          </h2>
          
          {sensors.length === 0 ? (
            <p className="text-gray-500">Henüz sensör bulunmuyor.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sensör ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sensör Adı
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tür
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Konum
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İzin
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sensors.map(sensor => (
                    <tr key={sensor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sensor.sensor_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {sensor.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sensor.type === SensorType.TEMPERATURE && 'Sıcaklık'}
                        {sensor.type === SensorType.HUMIDITY && 'Nem'}
                        {sensor.type === SensorType.TEMPERATURE_HUMIDITY && 'Sıcaklık ve Nem'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sensor.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`permission-${selectedUser}-${sensor.id}`}
                            checked={hasPermission(selectedUser, sensor.id)}
                            onChange={() => togglePermission(selectedUser, sensor.id)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <label 
                            htmlFor={`permission-${selectedUser}-${sensor.id}`}
                            className="ml-2 block text-sm text-gray-900"
                          >
                            {hasPermission(selectedUser, sensor.id) ? 'İzin Var' : 'İzin Yok'}
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 