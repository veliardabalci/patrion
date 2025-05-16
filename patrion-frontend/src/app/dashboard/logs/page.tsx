'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { logsApi, usersApi } from '@/services/api';
import { Log, User, UserRole } from '@/types';
import { 
  ClipboardDocumentListIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  CalendarIcon,
  UserIcon,
  DeviceTabletIcon,
  XCircleIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function LogsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState({
    userId: '',
    sensorId: '',
    action: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // View mode state
  const [viewMode, setViewMode] = useState<'all' | 'user' | 'sensor'>('all');
  const [viewId, setViewId] = useState<string | null>(null);
  const [viewTitle, setViewTitle] = useState<string>('Tüm Loglar');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const logsPerPage = 10;
  
  // Action types for dropdown
  const actionTypes = [
    'viewed_latest_data',
    'viewed_sensor_details',
    'viewed_range_data',
    'subscribed_to_sensor',
    'viewed_logs'
  ];

  // Load logs and users
  useEffect(() => {
    // Redirect non-admin users
    if (user && user.role !== UserRole.SYSTEM_ADMIN) {
      router.push('/dashboard');
      return;
    }
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get users for filtering
        const usersData = await usersApi.getAll();
        setUsers(usersData);
        
        // Get logs based on view mode
        let logsData: Log[];
        
        if (viewMode === 'user' && viewId) {
          logsData = await logsApi.getUserLogs(viewId);
          // Find user for title
          const viewUser = usersData.find(u => u.id === viewId);
          if (viewUser) {
            setViewTitle(`${viewUser.firstName} ${viewUser.lastName} Kullanıcısının Logları`);
          }
        } else if (viewMode === 'sensor' && viewId) {
          logsData = await logsApi.getSensorLogs(viewId);
          setViewTitle(`${viewId} Sensörünün Logları`);
        } else {
          logsData = await logsApi.getAll();
          setViewTitle('Tüm Loglar');
        }
        
        // Eksik kullanıcı bilgilerini tamamla
        logsData = logsData.map(log => {
          // Eğer log.user yoksa ve log.userId varsa, kullanıcı bilgisini ekle
          if (!log.user && log.userId) {
            const foundUser = usersData.find(u => u.id === log.userId);
            if (foundUser) {
              return { ...log, user: foundUser };
            }
          }
          return log;
        });
        
        // İşlem tipi filtresi varsa, JavaScript tarafında filtrele
        if (filters.action && logsData.length > 0) {
          logsData = logsData.filter(log => log.action === filters.action);
        }
        
        // Tarih filtresi varsa, JavaScript tarafında filtrele
        if (filters.startDate || filters.endDate) {
          logsData = logsData.filter(log => {
            const logDate = new Date(log.timestamp);
            
            if (filters.startDate && filters.endDate) {
              const startDate = new Date(filters.startDate);
              const endDate = new Date(filters.endDate);
              return logDate >= startDate && logDate <= endDate;
            } else if (filters.startDate) {
              const startDate = new Date(filters.startDate);
              return logDate >= startDate;
            } else if (filters.endDate) {
              const endDate = new Date(filters.endDate);
              return logDate <= endDate;
            }
            
            return true;
          });
        }
        
        setLogs(logsData);
        setTotalPages(Math.ceil(logsData.length / logsPerPage));
        setCurrentPage(1);
        
      } catch (err: any) {
        console.error('Error loading logs:', err);
        setError('Loglar yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchData();
    }
  }, [user, router, viewMode, viewId, filters.action, filters.startDate, filters.endDate]);
  
  // Apply filters
  const applyFilters = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let filteredLogs: Log[] = [];
      
      // Kullanıcı filtresi seçilmişse
      if (filters.userId) {
        console.log('Filtering logs by user ID:', filters.userId);
        filteredLogs = await logsApi.getUserLogs(filters.userId);
        setViewMode('user');
        setViewId(filters.userId);
        
        // Kullanıcı adını bul
        const selectedUser = users.find(u => u.id === filters.userId);
        if (selectedUser) {
          setViewTitle(`${selectedUser.firstName} ${selectedUser.lastName} Kullanıcısının Logları`);
        }
      } 
      // Sensör filtresi seçilmişse
      else if (filters.sensorId) {
        console.log('Filtering logs by sensor ID:', filters.sensorId);
        filteredLogs = await logsApi.getSensorLogs(filters.sensorId);
        setViewMode('sensor');
        setViewId(filters.sensorId);
        setViewTitle(`${filters.sensorId} Sensörünün Logları`);
      } 
      // Her ikisi de seçilmemişse, tüm logları getir
      else {
        console.log('No user or sensor filter applied, fetching all logs');
        filteredLogs = await logsApi.getAll();
        setViewMode('all');
        setViewId(null);
        setViewTitle('Tüm Loglar');
      }
      
      // Eksik kullanıcı bilgilerini tamamla
      filteredLogs = filteredLogs.map(log => {
        // Eğer log.user yoksa ve log.userId varsa, kullanıcı bilgisini ekle
        if (!log.user && log.userId) {
          const foundUser = users.find(u => u.id === log.userId);
          if (foundUser) {
            return { ...log, user: foundUser };
          }
        }
        return log;
      });
      
      // İşlem tipi filtresi varsa, JavaScript tarafında filtrele
      if (filters.action && filteredLogs.length > 0) {
        console.log('Filtering by action type:', filters.action);
        filteredLogs = filteredLogs.filter(log => log.action === filters.action);
      }
      
      // Tarih filtresi varsa, JavaScript tarafında filtrele
      if (filters.startDate || filters.endDate) {
        filteredLogs = filteredLogs.filter(log => {
          const logDate = new Date(log.timestamp);
          
          if (filters.startDate && filters.endDate) {
            const startDate = new Date(filters.startDate);
            const endDate = new Date(filters.endDate);
            return logDate >= startDate && logDate <= endDate;
          } else if (filters.startDate) {
            const startDate = new Date(filters.startDate);
            return logDate >= startDate;
          } else if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            return logDate <= endDate;
          }
          
          return true;
        });
      }
      
      console.log('Received filtered logs:', filteredLogs.length);
      
      setLogs(filteredLogs);
      setTotalPages(Math.ceil(filteredLogs.length / logsPerPage));
      setCurrentPage(1);
      
    } catch (err: any) {
      console.error('Error applying filters:', err);
      setError('Filtreler uygulanırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };
  
  const resetFilters = async () => {
    // Reset filter form values
    setFilters({
      userId: '',
      sensorId: '',
      action: '',
      startDate: '',
      endDate: '',
    });
    
    // Reset view mode
    setViewMode('all');
    setViewId(null);
    setViewTitle('Tüm Loglar');
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Resetting filters and fetching all logs');
      // Her zaman tüm logları getir
      const logsData = await logsApi.getAll();
      console.log('Received all logs:', logsData.length);
      
      setLogs(logsData);
      setTotalPages(Math.ceil(logsData.length / logsPerPage));
      setCurrentPage(1);
    } catch (err) {
      console.error('Error resetting filters:', err);
      setError('Filtreler sıfırlanırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // View logs by user
  const viewUserLogs = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Viewing logs for user:', userId);
      setViewMode('user');
      setViewId(userId);
      
      // Kullanıcı loglarını getir
      const userLogs = await logsApi.getUserLogs(userId);
      
      // Kullanıcı adını bul
      const viewUser = users.find(u => u.id === userId);
      if (viewUser) {
        setViewTitle(`${viewUser.firstName} ${viewUser.lastName} Kullanıcısının Logları`);
      }
      
      // Eksik kullanıcı bilgilerini tamamla
      const processedLogs = userLogs.map(log => {
        // Eğer log.user yoksa ve log.userId varsa, kullanıcı bilgisini ekle
        if (!log.user && log.userId) {
          const foundUser = users.find(u => u.id === log.userId);
          if (foundUser) {
            return { ...log, user: foundUser };
          }
        }
        return log;
      });
      
      setLogs(processedLogs);
      setTotalPages(Math.ceil(processedLogs.length / logsPerPage));
      setCurrentPage(1);
      
      // Filtreleri sıfırla ama userId'yi koru
      setFilters({
        userId: userId,
        sensorId: '',
        action: '',
        startDate: '',
        endDate: '',
      });
    } catch (err) {
      console.error('Error fetching user logs:', err);
      setError('Kullanıcı logları yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };
  
  // View logs by sensor
  const viewSensorLogs = async (sensorId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Viewing logs for sensor:', sensorId);
      setViewMode('sensor');
      setViewId(sensorId);
      setViewTitle(`${sensorId} Sensörünün Logları`);
      
      // Sensör loglarını getir
      const sensorLogs = await logsApi.getSensorLogs(sensorId);
      
      // Eksik kullanıcı bilgilerini tamamla
      const processedLogs = sensorLogs.map(log => {
        // Eğer log.user yoksa ve log.userId varsa, kullanıcı bilgisini ekle
        if (!log.user && log.userId) {
          const foundUser = users.find(u => u.id === log.userId);
          if (foundUser) {
            return { ...log, user: foundUser };
          }
        }
        return log;
      });
      
      setLogs(processedLogs);
      setTotalPages(Math.ceil(processedLogs.length / logsPerPage));
      setCurrentPage(1);
      
      // Filtreleri sıfırla ama sensorId'yi koru
      setFilters({
        userId: '',
        sensorId: sensorId,
        action: '',
        startDate: '',
        endDate: '',
      });
    } catch (err) {
      console.error('Error fetching sensor logs:', err);
      setError('Sensör logları yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };
  
  // Format timestamp
  const formatDate = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'dd MMM yyyy HH:mm:ss', { locale: tr });
    } catch (error) {
      return timestamp;
    }
  };
  
  // Get action display name
  const getActionDisplayName = (action: string) => {
    const actionMap: Record<string, string> = {
      'viewed_latest_data': 'Son verileri görüntüledi',
      'viewed_historical_data': 'Geçmiş verileri görüntüledi',
      'viewed_sensor_details': 'Sensör detaylarını görüntüledi',
      'viewed_range_data': 'Tarih aralığı verilerini görüntüledi',
      'subscribed_to_sensor': 'Sensöre abone oldu',
      'viewed_logs': 'Logları görüntüledi',
      'created_sensor': 'Sensör oluşturdu',
      'updated_sensor': 'Sensör güncelledi',
      'deleted_sensor': 'Sensör sildi',
      'granted_access': 'Erişim izni verdi',
      'revoked_access': 'Erişim izni kaldırdı',
      'login': 'Giriş yaptı',
      'logout': 'Çıkış yaptı',
      'failed_login': 'Giriş başarısız'
    };
    
    return actionMap[action] || action;
  };
  
  // Get displayed logs for the current page
  const displayedLogs = logs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage);
  
  if (!user || user.role !== UserRole.SYSTEM_ADMIN) {
    return null; // Already redirecting in useEffect
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-100">
        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-indigo-400">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardDocumentListIcon className="h-7 w-7" />
            {viewTitle}
          </h2>
        </div>
        
        <div className="p-6">
          {/* View Mode Indicator */}
          {viewMode !== 'all' && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {viewMode === 'user' ? (
                  <UserIcon className="h-5 w-5 text-blue-500" />
                ) : (
                  <DeviceTabletIcon className="h-5 w-5 text-blue-500" />
                )}
                <span className="text-blue-700 font-medium">
                  {viewMode === 'user' 
                    ? 'Kullanıcı logları görüntüleniyor' 
                    : 'Sensör logları görüntüleniyor'}
                </span>
              </div>
              <button
                onClick={resetFilters}
                className="text-blue-700 hover:text-blue-900 text-sm font-medium flex items-center gap-1"
              >
                <XCircleIcon className="h-4 w-4" />
                Tümünü Göster
              </button>
            </div>
          )}
          
          {/* Filter Toggle Button */}
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <FunnelIcon className="h-5 w-5" />
              {showFilters ? 'Filtreleri Gizle' : 'Filtreleri Göster'}
            </button>
            
            <button
              onClick={resetFilters}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <ArrowPathIcon className="h-5 w-5" />
              Yenile
            </button>
          </div>
          
          {/* Filters */}
          {showFilters && (
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Log Filtreleri</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* User Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kullanıcı
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      name="userId"
                      value={filters.userId}
                      onChange={handleInputChange}
                      className="block w-full pl-10 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                    >
                      <option value="">Tüm Kullanıcılar</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Sensor ID Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sensör ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DeviceTabletIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="sensorId"
                      value={filters.sensorId}
                      onChange={handleInputChange}
                      placeholder="Sensör ID ile filtrele"
                      className="block w-full pl-10 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                    />
                  </div>
                </div>
                
                {/* Action Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    İşlem Tipi
                  </label>
                  <select
                    name="action"
                    value={filters.action}
                    onChange={handleInputChange}
                    className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Tüm İşlemler</option>
                    {actionTypes.map(action => (
                      <option key={action} value={action}>
                        {getActionDisplayName(action)}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Date Range Filters */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Başlangıç Tarihi
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CalendarIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="datetime-local"
                      name="startDate"
                      value={filters.startDate}
                      onChange={handleInputChange}
                      className="block w-full pl-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bitiş Tarihi
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CalendarIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="datetime-local"
                      name="endDate"
                      value={filters.endDate}
                      onChange={handleInputChange}
                      className="block w-full pl-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={applyFilters}
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Filtreleri Uygula
                </button>
              </div>
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}
          
          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <>
              {/* Results Count */}
              <div className="mb-4 text-sm text-gray-500">
                Toplam {logs.length} log kaydı bulundu
              </div>
              
              {/* Logs Table */}
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Tarih/Saat</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Kullanıcı</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">İşlem</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Sensör</th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">İşlemler</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {displayedLogs.length > 0 ? (
                      displayedLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900">
                            {formatDate(log.timestamp)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <div className="font-medium text-gray-900">
                              {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Bilinmeyen Kullanıcı'}
                            </div>
                            <div className="text-gray-500">{log.user ? log.user.email : '-'}</div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {getActionDisplayName(log.action)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {log.sensorId || '-'}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              {log.userId && viewMode !== 'user' && (
                                <button
                                  onClick={() => viewUserLogs(log.userId)}
                                  className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                                  title="Bu kullanıcının tüm loglarını görüntüle"
                                >
                                  <UserIcon className="h-4 w-4" />
                                  <span className="hidden sm:inline">Kullanıcı Logları</span>
                                </button>
                              )}
                              
                              {log.sensorId && viewMode !== 'sensor' && (
                                <button
                                  onClick={() => viewSensorLogs(log.sensorId!)}
                                  className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                                  title="Bu sensörün tüm loglarını görüntüle"
                                >
                                  <DeviceTabletIcon className="h-4 w-4" />
                                  <span className="hidden sm:inline">Sensör Logları</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-sm text-center text-gray-500">
                          Gösterilecek log kaydı bulunamadı
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-lg">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center rounded-md border ${
                        currentPage === 1
                          ? 'border-gray-300 bg-white text-gray-300'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      } px-4 py-2 text-sm font-medium`}
                    >
                      Önceki
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className={`relative ml-3 inline-flex items-center rounded-md border ${
                        currentPage === totalPages
                          ? 'border-gray-300 bg-white text-gray-300'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      } px-4 py-2 text-sm font-medium`}
                    >
                      Sonraki
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{(currentPage - 1) * logsPerPage + 1}</span>
                        {' - '}
                        <span className="font-medium">
                          {Math.min(currentPage * logsPerPage, logs.length)}
                        </span>
                        {' / '}
                        <span className="font-medium">{logs.length}</span> kayıt gösteriliyor
                      </p>
                    </div>
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ${
                            currentPage === 1
                              ? 'cursor-not-allowed'
                              : 'hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                          }`}
                        >
                          <span className="sr-only">Önceki</span>
                          <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                              currentPage === page
                                ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ${
                            currentPage === totalPages
                              ? 'cursor-not-allowed'
                              : 'hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                          }`}
                        >
                          <span className="sr-only">Sonraki</span>
                          <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 