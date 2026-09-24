import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, CreditCard, DollarSign } from 'lucide-react';
import type { Task, PaymentMode } from '../types/task';

interface ResolveTaskModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onConfirm: (
    taskId: string,
    resolutionData: {
      cost: number;
      payment_mode: PaymentMode;
      installments_count?: number;
      installment_amount?: number;
      resolved_notes?: string;
    }
  ) => void;
}

export const ResolveTaskModal: React.FC<ResolveTaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onConfirm
}) => {
  const [costInput, setCostInput] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('un_pago');
  const [installments, setInstallments] = useState<number>(3);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (task) {
      setCostInput(task.cost ? String(task.cost) : '');
      setPaymentMode(task.payment_mode || 'un_pago');
      setInstallments(task.installments_count || 3);
      setNotes(task.resolved_notes || '');
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const numericCost = parseFloat(costInput) || 0;
  const calculatedInstallment =
    paymentMode === 'cuotas' && installments > 0
      ? Math.round(numericCost / installments)
      : numericCost;

  const handleSave = () => {
    onConfirm(task.id, {
      cost: numericCost,
      payment_mode: paymentMode,
      installments_count: paymentMode === 'cuotas' ? installments : 1,
      installment_amount: paymentMode === 'cuotas' ? calculatedInstallment : numericCost,
      resolved_notes: notes.trim() || undefined
    });
    onClose();
  };

  const handleMarkWithoutCost = () => {
    onConfirm(task.id, {
      cost: 0,
      payment_mode: 'un_pago',
      installments_count: 1,
      installment_amount: 0,
      resolved_notes: notes.trim() || undefined
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resolve-dialog-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-600 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 id="resolve-dialog-title" className="text-base font-bold leading-tight">
                Marcar como Resuelto
              </h3>
              <p className="text-xs text-emerald-100 line-clamp-1 mt-0.5">
                {task.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Precio Final */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              ¿Cuánto costó este arreglo?
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-base">
                $
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={costInput}
                onChange={(e) => setCostInput(e.target.value)}
                placeholder="0 (o deja vacío si no tuvo costo)"
                className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:font-normal placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Modalidad de Pago */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Forma de pago
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode('un_pago')}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-sm font-semibold transition-all ${
                  paymentMode === 'un_pago'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <DollarSign className="w-4 h-4 text-emerald-600" />
                1 Solo Pago
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('cuotas')}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-sm font-semibold transition-all ${
                  paymentMode === 'cuotas'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                En Cuotas
              </button>
            </div>
          </div>

          {/* Opciones de Cuotas si corresponde */}
          {paymentMode === 'cuotas' && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">Cantidad de cuotas:</span>
                <div className="flex items-center gap-1.5">
                  {[2, 3, 6, 12].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setInstallments(num)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                        installments === num
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {numericCost > 0 && (
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Detalle:</span>
                  <span className="font-bold text-emerald-700">
                    {installments} cuotas de ${calculatedInstallment.toLocaleString('es-AR')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Notas u observaciones */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Observaciones (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ej. Lo hizo Roberto el electricista"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirmar y Guardar Resuelto
          </button>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={handleMarkWithoutCost}
              className="text-slate-500 hover:text-slate-700 underline font-medium py-1"
            >
              Resolver sin costo ($0)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 font-medium py-1"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
