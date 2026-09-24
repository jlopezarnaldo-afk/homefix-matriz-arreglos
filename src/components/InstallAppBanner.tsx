import React, { useState, useEffect } from 'react';
import { Download, Share2, PlusSquare, X, Smartphone, Sparkles } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallAppBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already running as installed standalone PWA
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // Check if device is iOS (iPhone/iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // Listen for Android/Chrome native install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsDismissed(true);
      }
    } else {
      // Fallback instruction modal for Chrome / other browsers
      setShowIOSModal(true);
    }
  };

  // If already installed or dismissed, don't show the bottom banner
  if (isStandalone) return null;

  return (
    <>
      {/* Banner flotante de instalación (Mobile-friendly) */}
      {!isDismissed && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-3.5 sm:p-4 rounded-2xl shadow-xl border border-white/20 backdrop-blur-md animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white text-blue-700 flex items-center justify-center shrink-0 shadow-sm">
                <Smartphone className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold leading-snug">
                  Instalar HomeFix en tu celular
                </p>
                <p className="text-[11px] text-blue-100 mt-0.5">
                  Acceso directo sin abrir el navegador, 100% como app
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-3.5 py-2 bg-white text-blue-800 hover:bg-blue-50 font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 min-h-[40px]"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Instalar</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="p-2 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal interactivo con pasos para iPhone / Android / PC */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 overflow-hidden text-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {isIOS ? 'Instalar en tu iPhone' : 'Instalar HomeFix'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pasos para iPhone */}
            {isIOS ? (
              <div className="space-y-3.5 text-xs text-slate-600">
                <p className="font-medium text-slate-800">
                  Sigue estos 3 pasos rápidos en Safari:
                </p>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      Toca el botón Compartir
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                      El icono del cuadrito con la flecha hacia arriba (<Share2 className="w-3.5 h-3.5 inline text-blue-600" />) en la barra inferior de Safari.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      Selecciona "Agregar a inicio"
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                      Desliza hacia abajo en el menú y toca <PlusSquare className="w-3.5 h-3.5 inline text-blue-600" /> <b>"Agregar a la pantalla de inicio"</b>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      Toca "Agregar"
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Arriba a la derecha. ¡Listo! Ya tienes el icono de la app en la pantalla principal de tu iPhone.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Pasos para Android / Chrome / PC */
              <div className="space-y-3.5 text-xs text-slate-600">
                <p className="font-medium text-slate-800">
                  Para instalar en tu dispositivo:
                </p>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                  <p className="font-bold mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" /> En Android / Chrome:
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Toca los 3 puntos (<b>⋮</b>) del menú de tu navegador y selecciona <b>"Instalar aplicación"</b> o <b>"Agregar a la pantalla principal"</b>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="font-bold text-slate-800 mb-1">
                    En computadora (PC / Mac):
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Haz clic en el icono de instalación en la barra de direcciones de Chrome o Edge para tener la app en tu escritorio.
                  </p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
