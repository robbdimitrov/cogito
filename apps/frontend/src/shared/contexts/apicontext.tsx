'use client';

import React, { createContext, useContext, useState } from 'react';
import APIClient from '@/shared/services/apiclient';

const APIContext = createContext<APIClient | null>(null);

export const useAPI = () => {
  const context = useContext(APIContext);
  if (!context) {
    throw new Error('useAPI must be used within an APIProvider');
  }
  return context;
};

export const APIProvider = ({ children }: { children: React.ReactNode }) => {
  const [apiClient] = useState(() => new APIClient());

  return (
    <APIContext.Provider value={apiClient}>
      {children}
    </APIContext.Provider>
  );
};
