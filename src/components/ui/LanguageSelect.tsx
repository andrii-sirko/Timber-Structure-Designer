import { Languages } from 'lucide-react';
import { LANGS, setLang, useT, type Lang } from '@/i18n';

/** Header dropdown switching the UI language (English / Ukrainian / German / Polish). */
export function LanguageSelect() {
  const { t, lang } = useT();
  return (
    <label className="relative flex items-center gap-1 rounded-md px-1.5 py-1 text-slate-400 focus-within:ring-1 focus-within:ring-sky-500 hover:bg-slate-800 hover:text-white" title={t('Language')}>
      <Languages className="h-4 w-4" />
      {/* Only the short code shows in the header; the invisible native select on top keeps the full names in its list */}
      <span className="text-xs font-semibold text-slate-200 pointer-coarse:text-sm">{LANGS.find((l) => l.id === lang)?.short}</span>
      <select
        className="absolute inset-0 cursor-pointer opacity-0"
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        aria-label={t('Language')}
      >
        {LANGS.map((l) => (
          <option key={l.id} value={l.id} className="bg-slate-900">
            {l.short} – {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}
