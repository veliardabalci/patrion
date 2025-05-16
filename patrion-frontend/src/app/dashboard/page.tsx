'use client';

import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Ana Sayfa</h1>
      
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Welcome Card */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                  {user?.firstName?.charAt(0) || 'K'}
                </div>
              </div>
              <div className="ml-5">
                <h3 className="text-lg font-medium text-gray-900">
                  Hoş Geldiniz, {user?.firstName}!
                </h3>
                <p className="text-sm text-gray-500">
                  {user?.role === UserRole.SYSTEM_ADMIN
                    ? 'Sistem Yöneticisi'
                    : user?.role === UserRole.COMPANY_ADMIN
                    ? 'Şirket Yöneticisi'
                    : 'Kullanıcı'}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
} 