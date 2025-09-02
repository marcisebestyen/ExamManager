import { useState } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { Operator } from '@/interfaces/Operator';
import axiosInstance from '../api/axios.config';

interface DecodedJwtPayload {
  nameid: string;
  unique_name: string;
  role: string;
  exp: number;
  // id: number;
  // lastName: string;
  // firstName: string;
  // userName?: string;
  // role?: string;
  // token: string;
}

const useAuth = () => {
  const [user, setUser] = useState<Operator | null>(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return JSON.parse(storedUser);
      } catch (error) {
        console.error('Token or user parse error: ', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return null;
      }
    }

    return null;
  });

  const login = async (userName: string, password: string): Promise<void> => {
    try {
      const response = await axiosInstance.post<{
        firstName: string;
        lastName: string;
        token: string;
      }>('/operators/login', {
        userName,
        password,
      });

      const token = response.data.token;
      console.log(response.data);
      if (token && typeof token === 'string') {
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        try {
          const decodedPayload = jwtDecode<DecodedJwtPayload>(token);

          const mappedOperator: Operator = {
            id: decodedPayload.nameid || 'defaultIdOnError',
            userName: decodedPayload.unique_name || 'defaultUniqueNameOnError',
            role: decodedPayload.role || 'defaultRoleOnError',
            firstName: response.data.firstName || '',
            lastName: response.data.lastName || '',
            token: response.data.token || '',
          };

          if (mappedOperator.id !== 'defaultIdOnError') {
            localStorage.setItem('user', JSON.stringify(mappedOperator));
            setUser(mappedOperator);
          } else {
            throw new Error('User data incomplete in token.');
          }
        } catch (error) {
          console.error('Token decode issue: ', error);
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
          throw new Error('Successful login but decoding the token failed.');
        }
      } else {
        throw new Error('Missing or false token in token.');
      }
    } catch (error: any) {
      console.error('Login fail:', error.message, error);
      if (error.response?.status === 401) {
        throw new Error('Wrong username or password!');
      } else if (error.response?.status === 404) {
        throw new Error('Username cannot be found!');
      } else if (error.response?.status === 400) {
        throw new Error('Wrong data, check the username and password!');
      } else if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Unrecognized error during login.');
      }
    }
  };

  const logout = (onLogout?: () => void) => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);

    if (onLogout) {
      onLogout();
    }
  };

  return {
    user,
    login,
    logout,
    isAuthenticated: !!user,
  };
};

export default useAuth;
