import { useEffect, useRef, useState } from 'react';
import { FolderOpen, Save, Upload, Download, FileText, LayoutTemplate, Trash2, RotateCcw } from 'lucide-react';
import type { DerivedModel } from '@/types';
import { PROJECT_TEMPLATES, useProjectStore } from '@/store';
import { exportCutListCsv, exportCutListPdf, exportProjectJson, readProjectFile } from '@/utils/export';
import { Button, cx } from './primitives';

export function ProjectMenu({ model }: { model: DerivedModel }) {
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

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent): void => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const onImport = async (file: File): Promise<void> => {
    try {
      importProject(await readProjectFile(file));
      setError(null);
    } catch (e) {
      setError(`Import failed: ${e instanceof Error ? e.message : 'invalid file'}`);
    }
  };

  const savePreset = (): void => {
    const name = window.prompt('Save current project as preset:', project.name);
    if (name && name.trim()) saveProjectAs(name.trim());
  };

  const popover = 'absolute top-full right-0 z-30 mt-1 w-80 rounded-lg border border-slate-700 bg-slate-950 p-2 shadow-2xl';

  return (
    <div ref={wrapper} className="relative flex items-center gap-1.5">
      <Button size="sm" icon={LayoutTemplate} onClick={() => setOpen(open === 'templates' ? null : 'templates')} aria-expanded={open === 'templates'}>
        Templates
      </Button>
      <Button size="sm" icon={Save} onClick={savePreset} title="Save the current configuration as a named preset (stored in this browser)">
        Save preset
      </Button>
      <Button size="sm" icon={FolderOpen} onClick={() => setOpen(open === 'saved' ? null : 'saved')} aria-expanded={open === 'saved'}>
        Saved ({savedProjects.length})
      </Button>
      <span className="mx-1 h-5 w-px bg-slate-800" />
      <Button size="sm" icon={Download} onClick={() => exportProjectJson(project)} title="Export configuration as JSON">
        JSON
      </Button>
      <Button size="sm" icon={Upload} onClick={() => fileInput.current?.click()} title="Import a JSON configuration">
        Import
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
      <Button size="sm" icon={FileText} onClick={() => exportCutListCsv(project, model.cutList)} title="Export cutting list as CSV">
        CSV
      </Button>
      <Button size="sm" icon={FileText} onClick={() => void exportCutListPdf(project, model.cutList, model.bom, model.statics, model.connections)} title="Export cutting list, BOM & statics as PDF">
        PDF
      </Button>
      <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => window.confirm('Reset to the default carport? Unsaved changes are lost.') && resetProject()} title="Reset project">
        Reset
      </Button>
      {error && <span className="text-[11px] text-rose-300">{error}</span>}

      {open === 'templates' && (
        <div className={popover}>
          <div className="px-2 pb-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">Start from a template</div>
          {PROJECT_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-slate-800"
              onClick={() => {
                loadTemplate(t.id);
                setOpen(null);
              }}
            >
              <div className="text-sm text-slate-100">{t.name}</div>
              <div className="text-[11px] text-slate-500">{t.description}</div>
            </button>
          ))}
        </div>
      )}

      {open === 'saved' && (
        <div className={cx(popover, 'max-h-96 overflow-auto')}>
          <div className="px-2 pb-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">Saved presets (this browser)</div>
          {savedProjects.length === 0 && <p className="px-2 py-2 text-xs text-slate-500">Nothing saved yet. Use “Save preset”.</p>}
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
              <button type="button" title="Delete preset" className="rounded p-1 text-rose-300 hover:bg-rose-950/60" onClick={() => deleteSavedProject(p.id)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
