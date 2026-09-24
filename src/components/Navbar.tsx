import React from 'react';
import {
  Wrench,
  LayoutGrid,
  List,
  Plus,
  RotateCcw,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { formatCurrencyARS } from '../utils/formatters';

export type ViewMode = 'matrix' | 'list';
export type SyncStatus = 'online' | 'offline' | 'syncing' | 'local_only';

interface NavbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  totalCount: number;
  activeCount: number;
  readyCount: number;
  totalBudget?: number;
  syncStatus: SyncStatus;
  onNewTask: () => void;
  onResetSeed: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewMode,
  onViewModeChange,
  totalCount,
  activeCount,
  readyCount,
  totalBudget = 0,
  syncStatus,
  onNewTask,
  onResetSeed
}) => {
  const renderSyncBadge = () => {
    switch (syncStatus) {
      case 'online':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
            title="Conectado y sincronizado con Supabase"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Nube Sincronizada</span>
            <span className="sm:hidden">Online</span>
          </span>
        );
      case 'syncing':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse"
            title="Sincronizando cambios..."
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span className="hidden sm:inline">Sincronizando</span>
            <span className="sm:hidden">Sync...</span>
          </span>
        );
      case 'offline':
      case 'local_only':
      default:
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"
            title="Operando en modo local (localStorage)"
          >
            <CloudOff className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Modo Local</span>
            <span className="sm:hidden">Local</span>
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Top bar: Brand + Sync + Primary Actions */}
        <div className="flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-none">
                  HomeFix
                </h1>
                {renderSyncBadge()}
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block mt-0.5">
                Matriz de Arreglos del Hogar
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Reset seed button */}
            <button
              type="button"
              onClick={onResetSeed}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors min-h-[44px] min-w-[44px]"
              title="Restablecer datos de ejemplo iniciales"
              aria-label="Restablecer datos iniciales"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span className="hidden md:inline">Restablecer Iniciales</span>
            </button>

            {/* Nueva Tarea Primary Action */}
            <button
              type="button"
              onClick={onNewTask}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm shadow-blue-600/30 transition-all transform active:scale-95 min-h-[44px]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nueva Tarea</span>
            </button>
          </div>
        </div>

        {/* Bottom bar: Stats + View Mode Switcher */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Stats Bar */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
              <span className="font-semibold text-slate-900">{totalCount}</span>
              <span>{totalCount === 1 ? 'tarea' : 'tareas'}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium border border-blue-100">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="font-semibold text-blue-900">{activeCount}</span>
              <span>activas</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-medium border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-semibold text-emerald-900">{readyCount}</span>
              <span>listas</span>
            </span>

            {totalBudget > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-medium border border-amber-100 hidden lg:inline-flex">
                <span>Presupuesto est.:</span>
                <span className="font-bold">{formatCurrencyARS(totalBudget)}</span>
              </span>
            )}
          </div>

          {/* View Switcher Toggle */}
          <div
            className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-stretch sm:self-auto"
            role="group"
            aria-label="Selector de Vista"
          >
            <button
              type="button"
              onClick={() => onViewModeChange('matrix')}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] ${
                viewMode === 'matrix'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-pressed={viewMode === 'matrix'}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Tablero Matriz</span>
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] ${
                viewMode === 'list'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-pressed={viewMode === 'list'}
            >
              <List className="w-4 h-4" />
              <span>Lista con Filtros</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
