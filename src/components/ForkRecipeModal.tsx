'use client';

import React, { useState } from 'react';
import {
  X,
  GitFork,
  Sparkles,
  Plus,
  Trash2,
  Clock,
  Users,
  Flame,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Recipe, Ingredient, InstructionStep } from '@/lib/types';

interface ForkRecipeModalProps {
  isOpen: boolean;
  parentRecipe: Recipe;
  onClose: () => void;
  onForkCreated: (newRecipe: Recipe) => void;
}

const SUGGESTED_VARIANT_NAMES = [
  'Version Allégée',
  'Sans Gluten',
  'Version Végétarienne',
  'Cuisson Airfryer',
  'Version Express (15 min)',
  'Sans Lactose',
  'Extra Épicée',
  'Version Économique',
];

export default function ForkRecipeModal({
  isOpen,
  parentRecipe,
  onClose,
  onForkCreated,
}: ForkRecipeModalProps) {
  if (!isOpen) return null;

  // Master ID is either the parent's parentId (if parent is already a variant) or the parent's id
  const masterId = parentRecipe.parentId || parentRecipe.id;

  const [variantName, setVariantName] = useState('Version alternative');
  const [forkNotes, setForkNotes] = useState('');
  const [title, setTitle] = useState(`${parentRecipe.title} (Variante)`);
  const [description, setDescription] = useState(parentRecipe.description || '');
  const [prepTime, setPrepTime] = useState(parentRecipe.prepTime || 15);
  const [cookTime, setCookTime] = useState(parentRecipe.cookTime || 20);
  const [servings, setServings] = useState(parentRecipe.servings || 4);
  const [difficulty, setDifficulty] = useState(parentRecipe.difficulty || 'Moyen');

  const [ingredients, setIngredients] = useState<Ingredient[]>(
    parentRecipe.ingredients.map((ing, i) => ({
      ...ing,
      id: `fork-ing-${i + 1}-${Date.now()}`,
    }))
  );

  const [instructions, setInstructions] = useState<InstructionStep[]>(
    parentRecipe.instructions.map((step, i) => ({
      ...step,
      id: `fork-step-${i + 1}-${Date.now()}`,
    }))
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVariantNameSelect = (name: string) => {
    setVariantName(name);
    setTitle(`${parentRecipe.title} (${name})`);
  };

  const handleAddIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      {
        id: `ing-${Date.now()}`,
        raw: '',
        quantity: undefined,
        unit: '',
        name: '',
      },
    ]);
  };

  const handleUpdateIngredient = (index: number, field: string, val: any) => {
    setIngredients((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddStep = () => {
    setInstructions((prev) => [
      ...prev,
      {
        id: `step-${Date.now()}`,
        stepNumber: prev.length + 1,
        text: '',
        durationMinutes: undefined,
      },
    ]);
  };

  const handleUpdateStep = (index: number, field: string, val: any) => {
    setInstructions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveStep = (index: number) => {
    setInstructions((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((step, idx) => ({ ...step, stepNumber: idx + 1 }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Veuillez renseigner un titre pour cette variante.');
      return;
    }
    if (!variantName.trim()) {
      setError('Veuillez spécifier le nom court de la variante (ex: Sans gluten, Airfryer...).');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category: parentRecipe.category,
        image: parentRecipe.image,
        sourceType: 'manual',
        prepTime,
        cookTime,
        totalTime: prepTime + cookTime,
        servings,
        difficulty,
        parentId: masterId,
        variantName: variantName.trim(),
        forkNotes: forkNotes.trim() || undefined,
        tags: [...(parentRecipe.tags || []), 'Variante', variantName.trim()],
        ingredients: ingredients.filter((ing) => (ing.name || ing.raw).trim().length > 0),
        instructions: instructions.filter((step) => step.text.trim().length > 0),
      };

      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la création de la variante.');
      }

      onForkCreated(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Impossible de créer la variante.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-stone-900 flex items-center gap-2">
                <span>Créer une déclinaison (Fork)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  Variante
                </span>
              </h2>
              <p className="text-xs text-stone-600 truncate max-w-md">
                À partir de : <strong className="text-stone-800">{parentRecipe.title}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Variant Identity */}
          <div className="space-y-3 bg-stone-50/80 p-4 rounded-2xl border border-stone-200/80">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Nom court de la variante (Badge) *
              </label>
              <input
                type="text"
                value={variantName}
                onChange={(e) => setVariantName(e.target.value)}
                placeholder="Ex: Sans gluten, Airfryer, Version Végétarienne..."
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            {/* Suggestions */}
            <div>
              <p className="text-[11px] font-medium text-stone-500 mb-1.5">Suggestions rapides :</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_VARIANT_NAMES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleVariantNameSelect(name)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      variantName === name
                        ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                        : 'bg-white hover:bg-stone-200 text-stone-600 border border-stone-200'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Fork Notes / Changelog */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span>Ce qui change par rapport à la recette d'origine</span>
                <span className="text-[10px] text-stone-400 font-normal lowercase">(changelog)</span>
              </label>
              <textarea
                value={forkNotes}
                onChange={(e) => setForkNotes(e.target.value)}
                placeholder="Ex: Remplacé la farine de blé par de la farine de riz et fécule de maïs. Temps de cuisson réduit de 5 minutes."
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Section 2: General details */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Titre complet de la recette variante *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                  Préparation (min)
                </label>
                <input
                  type="number"
                  min="0"
                  value={prepTime}
                  onChange={(e) => setPrepTime(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-center font-semibold bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                  Cuisson (min)
                </label>
                <input
                  type="number"
                  min="0"
                  value={cookTime}
                  onChange={(e) => setCookTime(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-center font-semibold bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                  Portions
                </label>
                <input
                  type="number"
                  min="1"
                  value={servings}
                  onChange={(e) => setServings(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-center font-semibold bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                  Difficulté
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-semibold bg-white"
                >
                  <option value="Facile">Facile</option>
                  <option value="Moyen">Moyen</option>
                  <option value="Difficile">Difficile</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Ingrédients de la variante */}
          <div className="pt-2 border-t border-stone-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-stone-900 text-sm">
                  Ingrédients modifiés ({ingredients.length})
                </h3>
                <p className="text-[11px] text-stone-500">
                  Ajustez, ajoutez ou supprimez les ingrédients pour cette version.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddIngredient}
                className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter un ingrédient</span>
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {ingredients.map((ing, idx) => (
                <div
                  key={ing.id || idx}
                  className="flex items-center gap-2 p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs"
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
                    className="w-16 px-2 py-1.5 rounded-lg border border-stone-300 text-center bg-white font-medium"
                  />
                  <input
                    type="text"
                    placeholder="Unité"
                    value={ing.unit ?? ''}
                    onChange={(e) => handleUpdateIngredient(idx, 'unit', e.target.value)}
                    className="w-20 px-2 py-1.5 rounded-lg border border-stone-300 bg-white font-medium"
                  />
                  <input
                    type="text"
                    placeholder="Ingrédient"
                    value={ing.name || ing.raw}
                    onChange={(e) => {
                      handleUpdateIngredient(idx, 'name', e.target.value);
                      handleUpdateIngredient(idx, 'raw', e.target.value);
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 bg-white font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(idx)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Étapes */}
          <div className="pt-2 border-t border-stone-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-stone-900 text-sm">
                  Étapes de préparation ({instructions.length})
                </h3>
              </div>

              <button
                type="button"
                onClick={handleAddStep}
                className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter une étape</span>
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {instructions.map((step, idx) => (
                <div
                  key={step.id || idx}
                  className="flex items-start gap-2 p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs"
                >
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center flex-shrink-0 mt-1">
                    {idx + 1}
                  </span>
                  <textarea
                    rows={2}
                    value={step.text}
                    onChange={(e) => handleUpdateStep(idx, 'text', e.target.value)}
                    placeholder={`Description de l'étape ${idx + 1}...`}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 bg-white"
                  />
                  <div className="flex flex-col items-center gap-1">
                    <input
                      type="number"
                      placeholder="Min"
                      title="Minuteur (minutes)"
                      value={step.durationMinutes ?? ''}
                      onChange={(e) =>
                        handleUpdateStep(
                          idx,
                          'durationMinutes',
                          e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                        )
                      }
                      className="w-14 px-1.5 py-1 rounded-lg border border-stone-300 text-center bg-white text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(idx)}
                      className="p-1 text-stone-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-stone-600 hover:text-stone-900 font-semibold text-xs rounded-xl"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <GitFork className="w-4 h-4" />
              <span>{isSubmitting ? 'Création en cours...' : 'Enregistrer cette déclinaison (Fork)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
