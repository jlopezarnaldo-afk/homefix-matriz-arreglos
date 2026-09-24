import React, { useState, useMemo } from 'react';
import { CheckCircle2, Trash2, Edit3, Sparkles } from 'lucide-react';
import type { ComputedTask, Task } from '../types/task';
import { ROOM_LABELS } from '../types/task';

interface PendingViewProps {
  tasks: (ComputedTask | Task)[];
  onResolveClick: (task: Task) => void;
  onEdit: (task: ComputedTask | Task) => void;
  onDelete: (id: string) => void;
}

export const PendingView: React.FC<PendingViewProps> = ({
  tasks,
  onResolveClick,
  onEdit,
  onDelete
}) => {
  const [filterUrgency, setFilterUrgency] = useState<string>('all');
  const [filterRoom, setFilterRoom] = useState<string>('all');

  const pendingTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'listo')
      .filter((t) => {
        if (filterUrgency === 'all') return true;
        if (filterUrgency === 'urgente') return t.urgency >= 4;
        if (filterUrgency === 'medio') return t.urgency === 3 || t.urgency === 2;
        if (filterUrgency === 'bajo') return t.urgency === 1;
        return true;
      })
      .filter((t) => {
        if (filterRoom === 'all') return true;
        return t.room === filterRoom;
      })
      .sort((a, b) => {
        // Ordenar por urgencia descendente (5 primero, luego 3, luego 1)
        if (b.urgency !== a.urgency) {
          return b.urgency - a.urgency;
        }
        return (b.created_at || '').localeCompare(a.created_at || '');
      });
  }, [tasks, filterUrgency, filterRoom]);

  // Counts for tabs
  const allPendingCount = tasks.filter((t) => t.status !== 'listo').length;
  const urgentCount = tasks.filter((t) => t.status !== 'listo' && t.urgency >= 4).length;
  const mediumCount = tasks.filter(
    (t) => t.status !== 'listo' && (t.urgency === 3 || t.urgency === 2)
  ).length;
  const lowCount = tasks.filter((t) => t.status !== 'listo' && t.urgency === 1).length;

  const getUrgencyBadge = (urgency: number) => {
    if (urgency >= 4) {
      return {
        label: '🔴 Urgente',
        class: 'bg-rose-50 text-rose-700 border-rose-200'
      };
    }
    if (urgency >= 2) {
      return {
        label: '🟡 Medio',
        class: 'bg-amber-50 text-amber-700 border-amber-200'
      };
    }
    return {
      label: '🟢 Bajo',
      class: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  };

  return (
    <div className="space-y-4">
      {/* Filtros rápidos por urgencia */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterUrgency('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterUrgency === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({allPendingCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterUrgency('urgente')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterUrgency === 'urgente'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            🔴 Urgentes ({urgentCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterUrgency('medio')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterUrgency === 'medio'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            🟡 Medios ({mediumCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterUrgency('bajo')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterUrgency === 'bajo'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            🟢 Bajos ({lowCount})
          </button>
        </div>

        {/* Filtro ambiente */}
        <div className="flex items-center gap-1.5 ml-auto">
          <select
            value={filterRoom}
            onChange={(e) => setFilterRoom(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="all">🏠 Todos los ambientes</option>
            <option value="cocina">🍳 Cocina</option>
            <option value="baño">🚿 Baño</option>
            <option value="living">🛋️ Living</option>
            <option value="dormitorio">🛏️ Dormitorio</option>
            <option value="exterior">🌳 Exterior</option>
            <option value="general">🏠 General</option>
          </select>
        </div>
      </div>

      {/* Lista de tarjetas pendientes */}
      {pendingTasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-6">
          <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {allPendingCount === 0
              ? '¡Excelente! No hay arreglos pendientes'
              : 'No hay arreglos con este filtro'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {allPendingCount === 0
              ? 'Usa la barra superior para agregar cualquier arreglo o mantenimiento que surja en la casa.'
              : 'Prueba cambiando la urgencia o el ambiente seleccionado.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pendingTasks.map((task) => {
            const urgencyBadge = getUrgencyBadge(task.urgency);

            return (
              <div
                key={task.id}
                className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-blue-300 transition-all shadow-xs flex flex-col justify-between"
              >
                <div>
                  {/* Top: Urgencia y Ambiente */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${urgencyBadge.class}`}
                      >
                        {urgencyBadge.label}
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        📍 {ROOM_LABELS[task.room] || task.room}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(task)}
                        className="text-slate-400 hover:text-blue-600 p-1 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Editar tarea"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(task.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Eliminar tarea"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h4 className="text-sm font-bold text-slate-900 leading-snug mb-3">
                    {task.title}
                  </h4>
                </div>

                {/* Bottom: Botón verde LISTO */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {task.cost && task.cost > 0
                      ? `Est: $${task.cost.toLocaleString('es-AR')}`
                      : 'Pendiente'}
                  </span>

                  <button
                    type="button"
                    onClick={() => onResolveClick(task)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors min-h-[36px]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>✓ Listo</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
