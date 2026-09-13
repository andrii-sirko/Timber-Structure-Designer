import { useEffect, useId, useState, type ReactNode } from 'react';
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
}

/** Numeric input that commits on blur / Enter / arrow keys, so intermediate typing never triggers a rebuild. */
export function NumberField({ label, value, onChange, min, max, step = 10, unit = 'mm', hint, compact, disabled }: NumberFieldProps) {
  const id = useId();
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  const commit = (raw: string): void => {
    const n = Number(raw.replace(',', '.'));
    if (!Number.isFinite(n)) {
      setText(String(value));
      return;
    }
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    if (v !== value) onChange(v);
    setText(String(v));
  };

  return (
    <label htmlFor={id} className={cx('block', compact ? 'space-y-0.5' : 'space-y-1')}>
      <span className="flex items-baseline justify-between text-[11px] font-medium tracking-wide text-slate-400 uppercase">
        <span>{label}</span>
        {hint && <span className="text-[10px] font-normal normal-case text-slate-500">{hint}</span>}
      </span>
      <span className="flex items-center overflow-hidden rounded-md border border-slate-700 bg-slate-900 focus-within:border-sky-500">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          disabled={disabled}
          className="w-full min-w-0 bg-transparent px-2 py-1.5 font-mono text-sm text-slate-100 outline-none disabled:opacity-50"
          value={text}
          min={min}
          max={max}
          step={step}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            commit(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commit((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              const dir = e.key === 'ArrowUp' ? 1 : -1;
              const mult = e.shiftKey ? 10 : 1;
              commit(String(Number(text) + dir * step * mult));
            }
          }}
        />
        {unit && <span className="shrink-0 border-l border-slate-800 px-2 text-[11px] text-slate-500">{unit}</span>}
      </span>
    </label>
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
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-slate-200 uppercase hover:bg-slate-900/60"
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
      className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-1 text-left hover:bg-slate-900/60"
    >
      <span>
        <span className="block text-sm text-slate-200">{label}</span>
        {description && <span className="block text-[11px] text-slate-500">{description}</span>}
      </span>
      <span className={cx('relative h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-sky-500' : 'bg-slate-700')}>
        <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5')} />
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
        className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500"
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
  const sizes = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';
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
        'flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40',
        active ? 'border-sky-500 bg-sky-500/20 text-sky-200' : 'border-slate-700 bg-slate-900/90 text-slate-300 hover:border-slate-500 hover:text-white',
        className,
      )}
    >
      <Icon className="h-4 w-4" />
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
