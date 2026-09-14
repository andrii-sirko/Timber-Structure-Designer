import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  hint?: string;
  compact?: boolean;
  disabled?: boolean;
  /**
   * Slider travel when the value itself is not (fully) bounded. The typed value is still only
   * clamped to `min` / `max`; the slider range just widens to include the current value.
   */
  range?: [number, number];
}

const decimalsOf = (step: number): number => {
  const s = String(step);
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
};

/** Slider window used for a bound the field does not define: ±`SLIDER_SPAN_STEPS` steps around the value. */
const SLIDER_SPAN_STEPS = 40;

/**
 * Numeric parameter: a full-width slider for touch/tablet use plus an editable readout.
 * The slider commits on every move (the store folds the burst into one undo step), the readout
 * commits on blur / Enter / arrow keys so intermediate typing never triggers a rebuild.
 */
export function NumberField({ label, value, onChange, min, max, step = 10, unit = 'mm', hint, compact, disabled, range }: NumberFieldProps) {
  const id = useId();
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  // Slider bounds: explicit range > field limits > a window around the value. The window is frozen while
  // the thumb is held so the track does not slide under the finger; it re-centres once released.
  const span = step * SLIDER_SPAN_STEPS;
  const windowRef = useRef<[number, number] | null>(null);
  const [sliding, setSliding] = useState(false);
  const decimals = decimalsOf(step);
  const round = (n: number): number => Number(n.toFixed(decimals));
  const computeWindow = (): [number, number] => {
    let lo = range?.[0] ?? min ?? round(value - span);
    let hi = range?.[1] ?? max ?? round(value + span);
    if (value < lo) lo = round(value - span);
    if (value > hi) hi = round(value + span);
    return [lo, hi];
  };
  if (!sliding || windowRef.current === null) windowRef.current = computeWindow();
  const [lo, hi] = windowRef.current;
  const fill = hi > lo ? Math.min(100, Math.max(0, ((value - lo) / (hi - lo)) * 100)) : 0;

  const commit = (n: number): void => {
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    v = round(v);
    if (v !== value) onChange(v);
    setText(String(v));
  };
  const commitText = (raw: string): void => {
    const n = Number(raw.replace(',', '.'));
    if (!Number.isFinite(n)) {
      setText(String(value));
      return;
    }
    commit(n);
  };

  return (
    <div className={cx('block', compact ? 'space-y-0.5' : 'space-y-1', disabled && 'opacity-50')}>
      <label htmlFor={id} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
        <span className="min-w-0 text-[11px] leading-tight font-medium tracking-wide text-slate-400 uppercase">{label}</span>
        <span className="ml-auto flex shrink-0 items-center overflow-hidden rounded-md border border-slate-700 bg-slate-900 focus-within:border-sky-500">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            disabled={disabled}
            className="w-16 min-w-0 bg-transparent px-1.5 py-0.5 text-right font-mono text-sm text-slate-100 outline-none pointer-coarse:w-20 pointer-coarse:py-1.5 pointer-coarse:text-base"
            value={text}
            min={min}
            max={max}
            step={step}
            onChange={(e) => setText(e.target.value)}
            onFocus={(e) => {
              setFocused(true);
              e.target.select();
            }}
            onBlur={(e) => {
              setFocused(false);
              commitText(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitText((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).blur();
              } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const dir = e.key === 'ArrowUp' ? 1 : -1;
                const mult = e.shiftKey ? 10 : 1;
                commitText(String(Number(text) + dir * step * mult));
              }
            }}
          />
          {unit && <span className="shrink-0 border-l border-slate-800 px-1.5 text-[11px] text-slate-500">{unit}</span>}
        </span>
      </label>
      <input
        type="range"
        aria-label={`${label} slider`}
        disabled={disabled}
        className="slider"
        style={{ '--fill': `${fill}%` } as React.CSSProperties}
        min={lo}
        max={hi}
        step={step}
        value={Math.min(hi, Math.max(lo, value))}
        onPointerDown={() => setSliding(true)}
        onPointerUp={() => setSliding(false)}
        onPointerCancel={() => setSliding(false)}
        onBlur={() => setSliding(false)}
        onChange={(e) => commit(Number(e.target.value))}
      />
      {hint && <p className="text-[10px] leading-tight text-slate-500">{hint}</p>}
    </div>
  );
}

interface SectionProps {
  title: string;
  icon?: LucideIcon;
  defaultOpen?: boolean;
  badge?: ReactNode;
  children: ReactNode;
}

export function Section({ title, icon: Icon, defaultOpen = true, badge, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-slate-800">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-slate-200 uppercase hover:bg-slate-900/60 pointer-coarse:py-3.5"
      >
        {Icon && <Icon className="h-3.5 w-3.5 text-timber-400" />}
        <span className="flex-1">{title}</span>
        {badge}
        <ChevronDown className={cx('h-3.5 w-3.5 text-slate-500 transition-transform', open ? '' : '-rotate-90')} />
      </button>
      {open && <div className="space-y-3 px-3 pt-1 pb-4">{children}</div>}
    </section>
  );
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

export function Toggle({ label, checked, onChange, description }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-1 text-left hover:bg-slate-900/60 pointer-coarse:py-2"
    >
      <span>
        <span className="block text-sm text-slate-200">{label}</span>
        {description && <span className="block text-[11px] text-slate-500">{description}</span>}
      </span>
      <span className={cx('relative h-5 w-9 shrink-0 rounded-full transition-colors pointer-coarse:h-7 pointer-coarse:w-12', checked ? 'bg-sky-500' : 'bg-slate-700')}>
        <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform pointer-coarse:h-6 pointer-coarse:w-6', checked ? 'translate-x-4 pointer-coarse:translate-x-5.5' : 'translate-x-0.5')} />
      </span>
    </button>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}

export function SelectField<T extends string>({ label, value, onChange, options }: SelectFieldProps<T>) {
  const id = useId();
  return (
    <label htmlFor={id} className="block space-y-1">
      <span className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500 pointer-coarse:py-2.5 pointer-coarse:text-base"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'subtle';
  icon?: LucideIcon;
  size?: 'sm' | 'md';
}

export function Button({ variant = 'subtle', icon: Icon, size = 'md', className, children, ...rest }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40';
  const sizes = size === 'sm' ? 'px-2 py-1 text-xs pointer-coarse:py-2' : 'px-3 py-1.5 text-sm pointer-coarse:py-2.5';
  const variants = {
    primary: 'bg-sky-500 text-white hover:bg-sky-400',
    ghost: 'text-slate-300 hover:bg-slate-800',
    danger: 'text-rose-300 hover:bg-rose-950/60',
    subtle: 'border border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500 hover:bg-slate-800',
  }[variant];
  return (
    <button type="button" className={cx(base, sizes, variants, className)} {...rest}>
      {Icon && <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
      {children}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  active,
  title,
  onClick,
  className,
  disabled,
}: {
  icon: LucideIcon;
  active?: boolean;
  title: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40 pointer-coarse:h-11 pointer-coarse:w-11',
        active ? 'border-sky-500 bg-sky-500/20 text-sky-200' : 'border-slate-700 bg-slate-900/90 text-slate-300 hover:border-slate-500 hover:text-white',
        className,
      )}
    >
      <Icon className="h-4 w-4 pointer-coarse:h-5 pointer-coarse:w-5" />
    </button>
  );
}

export function StatusDot({ status, className }: { status: 'ok' | 'warning' | 'fail'; className?: string }) {
  const color = { ok: 'bg-emerald-400', warning: 'bg-amber-400', fail: 'bg-rose-500' }[status];
  return <span className={cx('inline-block h-2.5 w-2.5 rounded-full', color, className)} />;
}

export const STATUS_LABEL = { ok: 'Sufficient', warning: 'Near limit', fail: 'Overloaded' } as const;
export const STATUS_TEXT = { ok: 'text-emerald-300', warning: 'text-amber-300', fail: 'text-rose-300' } as const;
export const STATUS_BG = { ok: 'bg-emerald-500/15 border-emerald-500/40', warning: 'bg-amber-500/15 border-amber-500/40', fail: 'bg-rose-500/15 border-rose-500/40' } as const;
