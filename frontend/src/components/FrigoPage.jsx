import { useState, useMemo } from 'react'
import { X, Plus, Refrigerator, ChefHat, Sparkles, CheckCircle2, Circle } from 'lucide-react'

// ─── Normalisation ────────────────────────────────────────────────────────────
function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Matching engine ──────────────────────────────────────────────────────────
/**
 * Returns { score, matchedIndexes, missingIndexes }
 * score: 0→1  (matched ingredients / total ingredients)
 */
function scoreRecipe(recipe, userIngredients) {
  if (!recipe.ingredients?.length || !userIngredients.length) {
    return { score: 0, matchedIndexes: [], missingIndexes: [] }
  }

  const normUser = userIngredients.map(normalize)
  const matchedIndexes = []
  const missingIndexes = []

  recipe.ingredients.forEach((ing, idx) => {
    const ingName = typeof ing === 'string' ? ing : (ing.name || `${ing.qty || ''} ${ing.unit || ''} ${ing.name || ''}`.trim())
    const normIng = normalize(ingName)
    const hit = normUser.some(u => {
      // ingredient name contains the user's word, or vice versa (handles "oeufs" ↔ "oeuf")
      return normIng.includes(u) || (u.length >= 3 && u.includes(normIng.split(' ')[0]))
    })
    if (hit) matchedIndexes.push(idx)
    else missingIndexes.push(idx)
  })

  return {
    score: matchedIndexes.length / recipe.ingredients.length,
    matchedIndexes,
    missingIndexes,
  }
}

// ─── Score badge ──────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const pct = Math.round(score * 100)
  const cfg =
    pct >= 80 ? { color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50', label: 'Presque tout !' } :
    pct >= 50 ? { color: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50', label: 'Bonne base' } :
    pct >= 25 ? { color: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50', label: 'Partiel' } :
                { color: 'bg-red-400',    text: 'text-red-700',    bg: 'bg-red-50',   label: 'Quelques ingrédients' }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${cfg.bg}`}>
      {/* Bar */}
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${cfg.color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold ${cfg.text}`}>{pct}%</span>
    </div>
  )
}

// ─── Result card ──────────────────────────────────────────────────────────────
function ResultCard({ recipe, result, onSelect }) {
  const { score, matchedIndexes, missingIndexes } = result
  const missingCount = missingIndexes.length

  return (
    <div
      className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group"
      onClick={() => onSelect(recipe)}
    >
      {/* Image strip */}
      <div className="relative h-32 bg-amber-50 overflow-hidden">
        {recipe.image ? (
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ChefHat size={40} className="text-amber-200" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <ScoreBadge score={score} />
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-bold text-gray-800 leading-tight mb-2 group-hover:text-amber-700 transition-colors line-clamp-1">
          {recipe.title}
        </h3>

        {/* Ingredient breakdown */}
        <div className="space-y-1">
          {/* Matched */}
          {matchedIndexes.slice(0, 4).map(idx => {
            const ing = recipe.ingredients[idx]
            const label = typeof ing === 'string' ? ing : (ing.name || `${ing.qty || ''} ${ing.unit || ''} ${ing.name || ''}`.trim())
            return (
              <div key={idx} className="flex items-center gap-1.5 text-xs text-green-700">
                <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                <span className="line-clamp-1">{label}</span>
              </div>
            )
          })}
          {matchedIndexes.length > 4 && (
            <div className="text-xs text-green-600 font-medium pl-4">
              +{matchedIndexes.length - 4} ingrédient{matchedIndexes.length - 4 > 1 ? 's' : ''} disponible{matchedIndexes.length - 4 > 1 ? 's' : ''}
            </div>
          )}

          {/* Missing (only show a few) */}
          {missingIndexes.slice(0, 3).map(idx => {
            const ing = recipe.ingredients[idx]
            const label = typeof ing === 'string' ? ing : (ing.name || `${ing.qty || ''} ${ing.unit || ''} ${ing.name || ''}`.trim())
            return (
              <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-400">
                <Circle size={12} className="shrink-0" />
                <span className="line-clamp-1">{label}</span>
              </div>
            )
          })}
          {missingCount > 3 && (
            <div className="text-xs text-gray-400 pl-4">
              +{missingCount - 3} manquant{missingCount - 3 > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function FrigoPage({ recipes, onSelectRecipe }) {
  const [input, setInput] = useState('')
  const [ingredients, setIngredients] = useState([])

  function addIngredient() {
    const val = input.trim()
    if (val && !ingredients.includes(val)) {
      setIngredients(prev => [...prev, val])
    }
    setInput('')
  }

  function removeIngredient(ing) {
    setIngredients(prev => prev.filter(i => i !== ing))
  }

  function handleKey(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addIngredient()
    }
    if (e.key === 'Backspace' && !input && ingredients.length) {
      setIngredients(prev => prev.slice(0, -1))
    }
  }

  // Score all recipes
  const results = useMemo(() => {
    if (!ingredients.length) return []
    return recipes
      .map(r => ({ recipe: r, result: scoreRecipe(r, ingredients) }))
      .filter(({ result }) => result.score > 0)
      .sort((a, b) => b.result.score - a.result.score)
  }, [recipes, ingredients])

  const perfectMatches = results.filter(r => r.result.score === 1).length

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-amber-500 rounded-xl p-2">
            <Refrigerator size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-amber-900">Qu'est-ce que je cuisine ?</h1>
        </div>
        <p className="text-sm text-gray-500 ml-14">
          Entrez les ingrédients que vous avez, l'app trouve les recettes qui correspondent.
        </p>
      </div>

      {/* Ingredient input */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Mes ingrédients disponibles
        </label>

        {/* Tag input */}
        <div className={`flex flex-wrap gap-2 p-3 rounded-xl border-2 transition-colors ${
          ingredients.length ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'
        }`}>
          {ingredients.map(ing => (
            <span
              key={ing}
              className="flex items-center gap-1 bg-amber-500 text-white text-sm font-medium px-3 py-1 rounded-full"
            >
              {ing}
              <button
                onClick={() => removeIngredient(ing)}
                className="hover:bg-amber-600 rounded-full p-0.5 transition-colors"
              >
                <X size={12} />
              </button>
            </span>
          ))}

          <input
            className="flex-1 min-w-[160px] bg-transparent text-sm focus:outline-none placeholder-gray-400"
            placeholder={ingredients.length ? 'Ajouter… (Entrée)' : 'Ex : farine, oeufs, lait… (Entrée pour valider)'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
          />

          {input.trim() && (
            <button
              onClick={addIngredient}
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-full p-1.5 transition-colors"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {ingredients.length > 0 && (
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-gray-500">
              {ingredients.length} ingrédient{ingredients.length > 1 ? 's' : ''} renseigné{ingredients.length > 1 ? 's' : ''}
            </p>
            <button
              onClick={() => setIngredients([])}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Tout effacer
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {ingredients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Refrigerator size={56} className="mb-4 text-amber-200" />
          <p className="font-medium text-gray-500 text-lg">Remplissez votre frigo !</p>
          <p className="text-sm mt-1 text-center max-w-xs">
            Tapez vos ingrédients ci-dessus et découvrez quelles recettes vous pouvez cuisiner.
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <ChefHat size={48} className="mb-3 text-amber-200" />
          <p className="font-medium text-gray-500">Aucune recette ne correspond.</p>
          <p className="text-sm mt-1">Essayez d'autres ingrédients ou ajoutez plus de recettes à votre collection.</p>
        </div>
      ) : (
        <>
          {/* Summary bar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              <span className="font-semibold text-gray-700">
                {results.length} recette{results.length > 1 ? 's' : ''} trouvée{results.length > 1 ? 's' : ''}
              </span>
            </div>
            {perfectMatches > 0 && (
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                🎉 {perfectMatches} recette{perfectMatches > 1 ? 's' : ''} 100% réalisable{perfectMatches > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map(({ recipe, result }) => (
              <ResultCard
                key={recipe.id}
                recipe={recipe}
                result={result}
                onSelect={onSelectRecipe}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
