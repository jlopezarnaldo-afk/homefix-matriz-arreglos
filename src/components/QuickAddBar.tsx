import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type { RoomId } from '../types/task';

interface QuickAddBarProps {
  onAdd: (taskData: {
    title: string;
    urgency: number; // 5 = Urgente, 3 = Medio, 1 = Bajo
    room: RoomId;
  }) => Promise<void>;
}

export const QuickAddBar: React.FC<QuickAddBarProps> = ({ onAdd }) => {
  const [title, setTitle] = useState('');
  const [urgency, setUrgency] = useState<number>(3); // 3 = Medio by default
  const [room, setRoom] = useState<RoomId>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onAdd({
        title: title.trim(),
        urgency,
        room
      });
      setTitle('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm transition-all focus-within:border-blue-400 focus-within:shadow-md"
    >
      {/* Input principal */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="¿Qué hay que arreglar? (ej. Pérdida en bacha de cocina)"
          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />

        <button
          type="submit"
          disabled={!title.trim() || isSubmitting}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 min-h-[46px]"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Agregar</span>
        </button>
      </div>

      {/* Selectores de Urgencia y Ambiente */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
        {/* 3 Niveles de Urgencia */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-slate-500 mr-1 shrink-0">
            Urgencia:
          </span>

          {/* 🔴 Urgente */}
          <button
            type="button"
            onClick={() => setUrgency(5)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all shrink-0 ${
              urgency === 5
                ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-600" />
            🔴 Urgente
          </button>

          {/* 🟡 Medio */}
          <button
            type="button"
            onClick={() => setUrgency(3)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all shrink-0 ${
              urgency === 3
                ? 'bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            🟡 Medio
          </button>

          {/* 🟢 Bajo */}
          <button
            type="button"
            onClick={() => setUrgency(1)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all shrink-0 ${
              urgency === 1
                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            🟢 Bajo
          </button>
        </div>

        {/* Ambiente */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-semibold text-slate-500">Lugar:</span>
          <select
            value={room}
            onChange={(e) => setRoom(e.target.value as RoomId)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="general">🏠 General</option>
            <option value="cocina">🍳 Cocina</option>
            <option value="baño">🚿 Baño</option>
            <option value="living">🛋️ Living</option>
            <option value="dormitorio">🛏️ Dormitorio</option>
            <option value="exterior">🌳 Exterior</option>
          </select>
        </div>
      </div>
    </form>
  );
};
