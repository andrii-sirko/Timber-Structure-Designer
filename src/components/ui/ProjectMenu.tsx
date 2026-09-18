import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FolderOpen, Save, Upload, Download, FileText, LayoutTemplate, Trash2, RotateCcw } from 'lucide-react';
import type { DerivedModel } from '@/types';
import { PROJECT_TEMPLATES, useProjectStore } from '@/store';
import { exportCutListCsv, exportCutListPdf, exportProjectJson, readProjectFile } from '@/utils/export';
import { useT } from '@/i18n';
import { Button, cx } from './primitives';

export function ProjectMenu({ model }: { model: DerivedModel }) {
  const { t } = useT();
  const project = useProjectStore((s) => s.project);
  const savedProjects = useProjectStore((s) => s.savedProjects);
  const saveProjectAs = useProjectStore((s) => s.saveProjectAs);
  const loadSavedProject = useProjectStore((s) => s.loadSavedProject);
  const deleteSavedProject = useProjectStore((s) => s.deleteSavedProject);
  const loadTemplate = useProjectStore((s) => s.loadTemplate);
  const importProject = useProjectStore((s) => s.importProject);
  const resetProject = useProjectStore((s) => s.resetProject);
  const [open, setOpen] = useState<null | 'templates' | 'saved'>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent): void => {
      const t = e.target as Node;
      if (wrapper.current?.contains(t) || popoverRef.current?.contains(t)) return;
      setOpen(null);
    };
    const close = (): void => setOpen(null);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', close);
    // The header scrolls horizontally on narrow screens; a fixed popover would detach from its button
    const header = wrapper.current?.closest('header');
    header?.addEventListener('scroll', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', close);
      header?.removeEventListener('scroll', close);
    };
  }, [open]);

  // The header clips overflow (overflow-x-auto), so popovers are portalled and positioned against the viewport
  useLayoutEffect(() => {
    if (!open || !wrapper.current) return;
    const r = wrapper.current.getBoundingClientRect();
    setAnchor({ top: r.bottom + 4, right: Math.max(8, window.innerWidth - r.right) });
  }, [open]);

  const onImport = async (file: File): Promise<void> => {
    try {
      importProject(await readProjectFile(file));
      setError(null);
    } catch (e) {
      setError(t('Import failed: {message}', { message: e instanceof Error ? e.message : t('invalid file') }));
    }
  };

  const savePreset = (): void => {
    const name = window.prompt(t('Save current project as preset:'), project.name);
    if (name && name.trim()) saveProjectAs(name.trim());
  };

  const popover = 'fixed z-50 w-80 max-w-[calc(100vw-1rem)] rounded-lg border border-slate-700 bg-slate-950 p-2 shadow-2xl';
  const popoverStyle = anchor ? { top: anchor.top, right: anchor.right } : undefined;

  return (
    <div ref={wrapper} className="relative flex items-center gap-1.5">
      <Button size="sm" icon={LayoutTemplate} onClick={() => setOpen(open === 'templates' ? null : 'templates')} aria-expanded={open === 'templates'}>
        {t('Templates')}
      </Button>
      <Button size="sm" icon={Save} onClick={savePreset} title={t('Save the current configuration as a named preset (stored in this browser)')}>
        {t('Save preset')}
      </Button>
      <Button size="sm" icon={FolderOpen} onClick={() => setOpen(open === 'saved' ? null : 'saved')} aria-expanded={open === 'saved'}>
        {t('Saved ({n})', { n: savedProjects.length })}
      </Button>
      <span className="mx-1 h-5 w-px bg-slate-800" />
      <Button size="sm" icon={Download} onClick={() => exportProjectJson(project)} title={t('Export configuration as JSON')}>
        JSON
      </Button>
      <Button size="sm" icon={Upload} onClick={() => fileInput.current?.click()} title={t('Import a JSON configuration')}>
        {t('Import')}
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onImport(f);
          e.target.value = '';
        }}
      />
      <Button size="sm" icon={FileText} onClick={() => exportCutListCsv(project, model.cutList)} title={t('Export cutting list as CSV')}>
        CSV
      </Button>
      <Button size="sm" icon={FileText} onClick={() => void exportCutListPdf(project, model.cutList, model.bom, model.statics, model.connections)} title={t('Export cutting list, BOM & statics as PDF')}>
        PDF
      </Button>
      <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => window.confirm(t('Reset to the default carport? Unsaved changes are lost.')) && resetProject()} title={t('Reset project')}>
        {t('Reset')}
      </Button>
      {error && <span className="text-[11px] text-rose-300">{error}</span>}

      {open === 'templates' && anchor && createPortal(
        <div ref={popoverRef} className={popover} style={popoverStyle}>
          <div className="px-2 pb-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">{t('Start from a template')}</div>
          {PROJECT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-slate-800"
              onClick={() => {
                loadTemplate(tpl.id);
                setOpen(null);
              }}
            >
              <div className="text-sm text-slate-100">{t(tpl.name)}</div>
              <div className="text-[11px] text-slate-500">{t(tpl.description)}</div>
            </button>
          ))}
        </div>,
        document.body,
      )}

      {open === 'saved' && anchor && createPortal(
        <div ref={popoverRef} className={cx(popover, 'max-h-96 overflow-auto')} style={popoverStyle}>
          <div className="px-2 pb-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">{t('Saved presets (this browser)')}</div>
          {savedProjects.length === 0 && <p className="px-2 py-2 text-xs text-slate-500">{t('Nothing saved yet. Use “Save preset”.')}</p>}
          {savedProjects.map((p) => (
            <div key={p.id} className="flex items-center gap-1 rounded-md px-1 py-1 hover:bg-slate-800">
              <button
                type="button"
                className="min-w-0 flex-1 px-1 text-left"
                onClick={() => {
                  loadSavedProject(p.id);
                  setOpen(null);
                }}
              >
                <div className="truncate text-sm text-slate-100">{p.name}</div>
                <div className="text-[11px] text-slate-500">
                  {new Date(p.savedAt).toLocaleString()} · {p.project.params.length}×{p.project.params.width} mm
                </div>
              </button>
              <button type="button" title={t('Delete preset')} className="rounded p-1 text-rose-300 hover:bg-rose-950/60" onClick={() => deleteSavedProject(p.id)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
