'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Clock, Users, Heart, GitFork } from 'lucide-react';
import { Recipe } from '@/lib/types';
import StarRating from './StarRating';

interface RecipeCardProps {
  recipe: Recipe;
  onFavoriteToggle?: (id: string, isFav: boolean) => void;
}

export default function RecipeCard({ recipe, onFavoriteToggle }: RecipeCardProps) {
  const [isFavorite, setIsFavorite] = useState(recipe.favorite);
  const [isToggling, setIsToggling] = useState(false);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isToggling) return;

    setIsToggling(true);
    const nextState = !isFavorite;
    setIsFavorite(nextState);

    try {
      const res = await fetch(`/api/recipes/${recipe.id}/favorite`, { method: 'POST' });
      if (!res.ok) {
        setIsFavorite(!nextState); // rollback
      } else {
        if (onFavoriteToggle) onFavoriteToggle(recipe.id, nextState);
      }
    } catch {
      setIsFavorite(!nextState);
    } finally {
      setIsToggling(false);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Dessert':
        return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'Entrée':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Pains':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Apéritif':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Boisson':
        return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'Petit-déjeuner':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default:
        return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  const defaultImage =
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80';

  const variantsCount = recipe.variantsCount || 0;

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-stone-200/80 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all duration-300 flex flex-col h-full relative">
      <Link href={`/recipes/${recipe.id}`} className="flex flex-col flex-1">
        {/* Image Container */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100">
          <img
            src={recipe.image || defaultImage}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = defaultImage;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />

          {/* Category & Variant Badge */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border backdrop-blur-md shadow-sm ${getCategoryColor(
                recipe.category
              )}`}
            >
              {recipe.category}
            </span>

            {variantsCount > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-600/90 text-white backdrop-blur-md shadow-sm flex items-center gap-1">
                <GitFork className="w-3 h-3" />
                <span>{variantsCount} variante{variantsCount > 1 ? 's' : ''}</span>
              </span>
            )}

            {recipe.parentId && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-600/90 text-white backdrop-blur-md shadow-sm flex items-center gap-1">
                <GitFork className="w-3 h-3" />
                <span>{recipe.variantName || 'Variante'}</span>
              </span>
            )}
          </div>

          {/* Favorite Button */}
          <button
            onClick={handleFavoriteClick}
            aria-label="Ajouter aux favoris"
            className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white text-stone-600 hover:text-rose-500 shadow-md transition-transform duration-200 active:scale-90"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFavorite ? 'fill-rose-500 text-rose-500' : 'text-stone-500'
              }`}
            />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1 justify-between gap-3">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-lg text-stone-900 line-clamp-2 group-hover:text-orange-600 transition-colors leading-snug flex-1">
                {recipe.title}
              </h3>
            </div>

            {/* Stars rating display on card */}
            {recipe.rating !== undefined && recipe.rating > 0 && (
              <div className="mb-2">
                <StarRating rating={recipe.rating} size="xs" showScore={true} />
              </div>
            )}

            {recipe.description && (
              <p className="text-stone-500 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                {recipe.description}
              </p>
            )}
          </div>

          {/* Meta Info */}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 font-medium">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span>
                {recipe.totalTime || (recipe.prepTime || 0) + (recipe.cookTime || 0)} min
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-stone-400" />
              <span>{recipe.servings} pers.</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{recipe.ingredients.length} ingr.</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
