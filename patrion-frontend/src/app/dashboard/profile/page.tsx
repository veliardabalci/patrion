'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { usersApi } from '@/services/api';
import { UserRole } from '@/types';
import { 
  UserIcon, 
  EnvelopeIcon, 
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  PencilIcon,
  UserCircleIcon,
  LockClosedIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

// Define schema for form validation
const profileSchema = z.object({
  firstName: z.string().min(2, { message: 'Ad en az 2 karakter olmalıdır' }),
  lastName: z.string().min(2, { message: 'Soyad en az 2 karakter olmalıdır' }),
  email: z.string().email({ message: 'Geçerli bir e-posta adresi giriniz' }).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, { message: 'Şifre en az 8 karakter olmalıdır' }).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, refreshUserData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
    },
  });

  // Update form values when user data changes
  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Prepare update data
      const updateData: any = {
        firstName: data.firstName,
        lastName: data.lastName,
      };
      
      // Only include password fields if provided
      if (data.currentPassword && data.newPassword) {
        updateData.currentPassword = data.currentPassword;
        updateData.newPassword = data.newPassword;
      }
      
      // Call API to update user
      await usersApi.update(user.id, updateData);
      
      // Refresh user data in context
      await refreshUserData();
      
      setSuccess('Profil bilgileriniz başarıyla güncellendi.');
      setIsEditing(false);
      
      // Clear password fields
      reset({
        ...data,
        currentPassword: '',
        newPassword: '',
      });
    } catch (err: any) {
      console.error('Profil güncellenirken hata oluştu:', err);
      setError(err.response?.data?.message || 'Profil güncellenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-500">Kullanıcı bilgileriniz yüklenemedi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-100">
        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-indigo-400">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserIcon className="h-7 w-7" />
            Profilim
          </h2>
        </div>
        
        {success && (
          <div className="flex items-center gap-2 p-4 my-4 text-sm text-green-800 bg-green-50 rounded-lg mx-8 border border-green-100 shadow-sm">
            <CheckCircleIcon className="h-5 w-5" />
            <span>{success}</span>
          </div>
        )}
        
        {error && (
          <div className="flex items-center gap-2 p-4 my-4 text-sm text-red-800 bg-red-50 rounded-lg mx-8 border border-red-100 shadow-sm">
            <XCircleIcon className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}
        
        <div className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* User Role and Company Info */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-indigo-500" />
                Hesap Bilgileri
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rol
                  </label>
                  <div className="flex items-center p-3 border border-gray-300 rounded-lg bg-white shadow-sm">
                    <UserIcon className="h-5 w-5 text-indigo-500 mr-2" />
                    <span className="font-medium">{user.role === UserRole.SYSTEM_ADMIN ? 'Sistem Yöneticisi' : 
                          user.role === UserRole.COMPANY_ADMIN ? 'Şirket Yöneticisi' : 
                          'Kullanıcı'}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Şirket
                  </label>
                  <div className="flex items-center p-3 border border-gray-300 rounded-lg bg-white shadow-sm">
                    <BuildingOfficeIcon className="h-5 w-5 text-indigo-500 mr-2" />
                    <span className="font-medium">{user.company?.name || 'Şirket yok'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Profile Information */}
            <div className="space-y-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-indigo-500" />
                Kişisel Bilgiler
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="firstName">
                    Ad
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-indigo-500" aria-hidden="true" />
                    </div>
                    <input
                      id="firstName"
                      type="text"
                      className={`block w-full pl-10 py-3 text-base rounded-lg ${
                        errors.firstName
                          ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                      } ${!isEditing ? 'bg-gray-50' : 'bg-white'}`}
                      placeholder="Adınız"
                      disabled={!isEditing}
                      {...register('firstName')}
                    />
                  </div>
                  {errors.firstName && (
                    <p className="mt-2 text-sm text-red-600">{errors.firstName.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="lastName">
                    Soyad
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-indigo-500" aria-hidden="true" />
                    </div>
                    <input
                      id="lastName"
                      type="text"
                      className={`block w-full pl-10 py-3 text-base rounded-lg ${
                        errors.lastName
                          ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                      } ${!isEditing ? 'bg-gray-50' : 'bg-white'}`}
                      placeholder="Soyadınız"
                      disabled={!isEditing}
                      {...register('lastName')}
                    />
                  </div>
                  {errors.lastName && (
                    <p className="mt-2 text-sm text-red-600">{errors.lastName.message}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="email">
                  E-posta
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-indigo-500" aria-hidden="true" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    className="block w-full pl-10 py-3 text-base border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    placeholder="E-posta adresiniz"
                    disabled={true}
                    value={user.email}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">E-posta adresi değiştirilemez</p>
              </div>
              
              {isEditing && (
                <div className="space-y-5 pt-5 border-t border-gray-200 mt-4">
                  <h3 className="text-lg font-medium text-gray-800 flex items-center gap-2">
                    <ShieldCheckIcon className="h-5 w-5 text-indigo-500" />
                    Şifre Değiştir
                  </h3>
                  <p className="text-sm text-gray-500">Şifrenizi değiştirmek istemiyorsanız bu alanları boş bırakın</p>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="currentPassword">
                      Mevcut Şifre
                    </label>
                    <input
                      id="currentPassword"
                      type="password"
                      className="block w-full py-3 px-4 text-base border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                      {...register('currentPassword')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="newPassword">
                      Yeni Şifre
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      className={`block w-full py-3 px-4 text-base rounded-lg shadow-sm ${
                        errors.newPassword
                          ? 'border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                      {...register('newPassword')}
                    />
                    {errors.newPassword && (
                      <p className="mt-2 text-sm text-red-600">{errors.newPassword.message}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-4">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    className="px-5 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                    onClick={() => {
                      setIsEditing(false);
                      reset({
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        currentPassword: '',
                        newPassword: '',
                      });
                    }}
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center gap-1 transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <ShieldCheckIcon className="h-4 w-4" />
                        Kaydet
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="px-5 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center gap-1 transition-all"
                  onClick={() => setIsEditing(true)}
                >
                  <PencilIcon className="h-4 w-4" />
                  Profili Düzenle
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 