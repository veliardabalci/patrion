'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserRole, User } from '@/types';
import { usersApi } from '@/services/api';
import { 
  UserIcon, 
  EnvelopeIcon, 
  LockClosedIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

// Define schema for form validation
const userSchema = z.object({
  email: z.string().email({ message: 'Geçerli bir e-posta adresi giriniz' }),
  firstName: z.string().min(2, { message: 'Ad en az 2 karakter olmalıdır' }),
  lastName: z.string().min(2, { message: 'Soyad en az 2 karakter olmalıdır' }),
  password: z.string().min(8, { message: 'Şifre en az 8 karakter olmalıdır' }).optional(),
  role: z.enum([UserRole.COMPANY_ADMIN, UserRole.USER], {
    errorMap: () => ({ message: 'Geçerli bir rol seçiniz' }),
  }),
  isActive: z.boolean()
});

type UserFormData = z.infer<typeof userSchema>;

interface CompanyUserFormProps {
  companyId: string;
  onSuccess: () => void;
  onCancel: () => void;
  user?: User | null;
}

export default function CompanyUserForm({ companyId, onSuccess, onCancel, user }: CompanyUserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditMode = !!user;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      role: UserRole.USER,
      isActive: true,
    }
  });

  // Kullanıcı düzenleme modunda form alanlarını doldur
  useEffect(() => {
    if (user) {
      reset({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        password: undefined, // Password field is left empty when editing
        role: (user.role === UserRole.COMPANY_ADMIN || user.role === UserRole.USER) 
          ? user.role 
          : UserRole.USER, // Eğer rol uygun değilse varsayılan olarak USER kullan
        isActive: user.isActive
      });
    }
  }, [user, reset]);

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

  const onSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditMode && user) {
        // Kullanıcı güncelleme
        const updateData: any = {
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          isActive: data.isActive
        };

        // Sadece şifre belirtildiyse güncelleme verisine ekle
        if (data.password) {
          updateData.password = data.password;
        }

        await usersApi.update(user.id, updateData);
      } else {
        // Yeni kullanıcı oluşturma
        await usersApi.adminCreate({
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          password: data.password || '',
          role: data.role,
          companyId: companyId
        });
      }
      onSuccess();
    } catch (err: any) {
      console.error('Error saving user:', err);
      setError(err.response?.data?.message || 'Kullanıcı kaydedilirken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        {/* E-posta */}
        <div className="col-span-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            E-posta *
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <EnvelopeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="email"
              id="email"
              className={inputClassName(!!errors.email)}
              placeholder="ornek@sirket.com"
              disabled={isEditMode}
              {...register('email')}
            />
            {errors.email && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
              </div>
            )}
          </div>
          {errors.email && (
            <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Ad */}
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            Ad *
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UserIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              id="firstName"
              className={inputClassName(!!errors.firstName)}
              placeholder="Ad"
              {...register('firstName')}
            />
            {errors.firstName && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
              </div>
            )}
          </div>
          {errors.firstName && (
            <p className="mt-2 text-sm text-red-600">{errors.firstName.message}</p>
          )}
        </div>

        {/* Soyad */}
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            Soyad *
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UserIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              id="lastName"
              className={inputClassName(!!errors.lastName)}
              placeholder="Soyad"
              {...register('lastName')}
            />
            {errors.lastName && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
              </div>
            )}
          </div>
          {errors.lastName && (
            <p className="mt-2 text-sm text-red-600">{errors.lastName.message}</p>
          )}
        </div>

        {/* Şifre */}
        <div className="col-span-2">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            {isEditMode ? 'Şifre (değiştirmek için doldurun)' : 'Şifre *'}
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LockClosedIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="password"
              id="password"
              className={inputClassName(!!errors.password)}
              placeholder={isEditMode ? '••••••••' : 'Şifre giriniz'}
              {...register('password')}
            />
            {errors.password && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
              </div>
            )}
          </div>
          {errors.password && (
            <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
          )}
          {isEditMode && (
            <p className="mt-1 text-xs text-gray-500">Şifreyi değiştirmek istemiyorsanız boş bırakın.</p>
          )}
        </div>

        {/* Rol */}
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            Rol *
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <select
              id="role"
              className={`${inputClassName(!!errors.role)} appearance-none`}
              {...register('role')}
            >
              <option value={UserRole.USER}>Kullanıcı</option>
              <option value={UserRole.COMPANY_ADMIN}>Şirket Yöneticisi</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          {errors.role && (
            <p className="mt-2 text-sm text-red-600">{errors.role.message}</p>
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
                Kullanıcı aktif olarak işaretlensin
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
                Kaydediliyor...
              </>
            ) : (
              isEditMode ? 'Kaydet' : 'Kullanıcı Ekle'
            )}
          </button>
        </div>
      </div>
    </form>
  );
} 