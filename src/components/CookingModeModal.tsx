'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Check,
  CheckCircle2,
  Sparkles,
  ListOrdered,
  ChefHat,
  Trophy,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Recipe } from '@/lib/types';

interface CookingModeModalProps {
  recipe: Recipe;
  servingsMultiplier: number;
  onClose: () => void;
}

export default function CookingModeModal({
  recipe,
  servingsMultiplier,
  onClose,
}: CookingModeModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showIngredientsDrawer, setShowIngredientsDrawer] = useState(false);

  // Timer state for current step
  const currentStep = recipe.instructions[currentStepIndex];
  const stepDurationMinutes = currentStep?.durationMinutes;

  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number | null>(
    stepDurationMinutes ? stepDurationMinutes * 60 : null
  );
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Reset timer when changing step
  useEffect(() => {
    if (stepDurationMinutes) {
      setTimerSecondsLeft(stepDurationMinutes * 60);
    } else {
      setTimerSecondsLeft(null);
    }
    setIsTimerRunning(false);
  }, [currentStepIndex, stepDurationMinutes]);

  // Sound chime via Web Audio API
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch {
      // Audio might be blocked if user hasn't interacted
    }
  };

  // Timer countdown effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSecondsLeft !== null && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            setIsTimerRunning(false);
            playChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSecondsLeft]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < recipe.instructions.length - 1) {
      if (!completedSteps.includes(currentStepIndex)) {
        setCompletedSteps([...completedSteps, currentStepIndex]);
      }
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Finished all steps!
      if (!completedSteps.includes(currentStepIndex)) {
        setCompletedSteps([...completedSteps, currentStepIndex]);
      }
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalSteps = recipe.instructions.length;
  const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);
  const isFinished = completedSteps.length === totalSteps;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/95 text-stone-100 flex flex-col justify-between overflow-hidden animate-in fade-in select-none">
      {/* Top Bar */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-stone-800 bg-stone-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-600/30 border border-orange-500/40 flex items-center justify-center text-orange-400">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide line-clamp-1">
              Mode Cuisine : {recipe.title}
            </h2>
            <p className="text-xs text-stone-400">
              Étape {currentStepIndex + 1} sur {totalSteps} ({progressPercent}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowIngredientsDrawer(!showIngredientsDrawer)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors"
          >
            <ListOrdered className="w-4 h-4 text-orange-400" />
            <span>Ingrédients</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            title="Quitter le mode cuisine (Échap)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-stone-800 h-1.5">
        <div
          className="bg-gradient-to-r from-orange-500 to-amber-400 h-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto px-6 py-8 text-center relative w-full">
        {isFinished && currentStepIndex === totalSteps - 1 ? (
          <div className="space-y-6 max-w-lg animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400">
              <Trophy className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white">Félicitations, Chef !</h1>
              <p className="text-stone-300 text-base mt-2">
                Vous avez terminé toutes les étapes de la recette. Bon appétit !
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-8 py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-base shadow-lg transition-all"
            >
              Fermer le mode cuisine
            </button>
          </div>
        ) : (
          <div className="space-y-8 max-w-3xl">
            {/* Step badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-semibold tracking-wider uppercase">
              Étape {currentStepIndex + 1}
            </div>

            {/* Step Instructions Text */}
            <p className="text-2xl sm:text-3xl md:text-4xl font-medium leading-relaxed sm:leading-snug text-stone-100 max-w-2xl mx-auto">
              {currentStep?.text}
            </p>

            {/* Optional Integrated Timer */}
            {timerSecondsLeft !== null && (
              <div className="p-6 rounded-3xl bg-stone-900/90 border border-stone-800 shadow-xl inline-flex flex-col items-center gap-4 mx-auto backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <span className="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-amber-400">
                    {formatTimer(timerSecondsLeft)}
                  </span>
                  {timerSecondsLeft === 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse font-semibold">
                      Terminé !
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs shadow-md transition-all active:scale-95"
                  >
                    {isTimerRunning ? (
                      <>
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" /> Démarrer
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setIsTimerRunning(false);
                      setTimerSecondsLeft(stepDurationMinutes ? stepDurationMinutes * 60 : 0);
                    }}
                    className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors"
                    title="Réinitialiser"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sliding Ingredients Drawer */}
        {showIngredientsDrawer && (
          <div className="absolute top-0 right-0 bottom-0 w-80 bg-stone-900 border-l border-stone-800 p-6 flex flex-col text-left shadow-2xl animate-in slide-in-from-right duration-200 z-10">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <h3 className="font-bold text-stone-200 text-sm uppercase tracking-wider">
                Ingrédients ({recipe.ingredients.length})
              </h3>
              <button
                onClick={() => setShowIngredientsDrawer(false)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
              {recipe.ingredients.map((ing) => {
                const adjustedQty =
                  ing.quantity !== undefined
                    ? Math.round(ing.quantity * servingsMultiplier * 10) / 10
                    : undefined;
                return (
                  <div
                    key={ing.id}
                    className="text-xs p-2.5 rounded-xl bg-stone-800/60 border border-stone-700/50 flex items-start gap-2 text-stone-300"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                    <div>
                      {adjustedQty !== undefined && (
                        <span className="font-bold text-amber-400 mr-1.5">
                          {adjustedQty} {ing.unit || ''}
                        </span>
                      )}
                      <span>{ing.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="px-6 py-5 border-t border-stone-800 bg-stone-900/60 backdrop-blur-md flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentStepIndex === 0}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-300 font-semibold text-sm transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Étape précédente</span>
        </button>

        <div className="flex items-center gap-1.5">
          {recipe.instructions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStepIndex(idx)}
              className={`w-3 h-3 rounded-full transition-all ${
                idx === currentStepIndex
                  ? 'bg-orange-500 scale-125'
                  : completedSteps.includes(idx)
                  ? 'bg-emerald-500/70'
                  : 'bg-stone-700'
              }`}
              title={`Aller à l'étape ${idx + 1}`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold text-sm shadow-lg transition-all active:scale-95"
        >
          <span>
            {currentStepIndex === totalSteps - 1 ? 'Terminer la recette 🎉' : 'Étape suivante'}
          </span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
