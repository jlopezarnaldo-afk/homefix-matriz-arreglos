import React, { useMemo } from 'react';
import { CheckCircle2, DollarSign, CreditCard, RotateCcw, Trash2, Sparkles } from 'lucide-react';
import type { ComputedTask, Task } from '../types/task';
import { ROOM_LABELS } from '../types/task';

interface ResolvedViewProps {
  tasks: (ComputedTask | Task)[];
  onReopen: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ResolvedView: React.FC<ResolvedViewProps> = ({
  tasks,
  onReopen,
  onDelete
}) => {
  const resolvedTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status === 'listo')
      .sort((a, b) => {
        const dateA = a.resolved_at || a.updated_at || '';
        const dateB = b.resolved_at || b.updated_at || '';
        return dateB.localeCompare(dateA);
      });
  }, [tasks]);

  // Financial calculations
  const stats = useMemo(() => {
    let totalSpent = 0;
    let singlePaymentTotal = 0;
    let installmentTotal = 0;

    resolvedTasks.forEach((t) => {
      const cost = Number(t.cost) || 0;
      totalSpent += cost;
      if (t.payment_mode === 'cuotas') {
        installmentTotal += cost;
      } else {
        singlePaymentTotal += cost;
      }
    });

    return {
      totalSpent,
      singlePaymentTotal,
      installmentTotal,
      count: resolvedTasks.length
    };
  }, [resolvedTasks]);

  return (
    <div className="space-y-6">
      {/* Resumen de gastos y métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Arreglos Listos
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.count}</p>
          <p className="text-xs text-slate-500 mt-0.5">Solucionados en casa</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <DollarSign className="w-4 h-4 text-blue-600" />
            Total Invertido
          </div>
          <p className="text-2xl font-black text-emerald-700">
            ${stats.totalSpent.toLocaleString('es-AR')}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Gasto acumulado</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            En 1 Pago
          </div>
          <p className="text-xl font-bold text-slate-900">
            ${stats.singlePaymentTotal.toLocaleString('es-AR')}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Contado / Débito</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            En Cuotas
          </div>
          <p className="text-xl font-bold text-slate-900">
            ${stats.installmentTotal.toLocaleString('es-AR')}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Con tarjeta / cuotas</p>
        </div>
      </div>

      {/* Lista de arreglos resueltos */}
      {resolvedTasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-6">
          <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Todavía no hay arreglos resueltos</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Cuando soluciones una tarea pendiente, tócala para marcarla como lista e ingresar cuánto costó y si fue en 1 pago o en cuotas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Historial de Arreglos ({resolvedTasks.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {resolvedTasks.map((task) => {
              const cost = Number(task.cost) || 0;
              const hasInstallments = task.payment_mode === 'cuotas' && (task.installments_count || 1) > 1;

              return (
                <div
                  key={task.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-emerald-300 transition-all shadow-xs flex flex-col justify-between"
                >
                  <div>
                    {/* Top: Title and badges */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-2">
                          {task.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            📍 {ROOM_LABELS[task.room] || task.room}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✓ Resuelto
                          </span>
                        </div>
                      </div>

                      {/* Costo Destacado */}
                      <div className="text-right shrink-0">
                        <span className="text-base font-black text-emerald-700 block">
                          ${cost > 0 ? cost.toLocaleString('es-AR') : '0'}
                        </span>
                        {cost > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200 mt-0.5">
                            {hasInstallments ? (
                              <>
                                <CreditCard className="w-3 h-3 text-indigo-600" />
                                {task.installments_count} cuotas de $
                                {(task.installment_amount || Math.round(cost / (task.installments_count || 1))).toLocaleString('es-AR')}
                              </>
                            ) : (
                              <>
                                <DollarSign className="w-3 h-3 text-emerald-600" />
                                1 Pago
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Observaciones si hay */}
                    {task.resolved_notes && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl mt-2 italic">
                        "{task.resolved_notes}"
                      </p>
                    )}
                  </div>

                  {/* Bottom: actions */}
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      {task.resolved_at
                        ? new Date(task.resolved_at).toLocaleDateString('es-AR', {
                            day: 'numeric',
                            month: 'short'
                          })
                        : 'Completado'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onReopen(task.id)}
                        className="flex items-center gap-1 text-slate-600 hover:text-blue-600 px-2.5 py-1 rounded-lg hover:bg-blue-50 font-medium transition-colors"
                        title="Volver a poner en pendientes"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reabrir
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(task.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
