import { useState, useEffect, useCallback } from 'react'
import { normalizeIngObj } from '../utils/scaleIngredients'

const API = '/api/recipes'

/** Ensure all ingredients are {qty, unit, name} objects (handles all legacy formats). */
function normalizeRecipe(r) {
  return {
    ...r,
    ingredients: (r.ingredients || []).map(normalizeIngObj),
  }
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Erreur ${res.status}`)
  }
  return res.json()
}

export function useRecipes() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiFetch(API)
      setRecipes(data.map(normalizeRecipe))
      setError(null)
    } catch {
      setError('Impossible de joindre le serveur. Assurez-vous que le backend tourne.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Auto-migrate from localStorage (one-time) ─────────────────────────────
  useEffect(() => {
    async function migrate() {
      const LS_KEY = 'mes-recettes-v1'
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      try {
        const localRecipes = JSON.parse(raw)
        if (!localRecipes.length) { localStorage.removeItem(LS_KEY); return }
        const apiRecipes = await apiFetch(API)
        if (apiRecipes.length > 0) { localStorage.removeItem(LS_KEY); return }
        await apiFetch(`${API}/import`, {
          method: 'POST',
          body: JSON.stringify({ recipes: localRecipes }),
        })
        localStorage.removeItem(LS_KEY)
        load()
      } catch (e) {
        console.warn('Migration localStorage échouée :', e.message)
      }
    }
    migrate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const addRecipe = useCallback(async (data) => {
    const recipe = await apiFetch(API, { method: 'POST', body: JSON.stringify(data) })
    const normalized = normalizeRecipe(recipe)
    setRecipes(prev => [normalized, ...prev])
    return normalized
  }, [])

  const updateRecipe = useCallback(async (id, data) => {
    const updated = await apiFetch(`${API}/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    const normalized = normalizeRecipe(updated)
    setRecipes(prev => prev.map(r => r.id === id ? normalized : r))
    return normalized
  }, [])

  const deleteRecipe = useCallback(async (id) => {
    await apiFetch(`${API}/${id}`, { method: 'DELETE' })
    setRecipes(prev => prev.filter(r => r.id !== id))
  }, [])

  const toggleFavorite = useCallback(async (id) => {
    const recipe = recipes.find(r => r.id === id)
    if (!recipe) return
    const updated = await apiFetch(`${API}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ favorite: !recipe.favorite }),
    })
    setRecipes(prev => prev.map(r => r.id === id ? normalizeRecipe(updated) : r))
  }, [recipes])

  return { recipes, loading, error, load, addRecipe, updateRecipe, deleteRecipe, toggleFavorite }
}
