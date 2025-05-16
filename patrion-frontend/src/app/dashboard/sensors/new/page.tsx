'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { sensorsApi, companiesApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { UserRole, Company, SensorCreateRequest } from '@/types';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function NewSensorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  
  // Form state
  const [formData, setFormData] = useState<SensorCreateRequest>({
    sensor_id: '',
    name: '',
    description: '',
    location: '',
    type: 'temperature', // Default to temperature
    companyId: '',
  });

  // Şirketleri yükle (sadece admin için)
  useEffect(() => {
    const fetchCompanies = async () => {
      if (user?.role === UserRole.SYSTEM_ADMIN) {
        try {
          const data = await companiesApi.getAll();
          setCompanies(data);
        } catch (err) {
          console.error('Şirketler yüklenirken hata oluştu:', err);
          setError('Şirketler yüklenirken bir hata oluştu.');
        }
      } else if (user?.role === UserRole.COMPANY_ADMIN && user?.companyId) {
        // Şirket yöneticisi ise kendi şirketini otomatik olarak seç
        setFormData(prev => ({
          ...prev,
          companyId: user.companyId || '',
        }));
      }
    };

    fetchCompanies();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Şirket ID kontrolü
      if (!formData.companyId) {
        if (user?.role === UserRole.COMPANY_ADMIN && user?.companyId) {
          formData.companyId = user.companyId;
        } else {
          throw new Error('Lütfen bir şirket seçin.');
        }
      }

      // Sensör oluştur
      await sensorsApi.createSensor(formData);
      setSuccess('Sensör başarıyla oluşturuldu.');
      
      // 2 saniye sonra sensör listesine yönlendir
      setTimeout(() => {
        router.push('/dashboard/sensors');
      }, 2000);
    } catch (err: any) {
      console.error('Sensör oluşturulurken hata:', err);
      setError(err.response?.data?.message || 'Sensör oluşturulurken bir hata meydana geldi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link 
          href="/dashboard/sensors"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-2"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" /> Sensörlere Dön
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">Yeni Sensör Ekle</h1>
        <p className="mt-1 text-gray-500">
          Sisteme yeni bir IoT sensörü ekleyin.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          {success}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="sensor_id" className="block text-sm font-medium text-gray-700">
                Sensör ID *
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="sensor_id"
                  id="sensor_id"
                  required
                  value={formData.sensor_id}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="temp_sensor_01"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Sensörün benzersiz ID'si</p>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Sensör Adı *
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Sıcaklık Sensörü 1"
                />
              </div>
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Açıklama
              </label>
              <div className="mt-1">
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Ana depo sıcaklık sensörü"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                Konum *
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="location"
                  id="location"
                  required
                  value={formData.location}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Depo - Raf A1"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Sensör Tipi *
              </label>
              <div className="mt-1">
                <select
                  id="type"
                  name="type"
                  required
                  value={formData.type}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="temperature">Sıcaklık</option>
                  <option value="humidity">Nem</option>
                  <option value="temperature_humidity">Sıcaklık ve Nem</option>
                </select>
              </div>
            </div>

            {user?.role === UserRole.SYSTEM_ADMIN && (
              <div className="sm:col-span-6">
                <label htmlFor="companyId" className="block text-sm font-medium text-gray-700">
                  Şirket *
                </label>
                <div className="mt-1">
                  <select
                    id="companyId"
                    name="companyId"
                    required
                    value={formData.companyId}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Şirket Seçin</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {user?.role === UserRole.COMPANY_ADMIN && (
              <input type="hidden" name="companyId" value={formData.companyId} />
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <Link
              href="/dashboard/sensors"
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 