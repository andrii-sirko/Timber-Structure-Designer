import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { VehicleModel } from '@/types';
import { OBJECT_CATEGORIES, VEHICLE_CATALOG } from '@/engine/vehicles';
import { ObjectIcon } from './objectIcons';
import { Button, cx } from './primitives';

const dims = (m: VehicleModel): string => `${m.length} × ${m.width} × ${m.height} mm${m.mirrorWidth !== m.width ? ` · ${m.mirrorWidth} mm incl. mirrors` : ''}${m.customSize ? ' · free size' : ''}`;

/** "Add object" button that opens a grid of catalogue tiles grouped by purpose; a tile places the object at once. */
export function ObjectPicker({ onPick }: { onPick: (modelId: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div ref={ref} className="space-y-2">
      <Button variant={open ? 'subtle' : 'primary'} icon={open ? X : Plus} onClick={() => setOpen((o) => !o)} className="w-full" title="Choose an object from the catalogue">
        {open ? 'Close catalogue' : 'Add object…'}
      </Button>
      {open && (
        <div className="max-h-[50vh] space-y-3 overflow-y-auto rounded-md border border-slate-700 bg-slate-950/95 p-2 shadow-xl">
          {OBJECT_CATEGORIES.map((c) => {
            const items = VEHICLE_CATALOG.filter((m) => m.category === c.id);
            if (items.length === 0) return null;
            return (
              <div key={c.id}>
                <h4 className="mb-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">{c.label}</h4>
                <div className="grid grid-cols-3 gap-1">
                  {items.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      title={`${m.name}\n${dims(m)}`}
                      onClick={() => {
                        onPick(m.id);
                        setOpen(false);
                      }}
                      className={cx(
                        'flex flex-col items-center gap-1 rounded-md border border-slate-800 bg-slate-900/70 px-1 py-2 text-center',
                        'hover:border-sky-500/60 hover:bg-sky-950/40 focus-visible:border-sky-500 focus-visible:outline-none pointer-coarse:py-3',
                      )}
                    >
                      <ObjectIcon style={m.style} className="h-5 w-5 text-sky-300" />
                      <span className="line-clamp-2 text-[10px] leading-tight text-slate-200">{m.name.split(' – ')[0].replace(/ \(free size\)$/, '')}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
