import { Armchair, Bike, Car, CarFront, Caravan, CookingPot, Cylinder, Flame, Hammer, LayoutGrid, Logs, Package, Recycle, Scissors, Shovel, Table2, Tractor, Trash2, Truck, type LucideIcon, type LucideProps } from 'lucide-react';
import type { VehicleBodyStyle } from '@/types';

/** Leaning ladder – lucide has no ladder glyph. */
function Ladder({ size = 24, strokeWidth = 2, className }: LucideProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M8 3v18M16 3v18M8 7h8M8 12h8M8 17h8" />
    </svg>
  );
}

const ICONS: Record<VehicleBodyStyle, LucideIcon | typeof Ladder> = {
  city: CarFront,
  compact: Car,
  sedan: Car,
  estate: Car,
  suv: Car,
  van: Caravan,
  pickup: Truck,
  camper: Caravan,
  motorcycle: Bike,
  bicycle: Bike,
  bin: Trash2,
  container: Recycle,
  mower: Scissors,
  ridingMower: Tractor,
  wheelbarrow: Shovel,
  shelf: LayoutGrid,
  table: Table2,
  workbench: Hammer,
  bench: Armchair,
  firewood: Logs,
  box: Package,
  barrel: Cylinder,
  ladder: Ladder,
  gasGrill: Flame,
  kettleGrill: CookingPot,
};

export function ObjectIcon({ style, className }: { style: VehicleBodyStyle; className?: string }) {
  const Icon = ICONS[style];
  return <Icon className={className} />;
}
