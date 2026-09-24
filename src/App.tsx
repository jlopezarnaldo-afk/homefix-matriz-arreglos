import React from 'react'
import {
  Wrench,
  AlertTriangle,
  Zap,
  CalendarClock,
  Clock,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react'

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">HomeFix</h1>
              <p className="text-xs text-slate-500 font-medium">Matriz de Arreglos del Hogar</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Sistema Listo — M1 Scaffolding
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero Section */}
        <section className="mb-8 bg-linear-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-6 sm:p-8 shadow-md">
          <div className="max-w-2xl">
            <span className="inline-block px-3 py-1 mb-3 text-xs font-semibold bg-white/20 backdrop-blur-xs rounded-full">
              Priorización Inteligente de Reparaciones
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
              Organiza, evalúa y resuelve los arreglos de tu casa
            </h2>
            <p className="text-blue-100 text-sm sm:text-base leading-relaxed mb-6">
              Clasificación automática mediante matriz de impacto, urgencia y costo. Optimizado para móvil y escritorio con sincronización continua.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-blue-100">
              <span className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" /> React 19 + TypeScript
              </span>
              <span className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" /> Tailwind CSS v4
              </span>
              <span className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" /> Supabase + Local Fallback
              </span>
            </div>
          </div>
        </section>

        {/* Quadrant Overview */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" />
                Matriz de Cuadrantes (2x2)
              </h3>
              <p className="text-xs text-slate-500">Distribución de tareas según urgencia y esfuerzo</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Q1: Emergencias */}
            <div className="p-5 rounded-xl border border-red-200 bg-red-50/60 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-red-100 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-red-900 text-sm">Q1 — Emergencias / Crítico</h4>
                    <span className="text-xs text-red-600 font-medium">Alta Urgencia · Alto Esfuerzo</span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-red-200 text-red-800">P1</span>
              </div>
              <p className="text-xs text-red-700 leading-relaxed mb-3">
                Riesgo de daño estructural, agua, electricidad o gas. Atención inmediata requerida.
              </p>
              <div className="text-xs text-slate-500 italic">Ejemplo: Pérdida de agua bajo bacha de cocina</div>
            </div>

            {/* Q2: Quick Wins */}
            <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/60 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-900 text-sm">Q2 — Victorias Rápidas</h4>
                    <span className="text-xs text-emerald-600 font-medium">Alta Urgencia · Bajo Esfuerzo</span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-800">P2</span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed mb-3">
                Alto impacto con resolución ágil en menos de 30 minutos. Máximo retorno de tranquilidad.
              </p>
              <div className="text-xs text-slate-500 italic">Ejemplo: Cambio de cuerito o ajuste de bisagra</div>
            </div>

            {/* Q3: Proyectos a Planificar */}
            <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/60 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-900 text-sm">Q3 — Proyectos a Planificar</h4>
                    <span className="text-xs text-blue-600 font-medium">Baja Urgencia · Alto Esfuerzo / Costo</span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-200 text-blue-800">P3</span>
              </div>
              <p className="text-xs text-blue-700 leading-relaxed mb-3">
                Mejoras importantes que requieren presupuesto o coordinación de especialistas.
              </p>
              <div className="text-xs text-slate-500 italic">Ejemplo: Pintura exterior o remodelación de baño</div>
            </div>

            {/* Q4: Tareas Menores */}
            <div className="p-5 rounded-xl border border-purple-200 bg-purple-50/60 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-purple-900 text-sm">Q4 — Tareas Menores / Postergables</h4>
                    <span className="text-xs text-purple-600 font-medium">Baja Urgencia · Bajo Esfuerzo</span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-200 text-purple-800">P4</span>
              </div>
              <p className="text-xs text-purple-700 leading-relaxed mb-3">
                Detalles estéticos de bajo impacto para atender en momentos de tiempo libre.
              </p>
              <div className="text-xs text-slate-500 italic">Ejemplo: Retoque de masilla o ajuste de tirador</div>
            </div>
          </div>
        </section>

        {/* Next Milestones Status */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
            Hoja de Ruta de Desarrollo
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <div className="font-semibold text-xs text-emerald-950">Hito 1: Scaffolding y Entorno</div>
                  <div className="text-xs text-emerald-700">Vite, React 19, TypeScript, Tailwind CSS, Vercel SPA</div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                Completado
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-xs font-bold text-slate-500">2</div>
                <div>
                  <div className="font-semibold text-xs text-slate-800">Hito 2: Motor de Datos y Persistencia Resiliente</div>
                  <div className="text-xs text-slate-500">Modelo de tareas, algoritmo de prioridad, Supabase client y fallback local</div>
                </div>
              </div>
              <span className="text-xs font-medium text-slate-600 bg-slate-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                Siguiente <ArrowRight className="h-3 w-3" />
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-xs font-bold text-slate-500">3</div>
                <div>
                  <div className="font-semibold text-xs text-slate-800">Hito 3: Vistas Interactivas y Matriz 2x2 Responsiva</div>
                  <div className="text-xs text-slate-500">Vistas Matriz y Lista, modal de carga, filtros dinámicos y acciones rápidas</div>
                </div>
              </div>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                Planificado
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
