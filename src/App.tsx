import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import type { Task, ComputedTask } from './types/task';
import { enrichTask } from './services/prioritizer';
import { storageService, generateUUID } from './services/storage';
import { Navbar, type ViewMode, type SyncStatus } from './components/Navbar';
import { MatrixView } from './components/MatrixView';
import { ListView } from './components/ListView';
import { TaskModal } from './components/TaskModal';
import { Toast, type ToastMessage, type ToastType } from './components/Toast';

export const App: React.FC = () => {
  // Application Data State
  const [tasks, setTasks] = useState<ComputedTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('online');

  // Modal & Edit State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<ComputedTask | null>(null);
  const [defaultCoords, setDefaultCoords] = useState<{ urgency: number; effort: number }>({
    urgency: 3,
    effort: 2
  });

  // Confirmation Modals State
  const [taskToDelete, setTaskToDelete] = useState<ComputedTask | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);

  // Toast Notifications State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = generateUUID();
    setToasts((prev) => [...prev.slice(-3), { id, message, type, title }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch and enrich tasks from storage
  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const rawTasks = await storageService.getTasks();
      const enriched = rawTasks.map((t) => enrichTask(t));
      setTasks(enriched);
    } catch (err) {
      console.error('Error loading tasks:', err);
      addToast('Error al cargar las tareas desde el almacenamiento', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  // Initial load & Network event listeners
  useEffect(() => {
    loadTasks();

    const handleOnline = async () => {
      setSyncStatus('syncing');
      try {
        const drained = await storageService.drainMutationQueue();
        setSyncStatus('online');
        if (drained > 0) {
          addToast(`Sincronizados ${drained} cambios con la nube`, 'success', 'Conexión restablecida');
          loadTasks();
        }
      } catch {
        setSyncStatus('local_only');
      }
    };

    const handleOffline = () => {
      setSyncStatus('offline');
      addToast('Sin conexión a internet: operando en modo local', 'warning', 'Modo Offline');
    };

    // Check navigator status if in browser
    if (typeof window !== 'undefined') {
      if (!window.navigator.onLine) {
        setSyncStatus('offline');
      }
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [loadTasks, addToast]);

  // Task Action Handlers
  const handleSaveTask = async (
    taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>,
    taskId?: string
  ) => {
    try {
      if (taskId) {
        const updated = await storageService.updateTask(taskId, taskData);
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? enrichTask(updated) : t))
        );
        addToast('Tarea actualizada correctamente', 'success');
      } else {
        const created = await storageService.createTask(taskData);
        setTasks((prev) => [enrichTask(created), ...prev]);
        addToast('Tarea registrada y clasificada en la matriz', 'success');
      }
    } catch (err) {
      console.error('Error saving task:', err);
      addToast('No se pudo guardar la tarea', 'error');
      throw err;
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      // Find current task
      const current = tasks.find((t) => t.id === id);
      const isCurrentlyDone = current?.status === 'listo';

      const updated = await storageService.toggleTaskStatus(id);
      const enriched = enrichTask(updated);

      setTasks((prev) => prev.map((t) => (t.id === id ? enriched : t)));

      if (!isCurrentlyDone) {
        addToast('¡Arreglo completado! Buen trabajo', 'success', 'Completado');
      } else {
        addToast('Tarea marcada como pendiente', 'info');
      }
    } catch (err) {
      console.error('Error toggling task status:', err);
      addToast('No se pudo actualizar el estado de la tarea', 'error');
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await storageService.deleteTask(taskToDelete.id);
      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
      addToast(`Tarea "${taskToDelete.title}" eliminada`, 'info');
    } catch (err) {
      console.error('Error deleting task:', err);
      addToast('No se pudo eliminar la tarea', 'error');
    } finally {
      setTaskToDelete(null);
    }
  };

  const handleResetToSeed = async () => {
    try {
      const seedTasks = await storageService.resetToSeed();
      const enriched = seedTasks.map((t) => enrichTask(t));
      setTasks(enriched);
      addToast('Datos iniciales representativos restablecidos', 'success', 'Reinicio');
    } catch (err) {
      console.error('Error resetting seed tasks:', err);
      addToast('No se pudieron restablecer los datos iniciales', 'error');
    } finally {
      setIsResetConfirmOpen(false);
    }
  };

  const openNewTaskModal = (coords?: { urgency: number; effort: number }) => {
    setEditingTask(null);
    if (coords) {
      setDefaultCoords(coords);
    } else {
      setDefaultCoords({ urgency: 3, effort: 2 });
    }
    setIsModalOpen(true);
  };

  const openEditTaskModal = (task: ComputedTask) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  // Calculated Stats
  const totalCount = tasks.length;
  const activeCount = useMemo(
    () => tasks.filter((t) => t.status === 'pendiente' || t.status === 'en_proceso').length,
    [tasks]
  );
  const readyCount = useMemo(
    () => tasks.filter((t) => t.status === 'listo').length,
    [tasks]
  );
  const totalBudget = useMemo(
    () => tasks.reduce((sum, t) => sum + (t.cost || 0), 0),
    [tasks]
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navbar */}
      <Navbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalCount={totalCount}
        activeCount={activeCount}
        readyCount={readyCount}
        totalBudget={totalBudget}
        syncStatus={syncStatus}
        onNewTask={() => openNewTaskModal()}
        onResetSeed={() => setIsResetConfirmOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Intro Banner (Mobile-first, clean) */}
        <section className="mb-6 p-4 sm:p-5 rounded-2xl bg-linear-to-r from-blue-700 via-indigo-700 to-blue-800 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-blue-100">
                  Matriz de Priorización
                </span>
                <span className="text-xs text-blue-200 hidden md:inline">
                  Urgencia vs. Esfuerzo & Costo
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                Triaje y resolución inteligente de arreglos del hogar
              </h2>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => openNewTaskModal()}
                className="px-4 py-2 text-xs font-bold bg-white text-blue-800 hover:bg-blue-50 rounded-xl shadow-xs transition-colors min-h-[44px]"
              >
                + Nueva Tarea
              </button>
            </div>
          </div>
        </section>

        {/* View Component Switcher */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-500">Cargando tareas...</p>
          </div>
        ) : viewMode === 'matrix' ? (
          <MatrixView
            tasks={tasks}
            onToggleStatus={handleToggleStatus}
            onEdit={openEditTaskModal}
            onDelete={(id) => {
              const t = tasks.find((item) => item.id === id);
              if (t) setTaskToDelete(t);
            }}
            onNewTask={(coords) => openNewTaskModal(coords)}
          />
        ) : (
          <ListView
            tasks={tasks}
            onToggleStatus={handleToggleStatus}
            onEdit={openEditTaskModal}
            onDelete={(id) => {
              const t = tasks.find((item) => item.id === id);
              if (t) setTaskToDelete(t);
            }}
            onNewTask={() => openNewTaskModal()}
          />
        )}
      </main>

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        editingTask={editingTask}
        defaultUrgency={defaultCoords.urgency}
        defaultEffort={defaultCoords.effort}
      />

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3
              id="delete-dialog-title"
              className="text-base font-bold text-slate-900 text-center mb-2"
            >
              ¿Eliminar esta tarea?
            </h3>
            <p className="text-xs text-slate-600 text-center mb-6 leading-relaxed">
              Vas a eliminar{' '}
              <span className="font-semibold text-slate-900">
                "{taskToDelete.title}"
              </span>
              . Esta acción no se puede deshacer.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteTask}
                className="px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors min-h-[44px]"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Seed Confirmation Modal */}
      {isResetConfirmOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
        >
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4 mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3
              id="reset-dialog-title"
              className="text-base font-bold text-slate-900 text-center mb-2"
            >
              ¿Restablecer datos iniciales?
            </h3>
            <p className="text-xs text-slate-600 text-center mb-6 leading-relaxed">
              Se restaurarán las 3 tareas de ejemplo representativas originales (Pérdida en bacha, Pintura living, Ajuste de picaporte).
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetToSeed}
                className="px-4 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors min-h-[44px]"
              >
                Restablecer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
