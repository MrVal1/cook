import { useState } from 'react'
import { X, Link, Loader2, AlertCircle, ChefHat } from 'lucide-react'
import { importRecipeFromUrl } from '../utils/recipeParser'

export default function ImportModal({ onImport, onClose }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleImport() {
    const trimmed = url.trim()
    if (!trimmed) return
    setError('')
    setLoading(true)
    try {
      const recipe = await importRecipeFromUrl(trimmed)
      onImport(recipe)
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'import.')
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleImport()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Link className="text-amber-500" size={20} />
            <h2 className="text-lg font-bold">Importer depuis un lien</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-500">
            Collez le lien d'une recette (Marmiton, 750g, AllRecipes, BBC Food, etc.)
            et l'application récupère automatiquement tous les détails.
          </p>

          <div className="flex gap-2">
            <input
              type="url"
              className="input-field flex-1"
              placeholder="https://www.marmiton.org/recettes/..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-700 rounded-lg p-3 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-400 bg-amber-50 rounded-lg p-3">
            <ChefHat size={14} className="text-amber-400 shrink-0" />
            <span>
              Fonctionne avec les sites qui utilisent le format standard schema.org/Recipe
              (la majorité des grands sites de recettes).
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary" disabled={loading}>
            Annuler
          </button>
          <button
            onClick={handleImport}
            className="btn-primary flex items-center gap-2"
            disabled={loading || !url.trim()}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Importation…
              </>
            ) : (
              <>
                <Link size={16} />
                Importer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
