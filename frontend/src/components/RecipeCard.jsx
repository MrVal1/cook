import { Clock, Users, Heart, ChefHat } from 'lucide-react'

export default function RecipeCard({ recipe, onClick, onToggleFavorite }) {
  const time = recipe.totalTime || recipe.cookTime || recipe.prepTime

  return (
    <div
      className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden"
      onClick={() => onClick(recipe)}
    >
      {/* Image */}
      <div className="relative h-44 bg-amber-100 overflow-hidden">
        {recipe.image ? (
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
          />
        ) : null}
        <div
          className={`${recipe.image ? 'hidden' : 'flex'} w-full h-full items-center justify-center`}
          style={{ display: recipe.image ? 'none' : 'flex' }}
        >
          <ChefHat size={48} className="text-amber-300" />
        </div>

        {/* Favorite button */}
        <button
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
          onClick={e => { e.stopPropagation(); onToggleFavorite(recipe.id) }}
        >
          <Heart
            size={16}
            className={recipe.favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}
          />
        </button>

        {/* Category badge */}
        {recipe.category && (
          <span className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm text-xs font-semibold px-2 py-0.5 rounded-full text-amber-700">
            {recipe.category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-gray-800 leading-tight line-clamp-2 group-hover:text-amber-700 transition-colors">
          {recipe.title}
        </h3>

        {recipe.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{recipe.description}</p>
        )}

        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          {time && (
            <span className="flex items-center gap-1">
              <Clock size={12} className="text-amber-400" />
              {time}
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <Users size={12} className="text-amber-400" />
              {recipe.servings}
            </span>
          )}
        </div>

        {recipe.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {recipe.tags.slice(0, 3).map(t => (
              <span key={t} className="bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                {t}
              </span>
            ))}
            {recipe.tags.length > 3 && (
              <span className="text-gray-400 text-xs px-1 py-0.5">+{recipe.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
