import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  X,
  Plus
} from 'lucide-react';
import type { ComputedTask } from '../types/task';
import { TaskCard } from './TaskCard';

interface ListViewProps {
  tasks: ComputedTask[];
  onToggleStatus: (id: string) => void;
  onEdit: (task: ComputedTask) => void;
  onDelete: (id: string) => void;
  onNewTask: () => void;
}

type SortOption = 'score_desc' | 'urgency_desc' | 'effort_asc' | 'cost_desc' | 'cost_asc';

export const ListView: React.FC<ListViewProps> = ({
  tasks,
  onToggleStatus,
  onEdit,
  onDelete,
  onNewTask
}) => {
  // Filter states
  const [search, setSearch] = useState('');
  const [filterRoom, setFilterRoom] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('score_desc');

  // Filter & Sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // 1. Text Search (title)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q));
    }

    // 2. Room filter
    if (filterRoom !== 'all') {
      if (filterRoom === 'baño' || filterRoom === 'bano') {
        result = result.filter((t) => t.room === 'baño' || t.room === 'bano');
      } else {
        result = result.filter((t) => t.room === filterRoom);
      }
    }

    // 3. Execution type filter
    if (filterType !== 'all') {
      result = result.filter((t) => t.execution_type === filterType);
    }

    // 4. Status filter
    if (filterStatus !== 'all') {
      result = result.filter((t) => t.status === filterStatus);
    }

    // 5. Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'score_desc':
          return b.priority_score - a.priority_score;
        case 'urgency_desc':
          return b.urgency !== a.urgency
            ? b.urgency - a.urgency
            : b.priority_score - a.priority_score;
        case 'effort_asc':
          return a.effort !== b.effort
            ? a.effort - b.effort
            : b.priority_score - a.priority_score;
        case 'cost_desc':
          return (b.cost || 0) - (a.cost || 0);
        case 'cost_asc':
          return (a.cost || 0) - (b.cost || 0);
        default:
          return b.priority_score - a.priority_score;
      }
    });

    return result;
  }, [tasks, search, filterRoom, filterType, filterStatus, sortBy]);

  const hasActiveFilters =
    search.trim() !== '' ||
    filterRoom !== 'all' ||
    filterType !== 'all' ||
    filterStatus !== 'all';

  const clearAllFilters = () => {
    setSearch('');
    setFilterRoom('all');
    setFilterType('all');
    setFilterStatus('all');
    setSortBy('score_desc');
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        {/* Row 1: Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título de la tarea (ej. bacha, persiana, enchufe)..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[44px]"
            aria-label="Buscar tareas"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Row 2: Select filters & Sort */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {/* Ambiente Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Ambiente
            </label>
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-blue-500 min-h-[44px]"
              aria-label="Filtrar por ambiente"
            >
              <option value="all">Todos los ambientes</option>
              <option value="cocina">Cocina</option>
              <option value="baño">Baño</option>
              <option value="living">Living</option>
              <option value="dormitorio">Dormitorio</option>
              <option value="exterior">Exterior</option>
              <option value="general">General</option>
            </select>
          </div>

          {/* Tipo de Ejecución Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Ejecución
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-blue-500 min-h-[44px]"
              aria-label="Filtrar por tipo de ejecución"
            >
              <option value="all">Todos los tipos</option>
              <option value="diy">DIY (Hacerlo yo mismo)</option>
              <option value="profesional">Técnico / Especialista</option>
            </select>
          </div>

          {/* Estado Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Estado
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-blue-500 min-h-[44px]"
              aria-label="Filtrar por estado"
            >
              <option value="all">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_proceso">En proceso</option>
              <option value="listo">Listo</option>
            </select>
          </div>

          {/* Ordenamiento */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Ordenar por
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-blue-500 min-h-[44px]"
              aria-label="Ordenar tareas"
            >
              <option value="score_desc">Prioridad (Mayor a menor)</option>
              <option value="urgency_desc">Mayor Urgencia (5 a 1)</option>
              <option value="effort_asc">Menor Esfuerzo (1 a 5)</option>
              <option value="cost_desc">Mayor Costo ($)</option>
              <option value="cost_asc">Menor Costo ($)</option>
            </select>
          </div>
        </div>

        {/* Active Filters Bar & Summary */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="text-slate-600 font-medium">
            Mostrando{' '}
            <span className="font-bold text-slate-900">
              {filteredAndSortedTasks.length}
            </span>{' '}
            de{' '}
            <span className="font-bold text-slate-900">{tasks.length}</span> tareas
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors min-h-[44px]"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredAndSortedTasks.length > 0 ? (
          filteredAndSortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleStatus={onToggleStatus}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        ) : (
          /* Empty Search / Filter State */
          <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              No se encontraron tareas con estos filtros
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              Prueba modificando los criterios de búsqueda o restableciendo los filtros
              para ver todo el catálogo.
            </p>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors min-h-[44px]"
                >
                  Limpiar filtros
                </button>
              )}
              <button
                type="button"
                onClick={onNewTask}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Tarea</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListView;
