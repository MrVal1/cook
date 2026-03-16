import { useState, useRef, useLayoutEffect, useEffect, forwardRef } from 'react'
import { X, Plus, Trash2, ArrowLeft, Link, Loader2, AlertCircle, ChefHat } from 'lucide-react'
import { normalizeIngObj } from '../utils/scaleIngredients'
import { importRecipeFromUrl } from '../utils/recipeParser'
import IconPicker from './IconPicker'
import Markdown from './Markdown'

/** Textarea auto-redimensionnable — accepte un ref externe via forwardRef */
const AutoResizeTextarea = forwardRef(function AutoResizeTextarea(
  { value, onChange, className = '', placeholder, ...props },
  externalRef
) {
  const localRef = useRef(null)
  const setRef = el => {
    localRef.current = el
    if (typeof externalRef === 'function') externalRef(el)
    else if (externalRef) externalRef.current = el
  }
  useLayoutEffect(() => {
    const el = localRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [value])
  return (
    <textarea
      ref={setRef}
      value={value}
      onChange={onChange}
      className={className}
      placeholder={placeholder}
      style={{ overflow: 'hidden', resize: 'none' }}
      rows={1}
      {...props}
    />
  )
})

/** Normalise une étape : string → {text, icon} ou {text,icon} tel quel */
const normalizeStep = s =>
  typeof s === 'string' ? { text: s, icon: '' } : { text: s?.text || '', icon: s?.icon || '' }

const CATEGORIES = ['Entrée', 'Plat principal', 'Dessert', 'Apéritif', 'Soupe', 'Salade', 'Petit-déjeuner', 'Autre']

const UNIT_GROUPS = [
  { group: 'Poids',    units: ['g', 'kg'] },
  { group: 'Volume',   units: ['ml', 'cl', 'dl', 'L'] },
  { group: 'Mesures',  units: ['c. à s.', 'c. à c.', 'verre', 'tasse'] },
  { group: 'Autres',   units: ['pincée', 'poignée', 'tranche', 'botte', 'gousse', 'brin', 'feuille', 'sachet', 'boîte', 'noix'] },
]

const EMPTY = {
  title: '',
  description: '',
  image: '',
  prepTime: '',
  cookTime: '',
  totalTime: '',
  servings: '',
  category: '',
  cuisine: '',
  ingredients: [{ qty: '', unit: '', name: '' }],
  steps: [{ text: '', icon: '' }],
  tips: '',
  tags: [],
  sourceUrl: '',
}

function normalize(recipe) {
  return {
    ...EMPTY,
    ...recipe,
    ingredients: recipe.ingredients?.length
      ? recipe.ingredients.map(normalizeIngObj)
      : [{ qty: '', unit: '', name: '' }],
    steps: recipe.steps?.length ? recipe.steps.map(normalizeStep) : [{ text: '', icon: '' }],
    tags: recipe.tags || [],
    tips: recipe.tips || '',
  }
}

/**
 * Ligne d'étape : édition inline markdown.
 * - Vide ou en cours de saisie → textarea auto-resize
 * - Rempli + blur → rendu markdown (clic pour reprendre l'édition)
 * - Icône à côté du numéro si texte court, en dessous si multi-lignes
 */
function StepRow({ step, index, onTextChange, onIconChange, onRemove }) {
  const [editing, setEditing] = useState(!step.text.trim())
  const textareaRef = useRef(null)

  const isMultiLine = step.text.includes('\n') || step.text.length > 70

  // Focus le textarea quand on passe en mode édition
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [editing])

  return (
    <div className="flex gap-2 items-start">
      {/* Numéro + icône : côte à côte si ligne unique, empilés si multi-lignes */}
      <div className={`flex ${isMultiLine ? 'flex-col' : 'flex-row'} items-center gap-1 shrink-0 mt-2`}>
        <span className="bg-amber-100 text-amber-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">
          {index + 1}
        </span>
        <IconPicker value={step.icon} onChange={onIconChange} />
      </div>

      {/* Zone de texte : édition ↔ rendu markdown */}
      <div className="flex-1 min-w-0">
        {editing || !step.text.trim() ? (
          <AutoResizeTextarea
            ref={textareaRef}
            className="input-field"
            value={step.text}
            onChange={e => onTextChange(e.target.value)}
            onBlur={() => { if (step.text.trim()) setEditing(false) }}
            placeholder={`Étape ${index + 1}… (**gras**, *italique*, - liste)`}
          />
        ) : (
          <div
            onClick={() => setEditing(true)}
            className="px-3 py-2 rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 cursor-text text-sm text-gray-700 transition-colors"
          >
            <Markdown>{step.text}</Markdown>
          </div>
        )}
      </div>

      <button type="button" onClick={onRemove} className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0 mt-2" tabIndex={-1}>
        <Trash2 size={16} />
      </button>
    </div>
  )
}

export default function RecipeForm({ initial, onSave, onCancel }) {
  const isCreate = !initial?.id

  const [tab, setTab] = useState('create') // 'create' | 'import'
  const [form, setForm] = useState(() => normalize(initial || {}))
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState({})

  // Import state
  const [importUrl, setImportUrl] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState('')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }))
  }

  // Ingredients
  function setIngredient(i, field, val) {
    const updated = [...form.ingredients]
    updated[i] = { ...updated[i], [field]: val }
    set('ingredients', updated)
  }
  function addIngredient() { set('ingredients', [...form.ingredients, { qty: '', unit: '', name: '' }]) }
  function removeIngredient(i) {
    if (form.ingredients.length === 1) return
    set('ingredients', form.ingredients.filter((_, idx) => idx !== i))
  }

  // Steps
  function setStep(i, field, val) {
    const updated = [...form.steps]
    updated[i] = { ...updated[i], [field]: val }
    set('steps', updated)
  }
  function addStep() { set('steps', [...form.steps, { text: '', icon: '' }]) }
  function removeStep(i) {
    if (form.steps.length === 1) return
    set('steps', form.steps.filter((_, idx) => idx !== i))
  }

  // Tags
  function addTag() {
    const t = tagInput.trim()
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t])
    setTagInput('')
  }
  function removeTag(t) { set('tags', form.tags.filter(tag => tag !== t)) }
  function handleTagKey(e) { if (e.key === 'Enter') { e.preventDefault(); addTag() } }

  // Import from URL
  async function handleImport() {
    const trimmed = importUrl.trim()
    if (!trimmed) return
    setImportError('')
    setImportLoading(true)
    try {
      const recipe = await importRecipeFromUrl(trimmed)
      setForm(normalize(recipe))
      setTab('create')
    } catch (err) {
      setImportError(err.message || "Erreur lors de l'import.")
    } finally {
      setImportLoading(false)
    }
  }

  function validate() {
    const e = {}
    if (!form.title.trim()) e.title = 'Le titre est requis'
    if (form.ingredients.every(i => !i.name?.trim() && !i.qty?.trim())) e.ingredients = 'Ajoutez au moins un ingrédient'
    if (form.steps.every(s => !s.text?.trim())) e.steps = 'Ajoutez au moins une étape'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave({
      ...form,
      ingredients: form.ingredients.filter(i => i.name?.trim() || i.qty?.trim()),
      steps: form.steps.filter(s => s.text?.trim()),
    })
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-amber-100 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-amber-800">
          {initial?.id ? 'Modifier la recette' : 'Nouvelle recette'}
        </h1>
      </div>

      {/* Tabs — create mode only */}
      {isCreate && (
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 mb-6">
          <button
            type="button"
            onClick={() => setTab('create')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'create' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:text-amber-600'
            }`}
          >
            <Plus size={15} />
            Créer manuellement
          </button>
          <button
            type="button"
            onClick={() => setTab('import')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'import' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:text-amber-600'
            }`}
          >
            <Link size={15} />
            Importer depuis un lien
          </button>
        </div>
      )}

      {/* ── Import tab ── */}
      {isCreate && tab === 'import' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <p className="text-sm text-gray-500">
            Collez le lien d'une recette (Marmiton, 750g, AllRecipes, BBC Food…) et l'application
            récupère automatiquement tous les détails.
          </p>
          <input
            type="url"
            className="input-field"
            placeholder="https://www.marmiton.org/recettes/..."
            value={importUrl}
            onChange={e => setImportUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleImport()}
            disabled={importLoading}
            autoFocus
          />
          {importError && (
            <div className="flex items-start gap-2 bg-red-50 text-red-700 rounded-lg p-3 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{importError}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-amber-50 rounded-lg p-3">
            <ChefHat size={14} className="text-amber-400 shrink-0" />
            <span>
              Fonctionne avec les sites qui utilisent le format standard schema.org/Recipe
              (la majorité des grands sites de recettes).
            </span>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleImport}
              className="btn-primary flex items-center gap-2"
              disabled={importLoading || !importUrl.trim()}
            >
              {importLoading ? (
                <><Loader2 size={16} className="animate-spin" /> Importation…</>
              ) : (
                <><Link size={16} /> Importer</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Create / Edit form ── */}
      {tab === 'create' && (
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Infos générales */}
          <section className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-700">Informations générales</h2>

            <div>
              <label className="block text-sm font-medium mb-1">Titre *</label>
              <input
                className={`input-field ${errors.title ? 'border-red-400' : ''}`}
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Tarte aux pommes, Boeuf bourguignon…"
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <AutoResizeTextarea
                className="input-field"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Décrivez la recette en quelques mots…"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Image (URL)</label>
              <input
                className="input-field"
                type="url"
                value={form.image}
                onChange={e => set('image', e.target.value)}
                placeholder="https://…"
              />
              {form.image && (
                <img src={form.image} alt="" className="mt-2 h-32 w-full object-cover rounded-lg" onError={e => e.target.style.display='none'} />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Catégorie</label>
                <select className="input-field" value={form.category} onChange={e => set('category', e.target.value)}>
                  <option value="">— Choisir —</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cuisine</label>
                <input className="input-field" value={form.cuisine} onChange={e => set('cuisine', e.target.value)} placeholder="Française, Italienne…" />
              </div>
            </div>
          </section>

          {/* Temps & portions */}
          <section className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-700">Temps & portions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Préparation</label>
                <input className="input-field" value={form.prepTime} onChange={e => set('prepTime', e.target.value)} placeholder="30 min" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cuisson</label>
                <input className="input-field" value={form.cookTime} onChange={e => set('cookTime', e.target.value)} placeholder="1h" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium mb-1">Portions</label>
                <input className="input-field" value={form.servings} onChange={e => set('servings', e.target.value)} placeholder="4 personnes" />
              </div>
            </div>
          </section>

          {/* Ingrédients */}
          <section className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="font-semibold text-gray-700">Ingrédients *</h2>
            {errors.ingredients && <p className="text-red-500 text-xs">{errors.ingredients}</p>}
            {form.ingredients.map((ing, i) => (
              <div key={i} className="flex gap-1.5 items-center">
                <span className="text-amber-400 font-bold text-sm w-5 text-right shrink-0">{i + 1}</span>
                <input
                  className="input-field w-14 shrink-0 text-center px-1"
                  value={ing.qty}
                  onChange={e => setIngredient(i, 'qty', e.target.value)}
                  placeholder="400"
                />
                <select
                  className="input-field w-20 sm:w-24 shrink-0 px-1 text-sm cursor-pointer"
                  value={ing.unit}
                  onChange={e => setIngredient(i, 'unit', e.target.value)}
                >
                  <option value="">—</option>
                  {UNIT_GROUPS.map(({ group, units }) => (
                    <optgroup key={group} label={group}>
                      {units.map(u => <option key={u} value={u}>{u}</option>)}
                    </optgroup>
                  ))}
                </select>
                <input
                  className="input-field flex-1 min-w-0"
                  value={ing.name}
                  onChange={e => setIngredient(i, 'name', e.target.value)}
                  placeholder="farine…"
                />
                <button type="button" onClick={() => removeIngredient(i)} className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0" tabIndex={-1}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button type="button" onClick={addIngredient} className="flex items-center gap-1 text-amber-600 hover:text-amber-700 text-sm font-medium">
              <Plus size={16} /> Ajouter un ingrédient
            </button>
          </section>

          {/* Étapes */}
          <section className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="font-semibold text-gray-700">Étapes de préparation *</h2>
            {errors.steps && <p className="text-red-500 text-xs">{errors.steps}</p>}
            {form.steps.map((step, i) => (
              <StepRow
                key={i}
                step={step}
                index={i}
                onTextChange={val => setStep(i, 'text', val)}
                onIconChange={val => setStep(i, 'icon', val)}
                onRemove={() => removeStep(i)}
              />
            ))}
            <button type="button" onClick={addStep} className="flex items-center gap-1 text-amber-600 hover:text-amber-700 text-sm font-medium">
              <Plus size={16} /> Ajouter une étape
            </button>
          </section>

          {/* Conseils */}
          <section className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="font-semibold text-gray-700">💡 Conseils</h2>
            <AutoResizeTextarea
              className="input-field"
              value={form.tips}
              onChange={e => set('tips', e.target.value)}
              placeholder="Astuces, variantes, conseils de présentation…"
            />
          </section>

          {/* Tags & source */}
          <section className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-700">Tags & source</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Tags</label>
              <div className="flex gap-2">
                <input
                  className="input-field"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKey}
                  placeholder="Végétarien, Rapide, Festif…"
                />
                <button type="button" onClick={addTag} className="btn-secondary shrink-0">
                  <Plus size={16} />
                </button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.tags.map(t => (
                    <span key={t} className="flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-medium">
                      {t}
                      <button type="button" onClick={() => removeTag(t)} className="hover:text-red-500"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Source / URL d'origine</label>
              <input className="input-field" type="url" value={form.sourceUrl} onChange={e => set('sourceUrl', e.target.value)} placeholder="https://…" />
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onCancel} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary">
              {initial?.id ? 'Enregistrer les modifications' : 'Créer la recette'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
