import React, { useState } from 'react';
import {
  Flame,
  Sparkles,
  Calendar,
  Coffee,
  Plus,
  TrendingUp
} from 'lucide-react';
import type { ComputedTask, QuadrantId } from '../types/task';
import { formatCurrencyARS } from '../utils/formatters';
import { TaskCard } from './TaskCard';

interface MatrixViewProps {
  tasks: ComputedTask[];
  onToggleStatus: (id: string) => void;
  onEdit: (task: ComputedTask) => void;
  onDelete: (id: string) => void;
  onNewTask: (defaults?: { urgency: number; effort: number }) => void;
}

interface QuadrantConfig {
  id: QuadrantId;
  title: string;
  subtitle: string;
  shortLabel: string;
  icon: React.ReactNode;
  bgHeader: string;
  borderClass: string;
  badgeClass: string;
  tagClass: string;
  defaultCoords: { urgency: number; effort: number };
}

const QUADRANTS: QuadrantConfig[] = [
  {
    id: 'Q1',
    title: 'Q1 — Emergencias / Crítico',
    subtitle: 'Alta Urgencia (4-5) · Alto Esfuerzo (3-5)',
    shortLabel: 'Q1 Emergencia',
    icon: <Flame className="w-4 h-4 text-rose-600" />,
    bgHeader: 'bg-rose-50/90 text-rose-900 border-rose-200',
    borderClass: 'border-rose-200',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    tagClass: 'bg-rose-600 text-white',
    defaultCoords: { urgency: 5, effort: 4 }
  },
  {
    id: 'Q2',
    title: 'Q2 — Victorias Rápidas (Quick Wins)',
    subtitle: 'Alta Urgencia (3-5) · Bajo Esfuerzo (1-2)',
    shortLabel: 'Q2 Quick Wins',
    icon: <Sparkles className="w-4 h-4 text-emerald-600" />,
    bgHeader: 'bg-emerald-50/90 text-emerald-900 border-emerald-200',
    borderClass: 'border-emerald-200',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    tagClass: 'bg-emerald-600 text-white',
    defaultCoords: { urgency: 4, effort: 1 }
  },
  {
    id: 'Q3',
    title: 'Q3 — Proyectos a Planificar',
    subtitle: 'Baja Urgencia (1-3) · Alto Esfuerzo o Alto Costo',
    shortLabel: 'Q3 Proyectos',
    icon: <Calendar className="w-4 h-4 text-amber-600" />,
    bgHeader: 'bg-amber-50/90 text-amber-900 border-amber-200',
    borderClass: 'border-amber-200',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    tagClass: 'bg-amber-600 text-white',
    defaultCoords: { urgency: 2, effort: 4 }
  },
  {
    id: 'Q4',
    title: 'Q4 — Tareas Menores / Postergables',
    subtitle: 'Baja Urgencia (1-2) · Bajo Esfuerzo (1-2)',
    shortLabel: 'Q4 Menores',
    icon: <Coffee className="w-4 h-4 text-slate-600" />,
    bgHeader: 'bg-slate-50/90 text-slate-900 border-slate-200',
    borderClass: 'border-slate-200',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    tagClass: 'bg-slate-600 text-white',
    defaultCoords: { urgency: 1, effort: 1 }
  }
];

export const MatrixView: React.FC<MatrixViewProps> = ({
  tasks,
  onToggleStatus,
  onEdit,
  onDelete,
  onNewTask
}) => {
  // Mobile active quadrant tab (for screens < 768px)
  const [activeMobileTab, setActiveMobileTab] = useState<QuadrantId>('Q1');
  const [mobileMode, setMobileMode] = useState<'tabs' | 'stacked'>('tabs');

  // Partition tasks into 4 quadrants
  const getQuadrantTasks = (qid: QuadrantId) => {
    return tasks.filter((t) => t.quadrant === qid);
  };

  const getQuadrantBudget = (qid: QuadrantId) => {
    return getQuadrantTasks(qid).reduce((sum, t) => sum + (t.cost || 0), 0);
  };

  const renderQuadrantSection = (config: QuadrantConfig) => {
    const qTasks = getQuadrantTasks(config.id);
    const qBudget = getQuadrantBudget(config.id);

    return (
      <section
        key={config.id}
        className={`flex flex-col rounded-2xl border ${config.borderClass} bg-slate-50/40 shadow-xs overflow-hidden`}
        aria-labelledby={`quadrant-heading-${config.id}`}
      >
        {/* Quadrant Header Bar */}
        <div className={`p-4 border-b ${config.bgHeader}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-white shadow-xs shrink-0">
                {config.icon}
              </div>
              <div className="min-w-0">
                <h3
                  id={`quadrant-heading-${config.id}`}
                  className="font-bold text-sm sm:text-base tracking-tight truncate"
                >
                  {config.title}
                </h3>
                <p className="text-[11px] font-medium opacity-80 truncate">
                  {config.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full border ${config.badgeClass}`}
                title={`${qTasks.length} tareas`}
              >
                {qTasks.length}
              </span>
            </div>
          </div>

          {/* Subheader info: total cost */}
          {qBudget > 0 && (
            <div className="mt-2 text-[11px] font-medium opacity-85 flex items-center justify-between border-t border-black/5 pt-1.5">
              <span>Presupuesto estimado:</span>
              <span className="font-semibold">{formatCurrencyARS(qBudget)}</span>
            </div>
          )}
        </div>

        {/* Quadrant Body / Task List */}
        <div className="p-3 sm:p-4 flex-1 flex flex-col gap-3">
          {qTasks.length > 0 ? (
            qTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleStatus={onToggleStatus}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          ) : (
            /* Empty State for Quadrant */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                {config.icon}
              </div>
              <p className="text-xs font-medium text-slate-600 mb-1">
                No hay tareas en este cuadrante
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs mb-3">
                Agrega una tarea clasificada para visualizarla aquí.
              </p>
              <button
                type="button"
                onClick={() => onNewTask(config.defaultCoords)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors min-h-[44px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Agregar tarea rápida</span>
              </button>
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-4">
      {/* Visual Axis Guide / Helper on Desktop */}
      <div className="hidden md:flex items-center justify-between px-3 py-2 bg-slate-100/80 rounded-xl text-xs text-slate-600 font-medium">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <span>Matriz de Impacto vs. Esfuerzo (2x2)</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-500">
          <span>Eje Vertical: Urgencia (Alta $\ge$ 3 / Baja $\le$ 2)</span>
          <span>•</span>
          <span>Eje Horizontal: Esfuerzo (Bajo $\le$ 2 / Alto $\ge$ 3)</span>
        </div>
      </div>

      {/* Mobile-Only Controls (< 768px) */}
      <div className="md:hidden space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Cuadrantes
          </span>
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setMobileMode('tabs')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                mobileMode === 'tabs' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Pestañas
            </button>
            <button
              type="button"
              onClick={() => setMobileMode('stacked')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                mobileMode === 'stacked' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Apilado
            </button>
          </div>
        </div>

        {/* Tab Strip: 4 accessible full-tap buttons with zero horizontal scroll */}
        {mobileMode === 'tabs' && (
          <nav
            className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200"
            role="tablist"
            aria-label="Pestañas de Cuadrantes"
          >
            {QUADRANTS.map((q) => {
              const count = getQuadrantTasks(q.id).length;
              const isSelected = activeMobileTab === q.id;

              return (
                <button
                  key={q.id}
                  role="tab"
                  id={`tab-${q.id}`}
                  aria-selected={isSelected}
                  aria-controls={`panel-${q.id}`}
                  onClick={() => setActiveMobileTab(q.id)}
                  className={`py-2 px-1 text-xs font-semibold rounded-lg flex flex-col items-center justify-center min-h-[48px] transition-all ${
                    isSelected
                      ? `${q.tagClass} shadow-xs`
                      : 'text-slate-600 hover:bg-white/80'
                  }`}
                >
                  <span className="text-[11px] leading-tight font-bold">{q.id}</span>
                  <span
                    className={`text-[10px] font-mono mt-0.5 ${
                      isSelected ? 'opacity-90' : 'text-slate-400'
                    }`}
                  >
                    ({count})
                  </span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Desktop Grid Layout (>= 768px): 2x2 Matrix */}
      <div className="hidden md:grid md:grid-cols-2 gap-4 lg:gap-6">
        {QUADRANTS.map((config) => renderQuadrantSection(config))}
      </div>

      {/* Mobile Layout (< 768px) */}
      <div className="md:hidden">
        {mobileMode === 'tabs' ? (
          <div
            role="tabpanel"
            id={`panel-${activeMobileTab}`}
            aria-labelledby={`tab-${activeMobileTab}`}
          >
            {renderQuadrantSection(QUADRANTS.find((q) => q.id === activeMobileTab)!)}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {QUADRANTS.map((config) => renderQuadrantSection(config))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatrixView;
