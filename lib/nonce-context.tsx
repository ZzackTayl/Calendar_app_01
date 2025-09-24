'use client'

import { createContext, useContext, useEffect, useState } from 'react';

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

export function NonceProvider({ children, nonce: initialNonce }: NonceProviderProps) {
  const [nonce, setNonce] = useState<string>(initialNonce);

  useEffect(() => {
    // Fallback: try to get nonce from meta tag if not provided
    if (!nonce && typeof document !== 'undefined') {
      const metaTag = document.querySelector('meta[name="csp-nonce"]');
      if (metaTag) {
        const metaNonce = metaTag.getAttribute('content');
        if (metaNonce) {
          setNonce(metaNonce);
        }
      }
    }
  }, [nonce]);

  return (
    <NonceContext.Provider value={nonce}>
      {children}
    </NonceContext.Provider>
  );
}
