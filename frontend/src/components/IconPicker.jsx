import { useState } from 'react'
import { Smile } from 'lucide-react'
import { STEP_ICONS, StepIcon } from '../utils/stepIcons'

export default function IconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const current = STEP_ICONS.find(i => i.id === value)

  function select(id) {
    onChange(value === id ? '' : id) // re-clic = désélection
    setOpen(false)
  }

  return (
    <div className="relative shrink-0">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title={current ? current.label : 'Ajouter une icône'}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
          value
            ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
            : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
        }`}
      >
        {value
          ? <StepIcon iconId={value} size={17} />
          : <Smile size={15} />
        }
      </button>

      {open && (
        <>
          {/* Backdrop transparent pour fermer en cliquant ailleurs */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          {/* Panel de sélection */}
          <div className="absolute left-0 top-10 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 w-64">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Icône de l'étape
            </p>

            <div className="grid grid-cols-7 gap-1">
              {/* Bouton "aucune icône" */}
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                title="Aucune icône"
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${
                  !value
                    ? 'bg-amber-500 text-white'
                    : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'
                }`}
              >
                ×
              </button>

              {STEP_ICONS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => select(id)}
                  title={label}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    value === id
                      ? 'bg-amber-500 text-white'
                      : 'text-gray-400 hover:bg-amber-50 hover:text-amber-600'
                  }`}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>

            {/* Label de l'icône sélectionnée */}
            {current && (
              <p className="text-xs text-amber-600 font-medium mt-2 text-center">
                {current.label}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
