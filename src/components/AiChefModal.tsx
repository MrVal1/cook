'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  History,
  Send,
  Loader2,
  CheckCircle2,
  BookmarkPlus,
  Clock,
  Users,
  AlertCircle,
  Trash2,
  ChevronRight,
  KeyRound,
  ChefHat,
  Flame,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { AiHistoryEntry, ScrapedRecipeDraft, Recipe } from '@/lib/types';

interface AiChefModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onRecipeSaved?: (recipe: Recipe) => void;
}

const QUICK_PROMPTS = [
  { label: '🥕 Vider le frigo (restes)', prompt: 'Propose-moi un plat délicieux avec les restes que j\'ai sous la main : ' },
  { label: '⏱️ Dîner express < 20 min', prompt: 'Une idée de dîner complet, sain et prêt en moins de 20 minutes pour ce soir.' },
  { label: '🍫 Dessert gourmand', prompt: 'Un dessert gourmand, réconfortant et facile à réaliser avec du chocolat.' },
  { label: '🥗 Repas végétarien équilibré', prompt: 'Un plat végétarien savoureux, coloré et plein de protéines végétales.' },
  { label: '🇮🇹 Plat italien traditionnel', prompt: 'Une véritable recette italienne authentique et conviviale.' },
];

export default function AiChefModal({
  isOpen,
  onClose,
  onOpenSettings,
  onRecipeSaved,
}: AiChefModalProps) {
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');

  // Generation state
  const [prompt, setPrompt] = useState('');
  const [servingsFilter, setServingsFilter] = useState('4');
  const [timeFilter, setTimeFilter] = useState('');
  const [dietFilter, setDietFilter] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [needApiKey, setNeedApiKey] = useState(false);

  // Result state
  const [generatedResult, setGeneratedResult] = useState<{
    historyEntry: AiHistoryEntry;
    recipe: ScrapedRecipeDraft;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // History state
  const [historyList, setHistoryList] = useState<AiHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<AiHistoryEntry | null>(null);

  // Load history when tab changes to history
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/ai/history');
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data);
      }
    } catch (e) {
      console.error('Error fetching history:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  if (!isOpen) return null;

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;

    setGenError(null);
    setNeedApiKey(false);
    setIsGenerating(true);
    setGeneratedResult(null);
    setSavedSuccess(false);

    let apiKey = '';
    let model = 'gemini-1.5-flash';
    if (typeof window !== 'undefined') {
      apiKey = localStorage.getItem('cook_gemini_api_key') || '';
      model = localStorage.getItem('cook_gemini_model') || 'gemini-1.5-flash';
    }

    // Build composed prompt
    let fullPrompt = prompt.trim();
    if (servingsFilter) fullPrompt += ` (pour ${servingsFilter} personnes)`;
    if (timeFilter) fullPrompt += ` (temps max : ${timeFilter})`;
    if (dietFilter) fullPrompt += ` (régime/allergie : ${dietFilter})`;

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          apiKey,
          model,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needApiKey || res.status === 401) {
          setNeedApiKey(true);
        }
        throw new Error(data.error || 'Erreur lors de la génération.');
      }

      setGeneratedResult(data);
      // Refresh history list in background
      fetchHistory();
    } catch (err: any) {
      setGenError(err.message || 'Impossible de générer la recette.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveRecipe = async (
    recipeDraft: ScrapedRecipeDraft,
    historyEntryId: string
  ) => {
    setIsSaving(true);
    try {
      const payload = {
        title: recipeDraft.title,
        description: recipeDraft.description || '',
        category: recipeDraft.category || 'Plat',
        difficulty: recipeDraft.difficulty || 'Moyen',
        servings: recipeDraft.servings || 4,
        prepTime: recipeDraft.prepTime || 15,
        cookTime: recipeDraft.cookTime || 20,
        image: recipeDraft.image,
        sourceType: 'paste',
        notes: recipeDraft.notes,
        tags: Array.isArray(recipeDraft.tags) ? recipeDraft.tags : [],
        ingredients: recipeDraft.ingredients,
        instructions: recipeDraft.instructions,
      };

      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const saved: Recipe = await res.json();
      if (!res.ok) {
        throw new Error((saved as any).error || 'Erreur lors de la sauvegarde.');
      }

      // Mark history entry as saved
      await fetch('/api/ai/history/mark-saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyId: historyEntryId, recipeId: saved.id }),
      });

      setSavedSuccess(true);
      fetchHistory();

      if (onRecipeSaved) {
        onRecipeSaved(saved);
      }
    } catch (err: any) {
      alert(err.message || 'Erreur de sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/ai/history?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistoryList((prev) => prev.filter((item) => item.id !== id));
        if (selectedHistoryItem?.id === id) {
          setSelectedHistoryItem(null);
        }
      }
    } catch {}
  };

  const handleClearAllHistory = async () => {
    if (confirm('Voulez-vous vraiment effacer tout votre historique de recettes demandées ?')) {
      try {
        const res = await fetch('/api/ai/history?all=true', { method: 'DELETE' });
        if (res.ok) {
          setHistoryList([]);
          setSelectedHistoryItem(null);
        }
      } catch {}
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <span>Le Chef IA</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase tracking-wider">
                  Assistant Culinaire
                </span>
              </h2>
              <p className="text-xs text-stone-500">
                Demandez une recette sur mesure et retrouvez toutes vos idées passées
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSettings}
              className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Configurer la clé API"
            >
              <KeyRound className="w-3.5 h-3.5 text-stone-400" />
              <span className="hidden sm:inline">Clé API</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-stone-200 flex gap-3 bg-stone-50/30">
          <button
            type="button"
            onClick={() => setActiveTab('generate')}
            className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-xs rounded-t-xl transition-all border-b-2 ${
              activeTab === 'generate'
                ? 'border-orange-500 text-orange-600 bg-orange-50/60 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Demander une recette</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-xs rounded-t-xl transition-all border-b-2 ${
              activeTab === 'history'
                ? 'border-orange-500 text-orange-600 bg-orange-50/60 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>
              Historique des demandes {historyList.length > 0 && `(${historyList.length})`}
            </span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: GENERATE */}
          {activeTab === 'generate' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Need API Key Banner */}
              {needApiKey && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <KeyRound className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-amber-900">
                        Clé API Google Gemini requise pour demander des recettes
                      </p>
                      <p className="text-amber-800">
                        Renseignez votre clé API dans les paramètres. C'est 100% gratuit et instantané
                        avec votre compte Google.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onOpenSettings}
                    className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-sm flex-shrink-0 transition-colors"
                  >
                    Ouvrir les Paramètres
                  </button>
                </div>
              )}

              {genError && !needApiKey && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Erreur de génération</p>
                    <p className="mt-0.5">{genError}</p>
                  </div>
                </div>
              )}

              {/* Input Form */}
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Que souhaitez-vous cuisiner ?
                  </label>
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Ex: J'ai 3 blancs de poulet, du curry et une boîte de lait de coco... / Un gâteau sans gluten fondant à la pomme..."
                      className="w-full px-4 py-3 rounded-2xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm shadow-sm"
                    />
                  </div>
                </div>

                {/* Quick suggestions pills */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-stone-400">
                    Idées d'inspirations :
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPrompt(q.prompt)}
                        className="px-3 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-colors"
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Options row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Nombre de convives
                    </label>
                    <select
                      value={servingsFilter}
                      onChange={(e) => setServingsFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                    >
                      <option value="2">2 personnes</option>
                      <option value="4">4 personnes</option>
                      <option value="6">6 personnes</option>
                      <option value="8">8 personnes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Temps disponible
                    </label>
                    <select
                      value={timeFilter}
                      onChange={(e) => setTimeFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                    >
                      <option value="">Pas de limite</option>
                      <option value="moins de 15 minutes">Moins de 15 min</option>
                      <option value="moins de 30 minutes">Moins de 30 min</option>
                      <option value="moins de 45 minutes">Moins de 45 min</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Régime particulier
                    </label>
                    <select
                      value={dietFilter}
                      onChange={(e) => setDietFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                    >
                      <option value="">Classique</option>
                      <option value="végétarien">Végétarien</option>
                      <option value="sans gluten">Sans gluten</option>
                      <option value="sans lactose">Sans lactose</option>
                      <option value="healthy / léger">Healthy / Léger</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isGenerating || !prompt.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-40 text-white font-bold text-sm rounded-2xl shadow-md transition-all active:scale-95 flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Création de la recette en cuisine...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Demander au Chef IA</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Generated Recipe Preview Card */}
              {generatedResult && (
                <div className="mt-8 border border-stone-200 rounded-3xl p-6 bg-stone-50/50 space-y-6 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-200">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Recette générée et conservée dans votre Historique</span>
                    </div>

                    <button
                      type="button"
                      disabled={isSaving || savedSuccess}
                      onClick={() =>
                        handleSaveRecipe(
                          generatedResult.recipe,
                          generatedResult.historyEntry.id
                        )
                      }
                      className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-2 active:scale-95"
                    >
                      {savedSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Enregistrée dans mon carnet !</span>
                        </>
                      ) : isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Enregistrement...</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-4 h-4" />
                          <span>Enregistrer dans mon carnet gourmand</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Recipe content preview */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      {generatedResult.recipe.image && (
                        <div className="w-full sm:w-40 aspect-video sm:aspect-square rounded-2xl overflow-hidden bg-stone-200 flex-shrink-0">
                          <img
                            src={generatedResult.recipe.image}
                            alt={generatedResult.recipe.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="space-y-1.5 flex-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
                          {generatedResult.recipe.category}
                        </span>
                        <h3 className="text-xl font-extrabold text-stone-900 leading-snug">
                          {generatedResult.recipe.title}
                        </h3>
                        {generatedResult.recipe.description && (
                          <p className="text-xs text-stone-600 leading-relaxed">
                            {generatedResult.recipe.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs font-medium text-stone-500 pt-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-orange-500" />
                            {generatedResult.recipe.totalTime} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-stone-400" />
                            {generatedResult.recipe.servings} pers.
                          </span>
                          <span className="flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-stone-400" />
                            {generatedResult.recipe.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ingredients preview */}
                    <div className="pt-2">
                      <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-2">
                        Ingrédients ({generatedResult.recipe.ingredients.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {generatedResult.recipe.ingredients.map((ing: any, i: number) => {
                          const hasQty =
                            ing.quantity !== undefined &&
                            ing.quantity !== null &&
                            String(ing.quantity).trim() !== '';
                          return (
                            <div
                              key={i}
                              className="p-2.5 rounded-xl bg-white border border-stone-200 flex items-start gap-2 shadow-sm"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                              <div className="text-xs leading-snug">
                                {typeof ing === 'string' ? (
                                  <span className="font-semibold text-stone-800">{ing}</span>
                                ) : (
                                  <>
                                    {(hasQty || ing.unit) && (
                                      <strong className="font-bold text-orange-600 mr-1.5 inline-block">
                                        {hasQty ? ing.quantity : ''} {ing.unit || ''}
                                      </strong>
                                    )}
                                    <span className="font-medium text-stone-800">
                                      {ing.name || ing.raw}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Instructions preview */}
                    <div className="pt-2">
                      <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-2">
                        Préparation ({generatedResult.recipe.instructions.length} étapes)
                      </h4>
                      <div className="space-y-2">
                        {generatedResult.recipe.instructions.map((step: any, i: number) => (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-white border border-stone-200 text-xs flex items-start gap-2.5"
                          >
                            <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center flex-shrink-0">
                              {i + 1}
                            </span>
                            <div className="flex-1">
                              <p className="text-stone-800">
                                {typeof step === 'string' ? step : step.text}
                              </p>
                              {typeof step === 'object' && step.durationMinutes && (
                                <span className="inline-block mt-1 text-[11px] text-orange-600 font-semibold">
                                  ⏱️ Minuteur conseillé : {step.durationMinutes} min
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Notes preview */}
                    {generatedResult.recipe.notes && (
                      <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs">
                        <span className="font-bold">Astuce du Chef : </span>
                        <span>{generatedResult.recipe.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HISTORY OF ALL REQUESTED RECIPES */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              {/* History Header bar */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    Historique de toutes les demandes à l'IA
                  </h3>
                  <p className="text-xs text-stone-500">
                    Toutes vos recettes demandées restent accessibles ici, même si vous ne les aviez pas
                    enregistrées.
                  </p>
                </div>
                {historyList.length > 0 && (
                  <button
                    onClick={handleClearAllHistory}
                    className="text-xs text-stone-400 hover:text-rose-600 font-medium flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Tout effacer</span>
                  </button>
                )}
              </div>

              {isLoadingHistory ? (
                <div className="py-16 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-500 mb-2" />
                  <p className="text-xs text-stone-500">Chargement de votre historique...</p>
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-16 text-center max-w-sm mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                    <History className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-stone-800 text-sm">Aucune recette demandée pour le moment</h4>
                  <p className="text-xs text-stone-500">
                    Demandez une première recette au Chef IA dans le premier onglet, elle apparaîtra
                    automatiquement ici.
                  </p>
                  <button
                    onClick={() => setActiveTab('generate')}
                    className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold"
                  >
                    Faire une demande
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyList.map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => setSelectedHistoryItem(entry)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        selectedHistoryItem?.id === entry.id
                          ? 'border-orange-500 bg-orange-50/40 shadow-sm'
                          : 'border-stone-200/80 bg-white hover:border-orange-200 hover:bg-stone-50/50'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        {entry.recipe.image && (
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0">
                            <img
                              src={entry.recipe.image}
                              alt={entry.recipe.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 text-sm">
                              {entry.recipe.title}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-semibold">
                              {entry.recipe.category}
                            </span>
                            {entry.savedToRecipes ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Dans mon carnet
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                                Non enregistrée
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500 line-clamp-1 italic">
                            « {entry.prompt} »
                          </p>
                          <p className="text-[10px] text-stone-400">
                            Demandé le {formatDate(entry.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteHistoryItem(entry.id, e)}
                          className="p-2 text-stone-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Supprimer cette demande"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedHistoryItem(entry)}
                          className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1"
                        >
                          <span>Voir la recette</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Modal or expander when a history item is selected */}
              {selectedHistoryItem && (
                <div className="mt-6 p-6 rounded-3xl bg-stone-50 border border-stone-300 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                    <div>
                      <span className="text-xs text-stone-500">Demande d'origine :</span>
                      <p className="text-xs font-bold text-stone-800 italic">
                        « {selectedHistoryItem.prompt} »
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!selectedHistoryItem.savedToRecipes && (
                        <button
                          onClick={() =>
                            handleSaveRecipe(
                              selectedHistoryItem.recipe,
                              selectedHistoryItem.id
                            )
                          }
                          disabled={isSaving}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
                        >
                          <BookmarkPlus className="w-3.5 h-3.5" />
                          <span>Enregistrer dans mon carnet</span>
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedHistoryItem(null)}
                        className="p-1.5 text-stone-400 hover:text-stone-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-lg font-bold text-stone-900">
                      {selectedHistoryItem.recipe.title}
                    </h4>
                    {selectedHistoryItem.recipe.description && (
                      <p className="text-xs text-stone-600">
                        {selectedHistoryItem.recipe.description}
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                          Ingrédients :
                        </h5>
                        <ul className="text-xs space-y-1.5 text-stone-700">
                          {selectedHistoryItem.recipe.ingredients.map((ing: any, i) => {
                            const hasQty =
                              ing.quantity !== undefined &&
                              ing.quantity !== null &&
                              String(ing.quantity).trim() !== '';
                            return (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-orange-500 font-bold">•</span>
                                <div className="leading-snug">
                                  {typeof ing === 'string' ? (
                                    <span>{ing}</span>
                                  ) : (
                                    <>
                                      {(hasQty || ing.unit) && (
                                        <strong className="text-orange-600 font-bold mr-1.5">
                                          {hasQty ? ing.quantity : ''} {ing.unit || ''}
                                        </strong>
                                      )}
                                      <span className="text-stone-800 font-medium">
                                        {ing.name || ing.raw}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                          Étapes :
                        </h5>
                        <ol className="text-xs space-y-1 text-stone-700 list-decimal list-inside">
                          {selectedHistoryItem.recipe.instructions.map((step: any, i) => (
                            <li key={i}>{typeof step === 'string' ? step : step.text}</li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
