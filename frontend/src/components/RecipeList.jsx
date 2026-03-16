import { useState } from 'react'
import { Search, Heart, ChefHat, ArrowUpDown } from 'lucide-react'
import RecipeCard from './RecipeCard'

const FILTERS = [
  { key: 'all', label: 'Toutes' },
  { key: 'favorite', label: 'Favoris' },
]

const SORT_OPTIONS = [
  { value: 'newest',    label: '✦ Plus récent' },
  { value: 'oldest',   label: '✦ Plus ancien' },
  { value: 'az',       label: 'A → Z' },
  { value: 'za',       label: 'Z → A' },
  { value: 'preptime', label: '⏱ Prépa ↑' },
  { value: 'totaltime',label: '⏱ Temps total ↑' },
]

/** Parse "30 min", "1h", "1h 30min", "2h30" → minutes (Infinity if absent) */
function parseMinutes(str) {
  if (!str) return Infinity
  const h = parseInt(str.match(/(\d+)\s*h/)?.[1] ?? '0')
  const m = parseInt(str.match(/(\d+)\s*min/)?.[1] ?? '0')
  const total = h * 60 + m
  return total > 0 ? total : Infinity
}

function sortRecipes(recipes, sortKey) {
  const arr = [...recipes]
  switch (sortKey) {
    case 'newest':
      return arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    case 'oldest':
      return arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    case 'az':
      return arr.sort((a, b) => a.title.localeCompare(b.title, 'fr'))
    case 'za':
      return arr.sort((a, b) => b.title.localeCompare(a.title, 'fr'))
    case 'preptime':
      return arr.sort((a, b) => parseMinutes(a.prepTime) - parseMinutes(b.prepTime))
    case 'totaltime':
      return arr.sort((a, b) => {
        const tA = parseMinutes(a.totalTime || a.cookTime || a.prepTime)
        const tB = parseMinutes(b.totalTime || b.cookTime || b.prepTime)
        return tA - tB
      })
    default:
      return arr
  }
}

export default function RecipeList({ recipes, onSelect, onToggleFavorite }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sortKey, setSortKey] = useState('newest')

  const categories = [...new Set(recipes.map(r => r.category).filter(Boolean))].sort()

  const filtered = recipes.filter(r => {
    if (filter === 'favorite' && !r.favorite) return false
    if (categoryFilter && r.category !== categoryFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      r.title.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.tags?.some(t => t.toLowerCase().includes(q)) ||
      r.category?.toLowerCase().includes(q) ||
      r.cuisine?.toLowerCase().includes(q) ||
      r.ingredients?.some(i => {
        const text = typeof i === 'string' ? i : `${i.qty || ''} ${i.unit || ''} ${i.name || ''}`
        return text.toLowerCase().includes(q)
      })
    )
  })

  const sorted = sortRecipes(filtered, sortKey)

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input-field pl-10"
          placeholder="Rechercher une recette, un ingrédient, un tag…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filter bar + Sort */}
      <div className="flex flex-wrap items-center gap-2 mb-4 sm:mb-6">
        {/* Filters */}
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-amber-500 text-white'
                : 'bg-white text-gray-600 hover:bg-amber-50 border border-gray-200'
            }`}
          >
            {f.key === 'favorite' && <Heart size={13} className={filter === f.key ? 'fill-white' : ''} />}
            {f.label}
          </button>
        ))}
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setCategoryFilter(categoryFilter === c ? '' : c)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              categoryFilter === c
                ? 'bg-amber-700 text-white'
                : 'bg-white text-gray-600 hover:bg-amber-50 border border-gray-200'
            }`}
          >
            {c}
          </button>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sort dropdown */}
        {recipes.length > 1 && (
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5">
            <ArrowUpDown size={13} className="text-gray-400 shrink-0" />
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value)}
              className="text-sm text-gray-600 font-medium bg-transparent focus:outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Results count */}
      {search && (
        <p className="text-sm text-gray-500 mb-4">
          {sorted.length} résultat{sorted.length !== 1 ? 's' : ''} pour « {search} »
        </p>
      )}

      {/* Grid */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <ChefHat size={56} className="mb-4 text-amber-200" />
          {recipes.length === 0 ? (
            <>
              <p className="font-semibold text-lg text-gray-500">Aucune recette pour l'instant</p>
              <p className="text-sm mt-1">Créez votre première recette ou importez-en une depuis un lien !</p>
            </>
          ) : (
            <p className="font-medium text-gray-500">Aucune recette ne correspond à votre recherche.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(r => (
            <RecipeCard
              key={r.id}
              recipe={r}
              onClick={onSelect}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  )
}
