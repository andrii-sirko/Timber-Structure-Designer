import type { StoreApi } from 'zustand';
import type { Measurement, ProjectState, WallKey } from '@/types';
import { t } from '@/i18n';

/** Slice of the store that undo/redo captures and restores. */
export interface HistoryTracked {
  project: ProjectState;
  measurements: Measurement[];
  selectedWallId: WallKey | null;
  selectedOpeningId: string | null;
  selectedVehicleId: string | null;
  selectedMemberId: string | null;
  isDragging: boolean;
}

type Snapshot = Omit<HistoryTracked, 'isDragging'>;

export interface HistoryEntry {
  /** Human label of the action that produced the change ("Add window") */
  label: string;
  /** Epoch ms of the last write folded into this entry */
  at: number;
  /** Coalescing bucket, e.g. `vehicle:<id>`; null = never merge */
  key: string | null;
  /** State as it was *before* the action ran */
  snapshot: Snapshot;
}

export interface HistorySlice {
  past: HistoryEntry[];
  future: HistoryEntry[];
  undo: () => void;
  redo: () => void;
  /** Rewind `steps` actions in one click (history dropdown) */
  undoTimes: (steps: number) => void;
  /** Re-apply `steps` undone actions in one click */
  redoTimes: (steps: number) => void;
  clearHistory: () => void;
}

/** Consecutive writes in the same bucket within this window fold into one undo step. */
const COALESCE_MS = 700;
const LIMIT = 100;

const humanize = (s: string): string => s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();

/** Friendly English names for parameter/timber/load keys, translated via `t()` before interpolation. */
const FIELD_NAMES: Record<string, string> = {
  length: 'Length',
  width: 'Width',
  frontHeight: 'Front height',
  rearHeight: 'Rear height',
  maxPostSpacing: 'Max post spacing',
  postsPerRow: 'Posts per row',
  maxRafterSpacing: 'Max rafter spacing',
  maxRafterLength: 'Max rafter length',
  maxStudSpacing: 'Max stud spacing',
  maxStockLength: 'Max stock length',
  braces: 'Knee braces',
  braceLeg: 'Brace leg',
  braceDirection: 'Brace direction',
  connectionMode: 'Connection mode',
};
const TIMBER_NAMES: Record<string, string> = { post: 'Post', beam: 'Purlin', rafter: 'Rafter', stud: 'Stud', brace: 'Knee brace' };
const LOAD_NAMES: Record<string, string> = { snowLoad: 'Snow load', roofCovering: 'Roof covering', serviceClass: 'Service class', windLoad: 'Wind load' };
const SIDE_NAMES: Record<string, string> = { front: 'Front', rear: 'Rear', left: 'Left', right: 'Right' };
const OPENING_NAMES: Record<string, string> = { door: 'Door', window: 'Window', passage: 'Passage' };

/** Translate a field/side/type name, falling back to a humanized English version when it isn't in the map. */
const fieldName = (map: Record<string, string>, key: string): string => t(map[key] ?? humanize(key));

/** Label shown as "Undo <label>" — receives the action's own arguments. Already localized via `t()`. */
const LABELS: Record<string, (...args: never[]) => string> = {
  setProjectName: () => t('Rename project'),
  setParam: (key: string) =>
    key === 'roofDirection' ? t('Change roof direction') : key === 'roofScheme' ? t('Change roof framing scheme') : t('Change {field}', { field: fieldName(FIELD_NAMES, key) }),
  setParams: () => t('Apply statics auto-fix'),
  setOverhang: (side: string) => t('Change {field} overhang', { field: fieldName(SIDE_NAMES, side) }),
  setTimber: (key: string) => t('Change {field} section', { field: fieldName(TIMBER_NAMES, key) }),
  setStrengthClass: () => t('Change strength class'),
  setLoad: (key: string) => t('Change {field}', { field: fieldName(LOAD_NAMES, key) }),
  setWallClosed: (id: string, closed: boolean) => (closed ? t('Close {field} wall', { field: fieldName(SIDE_NAMES, id) }) : t('Open {field} wall', { field: fieldName(SIDE_NAMES, id) })),
  addOpening: (_wall: string, type: string) => t('Add {field}', { field: fieldName(OPENING_NAMES, type) }),
  updateOpening: () => t('Edit opening'),
  removeOpening: () => t('Delete opening'),
  addPartition: () => t('Add partition'),
  updatePartition: () => t('Edit partition'),
  removePartition: () => t('Delete partition'),
  addVehicle: () => t('Add object'),
  updateVehicle: () => t('Move vehicle'),
  removeVehicle: () => t('Remove vehicle'),
  nudgeVehicle: () => t('Move vehicle'),
  rotateVehicle: () => t('Rotate vehicle'),
  movePost: () => t('Move post'),
  moveMidPurlin: (_index: number, position: number | null) => (position === null ? t('Reset mid purlin position') : t('Move mid purlin')),
  removePost: () => t('Remove post'),
  addFreePost: () => t('Add post'),
  updateFreePost: () => t('Move post'),
  removeFreePost: () => t('Remove post'),
  addPavedArea: () => t('Add paved floor'),
  updatePavedArea: () => t('Edit paved floor'),
  removePavedArea: () => t('Remove paved floor'),
  movePavedPoint: () => t('Move floor corner'),
  insertPavedPoint: () => t('Add floor corner'),
  removePavedPoint: () => t('Remove floor corner'),
  translatePavedArea: () => t('Move paved floor'),
  resizePavedArea: () => t('Resize paved floor'),
  addMeasurement: () => t('Add measurement'),
  removeMeasurement: () => t('Remove measurement'),
  clearMeasurements: () => t('Clear measurements'),
  saveProjectAs: () => t('Save project'),
  loadSavedProject: () => t('Load saved project'),
  loadTemplate: () => t('Load template'),
  importProject: () => t('Import project'),
  resetProject: () => t('Reset project'),
};

/** Actions whose rapid repeats (drag, typing, arrow-key nudge) belong in a single undo step. */
const COALESCE: Record<string, (...args: never[]) => string> = {
  setProjectName: () => 'name',
  setParam: (key: string) => `param:${key}`,
  setOverhang: (side: string) => `overhang:${side}`,
  setLoad: (key: string) => `load:${key}`,
  updateOpening: (_wall: string, id: string) => `opening:${id}`,
  updatePartition: (id: string) => `partition:${id}`,
  setWallExtent: (id: string) => `wallExtent:${id}`,
  updateVehicle: (id: string) => `vehicle:${id}`,
  nudgeVehicle: (id: string) => `vehicle:${id}`,
  rotateVehicle: (id: string) => `vehicle:rot:${id}`,
  movePost: (id: string) => `post:${id}`,
  updateFreePost: (id: string) => `freePost:${id}`,
  moveMidPurlin: (index: number) => `midPurlin:${index}`,
  updatePavedArea: (id: string) => `paving:${id}`,
  movePavedPoint: (id: string, index: number) => `paving:${id}:${index}`,
  translatePavedArea: (id: string) => `paving:move:${id}`,
  resizePavedArea: (id: string) => `paving:size:${id}`,
};

function snapshotOf(s: HistoryTracked): Snapshot {
  return {
    project: s.project,
    measurements: s.measurements,
    selectedWallId: s.selectedWallId,
    selectedOpeningId: s.selectedOpeningId,
    selectedVehicleId: s.selectedVehicleId,
    selectedMemberId: s.selectedMemberId,
  };
}

function describe(name: string | undefined, args: unknown[]): string {
  const fn = name ? LABELS[name] : undefined;
  if (!fn) return name ? humanize(name) : t('Edit');
  return (fn as (...a: unknown[]) => string)(...args);
}

function bucket(name: string | undefined, args: unknown[]): string | null {
  const fn = name ? COALESCE[name] : undefined;
  return fn ? (fn as (...a: unknown[]) => string)(...args) : null;
}

type Creator<T> = (set: StoreApi<T>['setState'], get: StoreApi<T>['getState'], api: StoreApi<T>) => T;

/**
 * Wraps a store creator so that every action which touches the project (or measurements)
 * pushes a labelled snapshot onto an undo stack. Selection is captured with each snapshot so
 * undoing an edit also puts the user back on the wall/opening/vehicle it happened on, but a
 * selection change on its own is not an undo step. View settings are deliberately not tracked.
 */
export function withHistory<T extends HistoryTracked>(creator: Creator<T>): Creator<T & HistorySlice> {
  return (set, get, api) => {
    let active: { name: string; args: unknown[] } | null = null;
    let lastKey: string | null = null;

    const record = (before: HistoryTracked): void => {
      const label = describe(active?.name, active?.args ?? []);
      const key = bucket(active?.name, active?.args ?? []);
      const now = Date.now();
      const { past, isDragging } = get();
      const last = past[past.length - 1];
      // fold a drag / key-repeat / typing burst into the entry it started
      if (last && key !== null && key === lastKey && (isDragging || now - last.at < COALESCE_MS)) {
        set({ past: [...past.slice(0, -1), { ...last, label, at: now }], future: [] } as Partial<T & HistorySlice>);
        return;
      }
      lastKey = key;
      const entry: HistoryEntry = { label, at: now, key, snapshot: snapshotOf(before) };
      set({ past: [...past, entry].slice(-LIMIT), future: [] } as Partial<T & HistorySlice>);
    };

    const trackedSet: StoreApi<T>['setState'] = (partial, replace) => {
      const before = get();
      (set as StoreApi<T>['setState'])(partial, replace as never);
      const after = get();
      if (before.project === after.project && before.measurements === after.measurements) {
        // a finished drag seals its entry so the next one starts fresh
        if (before.isDragging && !after.isDragging) lastKey = null;
        return;
      }
      record(before);
    };

    const state = creator(trackedSet, get as unknown as StoreApi<T>['getState'], api as unknown as StoreApi<T>);

    // Every action records under its own name, so entries get a readable label.
    const labelled: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(state)) {
      if (typeof value !== 'function') continue;
      labelled[name] = (...args: unknown[]) => {
        const prev = active;
        active = { name, args };
        try {
          return (value as (...a: unknown[]) => unknown)(...args);
        } finally {
          active = prev;
        }
      };
    }

    const history: HistorySlice = {
      past: [],
      future: [],
      undo: () => {
        const { past, future } = get();
        const entry = past[past.length - 1];
        if (!entry) return;
        const current = snapshotOf(get());
        lastKey = null;
        set({
          ...entry.snapshot,
          past: past.slice(0, -1),
          future: [...future, { ...entry, snapshot: current, at: Date.now() }],
        } as Partial<T & HistorySlice>);
      },
      redo: () => {
        const { past, future } = get();
        const entry = future[future.length - 1];
        if (!entry) return;
        const current = snapshotOf(get());
        lastKey = null;
        set({
          ...entry.snapshot,
          future: future.slice(0, -1),
          past: [...past, { ...entry, snapshot: current, at: Date.now() }],
        } as Partial<T & HistorySlice>);
      },
      undoTimes: (steps) => {
        for (let i = 0; i < steps; i += 1) get().undo();
      },
      redoTimes: (steps) => {
        for (let i = 0; i < steps; i += 1) get().redo();
      },
      clearHistory: () => {
        lastKey = null;
        set({ past: [], future: [] } as Partial<T & HistorySlice>);
      },
    };

    return { ...state, ...(labelled as Partial<T>), ...history } as T & HistorySlice;
  };
}
