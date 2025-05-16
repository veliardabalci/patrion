'use client';

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { companiesApi } from '@/services/api';
import { usersApi } from '@/services/api';
import { Company, User, UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { 
  BuildingOfficeIcon,
  PencilIcon,
  UserIcon,
  PhoneIcon,
  GlobeAltIcon,
  MapPinIcon,
  PlusIcon,
  XMarkIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import CompanyUserForm from '../companies/CompanyUserForm';

export default function MyCompanyPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditInfoOpen, setIsEditInfoOpen] = useState(false);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const { user: currentUser } = useAuth();

  const fetchCompany = async () => {
    setIsLoading(true);
    try {
      const data = await companiesApi.getMyCompany();
      setCompany(data);
    } catch (err) {
      console.error('Error fetching company:', err);
      setError('Şirket bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, []);

  const handleAddUser = () => {
    setIsUserFormOpen(true);
  };

  const handleUserFormClose = () => {
    setIsUserFormOpen(false);
  };

  const handleUserFormSuccess = () => {
    setIsUserFormOpen(false);
    fetchCompany();
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

  if (!company) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mt-6">
        Şirket bilgisi bulunamadı. Sistem yöneticisi ile iletişime geçiniz.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
              <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-semibold text-gray-900">
                {company.name}
              </h1>
              <p className="text-gray-500 mt-1">{company.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full 
              ${company.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {company.isActive ? 'Aktif' : 'Pasif'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Şirket Bilgileri */}
        <div className="col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Şirket Bilgileri</h2>
              </div>
            </div>
            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start">
                <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Adres</h3>
                  <p className="mt-1 text-sm text-gray-900">{company.address}</p>
                </div>
              </div>
              <div className="flex items-start">
                <PhoneIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Telefon</h3>
                  <p className="mt-1 text-sm text-gray-900">{company.phone}</p>
                </div>
              </div>
              <div className="flex items-start">
                <GlobeAltIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Web Sitesi</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">
                      {company.website}
                    </a>
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <UserIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Kayıt Tarihi</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(company.createdAt).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Şirket Yöneticileri */}
          <div className="mt-8 bg-white shadow rounded-lg">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Şirket Yöneticileri</h2>
            </div>
            <div className="px-6 py-5">
              {company.users && company.users.filter(user => user.role === UserRole.COMPANY_ADMIN).length > 0 ? (
                <div className="space-y-4">
                  {company.users.filter(user => user.role === UserRole.COMPANY_ADMIN).map((admin) => (
                    <div key={admin.id} className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-indigo-700 font-medium text-lg">
                          {admin.firstName.charAt(0)}{admin.lastName.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-900">
                          {admin.firstName} {admin.lastName}
                        </h3>
                        <p className="text-sm text-gray-500">{admin.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  Şirket yöneticisi bulunamadı
                </div>
              )}
            </div>
          </div>
        </div>

        {/* İstatistikler */}
        <div>
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">İstatistikler</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Kullanıcı Sayısı</h3>
                <p className="mt-1 text-3xl font-semibold text-indigo-600">{company.users?.length || 0}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Aktif Kullanıcılar</h3>
                <p className="mt-1 text-3xl font-semibold text-green-600">
                  {company.users?.filter(user => user.isActive).length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kullanıcılar */}
      <div className="mt-8 bg-white shadow rounded-lg">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Kullanıcılar</h2>
          {currentUser?.role === UserRole.COMPANY_ADMIN && (
            <button
              type="button"
              onClick={handleAddUser}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" aria-hidden="true" />
              Kullanıcı Ekle
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  E-posta
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kayıt Tarihi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {company.users && company.users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-indigo-700 font-medium text-lg">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${user.role === UserRole.COMPANY_ADMIN ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {user.role === UserRole.COMPANY_ADMIN ? 'Şirket Yöneticisi' : 'Kullanıcı'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                </tr>
              ))}

              {(!company.users || company.users.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    Şirkette kayıtlı kullanıcı bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kullanıcı Ekleme Modal */}
      <Transition.Root show={isUserFormOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={handleUserFormClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-xl bg-white px-4 pb-4 pt-5 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                  <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      onClick={handleUserFormClose}
                    >
                      <span className="sr-only">Kapat</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                  <div>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                      <UserIcon className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-5">
                      <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-gray-900">
                        Şirkete Kullanıcı Ekle
                      </Dialog.Title>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          {company.name} şirketine yeni bir kullanıcı eklemek için aşağıdaki formu doldurun.
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 sm:mt-8">
                      <CompanyUserForm 
                        companyId={company.id}
                        onSuccess={handleUserFormSuccess} 
                        onCancel={handleUserFormClose} 
                      />
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
} 