import React from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

interface TonProviderProps {
  children: React.ReactNode;
}

export function TonProvider({ children }: TonProviderProps) {
  return (
    <TonConnectUIProvider manifestUrl="https://vaelmour.netlify.app/tonconnect-manifest.json">
      {children}
    </TonConnectUIProvider>
  );
}
