'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Link as LinkIcon,
  Sparkles,
  PenTool,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  ChefHat,
  Send,
  History,
  BookmarkPlus,
  ArrowRight,
  Search,
  KeyRound,
  Clock,
  Users,
  Flame,
} from 'lucide-react';
import {
  Recipe,
  RecipeCategory,
  RecipeDifficulty,
  ScrapedRecipeDraft,
  AiHistoryEntry,
} from '@/lib/types';

interface AddRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipeAdded?: (recipe: Recipe) => void;
  initialRecipe?: Recipe; // If editing an existing recipe
  onOpenSettings?: () => void;
}

const CATEGORIES: RecipeCategory[] = [
  'Plat',
  'Entrée',
  'Dessert',
  'Pains',
  'Apéritif',
  'Petit-déjeuner',
  'Boisson',
  'Autre',
];

const DIFFICULTIES: RecipeDifficulty[] = ['Facile', 'Moyen', 'Difficile'];

const SAMPLE_AI_TEXT = `Voici une super recette de cookies maison aux pépites de chocolat et fleur de sel !

Pour 8 personnes (environ 12 gros cookies) :
Temps de préparation : 15 min
Temps de cuisson : 10 min

Ingrédients :
- 200g de farine de blé
- 120g de beurre doux ramolli
- 100g de sucre roux (cassonade)
- 50g de sucre blanc
- 1 gros oeuf
- 150g de pépites de chocolat noir
- 1 cuillère à café d'extrait de vanille
- 1/2 cuillère à café de bicarbonate de soude
- 1 pincée de fleur de sel

Instructions :
1. Préchauffez le four à 180°C (thermostat 6) et tapissez une plaque de papier sulfurisé.
2. Dans un grand saladier, fouettez le beurre avec les sucres jusqu'à obtenir un mélange bien crémeux.
3. Incorporez l'œuf et l'extrait de vanille, puis mélangez vigoureusement.
4. Ajoutez la farine, le bicarbonate et la fleur de sel. Mélangez délicatement à la spatule sans trop travailler la pâte.
5. Versez les pépites de chocolat et mélangez une dernière fois.
6. Formez des boules de pâte de la taille d'une balle de golf et déposez-les espacées sur la plaque.
7. Enfournez pendant 10 minutes jusqu'à ce que les bords soient dorés mais le centre encore tendre.
8. Laissez refroidir 5 minutes avant de déguster !`;

const SAMPLE_MARMITON_URL =
  'https://www.marmiton.org/recettes/recette_fondant-au-chocolat-rapide_16633.aspx';

const QUICK_PROMPTS = [
  { label: '🥕 Vider le frigo (restes)', prompt: 'Propose-moi un plat délicieux avec les ingrédients que j\'ai sous la main : ' },
  { label: '⏱️ Dîner express < 20 min', prompt: 'Une idée de dîner complet, sain et prêt en moins de 20 minutes pour ce soir.' },
  { label: '🍫 Dessert gourmand', prompt: 'Un dessert gourmand, réconfortant et facile à réaliser avec du chocolat.' },
  { label: '🥗 Végétarien équilibré', prompt: 'Un plat végétarien savoureux, coloré et plein de protéines végétales.' },
  { label: '🇮🇹 Plat italien traditionnel', prompt: 'Une véritable recette italienne authentique et conviviale.' },
];

export default function AddRecipeModal({
  isOpen,
  onClose,
  onRecipeAdded,
  initialRecipe,
  onOpenSettings,
}: AddRecipeModalProps) {
  const [tab, setTab] = useState<'url' | 'paste' | 'ai' | 'manual'>(
    initialRecipe ? 'manual' : 'url'
  );

  // URL state
  const [urlInput, setUrlInput] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Paste state
  const [pasteInput, setPasteInput] = useState('');
  const [isLoadingPaste, setIsLoadingPaste] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');

  // AI Chef tab state
  const [aiSubTab, setAiSubTab] = useState<'generate' | 'history'>('generate');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiServings, setAiServings] = useState('4');
  const [aiTime, setAiTime] = useState('');
  const [aiDiet, setAiDiet] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [needApiKey, setNeedApiKey] = useState(false);
  const [generatedAiResult, setGeneratedAiResult] = useState<{
    historyEntry: AiHistoryEntry;
    recipe: ScrapedRecipeDraft;
  } | null>(null);

  // AI History state
  const [aiHistoryList, setAiHistoryList] = useState<AiHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<AiHistoryEntry | null>(null);

  // Image search state
  const [isSearchingImage, setIsSearchingImage] = useState(false);
  const [candidateImages, setCandidateImages] = useState<string[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    title: initialRecipe?.title || '',
    description: initialRecipe?.description || '',
    category: initialRecipe?.category || ('Plat' as RecipeCategory),
    difficulty: initialRecipe?.difficulty || ('Moyen' as RecipeDifficulty),
    servings: initialRecipe?.servings || 4,
    prepTime: initialRecipe?.prepTime || 15,
    cookTime: initialRecipe?.cookTime || 25,
    image: initialRecipe?.image || '',
    sourceUrl: initialRecipe?.sourceUrl || '',
    notes: initialRecipe?.notes || '',
    tags: initialRecipe?.tags?.join(', ') || '',
  });

  const [ingredients, setIngredients] = useState<
    Array<{ id: string; raw: string; quantity?: number; unit?: string; name: string }>
  >(
    initialRecipe?.ingredients || [
      { id: '1', raw: '', quantity: undefined, unit: '', name: '' },
    ]
  );

  const [instructions, setInstructions] = useState<
    Array<{ id: string; text: string; durationMinutes?: number }>
  >(
    initialRecipe?.instructions?.map((ins) => ({
      id: ins.id,
      text: ins.text,
      durationMinutes: ins.durationMinutes,
    })) || [{ id: '1', text: '', durationMinutes: undefined }]
  );

  const [isSaving, setIsSaving] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Sync API key from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('cook_gemini_api_key') || '';
      if (storedKey) {
        setApiKeyInput(storedKey);
      }
    }
  }, [isOpen]);

  // Load AI history when opening or switching to AI history
  const fetchAiHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/ai/history');
      if (res.ok) {
        const data = await res.json();
        setAiHistoryList(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen && tab === 'ai') {
      fetchAiHistory();
    }
  }, [isOpen, tab]);

  if (!isOpen) return null;

  // Handle URL scraping
  const handleScrapeUrl = async () => {
    if (!urlInput.trim()) {
      setUrlError('Veuillez entrer une URL valide.');
      return;
    }

    setUrlError(null);
    setIsLoadingUrl(true);

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la récupération.');
      }

      setFormData({
        title: data.title || '',
        description: data.description || '',
        category: data.category || 'Plat',
        difficulty: data.difficulty || 'Moyen',
        servings: data.servings || 4,
        prepTime: data.prepTime || 15,
        cookTime: data.cookTime || 25,
        image: data.image || '',
        sourceUrl: data.sourceUrl || urlInput,
        notes: data.notes || '',
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
      });

      if (data.ingredients && data.ingredients.length > 0) {
        setIngredients(data.ingredients);
      }

      if (data.instructions && data.instructions.length > 0) {
        setInstructions(data.instructions);
      }

      setTab('manual');
    } catch (err: any) {
      setUrlError(err.message || 'Impossible d’extraire la recette.');
    } finally {
      setIsLoadingUrl(false);
    }
  };

  // Handle Text parsing
  const handleParseText = async () => {
    if (!pasteInput.trim()) {
      setPasteError('Veuillez coller un texte à analyser.');
      return;
    }

    setPasteError(null);
    setIsLoadingPaste(true);

    try {
      const storedModel = typeof window !== 'undefined' ? localStorage.getItem('cook_gemini_model') : undefined;
      const res = await fetch('/api/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: pasteInput,
          apiKey: apiKeyInput.trim() || undefined,
          model: storedModel || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l’analyse.');
      }

      setFormData({
        title: data.title || '',
        description: data.description || '',
        category: data.category || 'Plat',
        difficulty: data.difficulty || 'Moyen',
        servings: data.servings || 4,
        prepTime: data.prepTime || 15,
        cookTime: data.cookTime || 20,
        image: data.image || '',
        sourceUrl: '',
        notes: data.notes || '',
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
      });

      if (data.ingredients && data.ingredients.length > 0) {
        setIngredients(data.ingredients);
      }

      if (data.instructions && data.instructions.length > 0) {
        setInstructions(data.instructions);
      }

      setTab('manual');
    } catch (err: any) {
      setPasteError(err.message || 'Impossible d’analyser ce texte.');
    } finally {
      setIsLoadingPaste(false);
    }
  };

  // Handle AI Chef Generation
  const handleGenerateAi = async () => {
    if (!aiPrompt.trim()) return;

    setAiError(null);
    setNeedApiKey(false);
    setIsGeneratingAi(true);
    setGeneratedAiResult(null);

    let apiKey = '';
    let model = 'gemini-1.5-flash';
    if (typeof window !== 'undefined') {
      apiKey = localStorage.getItem('cook_gemini_api_key') || '';
      model = localStorage.getItem('cook_gemini_model') || 'gemini-1.5-flash';
    }

    let fullPrompt = aiPrompt.trim();
    if (aiServings) fullPrompt += ` (pour ${aiServings} personnes)`;
    if (aiTime) fullPrompt += ` (temps max : ${aiTime})`;
    if (aiDiet) fullPrompt += ` (régime/allergie : ${aiDiet})`;

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

      setGeneratedAiResult(data);
      fetchAiHistory();
    } catch (err: any) {
      setAiError(err.message || 'Impossible de générer la recette.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Import AI Recipe into Manual Form for Review
  const handleImportAiDraft = (draft: ScrapedRecipeDraft) => {
    setFormData({
      title: draft.title || '',
      description: draft.description || '',
      category: draft.category || 'Plat',
      difficulty: draft.difficulty || 'Moyen',
      servings: draft.servings || 4,
      prepTime: draft.prepTime || 15,
      cookTime: draft.cookTime || 20,
      image: draft.image || '',
      sourceUrl: '',
      notes: draft.notes || '',
      tags: Array.isArray(draft.tags) ? draft.tags.join(', ') : '',
    });

    if (draft.ingredients && draft.ingredients.length > 0) {
      setIngredients(
        draft.ingredients.map((ing: any, i: number) => ({
          id: ing.id || `ing-${i + 1}`,
          raw: typeof ing === 'string' ? ing : ing.raw || ing.name || '',
          quantity: typeof ing === 'object' ? ing.quantity : undefined,
          unit: typeof ing === 'object' ? ing.unit : undefined,
          name: typeof ing === 'object' ? ing.name || ing.raw : ing,
        }))
      );
    }

    if (draft.instructions && draft.instructions.length > 0) {
      setInstructions(
        draft.instructions.map((step: any, i: number) => ({
          id: step.id || `step-${i + 1}`,
          text: typeof step === 'string' ? step : step.text || '',
          durationMinutes: typeof step === 'object' ? step.durationMinutes : undefined,
        }))
      );
    }

    setTab('manual');
  };

  // Direct Save of AI Recipe
  const handleDirectSaveAiRecipe = async (draft: ScrapedRecipeDraft, historyId: string) => {
    setIsSaving(true);
    try {
      const payload = {
        title: draft.title,
        description: draft.description || '',
        category: draft.category || 'Plat',
        difficulty: draft.difficulty || 'Moyen',
        servings: draft.servings || 4,
        prepTime: draft.prepTime || 15,
        cookTime: draft.cookTime || 20,
        image: draft.image,
        sourceType: 'paste',
        notes: draft.notes,
        tags: Array.isArray(draft.tags) ? draft.tags : [],
        ingredients: draft.ingredients,
        instructions: draft.instructions,
      };

      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const saved = await res.json();
      if (!res.ok) {
        throw new Error(saved.error || 'Erreur lors de la sauvegarde.');
      }

      await fetch('/api/ai/history/mark-saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyId, recipeId: saved.id }),
      });

      if (onRecipeAdded) {
        onRecipeAdded(saved);
      }
      onClose();
    } catch (err: any) {
      alert(err.message || 'Impossible de sauvegarder la recette.');
    } finally {
      setIsSaving(false);
    }
  };

  // Search Web Image for Recipe
  const handleSearchWebImage = async () => {
    if (!formData.title.trim()) return;
    setIsSearchingImage(true);
    try {
      const res = await fetch(
        `/api/search-image?q=${encodeURIComponent(formData.title)}&category=${encodeURIComponent(
          formData.category
        )}`
      );
      const data = await res.json();
      if (data.images && data.images.length > 0) {
        setCandidateImages(data.images);
        setFormData((prev) => ({ ...prev, image: data.images[0] }));
      } else if (data.imageUrl) {
        setCandidateImages([data.imageUrl]);
        setFormData((prev) => ({ ...prev, image: data.imageUrl }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingImage(false);
    }
  };

  // Ingredients helpers
  const handleAddIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      { id: `ing-${Date.now()}`, raw: '', quantity: undefined, unit: '', name: '' },
    ]);
  };

  const handleUpdateIngredient = (index: number, field: string, val: any) => {
    setIngredients((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  // Steps helpers
  const handleAddStep = () => {
    setInstructions((prev) => [
      ...prev,
      { id: `step-${Date.now()}`, text: '', durationMinutes: undefined },
    ]);
  };

  const handleUpdateStep = (index: number, field: string, val: any) => {
    setInstructions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleRemoveStep = (index: number) => {
    setInstructions((prev) => prev.filter((_, i) => i !== index));
  };

  // Save recipe
  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setGeneralError('Veuillez renseigner un titre pour la recette.');
      return;
    }

    setGeneralError(null);
    setIsSaving(true);

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        difficulty: formData.difficulty,
        servings: Number(formData.servings) || 4,
        prepTime: Number(formData.prepTime) || 0,
        cookTime: Number(formData.cookTime) || 0,
        image: formData.image.trim() || undefined,
        sourceUrl: formData.sourceUrl.trim() || undefined,
        sourceType: initialRecipe
          ? initialRecipe.sourceType
          : formData.sourceUrl
          ? 'url'
          : pasteInput
          ? 'paste'
          : 'manual',
        notes: formData.notes.trim() || undefined,
        tags: formData.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        ingredients: ingredients.filter((ing) => (ing.name || ing.raw).trim().length > 0),
        instructions: instructions.filter((step) => step.text.trim().length > 0),
      };

      const url = initialRecipe ? `/api/recipes/${initialRecipe.id}` : '/api/recipes';
      const method = initialRecipe ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const saved = await res.json();
      if (!res.ok) {
        throw new Error(saved.error || 'Erreur lors de l’enregistrement');
      }

      if (onRecipeAdded) {
        onRecipeAdded(saved);
      }
      onClose();
    } catch (err: any) {
      setGeneralError(err.message || 'Une erreur est survenue.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
          <div>
            <h2 className="text-xl font-bold text-stone-900">
              {initialRecipe ? 'Modifier la recette' : 'Ajouter une nouvelle recette'}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Par lien web, copier-coller, génération Chef IA ou formulaire manuel
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        {!initialRecipe && (
          <div className="px-6 pt-3 border-b border-stone-200 flex gap-2 overflow-x-auto bg-stone-50/30">
            <button
              type="button"
              onClick={() => setTab('url')}
              className={`flex items-center gap-2 px-3.5 py-2.5 font-medium text-xs sm:text-sm rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
                tab === 'url'
                  ? 'border-orange-500 text-orange-600 bg-orange-50/60 font-semibold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              <span>Par Lien Web</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('paste')}
              className={`flex items-center gap-2 px-3.5 py-2.5 font-medium text-xs sm:text-sm rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
                tab === 'paste'
                  ? 'border-orange-500 text-orange-600 bg-orange-50/60 font-semibold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Copier-Coller Intelligent</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('ai')}
              className={`flex items-center gap-2 px-3.5 py-2.5 font-medium text-xs sm:text-sm rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
                tab === 'ai'
                  ? 'border-orange-500 text-orange-600 bg-orange-50/60 font-semibold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <ChefHat className="w-4 h-4 text-orange-500" />
              <span>Chef IA (Génération)</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('manual')}
              className={`flex items-center gap-2 px-3.5 py-2.5 font-medium text-xs sm:text-sm rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
                tab === 'manual'
                  ? 'border-orange-500 text-orange-600 bg-orange-50/60 font-semibold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <PenTool className="w-4 h-4" />
              <span>Manuel & Vérification {formData.title && `(${formData.title})`}</span>
            </button>
          </div>
        )}

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: BY URL */}
          {tab === 'url' && (
            <div className="space-y-4 max-w-2xl mx-auto py-4">
              {urlError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>{urlError}</p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Lien de la recette (Marmiton, 750g, CuisineAZ, blogs...)
                  </label>
                  <button
                    type="button"
                    onClick={() => setUrlInput(SAMPLE_MARMITON_URL)}
                    className="text-xs text-orange-600 hover:text-orange-700 underline font-medium"
                  >
                    Exemple Marmiton
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://www.marmiton.org/recettes/recette_..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm shadow-sm"
                  />
                  <button
                    onClick={handleScrapeUrl}
                    disabled={isLoadingUrl}
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-300 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-colors"
                  >
                    {isLoadingUrl ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Importation...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Importer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PASTE RAW TEXT */}
          {tab === 'paste' && (
            <div className="space-y-4 max-w-3xl mx-auto py-2">
              {pasteError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>{pasteError}</p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Collez votre texte brut :
                  </label>
                  <button
                    type="button"
                    onClick={() => setPasteInput(SAMPLE_AI_TEXT)}
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium underline"
                  >
                    Exemple de conversation (Cookies)
                  </button>
                </div>

                <textarea
                  rows={8}
                  value={pasteInput}
                  onChange={(e) => setPasteInput(e.target.value)}
                  placeholder="Collez ici votre recette (discussion IA, email, notes, ingrédients en vrac)..."
                  className="w-full px-4 py-3 rounded-2xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-xs leading-relaxed shadow-sm bg-stone-50/50"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParseText}
                  disabled={isLoadingPaste}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {isLoadingPaste ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyse en cours...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyser et Mettre en forme</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: CHEF IA */}
          {tab === 'ai' && (
            <div className="space-y-6 max-w-3xl mx-auto py-2">
              {/* Sub-toggle: Generator vs History */}
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAiSubTab('generate')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      aiSubTab === 'generate'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Générateur</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAiSubTab('history');
                      fetchAiHistory();
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      aiSubTab === 'history'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <History className="w-3.5 h-3.5 text-amber-600" />
                    <span>Historique IA ({aiHistoryList.length})</span>
                  </button>
                </div>

                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1 font-medium"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Clé API Gemini</span>
                  </button>
                )}
              </div>

              {/* Sub-tab: Generate */}
              {aiSubTab === 'generate' && (
                <div className="space-y-5">
                  {aiError && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold">{aiError}</p>
                        {needApiKey && onOpenSettings && (
                          <button
                            type="button"
                            onClick={onOpenSettings}
                            className="mt-1 text-xs font-bold text-rose-700 underline flex items-center gap-1"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Configurer ma clé API Gemini dans les Paramètres</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Suggestions Chips */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                      Idées rapides du Chef :
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_PROMPTS.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAiPrompt(item.prompt)}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-xs font-semibold text-amber-900 transition-all hover:scale-105 active:scale-95"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prompt Textarea */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Que souhaitez-vous cuisiner ?
                    </label>
                    <textarea
                      rows={3}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Ex: J'ai du saumon, des courgettes et de la crème, donne-moi une recette gourmande et rapide..."
                      className="w-full px-4 py-3 rounded-2xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs sm:text-sm bg-white shadow-sm"
                    />
                  </div>

                  {/* Options row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                        Portions
                      </label>
                      <select
                        value={aiServings}
                        onChange={(e) => setAiServings(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-semibold bg-white"
                      >
                        <option value="1">1 personne</option>
                        <option value="2">2 personnes</option>
                        <option value="4">4 personnes</option>
                        <option value="6">6 personnes</option>
                        <option value="8">8 personnes</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                        Temps max
                      </label>
                      <select
                        value={aiTime}
                        onChange={(e) => setAiTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-semibold bg-white"
                      >
                        <option value="">Peu importe</option>
                        <option value="15 minutes">15 minutes</option>
                        <option value="30 minutes">30 minutes</option>
                        <option value="45 minutes">45 minutes</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                        Régime
                      </label>
                      <select
                        value={aiDiet}
                        onChange={(e) => setAiDiet(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-semibold bg-white"
                      >
                        <option value="">Standard</option>
                        <option value="Végétarien">Végétarien</option>
                        <option value="Sans gluten">Sans gluten</option>
                        <option value="Sans lactose">Sans lactose</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleGenerateAi}
                      disabled={isGeneratingAi || !aiPrompt.trim()}
                      className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                    >
                      {isGeneratingAi ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Le Chef compose votre recette...</span>
                        </>
                      ) : (
                        <>
                          <ChefHat className="w-4 h-4" />
                          <span>Générer avec le Chef IA</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* GENERATED RESULT PREVIEW */}
                  {generatedAiResult && (
                    <div className="mt-4 p-5 rounded-3xl bg-amber-50/40 border border-amber-200/80 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 uppercase tracking-wider">
                              {generatedAiResult.recipe.category}
                            </span>
                            <span className="text-xs text-stone-500 font-medium">
                              {generatedAiResult.recipe.totalTime} min • {generatedAiResult.recipe.servings} pers. • {generatedAiResult.recipe.difficulty}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-stone-900 mt-1">
                            {generatedAiResult.recipe.title}
                          </h3>
                          {generatedAiResult.recipe.description && (
                            <p className="text-xs text-stone-600 mt-1">
                              {generatedAiResult.recipe.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Ingredients */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                          Ingrédients :
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {generatedAiResult.recipe.ingredients.map((ing: any, i: number) => {
                            const hasQty =
                              ing.quantity !== undefined &&
                              ing.quantity !== null &&
                              String(ing.quantity).trim() !== '';
                            return (
                              <div
                                key={i}
                                className="p-2 rounded-xl bg-white border border-stone-200 flex items-start gap-2"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                                <div>
                                  {(hasQty || ing.unit) && (
                                    <strong className="text-orange-600 font-bold mr-1.5">
                                      {hasQty ? ing.quantity : ''} {ing.unit || ''}
                                    </strong>
                                  )}
                                  <span className="text-stone-800 font-medium">
                                    {ing.name || ing.raw}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-3 pt-3 border-t border-amber-200/60">
                        <button
                          type="button"
                          onClick={() => handleImportAiDraft(generatedAiResult.recipe)}
                          className="px-4 py-2 bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs rounded-xl border border-stone-300 transition-colors flex items-center gap-1.5 shadow-xs"
                        >
                          <PenTool className="w-3.5 h-3.5 text-stone-600" />
                          <span>Vérifier & Ajuster</span>
                        </button>

                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            handleDirectSaveAiRecipe(
                              generatedAiResult.recipe,
                              generatedAiResult.historyEntry.id
                            )
                          }
                          className="px-5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                        >
                          <BookmarkPlus className="w-3.5 h-3.5" />
                          <span>{isSaving ? 'Enregistrement...' : 'Enregistrer dans mon carnet'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab: History */}
              {aiSubTab === 'history' && (
                <div className="space-y-3">
                  {isLoadingHistory ? (
                    <div className="py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-600 mx-auto" />
                      <p className="text-xs text-stone-500 mt-2">Chargement de l'historique...</p>
                    </div>
                  ) : aiHistoryList.length === 0 ? (
                    <div className="py-12 text-center text-xs text-stone-500 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                      Aucune recette demandée à l'IA pour l'instant.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {aiHistoryList.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-2xl bg-white border border-stone-200 flex items-center justify-between gap-3 hover:border-amber-300 transition-all shadow-xs"
                        >
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <h4 className="font-bold text-stone-900 text-sm truncate">
                              {item.recipe.title}
                            </h4>
                            <p className="text-xs text-stone-500 truncate">
                              Demande : <span className="italic">{item.prompt}</span>
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleImportAiDraft(item.recipe)}
                            className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center gap-1 transition-colors flex-shrink-0"
                          >
                            <span>Utiliser</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MANUAL FORM & VERIFICATION */}
          {tab === 'manual' && (
            <form onSubmit={handleSaveRecipe} className="space-y-6">
              {generalError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>{generalError}</p>
                </div>
              )}

              {/* General details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Titre de la recette *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Tarte Tatin rustique aux pommes"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm font-semibold"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Courte description
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description appétissante ou contexte..."
                    className="w-full px-4 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Catégorie
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as RecipeCategory })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Difficulté
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) =>
                      setFormData({ ...formData, difficulty: e.target.value as RecipeDifficulty })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2 md:col-span-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Portions
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.servings}
                      onChange={(e) =>
                        setFormData({ ...formData, servings: parseInt(e.target.value, 10) || 4 })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Prép. (min)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.prepTime}
                      onChange={(e) =>
                        setFormData({ ...formData, prepTime: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Cuisson (min)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.cookTime}
                      onChange={(e) =>
                        setFormData({ ...formData, cookTime: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                    />
                  </div>
                </div>

                {/* PHOTO SEARCH & INPUT */}
                <div className="md:col-span-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Photo de la recette</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleSearchWebImage}
                      disabled={isSearchingImage || !formData.title.trim()}
                      className="text-xs text-orange-600 hover:text-orange-700 font-semibold underline flex items-center gap-1 disabled:opacity-40"
                    >
                      {isSearchingImage ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Recherche sur le web...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-3 h-3" />
                          <span>Rechercher une photo sur le web</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="Lien de la photo ou cliquez sur 'Rechercher une photo sur le web'"
                      className="flex-1 px-3 py-2 rounded-xl border border-stone-300 text-xs"
                    />
                    {formData.image && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-stone-300 flex-shrink-0">
                        <img
                          src={formData.image}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  {/* Candidate images selection */}
                  {candidateImages.length > 1 && (
                    <div className="space-y-1 pt-1">
                      <p className="text-[11px] font-medium text-stone-500">
                        Photos trouvées sur le web (cliquez pour sélectionner) :
                      </p>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {candidateImages.map((imgUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, image: imgUrl }))}
                            className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                              formData.image === imgUrl
                                ? 'border-orange-500 ring-2 ring-orange-500/30 scale-105'
                                : 'border-stone-200 hover:border-stone-400 opacity-70 hover:opacity-100'
                            }`}
                            title={`Choisir la photo ${idx + 1}`}
                          >
                            <img
                              src={imgUrl}
                              alt={`Option ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {formData.image === imgUrl && (
                              <div className="absolute top-0.5 right-0.5 bg-orange-600 text-white rounded-full p-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* INGREDIENTS */}
              <div className="pt-4 border-t border-stone-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-stone-900 text-base">
                      Ingrédients ({ingredients.length})
                    </h3>
                    <p className="text-xs text-stone-500">
                      Renseignez la quantité, l'unité et le nom de l'ingrédient
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter un ingrédient</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {ingredients.map((ing, idx) => (
                    <div
                      key={ing.id || idx}
                      className="flex items-center gap-2 p-2 rounded-xl bg-stone-50/80 border border-stone-200/80"
                    >
                      <input
                        type="number"
                        step="any"
                        placeholder="Qté"
                        value={ing.quantity ?? ''}
                        onChange={(e) =>
                          handleUpdateIngredient(
                            idx,
                            'quantity',
                            e.target.value === '' ? undefined : parseFloat(e.target.value)
                          )
                        }
                        className="w-20 px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white text-center font-bold text-orange-600"
                      />
                      <input
                        type="text"
                        placeholder="Unité (g, cl...)"
                        value={ing.unit ?? ''}
                        onChange={(e) => handleUpdateIngredient(idx, 'unit', e.target.value)}
                        className="w-24 px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white font-medium"
                      />
                      <input
                        type="text"
                        placeholder="Nom de l'ingrédient (ex: Farine de blé)"
                        value={ing.name || ing.raw}
                        onChange={(e) => {
                          handleUpdateIngredient(idx, 'name', e.target.value);
                          handleUpdateIngredient(idx, 'raw', e.target.value);
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 text-xs bg-white font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(idx)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* INSTRUCTIONS */}
              <div className="pt-4 border-t border-stone-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-stone-900 text-base">
                      Étapes de préparation ({instructions.length})
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une étape</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {instructions.map((step, idx) => (
                    <div
                      key={step.id || idx}
                      className="flex items-start gap-2 p-2 rounded-xl bg-stone-50/80 border border-stone-200/80"
                    >
                      <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-1">
                        {idx + 1}
                      </span>
                      <textarea
                        rows={2}
                        placeholder={`Description de l'étape ${idx + 1}...`}
                        value={step.text}
                        onChange={(e) => handleUpdateStep(idx, 'text', e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <input
                          type="number"
                          placeholder="Min"
                          title="Durée de cuisson ou attente (minutes)"
                          value={step.durationMinutes ?? ''}
                          onChange={(e) =>
                            handleUpdateStep(
                              idx,
                              'durationMinutes',
                              e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                            )
                          }
                          className="w-14 px-2 py-1 rounded-lg border border-stone-300 text-xs text-center bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(idx)}
                          className="p-1 text-stone-400 hover:text-rose-600 rounded"
                          title="Supprimer cette étape"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Astuce de chef */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Astuce ou conseil du chef (facultatif)
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ex: Utiliser du beurre bien froid pour un croustillant parfait."
                  className="w-full px-4 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:text-stone-800 text-sm font-semibold transition-colors"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:bg-orange-300 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{initialRecipe ? 'Mettre à jour' : 'Enregistrer dans mon carnet'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
