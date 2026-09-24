import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Wrench, CheckCircle2, ListTodo, RotateCcw, Trash2, Cloud, CloudOff } from 'lucide-react';
import type { Task, ComputedTask, RoomId, PaymentMode } from './types/task';
import { enrichTask } from './services/prioritizer';
import { storageService, generateUUID } from './services/storage';
import { supabase } from './services/supabase';
import { QuickAddBar } from './components/QuickAddBar';
import { PendingView } from './components/PendingView';
import { ResolvedView } from './components/ResolvedView';
import { ResolveTaskModal } from './components/ResolveTaskModal';
import { TaskModal } from './components/TaskModal';
import { Toast, type ToastMessage, type ToastType } from './components/Toast';
import { InstallAppBanner } from './components/InstallAppBanner';

export const App: React.FC = () => {
  // Navigation: 'pendientes' | 'resueltos'
  const [activeTab, setActiveTab] = useState<'pendientes' | 'resueltos'>('pendientes');

  // Tasks state
  const [tasks, setTasks] = useState<ComputedTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing' | 'local_only'>('online');

  // Modals state
  const [resolvingTask, setResolvingTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<ComputedTask | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [taskToDelete, setTaskToDelete] = useState<ComputedTask | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = generateUUID();
    setToasts((prev) => [...prev.slice(-3), { id, message, type, title }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load tasks from resilient storage
  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const raw = await storageService.getTasks();
      const enriched = raw.map((t) => enrichTask(t));
      setTasks(enriched);
    } catch (err) {
      console.error('Error loading tasks:', err);
      addToast('Error al cargar datos locales', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadTasks();

    const handleOnline = async () => {
      setSyncStatus('syncing');
      try {
        const drained = await storageService.drainMutationQueue();
        setSyncStatus('online');
        if (drained > 0) {
          addToast(`Sincronizados ${drained} cambios con la nube`, 'success', 'Conectado');
          loadTasks();
        }
      } catch {
        setSyncStatus('local_only');
      }
    };

    const handleOffline = () => {
      setSyncStatus('offline');
      addToast('Modo offline: tus cambios se guardan localmente', 'warning');
    };

    if (typeof window !== 'undefined') {
      if (!window.navigator.onLine) setSyncStatus('offline');
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    // Realtime listener for instantaneous multi-device synchronization
    const channel = supabase
      .channel('homefix-realtime-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload: any) => {
          const rec = payload.new || payload.old;
          if (rec && (rec.client_phone === 'HOMEFIX' || rec.id?.startsWith('homefix_'))) {
            loadTasks();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [loadTasks, addToast]);

  // Counts
  const pendingCount = useMemo(
    () => tasks.filter((t) => t.status !== 'listo').length,
    [tasks]
  );
  const resolvedCount = useMemo(
    () => tasks.filter((t) => t.status === 'listo').length,
    [tasks]
  );

  // Quick Add Handler
  const handleQuickAdd = async (data: {
    title: string;
    urgency: number;
    room: RoomId;
  }) => {
    try {
      const newTask = await storageService.createTask({
        title: data.title,
        room: data.room,
        urgency: data.urgency,
        effort: 2, // default normal
        execution_type: 'diy',
        status: 'pendiente'
      });
      setTasks((prev) => [enrichTask(newTask), ...prev]);
      addToast(`"${data.title}" agregado a la lista`, 'success');
    } catch (err) {
      console.error('Error adding task:', err);
      addToast('No se pudo agregar la tarea', 'error');
    }
  };

  // Resolve task confirmation (with price and single-payment vs installments)
  const handleConfirmResolve = async (
    taskId: string,
    resolution: {
      cost: number;
      payment_mode: PaymentMode;
      installments_count?: number;
      installment_amount?: number;
      resolved_notes?: string;
    }
  ) => {
    try {
      const updated = await storageService.updateTask(taskId, {
        status: 'listo',
        cost: resolution.cost,
        payment_mode: resolution.payment_mode,
        installments_count: resolution.installments_count,
        installment_amount: resolution.installment_amount,
        resolved_at: new Date().toISOString(),
        resolved_notes: resolution.resolved_notes
      });

      const enriched = enrichTask(updated);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? enriched : t)));

      const paymentDetail =
        resolution.payment_mode === 'cuotas'
          ? `en ${resolution.installments_count} cuotas`
          : 'en 1 pago';

      addToast(
        resolution.cost > 0
          ? `Arreglo cerrado por $${resolution.cost.toLocaleString('es-AR')} (${paymentDetail})`
          : 'Arreglo marcado como resuelto',
        'success',
        '¡Listo!'
      );
    } catch (err) {
      console.error('Error resolving task:', err);
      addToast('No se pudo marcar como resuelto', 'error');
    }
  };

  // Reopen task
  const handleReopenTask = async (id: string) => {
    try {
      const updated = await storageService.updateTask(id, {
        status: 'pendiente',
        resolved_at: null
      });
      const enriched = enrichTask(updated);
      setTasks((prev) => prev.map((t) => (t.id === id ? enriched : t)));
      addToast('Arreglo reabierto y movido a pendientes', 'info');
    } catch (err) {
      console.error('Error reopening task:', err);
      addToast('No se pudo reabrir el arreglo', 'error');
    }
  };

  // Delete task
  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await storageService.deleteTask(taskToDelete.id);
      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
      addToast(`"${taskToDelete.title}" eliminado`, 'info');
    } catch (err) {
      console.error('Error deleting task:', err);
      addToast('No se pudo eliminar la tarea', 'error');
    } finally {
      setTaskToDelete(null);
    }
  };

  // Save edit modal
  const handleSaveEdit = async (
    taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>,
    taskId?: string
  ) => {
    if (!taskId) return;
    try {
      const updated = await storageService.updateTask(taskId, taskData);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? enrichTask(updated) : t))
      );
      addToast('Arreglo actualizado', 'success');
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error updating task:', err);
      addToast('No se pudo actualizar el arreglo', 'error');
    }
  };

  // Clear all tasks to start fresh
  const handleClearAll = async () => {
    storageService.setCache([]);
    setTasks([]);
    addToast('Lista lista para tus propios arreglos', 'info');
    setIsClearConfirmOpen(false);
  };

  // Reset to seed
  const handleResetToSeed = async () => {
    try {
      const seedTasks = await storageService.resetToSeed();
      setTasks(seedTasks.map((t) => enrichTask(t)));
      addToast('Datos iniciales restablecidos', 'success');
    } catch (err) {
      console.error('Error resetting tasks:', err);
      addToast('No se pudo restablecer los datos', 'error');
    } finally {
      setIsResetConfirmOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Header Limpio y Moderno */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Logo y Nombre */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 leading-tight">
                HomeFix
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Arreglos del Hogar
              </p>
            </div>
          </div>

          {/* Toggle de Pestañas: Pendientes vs Resueltos */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('pendientes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'pendientes'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Pendientes</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800">
                {pendingCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('resueltos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'resueltos'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Resueltos</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                {resolvedCount}
              </span>
            </button>
          </div>

          {/* Estado de sincronización y reset sutil */}
          <div className="hidden sm:flex items-center gap-2">
            <div
              className="flex items-center gap-1 text-[11px] text-slate-400 font-medium px-2 py-1 rounded-lg bg-slate-50 border border-slate-200"
              title={syncStatus === 'online' ? 'Sincronizado con Supabase' : 'Guardado localmente'}
            >
              {syncStatus === 'online' ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-slate-600">Online</span>
                </>
              ) : (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-slate-600">Local</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsClearConfirmOpen(true)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Vaciar lista y empezar de cero"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Restablecer tareas de ejemplo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-500">Cargando arreglos...</p>
          </div>
        ) : activeTab === 'pendientes' ? (
          <>
            {/* Barra de Carga Rápida */}
            <QuickAddBar onAdd={handleQuickAdd} />

            {/* Lista de Tareas Pendientes */}
            <PendingView
              tasks={tasks}
              onResolveClick={(task) => setResolvingTask(task)}
              onEdit={(task) => {
                setEditingTask(task as ComputedTask);
                setIsEditModalOpen(true);
              }}
              onDelete={(id) => {
                const t = tasks.find((item) => item.id === id);
                if (t) setTaskToDelete(t);
              }}
            />
          </>
        ) : (
          /* Sector de Resueltos con Gastos y Cuotas */
          <ResolvedView
            tasks={tasks}
            onReopen={handleReopenTask}
            onDelete={(id) => {
              const t = tasks.find((item) => item.id === id);
              if (t) setTaskToDelete(t);
            }}
          />
        )}
      </main>

      {/* Modal para Resolver Tarea con Precio y Cuotas/1 Pago */}
      <ResolveTaskModal
        isOpen={Boolean(resolvingTask)}
        task={resolvingTask}
        onClose={() => setResolvingTask(null)}
        onConfirm={handleConfirmResolve}
      />

      {/* Modal para Editar Tarea si el usuario lo desea */}
      {editingTask && (
        <TaskModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingTask(null);
          }}
          onSave={handleSaveEdit}
          editingTask={editingTask}
          defaultUrgency={editingTask.urgency}
          defaultEffort={editingTask.effort}
        />
      )}

      {/* Diálogo de Confirmación para Eliminar */}
      {taskToDelete && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              ¿Eliminar este arreglo?
            </h3>
            <p className="text-xs text-slate-600 mb-5">
              "{taskToDelete.title}" se borrará de tu lista.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteTask}
                className="py-2.5 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de Confirmación para Restablecer */}
      {isResetConfirmOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-3 mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              ¿Restablecer ejemplos?
            </h3>
            <p className="text-xs text-slate-600 mb-5">
              Volverán a aparecer las tareas de ejemplo iniciales.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetToSeed}
                className="py-2.5 px-4 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-xs"
              >
                Restablecer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de Confirmación para Vaciar Lista */}
      {isClearConfirmOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mb-3 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              ¿Vaciar la lista actual?
            </h3>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Se limpiará la lista para que puedas empezar desde cero y cargar tus propios arreglos del hogar.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="py-2.5 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl transition-colors shadow-xs"
              >
                Sí, vaciar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA Install Banner & Flow */}
      <InstallAppBanner />

      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
