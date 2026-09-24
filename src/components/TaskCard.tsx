import React from 'react';
import {
  Utensils,
  Bath,
  Armchair,
  Bed,
  Trees,
  Home,
  Wrench,
  HardHat,
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
  DollarSign
} from 'lucide-react';
import type { ComputedTask, RoomId, ExecutionType, TaskStatus, PriorityLevel } from '../types/task';
import { formatCurrencyARS } from '../utils/formatters';

interface TaskCardProps {
  task: ComputedTask;
  onToggleStatus: (id: string) => void;
  onEdit: (task: ComputedTask) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (id: string, status: TaskStatus) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleStatus,
  onEdit,
  onDelete,
  onStatusChange
}) => {
  const isDone = task.status === 'listo';

  // Room icon helper
  const getRoomIcon = (room: RoomId) => {
    switch (room) {
      case 'cocina':
        return <Utensils className="w-3.5 h-3.5" />;
      case 'baño':
      case 'bano':
        return <Bath className="w-3.5 h-3.5" />;
      case 'living':
        return <Armchair className="w-3.5 h-3.5" />;
      case 'dormitorio':
        return <Bed className="w-3.5 h-3.5" />;
      case 'exterior':
        return <Trees className="w-3.5 h-3.5" />;
      case 'general':
      default:
        return <Home className="w-3.5 h-3.5" />;
    }
  };

  const getRoomLabel = (room: RoomId) => {
    switch (room) {
      case 'cocina':
        return 'Cocina';
      case 'baño':
      case 'bano':
        return 'Baño';
      case 'living':
        return 'Living';
      case 'dormitorio':
        return 'Dormitorio';
      case 'exterior':
        return 'Exterior';
      case 'general':
      default:
        return 'General';
    }
  };

  // Execution type badge helper
  const getExecutionBadge = (type: ExecutionType) => {
    if (type === 'diy') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
          title="Hacerlo yo mismo (DIY)"
        >
          <Wrench className="w-3 h-3 text-emerald-600" />
          <span>DIY</span>
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200"
        title="Llamar a un técnico o especialista"
      >
        <HardHat className="w-3 h-3 text-purple-600" />
        <span>Técnico</span>
      </span>
    );
  };

  // Priority badge styling
  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'P1':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
            <span>P1 Emergencia</span>
          </span>
        );
      case 'P2':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span>P2 Quick Win</span>
          </span>
        );
      case 'P3':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <span>P3 Proyecto</span>
          </span>
        );
      case 'P4':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <span>P4 Postergable</span>
          </span>
        );
    }
  };

  // Urgency meter color dots (1 to 5)
  const renderUrgencyMeter = (urgency: number) => {
    const getColor = (index: number) => {
      if (index > urgency) return 'bg-slate-200';
      if (urgency >= 4) return 'bg-rose-500';
      if (urgency === 3) return 'bg-amber-500';
      return 'bg-emerald-500';
    };

    return (
      <div className="flex items-center gap-1" title={`Nivel de Urgencia: ${urgency}/5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${getColor(i)}`}
          />
        ))}
        <span className="text-[11px] font-semibold text-slate-600 ml-1">
          {urgency}/5
        </span>
      </div>
    );
  };

  // Effort meter dots (1 to 5)
  const renderEffortMeter = (effort: number) => {
    return (
      <div className="flex items-center gap-1" title={`Nivel de Esfuerzo: ${effort}/5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i <= effort ? 'bg-indigo-500' : 'bg-slate-200'
            }`}
          />
        ))}
        <span className="text-[11px] font-semibold text-slate-600 ml-1">
          {effort}/5
        </span>
      </div>
    );
  };

  return (
    <article
      className={`group relative rounded-xl border p-4 transition-all duration-200 ${
        isDone
          ? 'bg-slate-50/80 border-slate-200 opacity-75 shadow-none'
          : 'bg-white border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300'
      }`}
    >
      {/* Top badges line */}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {getPriorityBadge(task.priority)}

          {/* Room Badge */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {getRoomIcon(task.room)}
            <span>{getRoomLabel(task.room)}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {getExecutionBadge(task.execution_type)}
          {/* Continuous Score Pill */}
          <span
            className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
            title={`Puntaje de Prioridad continuo: ${task.priority_score.toFixed(1)}`}
          >
            {task.priority_score.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Task Title */}
      <h3
        className={`text-base font-semibold tracking-tight mb-3 break-words ${
          isDone ? 'line-through text-slate-400' : 'text-slate-900'
        }`}
      >
        {task.title}
      </h3>

      {/* Meters & Cost Information */}
      <div className="grid grid-cols-2 gap-2 text-xs py-2 px-2.5 rounded-lg bg-slate-50/70 border border-slate-100 mb-3">
        <div>
          <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider mb-0.5">
            Urgencia
          </span>
          {renderUrgencyMeter(task.urgency)}
        </div>
        <div>
          <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider mb-0.5">
            Esfuerzo
          </span>
          {renderEffortMeter(task.effort)}
        </div>
        <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
          <span className="text-slate-500 font-medium text-[11px] flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-slate-400" />
            Costo Estimado:
          </span>
          <span
            className={`font-semibold text-xs ${
              task.cost && task.cost > 0 ? 'text-slate-800' : 'text-slate-400 font-normal'
            }`}
          >
            {formatCurrencyARS(task.cost)}
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
        {/* Quick Done Toggle Button */}
        <button
          type="button"
          onClick={() => onToggleStatus(task.id)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[44px] min-w-[44px] ${
            isDone
              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
              : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-transparent'
          }`}
          aria-label={isDone ? 'Marcar como pendiente' : 'Marcar como listo'}
        >
          {isDone ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Listo</span>
            </>
          ) : (
            <>
              <Circle className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Marcar Listo</span>
            </>
          )}
        </button>

        {/* Status Dropdown + Edit & Delete */}
        <div className="flex items-center gap-1">
          {onStatusChange && (
            <select
              value={task.status}
              onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
              className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg px-2 py-1.5 font-medium cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-blue-500 min-h-[44px]"
              aria-label="Cambiar estado"
            >
              <option value="pendiente">Pendiente</option>
              <option value="en_proceso">En proceso</option>
              <option value="listo">Listo</option>
            </select>
          )}

          {/* Edit Button */}
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Editar tarea"
            aria-label={`Editar ${task.title}`}
          >
            <Pencil className="w-4 h-4" />
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Eliminar tarea"
            aria-label={`Eliminar ${task.title}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
};

export default TaskCard;
