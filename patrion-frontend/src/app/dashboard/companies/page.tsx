'use client';

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { companiesApi } from '@/services/api';
import { Company, UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { 
  PencilIcon, 
  TrashIcon, 
  BuildingOfficeIcon,
  PlusIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import CompanyForm from './CompanyForm';
import CompanyUserForm from './CompanyUserForm';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | undefined>(undefined);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [isDeletingCompany, setIsDeletingCompany] = useState(false);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [selectedCompanyDetail, setSelectedCompanyDetail] = useState<Company | null>(null);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const { user: currentUser } = useAuth();

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const data = await companiesApi.getAll();
      setCompanies(data);
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError('Şirket listesi yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleOpenForm = (company?: Company) => {
    setSelectedCompany(company);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setSelectedCompany(undefined);
    setIsFormOpen(false);
  };

  const handleFormSuccess = () => {
    handleCloseForm();
    fetchCompanies();
  };

  const handleOpenDeleteModal = (company: Company) => {
    setCompanyToDelete(company);
    setIsDeleteModalOpen(true);
    setDeleteError(null);
    setDeleteSuccess(null);
  };

  const handleCloseDeleteModal = () => {
    // If not currently deleting
    if (!isDeletingCompany) {
      setIsDeleteModalOpen(false);
      setCompanyToDelete(null);
      
      // If there was a success message, clear it after the modal is closed
      if (deleteSuccess) {
        setTimeout(() => {
          setDeleteSuccess(null);
        }, 300);
      }
    }
  };

  const handleDeleteCompany = async () => {
    if (!companyToDelete) return;
    
    setIsDeletingCompany(true);
    setDeleteError(null);
    setDeleteSuccess(null);
    
    try {
      await companiesApi.delete(companyToDelete.id);
      setCompanies(companies.filter(company => company.id !== companyToDelete.id));
      setDeleteSuccess('Şirket başarıyla silindi.');
      
      // Close the modal after a brief delay to show the success message
      setTimeout(() => {
        handleCloseDeleteModal();
      }, 1500);
    } catch (err: any) {
      console.error('Error deleting company:', err);
      // Extract the error message from the API response
      if (err.response?.data?.message) {
        // Check if the error is about users in the company
        if (err.response.data.message.includes('because it has')) {
          const userCount = err.response.data.message.match(/it has (\d+) users/)?.[1] || 'birden fazla';
          setDeleteError(`Bu şirket silinemez çünkü ${userCount} kullanıcısı var. Önce kullanıcıları başka şirketlere taşıyın veya silin.`);
        } else {
          setDeleteError(err.response.data.message);
        }
      } else {
        setDeleteError('Şirket silinirken bir hata oluştu.');
      }
    } finally {
      setIsDeletingCompany(false);
    }
  };

  // Function to refresh company with users
  const fetchCompanyWithUsers = async (id: string) => {
    try {
      const company = await companiesApi.getById(id);
      setSelectedCompanyDetail(company);
      setIsDetailViewOpen(true);
    } catch (err) {
      console.error('Error fetching company details:', err);
      setError('Şirket detayları yüklenirken bir hata oluştu.');
    }
  };

  const handleViewCompanyDetail = (company: Company) => {
    fetchCompanyWithUsers(company.id);
  };

  const handleCloseDetailView = () => {
    setIsDetailViewOpen(false);
    setSelectedCompanyDetail(null);
  };

  const handleAddUser = () => {
    setIsUserFormOpen(true);
  };

  const handleUserFormClose = () => {
    setIsUserFormOpen(false);
  };

  const handleUserFormSuccess = () => {
    setIsUserFormOpen(false);
    // Refresh company details to show new user
    if (selectedCompanyDetail) {
      fetchCompanyWithUsers(selectedCompanyDetail.id);
    }
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Şirketler</h1>
        {currentUser?.role === UserRole.SYSTEM_ADMIN && (
          <button
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            onClick={() => handleOpenForm()}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Yeni Şirket
          </button>
        )}
      </div>

      <div className="overflow-hidden bg-white shadow-md rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Şirket
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                İletişim
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Şirket Yöneticisi
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kullanıcı Sayısı
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Durum
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">İşlemler</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {companies.map((company) => (
              <tr 
                key={company.id} 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => handleViewCompanyDetail(company)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <div 
                        className="text-sm font-medium text-gray-900 cursor-pointer hover:text-indigo-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewCompanyDetail(company);
                        }}
                      >
                        {company.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {company.description}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{company.address}</div>
                  <div className="text-sm text-gray-500">
                    <div>{company.phone}</div>
                    <div>{company.website}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {company.companyAdmin?.firstName} {company.companyAdmin?.lastName}
                  </div>
                  <div className="text-sm text-gray-500">{company.companyAdmin?.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {company.users?.length || 0} kullanıcı
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${company.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {company.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  {currentUser?.role === UserRole.SYSTEM_ADMIN && (
                    <>
                      <button 
                        className="text-indigo-600 hover:text-indigo-900"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenForm(company);
                        }}
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-900" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDeleteModal(company);
                        }}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}

            {companies.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  Kayıtlı şirket bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Company Form Modal */}
      <Transition.Root show={isFormOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={handleCloseForm}>
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
                      onClick={handleCloseForm}
                    >
                      <span className="sr-only">Kapat</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                  <div>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                      <BuildingOfficeIcon className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-5">
                      <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-gray-900">
                        {selectedCompany ? 'Şirketi Düzenle' : 'Yeni Şirket Ekle'}
                      </Dialog.Title>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          {selectedCompany 
                            ? 'Şirket bilgilerini güncellemek için aşağıdaki formu doldurun.' 
                            : 'Yeni bir şirket eklemek için aşağıdaki formu doldurun.'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 sm:mt-8">
                      <CompanyForm 
                        initialData={selectedCompany} 
                        onSuccess={handleFormSuccess} 
                        onCancel={handleCloseForm} 
                      />
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Delete Confirmation Modal */}
      <Transition.Root show={isDeleteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={handleCloseDeleteModal}>
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
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                  {/* Success Message */}
                  {deleteSuccess ? (
                    <div>
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                        <CheckCircleIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
                      </div>
                      <div className="mt-3 text-center sm:mt-5">
                        <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                          Silme İşlemi Başarılı
                        </Dialog.Title>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">{deleteSuccess}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Delete Confirmation or Error */}
                      <div>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                          {deleteError ? (
                            <ExclamationCircleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                          ) : (
                            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                          )}
                        </div>
                        <div className="mt-3 text-center sm:mt-5">
                          <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                            {deleteError ? 'Silme Hatası' : 'Şirketi Sil'}
                          </Dialog.Title>
                          <div className="mt-2">
                            {deleteError ? (
                              <p className="text-sm text-red-500">{deleteError}</p>
                            ) : (
                              <p className="text-sm text-gray-500">
                                <strong>{companyToDelete?.name}</strong> şirketini silmek istediğinizden emin misiniz? 
                                Bu işlem geri alınamaz.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                        <button
                          type="button"
                          className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1"
                          onClick={handleCloseDeleteModal}
                          disabled={isDeletingCompany}
                        >
                          {deleteError ? 'Kapat' : 'İptal'}
                        </button>
                        {!deleteError && (
                          <button
                            type="button"
                            className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600 sm:col-start-2"
                            onClick={handleDeleteCompany}
                            disabled={isDeletingCompany}
                          >
                            {isDeletingCompany ? (
                              <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                                Siliniyor...
                              </>
                            ) : (
                              'Şirketi Sil'
                            )}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Company Detail Modal */}
      <Transition.Root show={isDetailViewOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={handleCloseDetailView}>
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
                <Dialog.Panel className="relative transform overflow-hidden rounded-xl bg-white px-4 pb-4 pt-5 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:p-6">
                  <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      onClick={handleCloseDetailView}
                    >
                      <span className="sr-only">Kapat</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                  
                  {selectedCompanyDetail ? (
                    <div>
                      <div className="flex items-center mb-6">
                        <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-xl font-semibold text-gray-900">{selectedCompanyDetail.name}</h3>
                          <p className="text-sm text-gray-500">{selectedCompanyDetail.description}</p>
                        </div>
                        <div className="ml-auto">
                          <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full 
                            ${selectedCompanyDetail.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {selectedCompanyDetail.isActive ? 'Aktif' : 'Pasif'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-8">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-500 uppercase mb-3">İletişim Bilgileri</h4>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-900">
                              <span className="font-medium">Adres:</span> {selectedCompanyDetail.address}
                            </p>
                            <p className="text-sm text-gray-900">
                              <span className="font-medium">Telefon:</span> {selectedCompanyDetail.phone}
                            </p>
                            <p className="text-sm text-gray-900">
                              <span className="font-medium">Web Sitesi:</span> {selectedCompanyDetail.website}
                            </p>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-500 uppercase mb-3">Şirket Yöneticisi</h4>
                          {selectedCompanyDetail.companyAdmin ? (
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {selectedCompanyDetail.companyAdmin.firstName} {selectedCompanyDetail.companyAdmin.lastName}
                              </p>
                              <p className="text-sm text-gray-600">{selectedCompanyDetail.companyAdmin.email}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">Şirket yöneticisi atanmamış</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-200 pt-6">
                        <h4 className="text-base font-medium text-gray-900 flex items-center justify-between">
                          <span>Kullanıcılar</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm bg-gray-100 text-gray-700 py-1 px-2 rounded-full">
                              Toplam: {selectedCompanyDetail.users?.length || 0}
                            </span>
                            {currentUser?.role === UserRole.SYSTEM_ADMIN && (
                              <button
                                type="button"
                                onClick={handleAddUser}
                                className="inline-flex items-center text-sm px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors"
                              >
                                <PlusIcon className="h-4 w-4 mr-1" />
                                Kullanıcı Ekle
                              </button>
                            )}
                          </div>
                        </h4>
                        
                        {selectedCompanyDetail.users?.length ? (
                          <div className="mt-4 overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Kullanıcı
                                  </th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Rol
                                  </th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Durum
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {selectedCompanyDetail.users.map((user) => (
                                  <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                          <UserIcon className="h-4 w-4 text-indigo-600" />
                                        </div>
                                        <div className="ml-3">
                                          <div className="text-sm font-medium text-gray-900">
                                            {user.firstName} {user.lastName}
                                          </div>
                                          <div className="text-sm text-gray-500">{user.email}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {user.role === UserRole.COMPANY_ADMIN ? 'Şirket Yöneticisi' : 
                                       user.role === UserRole.SYSTEM_ADMIN ? 'Sistem Yöneticisi' : 'Kullanıcı'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {user.isActive ? 'Aktif' : 'Pasif'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="mt-4 py-8 text-center border border-gray-200 border-dashed rounded-lg">
                            <p className="text-sm text-gray-500">Bu şirkete ait kullanıcı bulunmamaktadır.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                      <p className="mt-2 text-sm text-gray-500">Şirket bilgileri yükleniyor...</p>
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Add User to Company Modal */}
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
                          {selectedCompanyDetail?.name} şirketine yeni bir kullanıcı eklemek için aşağıdaki formu doldurun.
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 sm:mt-8">
                      {selectedCompanyDetail && (
                        <CompanyUserForm 
                          companyId={selectedCompanyDetail.id}
                          onSuccess={handleUserFormSuccess} 
                          onCancel={handleUserFormClose} 
                        />
                      )}
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