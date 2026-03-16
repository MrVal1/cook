import { useState } from 'react'
import { ArrowLeft, Clock, Users, Heart, Edit2, Trash2, ExternalLink, ChefHat, Globe, Minus, Plus, RotateCcw } from 'lucide-react'
import { scaleIngredient, parseServings, formatNumber } from '../utils/scaleIngredients'
import { StepIcon } from '../utils/stepIcons'
import Markdown from './Markdown'

const normalizeStep = s =>
  typeof s === 'string' ? { text: s, icon: '' } : { text: s?.text || '', icon: s?.icon || '' }

export default function RecipeDetail({ recipe, onBack, onEdit, onDelete, onToggleFavorite }) {
  const totalTime = recipe.totalTime || recipe.cookTime || recipe.prepTime

  // --- Servings scaler ---
  const baseServings = parseServings(recipe.servings)
  const [currentServings, setCurrentServings] = useState(baseServings)

  const hasScaler = baseServings !== null && baseServings > 0
  const factor = hasScaler && currentServings > 0 ? currentServings / baseServings : 1
  const isScaled = factor !== 1

  function increment() { setCurrentServings(s => Math.min((s || baseServings) + 1, 99)) }
  function decrement() { setCurrentServings(s => Math.max((s || baseServings) - 1, 1)) }
  function reset() { setCurrentServings(baseServings) }

  // Extract the unit suffix from the original servings string (e.g. " personnes")
  const servingsSuffix = recipe.servings
    ? recipe.servings.replace(/\d+/, '').trim()
    : ''

  // ---

  function handleDelete() {
    if (window.confirm('Supprimer cette recette ? Cette action est irréversible.')) {
      onDelete(recipe.id)
    }
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-amber-700 transition-colors font-medium">
          <ArrowLeft size={20} />
          Retour
        </button>
        <div className="flex gap-2">
          <button onClick={() => onToggleFavorite(recipe.id)} className="p-2 rounded-lg hover:bg-red-50 transition-colors">
            <Heart size={20} className={recipe.favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
          </button>
          <button onClick={onEdit} className="p-2 rounded-lg hover:bg-amber-50 transition-colors text-gray-600 hover:text-amber-700">
            <Edit2 size={20} />
          </button>
          <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500">
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Hero image */}
      {recipe.image ? (
        <div className="rounded-2xl overflow-hidden h-64 mb-5">
          <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="rounded-2xl bg-amber-100 h-40 flex items-center justify-center mb-5">
          <ChefHat size={56} className="text-amber-300" />
        </div>
      )}

      {/* Title & meta */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{recipe.title}</h1>
          {recipe.category && (
            <span className="shrink-0 bg-amber-100 text-amber-700 text-sm font-semibold px-3 py-1 rounded-full">
              {recipe.category}
            </span>
          )}
        </div>

        {recipe.description && (
          <div className="text-gray-600 text-sm mb-4">
            <Markdown>{recipe.description}</Markdown>
          </div>
        )}

        {/* Stats row */}
        <div className="flex flex-wrap gap-4 text-sm">
          {recipe.prepTime && (
            <div className="flex items-center gap-1.5 text-gray-600">
              <Clock size={15} className="text-amber-400" />
              <span><strong>Prépa :</strong> {recipe.prepTime}</span>
            </div>
          )}
          {recipe.cookTime && (
            <div className="flex items-center gap-1.5 text-gray-600">
              <Clock size={15} className="text-amber-400" />
              <span><strong>Cuisson :</strong> {recipe.cookTime}</span>
            </div>
          )}
          {totalTime && !recipe.prepTime && !recipe.cookTime && (
            <div className="flex items-center gap-1.5 text-gray-600">
              <Clock size={15} className="text-amber-400" />
              <span><strong>Durée :</strong> {totalTime}</span>
            </div>
          )}
          {recipe.cuisine && (
            <div className="flex items-center gap-1.5 text-gray-600">
              <Globe size={15} className="text-amber-400" />
              <span>{recipe.cuisine}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {recipe.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {recipe.tags.map(t => (
              <span key={t} className="bg-amber-50 text-amber-700 text-xs font-medium px-3 py-1 rounded-full border border-amber-100">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Ingredients + Scaler */}
      {recipe.ingredients?.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">

          {/* Header with scaler */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="font-bold text-gray-800">Ingrédients</h2>

            {hasScaler ? (
              <div className="flex items-center gap-2">
                {/* Reset button (only visible when scaled) */}
                {isScaled && (
                  <button
                    onClick={reset}
                    title="Remettre la quantité d'origine"
                    className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}

                {/* Stepper */}
                <div className={`flex items-center gap-1 rounded-xl border-2 px-1 py-0.5 transition-colors ${isScaled ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}>
                  <button
                    onClick={decrement}
                    disabled={currentServings <= 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-700"
                  >
                    <Minus size={14} />
                  </button>

                  <div className="flex flex-col items-center min-w-[52px]">
                    <span className="text-base font-bold text-gray-800 leading-none">
                      {currentServings}
                    </span>
                    {servingsSuffix && (
                      <span className="text-[10px] text-gray-400 leading-none mt-0.5">{servingsSuffix}</span>
                    )}
                  </div>

                  <button
                    onClick={increment}
                    disabled={currentServings >= 99}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-700"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Scale badge */}
                {isScaled && (
                  <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                    ×{factor % 1 === 0 ? factor : factor.toFixed(2).replace(/\.?0+$/, '').replace('.', ',')}
                  </span>
                )}
              </div>
            ) : (
              /* No servings count — just show the raw string if any */
              recipe.servings && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Users size={14} className="text-amber-400" />
                  {recipe.servings}
                </div>
              )
            )}
          </div>

          {/* Ingredient list */}
          <ul className="space-y-2">
            {recipe.ingredients.map((ing, i) => {
              const scaled = scaleIngredient(ing, factor)
              const hasQtyOrUnit = scaled.qty || scaled.unit
              return (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-2" />
                  <span className="text-gray-700">
                    {hasQtyOrUnit && (
                      <span className={`transition-colors ${isScaled ? 'text-amber-700 font-semibold' : 'text-gray-600 font-medium'}`}>
                        {[scaled.qty, scaled.unit].filter(Boolean).join(' ')}{' '}
                      </span>
                    )}
                    {scaled.name}
                  </span>
                </li>
              )
            })}
          </ul>

          {/* Helper text when scaled */}
          {isScaled && (
            <p className="text-xs text-amber-500 mt-3 flex items-center gap-1">
              <Users size={11} />
              Quantités ajustées pour {currentServings} {servingsSuffix || 'portion' + (currentServings > 1 ? 's' : '')}
              {' '}(recette originale : {baseServings} {servingsSuffix || 'portion' + (baseServings > 1 ? 's' : '')})
            </p>
          )}
        </div>
      )}

      {/* Steps */}
      {recipe.steps?.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h2 className="font-bold text-gray-800 mb-4">Préparation</h2>
          <ol className="space-y-4">
            {recipe.steps.map((rawStep, i) => {
              const step = normalizeStep(rawStep)
              return (
                <li key={i} className="flex gap-3">
                  {/* Numéro + icône optionnelle */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <span className="bg-amber-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </span>
                    {step.icon && (
                      <span className="text-amber-400" title={step.icon}>
                        <StepIcon iconId={step.icon} size={16} />
                      </span>
                    )}
                  </div>
                  <div className="text-gray-700 text-sm pt-0.5 flex-1">
                    <Markdown>{step.text}</Markdown>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {/* Conseils */}
      {recipe.tips && (
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h2 className="font-bold text-gray-800 mb-3">💡 Conseils</h2>
          <div className="text-gray-700 text-sm">
            <Markdown>{recipe.tips}</Markdown>
          </div>
        </div>
      )}

      {/* Source link */}
      {recipe.sourceUrl && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-amber-600 hover:text-amber-700 text-sm font-medium"
          >
            <ExternalLink size={15} />
            Voir la recette originale
          </a>
        </div>
      )}
    </div>
  )
}
