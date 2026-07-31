import React, { createContext, useContext, useState } from 'react';
import type { Usuario } from '../types';

interface AuthContextType {
  usuario: Usuario | null;
  login: (user: Usuario) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  usuario: null,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const saved = localStorage.getItem('svri_usuario');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (user: Usuario) => {
    setUsuario(user);
    localStorage.setItem('svri_usuario', JSON.stringify(user));
  };

  const logout = () => {
    setUsuario(null);
    localStorage.removeItem('svri_usuario');
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
