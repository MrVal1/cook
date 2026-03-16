import { useState } from 'react'
import { Plus, Refrigerator, BookOpen, ServerCrash, Loader2 } from 'lucide-react'
import { useRecipes } from './hooks/useRecipes'
import RecipeList from './components/RecipeList'
import RecipeDetail from './components/RecipeDetail'
import RecipeForm from './components/RecipeForm'
import FrigoPage from './components/FrigoPage'

// Views
const VIEW = {
  LIST:   'list',
  FRIGO:  'frigo',
  DETAIL: 'detail',
  CREATE: 'create',
  EDIT:   'edit',
}

export default function App() {
  const { recipes, loading, error, load, addRecipe, updateRecipe, deleteRecipe, toggleFavorite } = useRecipes()
  const [view, setView] = useState(VIEW.LIST)
  const [selected, setSelected] = useState(null)

  // --- Navigation helpers ---
  function goList()           { setView(VIEW.LIST);   setSelected(null) }
  function goFrigo()          { setView(VIEW.FRIGO);  setSelected(null) }
  function goDetail(recipe)   { setSelected(recipe);  setView(VIEW.DETAIL) }
  function goCreate()         { setView(VIEW.CREATE) }
  function goEdit(recipe)     { setSelected(recipe);  setView(VIEW.EDIT) }

  // --- Actions ---
  async function handleSaveNew(data) {
    const r = await addRecipe(data)
    goDetail(r)
  }

  async function handleSaveEdit(data) {
    const r = await updateRecipe(selected.id, data)
    goDetail(r)
  }

  function handleDelete(id) {
    deleteRecipe(id)
    goList()
  }

  function handleToggleFavorite(id) {
    toggleFavorite(id)
    if (selected?.id === id) {
      setSelected(prev => ({ ...prev, favorite: !prev.favorite }))
    }
  }

  const isRootView = view === VIEW.LIST || view === VIEW.FRIGO

  // ── Loading / Error screens ────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center gap-4 text-amber-600">
      <Loader2 size={40} className="animate-spin" />
      <p className="font-medium text-gray-600">Chargement des recettes…</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full">
        <ServerCrash size={48} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-800 mb-2">Backend inaccessible</h2>
        <p className="text-sm text-gray-500 mb-5">{error}</p>
        <div className="bg-gray-50 rounded-xl p-4 text-left mb-5">
          <p className="text-xs font-mono text-gray-600 mb-1">Dans un terminal :</p>
          <code className="text-xs font-mono text-amber-700 block">node start-recettes.mjs</code>
        </div>
        <button onClick={load} className="btn-primary w-full">Réessayer</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-amber-50">
      {/* ── Header ── */}
      <header className="bg-white border-b border-amber-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">

          {/* Tab navigation */}
          {isRootView && (
            <nav className="flex items-center gap-1 bg-amber-50 rounded-xl p-1 border border-amber-100">
              <button
                onClick={goList}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  view === VIEW.LIST
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-gray-500 hover:text-amber-600'
                }`}
              >
                <BookOpen size={15} />
                Mes recettes
              </button>
              <button
                onClick={goFrigo}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  view === VIEW.FRIGO
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-gray-500 hover:text-amber-600'
                }`}
              >
                <Refrigerator size={15} />
                Mon frigo
              </button>
            </nav>
          )}

          {/* Spacer when not in root view */}
          {!isRootView && <div />}

          {/* Action buttons */}
          <div className="flex gap-2 shrink-0">
            {view === VIEW.LIST && (
              <button
                onClick={goCreate}
                className="btn-primary flex items-center gap-1.5 text-sm"
              >
                <Plus size={15} />
                <span className="hidden sm:inline">Nouvelle recette</span>
                <span className="sm:hidden">Nouvelle</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="max-w-5xl mx-auto px-4 py-6">

        {view === VIEW.LIST && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-amber-900">
                  {recipes.length === 0 ? 'Bienvenue !' : `${recipes.length} recette${recipes.length > 1 ? 's' : ''}`}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {recipes.length === 0
                    ? 'Commencez à constituer votre livre de recettes.'
                    : 'Votre collection de recettes personnelles.'}
                </p>
              </div>
            </div>
            <RecipeList
              recipes={recipes}
              onSelect={goDetail}
              onToggleFavorite={handleToggleFavorite}
            />
          </>
        )}

        {view === VIEW.FRIGO && (
          <FrigoPage
            recipes={recipes}
            onSelectRecipe={goDetail}
          />
        )}

        {view === VIEW.DETAIL && selected && (
          <RecipeDetail
            recipe={selected}
            onBack={goList}
            onEdit={() => goEdit(selected)}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {view === VIEW.CREATE && (
          <RecipeForm
            initial={{}}
            onSave={handleSaveNew}
            onCancel={goList}
          />
        )}

        {view === VIEW.EDIT && selected && (
          <RecipeForm
            initial={selected}
            onSave={handleSaveEdit}
            onCancel={() => goDetail(selected)}
          />
        )}
      </main>
    </div>
  )
}
