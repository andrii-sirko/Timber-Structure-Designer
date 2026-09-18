import { useCallback } from 'react';
import { useStore } from 'zustand';
import { langStore, t, tx, type Lang, type Params } from './core';

export { LANGS, getLang, setLang, t, tx, type Lang } from './core';

/** Subscribes the component to the UI language and returns bound translators. */
export function useT() {
  const lang = useStore(langStore, (s) => s.lang);
  const bt = useCallback((key: string, params?: Params) => t(key, params, lang), [lang]);
  const btx = useCallback((text: string) => tx(text, lang), [lang]);
  return { t: bt, tx: btx, lang };
}

export function useLang(): Lang {
  return useStore(langStore, (s) => s.lang);
}
