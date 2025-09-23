'use client'

import { createContext, useContext } from 'react';

const NonceContext = createContext<string>('');

export function useNonce(): string {
  const context = useContext(NonceContext);
  if (context === undefined) {
    throw new Error('useNonce must be used within a NonceProvider');
  }
  return context;
}

interface NonceProviderProps {
  children: React.ReactNode;
  nonce: string;
}

export function NonceProvider({ children, nonce }: NonceProviderProps) {
  return (
    <NonceContext.Provider value={nonce}>
      {children}
    </NonceContext.Provider>
  );
}
