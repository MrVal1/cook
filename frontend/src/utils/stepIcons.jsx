/**
 * Stock d'icônes SVG pour les étapes de recette.
 * Mélange d'icônes Lucide et d'icônes SVG custom cuisine.
 */
import {
  Flame, Timer, Thermometer, Refrigerator, Droplets,
  Utensils, Scale, Clock, Layers, Zap, Leaf, Snowflake,
} from 'lucide-react'

// ─── Icônes custom cuisine ────────────────────────────────────────────────────
// Toutes en viewBox 0 0 24 24, stroke-based (style Lucide)

function Svg({ size, className, children }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      {children}
    </svg>
  )
}

function IconFouet({ size = 24, className = '' }) {
  return (
    <Svg size={size} className={className}>
      {/* Manche */}
      <line x1="12" y1="22" x2="12" y2="13" />
      {/* Boucle extérieure */}
      <path d="M12 13 C7 10 6 5 9 3 Q12 1.5 15 3 C18 5 17 10 12 13" />
      {/* Boucle intérieure */}
      <path d="M12 13 C10 11 9.5 8 11 6 Q12 5 13 6 C14.5 8 14 11 12 13" />
      {/* Fil transversal */}
      <line x1="7.5" y1="8.5" x2="16.5" y2="8.5" />
    </Svg>
  )
}

function IconCasserole({ size = 24, className = '' }) {
  return (
    <Svg size={size} className={className}>
      {/* Corps */}
      <path d="M5 10 v8 Q5 20 7 20 h10 Q19 20 19 18 v-8" />
      {/* Rebord */}
      <line x1="3" y1="10" x2="21" y2="10" />
      {/* Poignées */}
      <line x1="2" y1="10" x2="2" y2="13" />
      <line x1="2" y1="10" x2="5" y2="10" />
      <line x1="2" y1="13" x2="5" y2="13" />
      <line x1="22" y1="10" x2="22" y2="13" />
      <line x1="19" y1="10" x2="22" y2="10" />
      <line x1="19" y1="13" x2="22" y2="13" />
    </Svg>
  )
}

function IconPoele({ size = 24, className = '' }) {
  return (
    <Svg size={size} className={className}>
      {/* Corps de la poêle */}
      <path d="M7 9 Q7 7 9 7 h8 Q19 7 19 9 v5 Q19 16 17 16 H9 Q7 16 7 14 Z" />
      {/* Manche */}
      <line x1="2" y1="13" x2="7" y2="12" />
    </Svg>
  )
}

function IconRouleau({ size = 24, className = '' }) {
  return (
    <Svg size={size} className={className}>
      {/* Corps cylindrique */}
      <rect x="5" y="9" width="14" height="6" rx="3" />
      {/* Manche gauche */}
      <line x1="1" y1="12" x2="5" y2="12" />
      <line x1="1" y1="10" x2="1" y2="14" />
      {/* Manche droite */}
      <line x1="19" y1="12" x2="23" y2="12" />
      <line x1="23" y1="10" x2="23" y2="14" />
    </Svg>
  )
}

function IconBol({ size = 24, className = '' }) {
  return (
    <Svg size={size} className={className}>
      {/* Bol */}
      <path d="M4 8 Q4 18 12 18 Q20 18 20 8" />
      <line x1="2" y1="8" x2="22" y2="8" />
      {/* Base */}
      <line x1="8" y1="18" x2="16" y2="21" />
      <line x1="10" y1="21" x2="14" y2="21" />
    </Svg>
  )
}

function IconCouteau({ size = 24, className = '' }) {
  return (
    <Svg size={size} className={className}>
      {/* Lame */}
      <path d="M7 17 L20 5 Q22 3 21 5 L9 19 Z" />
      {/* Garde + manche */}
      <line x1="7" y1="17" x2="4" y2="20" />
      <path d="M4 20 Q3 21 4 22 L5 21 Z" />
    </Svg>
  )
}

function IconMixeur({ size = 24, className = '' }) {
  return (
    <Svg size={size} className={className}>
      {/* Vase du blender */}
      <path d="M8 3 h8 l-1 12 Q15 17 12 17 Q9 17 9 15 Z" />
      {/* Socle */}
      <rect x="7" y="17" width="10" height="3" rx="1" />
      <rect x="9" y="20" width="6" height="2" rx="1" />
      {/* Couvercle */}
      <line x1="10" y1="3" x2="14" y2="3" />
      {/* Lame */}
      <line x1="10" y1="13" x2="14" y2="13" />
      <line x1="12" y1="11" x2="12" y2="15" />
    </Svg>
  )
}

function IconFour({ size = 24, className = '' }) {
  return (
    <Svg size={size} className={className}>
      {/* Caisson */}
      <rect x="2" y="3" width="20" height="18" rx="2" />
      {/* Porte vitrée */}
      <rect x="5" y="8" width="14" height="10" rx="1" />
      {/* Poignée de porte */}
      <line x1="9" y1="14" x2="15" y2="14" />
      {/* Commandes en haut */}
      <circle cx="7" cy="5.5" r="1" />
      <circle cx="12" cy="5.5" r="1" />
      <circle cx="17" cy="5.5" r="1" />
    </Svg>
  )
}

function IconLouche({ size = 24, className = '' }) {
  return (
    <Svg size={size} className={className}>
      {/* Manche */}
      <line x1="5" y1="19" x2="14" y2="10" />
      {/* Bol de la louche */}
      <path d="M14 10 Q20 8 20 13 Q20 18 14 16 Q10 15 14 10" />
    </Svg>
  )
}

// ─── Catalogue complet ────────────────────────────────────────────────────────
export const STEP_ICONS = [
  // Chaleur & temps
  { id: 'feu',         label: 'Feu / Cuisson',     Icon: Flame },
  { id: 'four',        label: 'Four',               Icon: IconFour },
  { id: 'minuterie',   label: 'Minuterie',          Icon: Timer },
  { id: 'repos',       label: 'Repos / Attente',    Icon: Clock },
  { id: 'temperature', label: 'Température',        Icon: Thermometer },
  // Froid
  { id: 'frigo',       label: 'Réfrigérer',         Icon: Refrigerator },
  { id: 'congelation', label: 'Congeler',            Icon: Snowflake },
  // Liquides
  { id: 'eau',         label: 'Eau / Liquide',      Icon: Droplets },
  // Ustensiles
  { id: 'fouet',       label: 'Fouet / Battre',     Icon: IconFouet },
  { id: 'casserole',   label: 'Casserole / Mijoter',Icon: IconCasserole },
  { id: 'poele',       label: 'Poêle / Sauter',     Icon: IconPoele },
  { id: 'rouleau',     label: 'Rouleau / Abaisser', Icon: IconRouleau },
  { id: 'bol',         label: 'Bol / Mélanger',     Icon: IconBol },
  { id: 'couteau',     label: 'Couteau / Couper',   Icon: IconCouteau },
  { id: 'louche',      label: 'Louche / Dresser',   Icon: IconLouche },
  { id: 'mixeur',      label: 'Mixeur / Blender',   Icon: IconMixeur },
  // Cuisine générale
  { id: 'service',     label: 'Servir / Dresser',   Icon: Utensils },
  { id: 'peser',       label: 'Peser / Mesurer',    Icon: Scale },
  { id: 'assembler',   label: 'Assembler / Monter', Icon: Layers },
  { id: 'herbes',      label: 'Herbes / Épices',    Icon: Leaf },
  { id: 'electrique',  label: 'Appareil électrique',Icon: Zap },
]

/** Rend l'icône d'une étape par son id. Retourne null si id vide ou inconnu. */
export function StepIcon({ iconId, size = 20, className = '' }) {
  if (!iconId) return null
  const found = STEP_ICONS.find(i => i.id === iconId)
  if (!found) return null
  const { Icon } = found
  return <Icon size={size} className={className} />
}
