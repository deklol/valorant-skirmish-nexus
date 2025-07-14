import { createContext, useContext, ReactNode } from 'react';
import { useShop } from '@/hooks/useShop';

type ShopContextType = ReturnType<typeof useShop>;

const ShopContext = createContext<ShopContextType | null>(null);

interface ShopProviderProps {
  children: ReactNode;
}

export function ShopProvider({ children }: ShopProviderProps) {
  const shopData = useShop();
  
  return (
    <ShopContext.Provider value={shopData}>
      {children}
    </ShopContext.Provider>
  );
}

export function useShopContext() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShopContext must be used within a ShopProvider');
  }
  return context;
}