'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginRequest, RegisterRequest } from '../types';
import { authApi } from '../services/api';
import { useRouter } from 'next/navigation';
import { setCookie, getCookie, eraseCookie } from '../utils/cookies';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  // Kullanıcı verilerini güncelleme fonksiyonu
  const refreshUserData = async (): Promise<void> => {
    const token = getCookie('token');
    if (token) {
      try {
        const userData = await authApi.getCurrentUser();
        setUser(userData);
      } catch (error: any) {
        console.error('Failed to refresh user data:', error);
        if (error.response?.status === 401) {
          // Token geçersiz ise çıkış yap
          eraseCookie('token');
          eraseCookie('refresh_token');
          setUser(null);
          router.push('/login');
        }
      }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = getCookie('token');
      if (token) {
        try {
          const userData = await authApi.getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error('Failed to fetch user data:', error);
          eraseCookie('token');
          eraseCookie('refresh_token');
        }
      }
      setIsLoading(false);
    };

    initAuth();
    
    // Kullanıcı verilerini belirli aralıklarla kontrol et
    // Bu, token yenileme işleminin yanı sıra kullanıcı verilerinin güncel kalmasını sağlar
    const userDataInterval = setInterval(() => {
      if (getCookie('token')) {
        refreshUserData();
      }
    }, 5 * 60 * 1000); // 5 dakikada bir
    
    return () => clearInterval(userDataInterval);
  }, []);

  const login = async (data: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(data);
      setUser(response.user);
      
      // Başarılı girişte token'ları uzun süreyle sakla
      setCookie('token', response.access_token, 30);  // 30 gün
      setCookie('refresh_token', response.refresh_token, 60);  // 60 gün
      
      router.push('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    setIsLoading(true);
    try {
      const response = await authApi.register(data);
      setUser(response.user);
      
      // Başarılı kayıtta token'ları uzun süreyle sakla
      setCookie('token', response.access_token, 30);  // 30 gün
      setCookie('refresh_token', response.refresh_token, 60);  // 60 gün
      
      router.push('/dashboard');
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Even if logout API fails, we clear cookies and redirect
      setUser(null);
      eraseCookie('token');
      eraseCookie('refresh_token');
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 