'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  Users,
  Flame,
  ChefHat,
  Heart,
  Printer,
  Edit3,
  Trash2,
  ExternalLink,
  Check,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  GitFork,
  Crown,
  Layers,
} from 'lucide-react';
import { Recipe } from '@/lib/types';
import ServingsAdjuster from '@/components/ServingsAdjuster';
import CookingModeModal from '@/components/CookingModeModal';
import AddRecipeModal from '@/components/AddRecipeModal';
import ForkRecipeModal from '@/components/ForkRecipeModal';
import StarRating from '@/components/StarRating';

export default function RecipeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [masterRecipe, setMasterRecipe] = useState<Recipe | null>(null);
  const [variants, setVariants] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Servings state
  const [servings, setServings] = useState(4);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});

  // Modals state
  const [isCookingModeOpen, setIsCookingModeOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isForkModalOpen, setIsForkModalOpen] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  // Active step timers (step id -> seconds left)
  const [stepTimers, setStepTimers] = useState<Record<string, { seconds: number; running: boolean }>>({});

  const loadRecipeWithVariants = async () => {
    try {
      const res = await fetch(`/api/recipes/${params.id}?withVariants=true`);
      if (!res.ok) {
        throw new Error('Recette non trouvée.');
      }
      const data = await res.json();
      setRecipe(data.recipe);
      setMasterRecipe(data.masterRecipe);
      setVariants(data.variants || []);
      setServings(data.recipe.servings || 4);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger la recette.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecipeWithVariants();
  }, [params.id]);

  // Step timers interval effect
  useEffect(() => {
    const interval = setInterval(() => {
      setStepTimers((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [stepId, timer] of Object.entries(next)) {
          if (timer.running && timer.seconds > 0) {
            changed = true;
            next[stepId] = { ...timer, seconds: timer.seconds - 1 };
            if (next[stepId].seconds === 0) {
              next[stepId].running = false;
              // Chime
              try {
                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioCtx) {
                  const ctx = new AudioCtx();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.frequency.setValueAtTime(659.25, ctx.currentTime);
                  gain.gain.setValueAtTime(0.3, ctx.currentTime);
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.start();
                  osc.stop(ctx.currentTime + 0.6);
                }
              } catch {}
            }
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-stone-500 font-medium">Chargement de votre recette...</p>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="py-20 text-center max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <ChefHat className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900">Recette introuvable</h2>
        <p className="text-stone-500 text-sm">{error || 'Cette recette n’existe pas ou a été supprimée.'}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux recettes</span>
        </Link>
      </div>
    );
  }

  const multiplier = servings / (recipe.servings || 4);

  const toggleIngredientCheck = (id: string) => {
    setCheckedIngredients((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFavoriteToggle = async () => {
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/favorite`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setRecipe((prev) => (prev ? { ...prev, favorite: updated.favorite } : null));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRate = async (newRating: number) => {
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: newRating }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRecipe((prev) => (prev ? { ...prev, rating: updated.rating } : null));
        setVariants((prev) =>
          prev.map((v) => (v.id === updated.id ? { ...v, rating: updated.rating } : v))
        );
      }
    } catch (e) {
      console.error('Rating failed', e);
    }
  };

  const handlePromoteVariant = async (variantId: string) => {
    if (!window.confirm('Voulez-vous définir cette déclinaison comme la recette principale ? L\'ancienne recette principale deviendra une variante.')) {
      return;
    }

    setIsPromoting(true);
    try {
      const res = await fetch(`/api/recipes/${variantId}/promote`, { method: 'POST' });
      if (res.ok) {
        await loadRecipeWithVariants();
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || 'Impossible de promouvoir cette variante.');
      }
    } catch (e) {
      alert('Erreur lors de la promotion de la variante.');
    } finally {
      setIsPromoting(false);
    }
  };

  const handleDelete = async () => {
    const isVariant = !!recipe.parentId;
    const msg = isVariant
      ? 'Voulez-vous vraiment supprimer cette déclinaison ?'
      : (variants.length > 0
          ? `Cette recette principale a ${variants.length} variante(s). En la supprimant, la meilleure variante sera promue comme nouvelle recette principale. Continuer ?`
          : 'Voulez-vous vraiment supprimer cette recette de votre carnet ?');

    if (!window.confirm(msg)) {
      return;
    }

    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, { method: 'DELETE' });
      if (res.ok) {
        if (isVariant && masterRecipe) {
          router.push(`/recipes/${masterRecipe.id}`);
        } else {
          router.push('/');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartTimer = (stepId: string, durationMinutes: number) => {
    setStepTimers((prev) => ({
      ...prev,
      [stepId]: {
        seconds: prev[stepId]?.seconds ?? durationMinutes * 60,
        running: !prev[stepId]?.running,
      },
    }));
  };

  const handleResetTimer = (stepId: string, durationMinutes: number) => {
    setStepTimers((prev) => ({
      ...prev,
      [stepId]: {
        seconds: durationMinutes * 60,
        running: false,
      },
    }));
  };

  const formatTimerSeconds = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const defaultImage =
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80';

  const isCurrentVariant = !!recipe.parentId;
  const allFamilyMembers = masterRecipe
    ? [
        { ...masterRecipe, isMaster: true },
        ...variants.map((v) => ({ ...v, isMaster: false })),
      ]
    : [{ ...recipe, isMaster: true }];

  return (
    <div className="space-y-6 pb-16">
      {/* Back button & Actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Toutes les recettes</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleFavoriteToggle}
            className={`p-2.5 rounded-xl border transition-colors shadow-sm ${
              recipe.favorite
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-white border-stone-200 text-stone-600 hover:text-rose-500'
            }`}
            title={recipe.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart className={`w-4 h-4 ${recipe.favorite ? 'fill-rose-500' : ''}`} />
          </button>

          <button
            onClick={() => window.print()}
            className="p-2.5 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-stone-900 shadow-sm transition-colors"
            title="Imprimer la recette"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="p-2.5 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-orange-600 shadow-sm transition-colors"
            title="Modifier la recette"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            onClick={handleDelete}
            className="p-2.5 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-rose-600 shadow-sm transition-colors"
            title="Supprimer la recette"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* THE ONLY VERSIONS / FORK BAR (Matches user's screenshot) */}
      <div className="bg-[#f0fbf6] border border-[#d1f2e2] p-2.5 px-4 rounded-2xl flex items-center justify-between gap-3 overflow-x-auto no-print shadow-xs">
        <div className="flex items-center gap-2 flex-nowrap">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5 pr-1 flex-shrink-0">
            <Layers className="w-3.5 h-3.5 text-emerald-700" />
            <span>VERSIONS ({allFamilyMembers.length}) :</span>
          </span>

          {allFamilyMembers.map((member) => {
            const isSelected = member.id === recipe.id;
            return (
              <Link
                key={member.id}
                href={`/recipes/${member.id}`}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex-shrink-0 border ${
                  isSelected
                    ? 'bg-[#0b9663] text-white border-[#0b9663] shadow-xs'
                    : 'bg-white hover:bg-emerald-50 text-stone-700 border-stone-200/80 shadow-xs'
                }`}
              >
                {member.isMaster ? (
                  <Crown className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-200' : 'text-amber-500'}`} />
                ) : (
                  <GitFork className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                )}
                <span>{member.variantName || (member.isMaster ? 'Recette principale' : member.title)}</span>
                {member.rating !== undefined && member.rating > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                      isSelected ? 'bg-emerald-800 text-amber-200' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    ★ {member.rating.toFixed(1)}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isCurrentVariant && (
            <button
              onClick={() => handlePromoteVariant(recipe.id)}
              disabled={isPromoting}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs rounded-full shadow-xs transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50"
              title="Définir cette variante comme la recette principale"
            >
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              <span>{isPromoting ? 'Promotion...' : 'Définir comme principale'}</span>
            </button>
          )}

          <button
            onClick={() => setIsForkModalOpen(true)}
            className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold transition-colors shadow-xs active:scale-95"
          >
            <span>+ Déclinaison</span>
          </button>
        </div>
      </div>

      {/* Hero Card */}
      <div className="bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Image */}
          <div className="lg:col-span-5 relative aspect-[16/10] lg:aspect-auto min-h-[260px] bg-stone-100 overflow-hidden">
            <img
              src={recipe.image || defaultImage}
              alt={recipe.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = defaultImage;
              }}
            />
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/90 backdrop-blur-md text-orange-800 shadow-sm">
                {recipe.category}
              </span>
              {recipe.difficulty && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black/50 backdrop-blur-md text-white shadow-sm">
                  {recipe.difficulty}
                </span>
              )}
              {isCurrentVariant && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600/90 backdrop-blur-md text-white shadow-sm flex items-center gap-1">
                  <GitFork className="w-3 h-3" />
                  <span>{recipe.variantName || 'Variante'}</span>
                </span>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 leading-tight">
                {recipe.title}
              </h1>

              {/* STAR RATING COMPONENT */}
              <div className="flex items-center gap-3 pt-0.5">
                <StarRating
                  rating={recipe.rating || 0}
                  interactive={true}
                  size="lg"
                  onRate={handleRate}
                />
                <span className="text-xs text-stone-400">
                  (cliquez sur une étoile pour noter)
                </span>
              </div>

              {recipe.forkNotes && (
                <p className="text-xs text-emerald-800 bg-emerald-50/80 border border-emerald-200/80 px-3 py-2 rounded-xl italic">
                  💡 {recipe.forkNotes}
                </p>
              )}

              {recipe.description && (
                <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
                  {recipe.description}
                </p>
              )}

              {/* Tags */}
              {recipe.tags && recipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {recipe.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-lg bg-stone-100 text-stone-600 text-xs font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Meta Row */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 py-4 border-y border-stone-100 text-center">
              <div>
                <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Préparation
                </p>
                <p className="text-base font-bold text-stone-800 mt-0.5">
                  {recipe.prepTime ? `${recipe.prepTime} min` : '-'}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Cuisson
                </p>
                <p className="text-base font-bold text-stone-800 mt-0.5">
                  {recipe.cookTime ? `${recipe.cookTime} min` : '-'}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Total
                </p>
                <p className="text-base font-bold text-orange-600 mt-0.5">
                  {recipe.totalTime ? `${recipe.totalTime} min` : '-'}
                </p>
              </div>

              <div className="hidden sm:block">
                <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Portions
                </p>
                <p className="text-base font-bold text-stone-800 mt-0.5">
                  {recipe.servings || 4} pers.
                </p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 no-print">
              <button
                onClick={() => setIsCookingModeOpen(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-sm rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                <ChefHat className="w-5 h-5" />
                <span>Lancer le Mode Cuisine Pas-à-Pas</span>
              </button>

              {recipe.sourceUrl && (
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors p-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Voir le site d'origine</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2-Columns Body: Ingredients & Preparation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: INGREDIENTS */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm sticky top-24">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h2 className="text-lg font-bold text-stone-900">Ingrédients</h2>
              <ServingsAdjuster
                currentServings={servings}
                originalServings={recipe.servings || 4}
                onChange={setServings}
              />
            </div>

            <p className="text-xs text-stone-400 mt-2">
              Cochez les ingrédients au fur et à mesure que vous cuisinez.
            </p>

            <ul className="mt-4 space-y-2.5">
              {recipe.ingredients.map((ing) => {
                const isChecked = !!checkedIngredients[ing.id];
                const rawQty = ing.quantity;
                const scaledQty =
                  rawQty !== undefined ? Math.round(rawQty * multiplier * 10) / 10 : undefined;

                return (
                  <li
                    key={ing.id}
                    onClick={() => toggleIngredientCheck(ing.id)}
                    className={`flex items-start gap-3 p-3 rounded-2xl transition-all cursor-pointer border select-none ${
                      isChecked
                        ? 'bg-stone-50/70 border-stone-200/50 text-stone-400 line-through'
                        : 'bg-stone-50/40 hover:bg-stone-50 border-stone-200/80 text-stone-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        isChecked
                          ? 'bg-orange-600 border-orange-600 text-white'
                          : 'border-stone-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </div>

                    <div className="text-sm font-medium leading-snug">
                      {scaledQty !== undefined && (
                        <span className="font-bold text-orange-600 mr-1.5">
                          {scaledQty} {ing.unit || ''}
                        </span>
                      )}
                      <span>{ing.name}</span>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Chef Notes / Tips if any */}
            {recipe.notes && (
              <div className="mt-6 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Astuce du Chef</span>
                </div>
                <p className="leading-relaxed">{recipe.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: PREPARATION STEPS */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h2 className="text-lg font-bold text-stone-900">Préparation</h2>
              <span className="text-xs font-semibold text-stone-500">
                {recipe.instructions.length} étapes
              </span>
            </div>

            <div className="space-y-6">
              {recipe.instructions.map((step) => {
                const timer = stepTimers[step.id];
                const hasTimer = typeof step.durationMinutes === 'number' && step.durationMinutes > 0;

                return (
                  <div key={step.id} className="flex items-start gap-4 group">
                    <div className="w-8 h-8 rounded-2xl bg-orange-100 text-orange-700 font-extrabold flex items-center justify-center flex-shrink-0 text-sm shadow-xs group-hover:scale-105 transition-transform">
                      {step.stepNumber}
                    </div>

                    <div className="flex-1 space-y-3 pt-1">
                      <p className="text-stone-800 text-base leading-relaxed">{step.text}</p>

                      {/* Interactive inline timer for this step */}
                      {hasTimer && (
                        <div className="inline-flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-stone-100 border border-stone-200 text-xs no-print">
                          <Timer className="w-3.5 h-3.5 text-orange-600 ml-1.5" />
                          <span className="font-semibold text-stone-700">
                            {timer
                              ? formatTimerSeconds(timer.seconds)
                              : `${step.durationMinutes} min`}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleStartTimer(step.id, step.durationMinutes!)}
                            className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-[11px] flex items-center gap-1 transition-colors"
                          >
                            {timer?.running ? (
                              <>
                                <Pause className="w-2.5 h-2.5" /> Pause
                              </>
                            ) : (
                              <>
                                <Play className="w-2.5 h-2.5" /> Minuteur
                              </>
                            )}
                          </button>

                          {timer && (
                            <button
                              type="button"
                              onClick={() => handleResetTimer(step.id, step.durationMinutes!)}
                              className="p-1 text-stone-400 hover:text-stone-700"
                              title="Réinitialiser"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isCookingModeOpen && (
        <CookingModeModal
          recipe={recipe}
          servingsMultiplier={multiplier}
          onClose={() => setIsCookingModeOpen(false)}
        />
      )}

      {isEditModalOpen && (
        <AddRecipeModal
          isOpen={isEditModalOpen}
          initialRecipe={recipe}
          onClose={() => setIsEditModalOpen(false)}
          onRecipeAdded={(updated) => {
            setRecipe(updated);
            setIsEditModalOpen(false);
          }}
        />
      )}

      {isForkModalOpen && (
        <ForkRecipeModal
          isOpen={isForkModalOpen}
          parentRecipe={recipe}
          onClose={() => setIsForkModalOpen(false)}
          onForkCreated={(newFork) => {
            router.push(`/recipes/${newFork.id}`);
          }}
        />
      )}
    </div>
  );
}
