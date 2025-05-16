'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Company, User, UserRole } from '@/types';
import { companiesApi, usersApi } from '@/services/api';
import { 
  BuildingOfficeIcon, 
  GlobeAltIcon, 
  PhoneIcon, 
  MapPinIcon, 
  UserIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

// Define schema for form validation
const companySchema = z.object({
  name: z.string().min(2, { message: 'Şirket adı en az 2 karakter olmalıdır' }),
  description: z.string().min(1, { message: 'Açıklama gereklidir' }),
  address: z.string().min(5, { message: 'Adres en az 5 karakter olmalıdır' }),
  phone: z.string().min(10, { message: 'Geçerli bir telefon numarası giriniz' }),
  website: z.string().url({ message: 'Geçerli bir website adresi giriniz' }),
  companyAdminId: z.string().min(1, { message: 'Şirket yöneticisi seçiniz' }),
  isActive: z.boolean(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CompanyFormProps {
  initialData?: Company;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CompanyForm({ initialData, onSuccess, onCancel }: CompanyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [potentialAdmins, setPotentialAdmins] = useState<User[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);

  useEffect(() => {
    const fetchPotentialAdmins = async () => {
      setIsLoadingAdmins(true);
      try {
        const users = await usersApi.getAll();
        // Filter users that can be company admins (CompanyAdmin role or unassigned users)
        const admins = users.filter(user => 
          user.role === UserRole.COMPANY_ADMIN || 
          (user.role === UserRole.USER && !user.companyId)
        );
        setPotentialAdmins(admins);
      } catch (err) {
        console.error('Error fetching potential admins:', err);
        setError('Potansiyel şirket yöneticileri yüklenirken bir hata oluştu.');
      } finally {
        setIsLoadingAdmins(false);
      }
    };

    fetchPotentialAdmins();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: initialData ? {
      name: initialData.name,
      description: initialData.description,
      address: initialData.address,
      phone: initialData.phone,
      website: initialData.website || '',
      companyAdminId: initialData.companyAdminId,
      isActive: initialData.isActive,
    } : {
      name: '',
      description: '',
      address: '',
      phone: '',
      website: '',
      companyAdminId: '',
      isActive: true,
    }
  });

  const onSubmit = async (data: CompanyFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // For API compatibility, convert the data to match API expectations
      const apiData = {
        ...data,
        // If companyAdminId is empty string, set it to null or undefined
        companyAdminId: data.companyAdminId && data.companyAdminId.trim() !== '' 
          ? data.companyAdminId 
          : undefined
      };
      
      if (initialData) {
        await companiesApi.update(initialData.id, apiData);
      } else {
        await companiesApi.create(apiData as any); // Type cast for API compatibility
      }
      onSuccess();
    } catch (err: any) {
      console.error('Error saving company:', err);
      setError(err.response?.data?.message || 'Şirket kaydedilirken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Input field common styling
  const inputClassName = (hasError: boolean) => `
    pl-10 block w-full rounded-md 
    ${hasError 
      ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' 
      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
    } 
    shadow-sm sm:text-sm h-11 
    bg-gray-50 hover:bg-white focus:bg-white 
    transition-all duration-200
    focus:ring-2 focus:ring-offset-1
  `;

  const textareaClassName = (hasError: boolean) => `
    block w-full rounded-md 
    ${hasError 
      ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' 
      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
    } 
    shadow-sm sm:text-sm p-3 
    bg-gray-50 hover:bg-white focus:bg-white 
    transition-all duration-200
    focus:ring-2 focus:ring-offset-1
  `;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Hata</h3>
              <div className="mt-1 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Şirket Adı */}
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Şirket Adı *
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <BuildingOfficeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              id="name"
              className={inputClassName(!!errors.name)}
              placeholder="Şirket adı"
              {...register('name')}
            />
            {errors.name && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
              </div>
            )}
          </div>
          {errors.name && (
            <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* Website */}
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="website" className="block text-sm font-medium text-gray-700">
            Website *
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <GlobeAltIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              id="website"
              placeholder="https://example.com"
              className={inputClassName(!!errors.website)}
              {...register('website')}
            />
            {errors.website && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
              </div>
            )}
          </div>
          {errors.website && (
            <p className="mt-2 text-sm text-red-600">{errors.website.message}</p>
          )}
        </div>

        {/* Açıklama */}
        <div className="col-span-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Açıklama *
          </label>
          <div className="mt-1">
            <textarea
              id="description"
              rows={3}
              className={textareaClassName(!!errors.description)}
              placeholder="Şirket açıklaması"
              {...register('description')}
            />
          </div>
          {errors.description && (
            <p className="mt-2 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        {/* Adres */}
        <div className="col-span-2">
          <label htmlFor="address" className="block text-sm font-medium text-gray-700">
            Adres *
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPinIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <textarea
              id="address"
              rows={3}
              className={`pl-10 ${textareaClassName(!!errors.address)}`}
              placeholder="Şirket adresi"
              {...register('address')}
            />
          </div>
          {errors.address && (
            <p className="mt-2 text-sm text-red-600">{errors.address.message}</p>
          )}
        </div>

        {/* Telefon */}
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Telefon *
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <PhoneIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              id="phone"
              placeholder="1234567890"
              className={inputClassName(!!errors.phone)}
              {...register('phone')}
            />
            {errors.phone && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
              </div>
            )}
          </div>
          {errors.phone && (
            <p className="mt-2 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        {/* Şirket Yöneticisi */}
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="companyAdminId" className="block text-sm font-medium text-gray-700">
            Şirket Yöneticisi *
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UserIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <select
              id="companyAdminId"
              className={`${inputClassName(!!errors.companyAdminId)} appearance-none`}
              {...register('companyAdminId')}
              disabled={isLoadingAdmins}
            >
              <option value="">Şirket yöneticisi seçiniz</option>
              {potentialAdmins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.firstName} {admin.lastName} ({admin.email})
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            {errors.companyAdminId && (
              <div className="absolute inset-y-0 right-8 pr-3 flex items-center pointer-events-none">
                <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
              </div>
            )}
          </div>
          {isLoadingAdmins && (
            <p className="mt-2 text-sm text-gray-500">Yöneticiler yükleniyor...</p>
          )}
          {errors.companyAdminId && (
            <p className="mt-2 text-sm text-red-600">{errors.companyAdminId.message}</p>
          )}
        </div>

        {/* Aktif */}
        <div className="col-span-2 sm:col-span-1">
          <div className="flex items-center h-full mt-6">
            <div className="flex items-center">
              <input
                id="isActive"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                {...register('isActive')}
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                Şirket aktif olarak işaretlensin
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-5">
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            className="rounded-md bg-white py-2.5 px-4 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            İptal
          </button>
          <button
            type="submit"
            className="inline-flex justify-center items-center rounded-md bg-indigo-600 py-2.5 px-6 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                {initialData ? 'Güncelleniyor...' : 'Kaydediliyor...'}
              </>
            ) : initialData ? (
              'Güncelle'
            ) : (
              'Kaydet'
            )}
          </button>
        </div>
      </div>
    </form>
  );
} 