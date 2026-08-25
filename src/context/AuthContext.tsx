// src/context/AuthContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { UserRole } from '../types';

interface AuthContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  canPerform: (action: 'ACKNOWLEDGE' | 'RESOLVE' | 'EXPORT') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<UserRole>('Viewer'); // Default state

  const canPerform = (action: 'ACKNOWLEDGE' | 'RESOLVE' | 'EXPORT'): boolean => {
    if (userRole === 'Admin') return true;
    if (userRole === 'Operator') return action === 'ACKNOWLEDGE' || action === 'RESOLVE';
    return false; // Viewer can do none of these
  };

  return (
    <AuthContext.Provider value={{ userRole, setUserRole, canPerform }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};