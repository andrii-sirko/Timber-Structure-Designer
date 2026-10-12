import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FolderOpen, Save, Upload, Download, FileText, LayoutTemplate, Trash2, RotateCcw, Hammer, Menu } from 'lucide-react';
import type { DerivedModel } from '@/types';
import { PROJECT_TEMPLATES, useProjectStore } from '@/store';
import { exportCutListCsv, exportCutListPdf, exportProjectJson, readProjectFile } from '@/utils/export';
import { exportAssemblyPdf } from '@/utils/assemblyPdf';
import { useT } from '@/i18n';
import { Button, cx } from './primitives';

export function ProjectMenu({ model }: { model: DerivedModel }) {
  const { t, lang } = useT();
  const project = useProjectStore((s) => s.project);
  const savedProjects = useProjectStore((s) => s.savedProjects);
  const saveProjectAs = useProjectStore((s) => s.saveProjectAs);
  const loadSavedProject = useProjectStore((s) => s.loadSavedProject);
  const deleteSavedProject = useProjectStore((s) => s.deleteSavedProject);
  const loadTemplate = useProjectStore((s) => s.loadTemplate);
  const importProject = useProjectStore((s) => s.importProject);
  const resetProject = useProjectStore((s) => s.resetProject);
  const [open, setOpen] = useState<null | 'templates' | 'saved' | 'menu'>(null);
  const [error, setError] = useState<string | null>(null);
  const [guideBusy, setGuideBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  // Collapses step by step while the header would overflow: 0 = labelled buttons, 1 = icons only, 2 = one menu button
  const [level, setLevel] = useState(0);
  const compact = level >= 1;
  const collapsed = level >= 2;
  // Header content width measured at each level before stepping down, to know when the next level up fits again
  const widths = useRef<number[]>([]);

  useLayoutEffect(() => setLevel(0), [lang, savedProjects.length]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-measures after every render; the level cap stops the loop
  useLayoutEffect(() => {
    const header = wrapper.current?.closest('header');
    if (!header || level >= 2 || header.scrollWidth <= header.clientWidth + 1) return;
    widths.current[level] = header.scrollWidth;
    setLevel(level + 1);
  });

  useEffect(() => {
    const header = wrapper.current?.closest('header');
    if (!header) return;
    const ro = new ResizeObserver(() => {
      if (level < 2 && header.scrollWidth > header.clientWidth + 1) {
        widths.current[level] = header.scrollWidth;
        setLevel(level + 1);
      } else if (level > 0 && header.clientWidth >= widths.current[level - 1]) setLevel(level - 1);
    });
    ro.observe(header);
    return () => ro.disconnect();
  }, [level]);

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
    // On very narrow screens the header still scrolls; a fixed popover would detach from its button
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

  const label = (text: string) => (compact ? <span className="sr-only">{text}</span> : text);

  const popover = 'fixed z-50 w-80 max-w-[calc(100vw-1rem)] rounded-lg border border-slate-700 bg-slate-950 p-2 shadow-2xl';
  const popoverStyle = anchor ? { top: anchor.top, right: anchor.right } : undefined;
  const menuRow = 'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-100 hover:bg-slate-800 disabled:opacity-40 pointer-coarse:py-2.5';

  const exportGuide = (): void => {
    setGuideBusy(true);
    void exportAssemblyPdf(project, model).finally(() => setGuideBusy(false));
  };
  const confirmReset = (): void => {
    if (window.confirm(t('Reset to the default carport? Unsaved changes are lost.'))) resetProject();
  };
  // Runs a menu action and closes the menu first, so native dialogs (prompt / confirm / file picker) open over a clean header
  const fromMenu = (action: () => void) => () => {
    setOpen(null);
    action();
  };

  return (
    <div ref={wrapper} className="relative flex items-center gap-1.5">
      {collapsed ? (
        <Button size="sm" icon={Menu} onClick={() => setOpen(open === 'menu' ? null : 'menu')} aria-expanded={open === 'menu'} title={t('Project')} aria-label={t('Project')} />
      ) : (
        <>
      <Button size="sm" icon={LayoutTemplate} onClick={() => setOpen(open === 'templates' ? null : 'templates')} aria-expanded={open === 'templates'} title={compact ? t('Templates') : undefined}>
        {label(t('Templates'))}
      </Button>
      <Button size="sm" icon={Save} onClick={savePreset} title={t('Save the current configuration as a named preset (stored in this browser)')}>
        {label(t('Save preset'))}
      </Button>
      <Button size="sm" icon={FolderOpen} onClick={() => setOpen(open === 'saved' ? null : 'saved')} aria-expanded={open === 'saved'} title={compact ? t('Saved ({n})', { n: savedProjects.length }) : undefined}>
        {compact ? savedProjects.length : t('Saved ({n})', { n: savedProjects.length })}
      </Button>
      <span className="mx-1 h-5 w-px bg-slate-800" />
      <Button size="sm" icon={Download} onClick={() => exportProjectJson(project)} title={t('Export configuration as JSON')}>
        JSON
      </Button>
      <Button size="sm" icon={Upload} onClick={() => fileInput.current?.click()} title={t('Import a JSON configuration')}>
        {label(t('Import'))}
      </Button>
      <Button size="sm" icon={FileText} onClick={() => exportCutListCsv(project, model.cutList)} title={t('Export cutting list as CSV')}>
        CSV
      </Button>
      <Button size="sm" icon={FileText} onClick={() => void exportCutListPdf(project, model)} title={t('Export cutting list, BOM & statics as PDF')}>
        PDF
      </Button>
      <Button
        size="sm"
        icon={Hammer}
        disabled={guideBusy}
        onClick={exportGuide}
        title={guideBusy ? t('Preparing the assembly guide…') : t('Export the illustrated assembly guide as PDF (parts list and step-by-step drawings)')}
      >
        {label(t('Guide'))}
      </Button>
      <Button size="sm" variant="ghost" icon={RotateCcw} onClick={confirmReset} title={t('Reset project')}>
        {label(t('Reset'))}
      </Button>
        </>
      )}
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
      {error && <span className="text-[11px] text-rose-300">{error}</span>}

      {open === 'menu' && anchor && createPortal(
        <div ref={popoverRef} className={cx(popover, 'w-64')} style={popoverStyle}>
          <button type="button" className={menuRow} onClick={() => setOpen('templates')}>
            <LayoutTemplate className="h-4 w-4 text-slate-400" /> {t('Templates')}
          </button>
          <button type="button" className={menuRow} onClick={fromMenu(savePreset)}>
            <Save className="h-4 w-4 text-slate-400" /> {t('Save preset')}
          </button>
          <button type="button" className={menuRow} onClick={() => setOpen('saved')}>
            <FolderOpen className="h-4 w-4 text-slate-400" /> {t('Saved ({n})', { n: savedProjects.length })}
          </button>
          <div className="my-1 h-px bg-slate-800" />
          <button type="button" className={menuRow} onClick={fromMenu(() => exportProjectJson(project))}>
            <Download className="h-4 w-4 text-slate-400" /> {t('Export configuration as JSON')}
          </button>
          <button type="button" className={menuRow} onClick={fromMenu(() => fileInput.current?.click())}>
            <Upload className="h-4 w-4 text-slate-400" /> {t('Import a JSON configuration')}
          </button>
          <button type="button" className={menuRow} onClick={fromMenu(() => exportCutListCsv(project, model.cutList))}>
            <FileText className="h-4 w-4 text-slate-400" /> {t('Export cutting list as CSV')}
          </button>
          <button type="button" className={menuRow} onClick={fromMenu(() => void exportCutListPdf(project, model))}>
            <FileText className="h-4 w-4 text-slate-400" /> {t('Export cutting list, BOM & statics as PDF')}
          </button>
          <button type="button" className={menuRow} disabled={guideBusy} onClick={fromMenu(exportGuide)}>
            <Hammer className="h-4 w-4 text-slate-400" /> {guideBusy ? t('Preparing the assembly guide…') : t('Guide')}
          </button>
          <div className="my-1 h-px bg-slate-800" />
          <button type="button" className={menuRow} onClick={fromMenu(confirmReset)}>
            <RotateCcw className="h-4 w-4 text-slate-400" /> {t('Reset project')}
          </button>
        </div>,
        document.body,
      )}

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
