import { Languages } from 'lucide-react';
import { LANGS, setLang, useT, type Lang } from '@/i18n';

/** Header dropdown switching the UI language (English / Ukrainian / German). */
export function LanguageSelect() {
  const { t, lang } = useT();
  return (
    <label className="flex items-center gap-1 rounded-md px-1.5 text-slate-400 hover:bg-slate-800 hover:text-white" title={t('Language')}>
      <Languages className="h-4 w-4" />
      <select
        className="cursor-pointer bg-transparent py-1 text-xs font-semibold text-slate-200 outline-none pointer-coarse:text-sm"
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
