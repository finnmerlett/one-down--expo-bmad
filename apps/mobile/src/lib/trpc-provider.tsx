import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { createQueryClient, createTrpcClient, trpc } from './trpc';

type TrpcProviderProps = {
  children: ReactNode;
};

export function TrpcProvider({ children }: TrpcProviderProps) {
  const [queryClient] = useState(createQueryClient);
  const [trpcClient] = useState(createTrpcClient);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
