import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Flame,
  Calendar,
  Coffee,
  Wrench,
  HardHat,
  AlertCircle,
  Check
} from 'lucide-react';
import type {
  Task,
  ComputedTask,
  RoomId,
  ExecutionType,
  TaskStatus,
  PriorityLevel,
  QuadrantId
} from '../types/task';
import {
  calculatePriority,
  calculateQuadrant,
  calculatePriorityScore
} from '../services/prioritizer';
import { formatCurrencyARS } from '../utils/formatters';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>,
    taskId?: string
  ) => Promise<void> | void;
  editingTask?: Task | ComputedTask | null;
  defaultUrgency?: number;
  defaultEffort?: number;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTask,
  defaultUrgency = 3,
  defaultEffort = 2
}) => {
  // Form fields
  const [title, setTitle] = useState('');
  const [room, setRoom] = useState<RoomId>('cocina');
  const [urgency, setUrgency] = useState<number>(defaultUrgency);
  const [effort, setEffort] = useState<number>(defaultEffort);
  const [costInput, setCostInput] = useState<string>('');
  const [executionType, setExecutionType] = useState<ExecutionType>('diy');
  const [status, setStatus] = useState<TaskStatus>('pendiente');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Focus ref
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset form when modal opens or editingTask changes
  useEffect(() => {
    if (isOpen) {
      if (editingTask) {
        setTitle(editingTask.title);
        setRoom(editingTask.room);
        setUrgency(editingTask.urgency);
        setEffort(editingTask.effort);
        setCostInput(
          editingTask.cost !== null && editingTask.cost !== undefined
            ? String(editingTask.cost)
            : ''
        );
        setExecutionType(editingTask.execution_type);
        setStatus(editingTask.status);
      } else {
        setTitle('');
        setRoom('cocina');
        setUrgency(defaultUrgency);
        setEffort(defaultEffort);
        setCostInput('');
        setExecutionType('diy');
        setStatus('pendiente');
      }
      setErrors({});
      setTouched({});
      setIsSubmitting(false);

      // Focus title input on open
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, editingTask, defaultUrgency, defaultEffort]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Parse numeric cost
  const parsedCost = costInput.trim() === '' ? null : Number(costInput);

  // Live Priority Preview calculation
  const previewPriority: PriorityLevel = calculatePriority(urgency, effort, parsedCost);
  const previewQuadrant: QuadrantId = calculateQuadrant(urgency, effort, parsedCost);
  const previewScore: number = calculatePriorityScore(
    urgency,
    effort,
    parsedCost,
    status
  );

  // Real-time validation
  const validate = () => {
    const newErrors: Record<string, string> = {};

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      newErrors.title = 'El título es obligatorio';
    } else if (trimmedTitle.length < 3) {
      newErrors.title = 'El título debe tener al menos 3 caracteres';
    } else if (trimmedTitle.length > 120) {
      newErrors.title = 'El título no puede exceder los 120 caracteres';
    }

    if (costInput.trim() !== '') {
      const num = Number(costInput);
      if (isNaN(num) || num < 0) {
        newErrors.cost = 'El costo debe ser un número positivo o cero';
      } else if (num > 99999999) {
        newErrors.cost = 'El costo excede el límite permitido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ title: true, cost: true });

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'> = {
        title: title.trim(),
        room,
        urgency,
        effort,
        cost: parsedCost !== null && !isNaN(parsedCost) ? parsedCost : null,
        execution_type: executionType,
        status
      };

      await onSave(taskData, editingTask?.id);
      onClose();
    } catch (err) {
      console.error('Error saving task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Visual preview helpers
  const getQuadrantInfo = (qid: QuadrantId) => {
    switch (qid) {
      case 'Q1':
        return {
          title: 'Q1 — Emergencia',
          color: 'bg-rose-50 border-rose-200 text-rose-800',
          badge: 'bg-rose-600 text-white',
          icon: <Flame className="w-4 h-4 text-rose-600" />,
          desc: 'Alta urgencia y alto esfuerzo. Requiere atención inmediata.'
        };
      case 'Q2':
        return {
          title: 'Q2 — Quick Win',
          color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          badge: 'bg-emerald-600 text-white',
          icon: <Sparkles className="w-4 h-4 text-emerald-600" />,
          desc: 'Alta urgencia y bajo esfuerzo. ¡Máxima rentabilidad de tiempo, resolver pronto!'
        };
      case 'Q3':
        return {
          title: 'Q3 — Proyecto Planificado',
          color: 'bg-amber-50 border-amber-200 text-amber-800',
          badge: 'bg-amber-600 text-white',
          icon: <Calendar className="w-4 h-4 text-amber-600" />,
          desc: 'Menor urgencia con alto esfuerzo o presupuesto. Planificar y agendar.'
        };
      case 'Q4':
      default:
        return {
          title: 'Q4 — Postergable',
          color: 'bg-slate-50 border-slate-200 text-slate-800',
          badge: 'bg-slate-600 text-white',
          icon: <Coffee className="w-4 h-4 text-slate-600" />,
          desc: 'Baja urgencia y bajo esfuerzo. Para resolver en momentos libres.'
        };
    }
  };

  const quadInfo = getQuadrantInfo(previewQuadrant);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Modal Dialog Card */}
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 id="modal-title" className="text-lg font-bold text-slate-900 tracking-tight">
              {editingTask ? 'Editar Tarea' : 'Nueva Tarea de Reparación'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {editingTask
                ? 'Actualiza los datos de la tarea'
                : 'Registra un arreglo para clasificarlo automáticamente en la matriz'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* 1. Título */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="task-title"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Título / Tarea <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {title.length}/120
              </span>
            </div>
            <input
              id="task-title"
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (touched.title) validate();
              }}
              onBlur={() => {
                setTouched((prev) => ({ ...prev, title: true }));
                validate();
              }}
              maxLength={120}
              placeholder="Ej. Pérdida en bacha de cocina, enchufe chispea, cambiar bombilla..."
              className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:bg-white transition-all min-h-[44px] ${
                errors.title && touched.title
                  ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500'
                  : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
              }`}
              aria-invalid={!!(errors.title && touched.title)}
              aria-describedby={errors.title && touched.title ? 'title-error' : undefined}
            />
            {errors.title && touched.title && (
              <p id="title-error" className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.title}
              </p>
            )}
          </div>

          {/* 2. Ambiente */}
          <div>
            <label
              htmlFor="task-room"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
            >
              Ambiente <span className="text-rose-500">*</span>
            </label>
            <select
              id="task-room"
              value={room}
              onChange={(e) => setRoom(e.target.value as RoomId)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white min-h-[44px]"
            >
              <option value="cocina">Cocina</option>
              <option value="baño">Baño</option>
              <option value="living">Living</option>
              <option value="dormitorio">Dormitorio</option>
              <option value="exterior">Exterior / Jardín</option>
              <option value="general">General</option>
            </select>
          </div>

          {/* 3. Nivel de Urgencia (1 a 5) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Nivel de Urgencia (1 a 5) <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs font-bold text-slate-800">
                {urgency === 5
                  ? '5 - Riesgo estructural / Seguridad'
                  : urgency === 4
                  ? '4 - Urgencia Alta'
                  : urgency === 3
                  ? '3 - Urgencia Media'
                  : urgency === 2
                  ? '2 - Incomodidad leve'
                  : '1 - Meramente estético'}
              </span>
            </div>
            <div
              className="grid grid-cols-5 gap-1.5 p-1 bg-slate-100 rounded-xl"
              role="radiogroup"
              aria-label="Nivel de Urgencia"
            >
              {[1, 2, 3, 4, 5].map((lvl) => {
                const isSelected = urgency === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setUrgency(lvl)}
                    className={`py-2 text-xs font-bold rounded-lg transition-all min-h-[44px] flex flex-col items-center justify-center ${
                      isSelected
                        ? lvl >= 4
                          ? 'bg-rose-600 text-white shadow-xs'
                          : lvl === 3
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-white/80'
                    }`}
                  >
                    <span>{lvl}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Esfuerzo / Dificultad (1 a 5) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Esfuerzo / Complejidad (1 a 5) <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs font-bold text-slate-800">
                {effort === 1
                  ? '1 - 15 min (muy fácil)'
                  : effort === 2
                  ? '2 - 1 hora (fácil)'
                  : effort === 3
                  ? '3 - Medio día (moderado)'
                  : effort === 4
                  ? '4 - 1 a 2 días (complejo)'
                  : '5 - Múltiples días / Especialista'}
              </span>
            </div>
            <div
              className="grid grid-cols-5 gap-1.5 p-1 bg-slate-100 rounded-xl"
              role="radiogroup"
              aria-label="Nivel de Esfuerzo"
            >
              {[1, 2, 3, 4, 5].map((lvl) => {
                const isSelected = effort === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setEffort(lvl)}
                    className={`py-2 text-xs font-bold rounded-lg transition-all min-h-[44px] flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-white/80'
                    }`}
                  >
                    <span>{lvl}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Costo Estimado (ARS) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="task-cost"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Costo Estimado (ARS) <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
              {parsedCost !== null && !isNaN(parsedCost) && parsedCost > 0 && (
                <span className="text-xs font-bold text-emerald-700">
                  {formatCurrencyARS(parsedCost)}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                $
              </span>
              <input
                id="task-cost"
                type="number"
                min="0"
                step="500"
                value={costInput}
                onChange={(e) => {
                  setCostInput(e.target.value);
                  if (touched.cost) validate();
                }}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, cost: true }));
                  validate();
                }}
                placeholder="Ej. 15000"
                className={`w-full pl-8 pr-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:bg-white transition-all min-h-[44px] ${
                  errors.cost && touched.cost
                    ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500'
                    : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                }`}
                aria-invalid={!!(errors.cost && touched.cost)}
              />
            </div>
            {errors.cost && touched.cost && (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.cost}
              </p>
            )}
          </div>

          {/* 6. Tipo de Ejecución (DIY vs Técnico) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tipo de Ejecución <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExecutionType('diy')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all min-h-[44px] ${
                  executionType === 'diy'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Wrench className="w-4 h-4 text-emerald-600" />
                <span>Hacerlo yo mismo (DIY)</span>
              </button>

              <button
                type="button"
                onClick={() => setExecutionType('profesional')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all min-h-[44px] ${
                  executionType === 'profesional'
                    ? 'bg-purple-50 border-purple-300 text-purple-800 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <HardHat className="w-4 h-4 text-purple-600" />
                <span>Llamar a un técnico</span>
              </button>
            </div>
          </div>

          {/* 7. Estado */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Estado de la Reparación <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['pendiente', 'en_proceso', 'listo'] as TaskStatus[]).map((st) => {
                const isSelected = status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all min-h-[44px] ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-800 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {st === 'pendiente'
                      ? 'Pendiente'
                      : st === 'en_proceso'
                      ? 'En proceso'
                      : 'Listo'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* In-form Live Priority Preview */}
          <div className={`p-4 rounded-xl border ${quadInfo.color} transition-all`}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                {quadInfo.icon}
                Previsualización de Prioridad
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${quadInfo.badge}`}>
                  {previewPriority}
                </span>
                <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white/70">
                  Score: {previewScore.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="text-xs font-bold text-slate-900 mb-0.5">
              Asignación: {quadInfo.title}
            </div>
            <p className="text-xs opacity-90 leading-relaxed">
              {quadInfo.desc}
            </p>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md shadow-blue-600/30 transition-all min-h-[44px] disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{editingTask ? 'Guardar Cambios' : 'Registrar Tarea'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
