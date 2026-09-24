/**
 * HomeFix Data Model & Type Definitions
 * 
 * Defines core domain entities, enums, label dictionaries, color styles,
 * and comprehensive input validation rules.
 */

export type RoomId = 'cocina' | 'baño' | 'bano' | 'living' | 'dormitorio' | 'exterior' | 'general';
export type ExecutionType = 'diy' | 'profesional';
export type TaskStatus = 'pendiente' | 'en_proceso' | 'listo';
export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4';
export type PriorityCategory = PriorityLevel;
export type QuadrantId = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export type PaymentMode = 'un_pago' | 'cuotas';

export interface Task {
  id: string;
  title: string;
  room: RoomId;
  urgency: number; // 1 to 5 (1=Baja, 3=Media, 5=Urgente)
  effort: number;  // 1 to 5
  cost?: number | null;
  execution_type: ExecutionType;
  status: TaskStatus;
  payment_mode?: PaymentMode | null;
  installments_count?: number | null;
  installment_amount?: number | null;
  resolved_at?: string | null;
  resolved_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ComputedTask extends Task {
  priority: PriorityLevel;
  quadrant: QuadrantId;
  priority_score: number; // 0.00 to 100.00
  priority_label: string;
  quadrant_title: string;
  priorityScore?: number;
  priorityLabel?: string;
  quadrantTitle?: string;
}

// ---------------------------------------------------------------------------
// Constants & Enums
// ---------------------------------------------------------------------------

export const VALID_ROOMS: RoomId[] = [
  'cocina',
  'baño',
  'bano',
  'living',
  'dormitorio',
  'exterior',
  'general'
];

export const VALID_EXECUTION_TYPES: ExecutionType[] = ['diy', 'profesional'];
export const VALID_STATUSES: TaskStatus[] = ['pendiente', 'en_proceso', 'listo'];
export const HIGH_COST_THRESHOLD = 50000;

// ---------------------------------------------------------------------------
// Label Mappings & Metadata Dictionaries
// ---------------------------------------------------------------------------

export interface RoomDefinition {
  id: RoomId;
  label: string;
  iconName: string;
  colorClass: string;
  badgeClass: string;
  bgClass: string;
  borderClass: string;
}

export const ROOMS: Record<RoomId, RoomDefinition> = {
  cocina: {
    id: 'cocina',
    label: 'Cocina',
    iconName: 'Utensils',
    colorClass: 'text-amber-600',
    badgeClass: 'text-amber-700 bg-amber-50 border-amber-200',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200'
  },
  baño: {
    id: 'baño',
    label: 'Baño',
    iconName: 'Bath',
    colorClass: 'text-sky-600',
    badgeClass: 'text-sky-700 bg-sky-50 border-sky-200',
    bgClass: 'bg-sky-50',
    borderClass: 'border-sky-200'
  },
  bano: {
    id: 'bano',
    label: 'Baño',
    iconName: 'Bath',
    colorClass: 'text-sky-600',
    badgeClass: 'text-sky-700 bg-sky-50 border-sky-200',
    bgClass: 'bg-sky-50',
    borderClass: 'border-sky-200'
  },
  living: {
    id: 'living',
    label: 'Living',
    iconName: 'Armchair',
    colorClass: 'text-indigo-600',
    badgeClass: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    bgClass: 'bg-indigo-50',
    borderClass: 'border-indigo-200'
  },
  dormitorio: {
    id: 'dormitorio',
    label: 'Dormitorio',
    iconName: 'Bed',
    colorClass: 'text-purple-600',
    badgeClass: 'text-purple-700 bg-purple-50 border-purple-200',
    bgClass: 'bg-purple-50',
    borderClass: 'border-purple-200'
  },
  exterior: {
    id: 'exterior',
    label: 'Exterior / Jardín',
    iconName: 'Trees',
    colorClass: 'text-emerald-600',
    badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200'
  },
  general: {
    id: 'general',
    label: 'General',
    iconName: 'Home',
    colorClass: 'text-slate-600',
    badgeClass: 'text-slate-700 bg-slate-50 border-slate-200',
    bgClass: 'bg-slate-50',
    borderClass: 'border-slate-200'
  }
};

export const ROOM_LABELS: Record<RoomId, string> = {
  cocina: 'Cocina',
  baño: 'Baño',
  bano: 'Baño',
  living: 'Living',
  dormitorio: 'Dormitorio',
  exterior: 'Exterior / Jardín',
  general: 'General'
};

export interface ExecutionTypeDefinition {
  id: ExecutionType;
  label: string;
  badgeLabel: string;
  iconName: string;
  colorClass: string;
  badgeClass: string;
}

export const EXECUTION_TYPES: Record<ExecutionType, ExecutionTypeDefinition> = {
  diy: {
    id: 'diy',
    label: 'Hacerlo yo mismo (DIY)',
    badgeLabel: 'DIY',
    iconName: 'Hammer',
    colorClass: 'text-emerald-600',
    badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200'
  },
  profesional: {
    id: 'profesional',
    label: 'Llamar a un técnico/profesional',
    badgeLabel: 'Profesional',
    iconName: 'UserCheck',
    colorClass: 'text-blue-600',
    badgeClass: 'text-blue-700 bg-blue-50 border-blue-200'
  }
};

export const EXECUTION_TYPE_LABELS: Record<ExecutionType, string> = {
  diy: 'Hacerlo yo mismo (DIY)',
  profesional: 'Llamar a un técnico/profesional'
};

export interface StatusDefinition {
  id: TaskStatus;
  label: string;
  badgeClass: string;
  dotClass: string;
}

export const STATUS_DEFINITIONS: Record<TaskStatus, StatusDefinition> = {
  pendiente: {
    id: 'pendiente',
    label: 'Pendiente',
    badgeClass: 'text-amber-700 bg-amber-50 border-amber-200',
    dotClass: 'bg-amber-500'
  },
  en_proceso: {
    id: 'en_proceso',
    label: 'En proceso',
    badgeClass: 'text-blue-700 bg-blue-50 border-blue-200',
    dotClass: 'bg-blue-500'
  },
  listo: {
    id: 'listo',
    label: 'Listo',
    badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    dotClass: 'bg-emerald-500'
  }
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  listo: 'Listo'
};

export interface PriorityDefinition {
  category: PriorityLevel;
  label: string;
  title: string;
  subtitle: string;
  badgeClass: string;
  borderClass: string;
  bgLightClass: string;
  textClass: string;
}

export const PRIORITY_DEFINITIONS: Record<PriorityLevel, PriorityDefinition> = {
  P1: {
    category: 'P1',
    label: 'P1 - Emergencia / Crítico',
    title: 'Emergencia / Crítico',
    subtitle: 'Atención inmediata requerida (alto riesgo o daño)',
    badgeClass: 'text-red-700 bg-red-50 border-red-200',
    borderClass: 'border-red-300',
    bgLightClass: 'bg-red-50/60',
    textClass: 'text-red-700'
  },
  P2: {
    category: 'P2',
    label: 'P2 - Quick Win',
    title: 'Quick Win / Victoria Rápida',
    subtitle: 'Bajo esfuerzo y alta recompensa o urgencia',
    badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    borderClass: 'border-emerald-300',
    bgLightClass: 'bg-emerald-50/60',
    textClass: 'text-emerald-700'
  },
  P3: {
    category: 'P3',
    label: 'P3 - Proyecto Planificado',
    title: 'Proyecto Planificado',
    subtitle: 'Mayor esfuerzo o costo; planificar con tiempo',
    badgeClass: 'text-blue-700 bg-blue-50 border-blue-200',
    borderClass: 'border-blue-300',
    bgLightClass: 'bg-blue-50/60',
    textClass: 'text-blue-700'
  },
  P4: {
    category: 'P4',
    label: 'P4 - Postergable',
    title: 'Postergable / Tarea Menor',
    subtitle: 'Baja urgencia y bajo esfuerzo; hacer en tiempo libre',
    badgeClass: 'text-slate-600 bg-slate-50 border-slate-200',
    borderClass: 'border-slate-300',
    bgLightClass: 'bg-slate-50/60',
    textClass: 'text-slate-600'
  }
};

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  P1: 'P1 - Emergencia / Crítico',
  P2: 'P2 - Quick Win',
  P3: 'P3 - Proyecto Planificado',
  P4: 'P4 - Postergable'
};

export interface QuadrantDefinition {
  id: QuadrantId;
  title: string;
  subtitle: string;
  urgencyLabel: string;
  effortLabel: string;
  badgeClass: string;
  borderClass: string;
  headerBgClass: string;
}

export const QUADRANT_DEFINITIONS: Record<QuadrantId, QuadrantDefinition> = {
  Q1: {
    id: 'Q1',
    title: 'Q1 — Emergencias / Crítico',
    subtitle: 'Alta Urgencia + Alto Esfuerzo',
    urgencyLabel: 'Urgencia Alta (4-5)',
    effortLabel: 'Esfuerzo Alto (3-5)',
    badgeClass: 'text-red-700 bg-red-100 border-red-300',
    borderClass: 'border-red-200',
    headerBgClass: 'bg-red-50 text-red-900 border-red-200'
  },
  Q2: {
    id: 'Q2',
    title: 'Q2 — Victorias Rápidas (Quick Wins)',
    subtitle: 'Alta Urgencia + Bajo Esfuerzo',
    urgencyLabel: 'Urgencia Media/Alta (3-5)',
    effortLabel: 'Esfuerzo Bajo (1-2)',
    badgeClass: 'text-emerald-700 bg-emerald-100 border-emerald-300',
    borderClass: 'border-emerald-200',
    headerBgClass: 'bg-emerald-50 text-emerald-900 border-emerald-200'
  },
  Q3: {
    id: 'Q3',
    title: 'Q3 — Proyectos a Planificar',
    subtitle: 'Baja Urgencia + Alto Esfuerzo',
    urgencyLabel: 'Urgencia Baja/Mod (1-3)',
    effortLabel: 'Esfuerzo Alto (3-5)',
    badgeClass: 'text-blue-700 bg-blue-100 border-blue-300',
    borderClass: 'border-blue-200',
    headerBgClass: 'bg-blue-50 text-blue-900 border-blue-200'
  },
  Q4: {
    id: 'Q4',
    title: 'Q4 — Tareas Menores / Postergables',
    subtitle: 'Baja Urgencia + Bajo Esfuerzo',
    urgencyLabel: 'Urgencia Baja (1-2)',
    effortLabel: 'Esfuerzo Bajo (1-2)',
    badgeClass: 'text-slate-700 bg-slate-100 border-slate-300',
    borderClass: 'border-slate-200',
    headerBgClass: 'bg-slate-50 text-slate-800 border-slate-200'
  }
};

export const QUADRANT_TITLES: Record<QuadrantId, string> = {
  Q1: 'Q1 — Emergencias / Crítico',
  Q2: 'Q2 — Victorias Rápidas (Quick Wins)',
  Q3: 'Q3 — Proyectos a Planificar',
  Q4: 'Q4 — Tareas Menores / Postergables'
};

// ---------------------------------------------------------------------------
// Normalization & Validation Functions
// ---------------------------------------------------------------------------

/**
 * Normalizes room name for diacritic tolerance ('bano' -> 'baño' or vice versa)
 */
export function normalizeRoom(room: string): RoomId {
  const r = room.toLowerCase().trim();
  if (r === 'bano' || r === 'baño') return 'baño';
  if (VALID_ROOMS.includes(r as RoomId)) return r as RoomId;
  throw new Error(`Invalid room identifier: ${room}`);
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates task payload against HomeFix schema constraints
 */
export function validateTask(input: Partial<Task>): ValidationResult {
  const errors: Record<string, string> = {};

  // Title validation: min 3 chars, max 120 chars, trimmed
  if (!input.title || typeof input.title !== 'string') {
    errors.title = 'El título es requerido';
  } else {
    const trimmed = input.title.trim();
    if (trimmed.length < 3) {
      errors.title = 'El título debe tener al menos 3 caracteres';
    } else if (trimmed.length > 120) {
      errors.title = 'El título no puede exceder los 120 caracteres';
    }
  }

  // Room validation
  if (!input.room) {
    errors.room = 'El ambiente es requerido';
  } else {
    const r = input.room.toLowerCase().trim();
    if (!VALID_ROOMS.includes(r as RoomId)) {
      errors.room = `Ambiente inválido: ${input.room}`;
    }
  }

  // Urgency validation (1 to 5)
  if (input.urgency === undefined || input.urgency === null) {
    errors.urgency = 'La urgencia es requerida';
  } else if (!Number.isInteger(input.urgency) || input.urgency < 1 || input.urgency > 5) {
    errors.urgency = 'La urgencia debe ser un entero entre 1 y 5';
  }

  // Effort validation (1 to 5)
  if (input.effort === undefined || input.effort === null) {
    errors.effort = 'El esfuerzo es requerido';
  } else if (!Number.isInteger(input.effort) || input.effort < 1 || input.effort > 5) {
    errors.effort = 'El esfuerzo debe ser un entero entre 1 y 5';
  }

  // Cost validation (optional, >= 0, <= 99,999,999)
  if (input.cost !== undefined && input.cost !== null) {
    if (typeof input.cost !== 'number' || isNaN(input.cost) || input.cost < 0) {
      errors.cost = 'El costo debe ser un número mayor o igual a 0';
    } else if (input.cost > 99999999) {
      errors.cost = 'El costo excede el límite permitido';
    }
  }

  // Execution type validation
  if (!input.execution_type) {
    errors.execution_type = 'El tipo de ejecución es requerido';
  } else if (!VALID_EXECUTION_TYPES.includes(input.execution_type)) {
    errors.execution_type = `Tipo de ejecución inválido: ${input.execution_type}`;
  }

  // Status validation (optional, if provided must be in VALID_STATUSES)
  if (input.status && !VALID_STATUSES.includes(input.status)) {
    errors.status = `Estado inválido: ${input.status}`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export const validateTaskInput = validateTask;
