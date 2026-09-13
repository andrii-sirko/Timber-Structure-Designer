import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { MaterialPrices, MemberCategory, RoofCovering } from '@/types';
import { createDefaultPrices, normalizePrices } from '@/engine/pricing';

const STORAGE_KEY = 'timber-structure-designer-prices-v1';

export interface PriceStore {
  prices: MaterialPrices;
  setTimberPrice: (category: MemberCategory, value: number) => void;
  setCladdingBoardPrice: (value: number) => void;
  setRoofDeckPrice: (value: number) => void;
  setRoofingPrice: (covering: RoofCovering, value: number) => void;
  setHardwarePrice: (id: string, value: number) => void;
  resetPrices: () => void;
}

export const usePriceStore = create<PriceStore>()(
  persist(
    (set) => ({
      prices: createDefaultPrices(),
      setTimberPrice: (category, value) =>
        set((s) => ({ prices: { ...s.prices, timberPerM3: { ...s.prices.timberPerM3, [category]: value } } })),
      setCladdingBoardPrice: (value) => set((s) => ({ prices: { ...s.prices, claddingBoardPerM2: value } })),
      setRoofDeckPrice: (value) => set((s) => ({ prices: { ...s.prices, roofDeckPerM2: value } })),
      setRoofingPrice: (covering, value) =>
        set((s) => ({ prices: { ...s.prices, roofingPerM2: { ...s.prices.roofingPerM2, [covering]: value } } })),
      setHardwarePrice: (id, value) =>
        set((s) => ({ prices: { ...s.prices, hardwarePerUnit: { ...s.prices.hardwarePerUnit, [id]: value } } })),
      resetPrices: () => set({ prices: createDefaultPrices() }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => ({ ...current, prices: normalizePrices((persisted as Partial<PriceStore> | undefined)?.prices) }),
    },
  ),
);
