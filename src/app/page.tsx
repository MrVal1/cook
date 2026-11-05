'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { ChefHat } from 'lucide-react';
import RecipeCard from '@/components/RecipeCard';
import { Recipe } from '@/lib/types';
import { useFilter } from '@/context/FilterContext';

const CATEGORIES: Array<{ label: string; value: string }> = [
  { label: 'Toutes', value: 'ALL' },
  { label: 'Mieux notées ⭐', value: 'TOP_RATED' },
  { label: 'Favoris ❤️', value: 'FAVORITES' },
  { label: 'Plats', value: 'Plat' },
  { label: 'Entrées', value: 'Entrée' },
  { label: 'Desserts', value: 'Dessert' },
  { label: 'Pains 🥖', value: 'Pains' },
  { label: 'Apéritif', value: 'Apéritif' },
  { label: 'Petit-déj', value: 'Petit-déjeuner' },
  { label: 'Boissons', value: 'Boisson' },
];

export default function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { searchQuery, sortBy, selectedCategory, setSelectedCategory } = useFilter();

  const fetchRecipes = async () => {
    try {
      const res = await fetch('/api/recipes');
      if (res.ok) {
        const data = await res.json();
        setRecipes(data);
      }
    } catch (err) {
      console.error('Failed to load recipes', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();

    const handleUpdate = () => fetchRecipes();
    window.addEventListener('recipe-added', handleUpdate);
    return () => window.removeEventListener('recipe-added', handleUpdate);
  }, []);

  // Filter & Search logic
  const filteredRecipes = useMemo(() => {
    return recipes
      .filter((recipe) => {
        // Category filter
        if (selectedCategory === 'FAVORITES') {
          if (!recipe.favorite) return false;
        } else if (selectedCategory === 'TOP_RATED') {
          if ((recipe.rating || 0) < 3.5) return false;
        } else if (selectedCategory !== 'ALL') {
          if (recipe.category !== selectedCategory) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = recipe.title.toLowerCase().includes(q);
          const matchDesc = recipe.description?.toLowerCase().includes(q);
          const matchTags = recipe.tags?.some((t) => t.toLowerCase().includes(q));
          const matchIngr = recipe.ingredients.some((ing) =>
            (ing.name || ing.raw).toLowerCase().includes(q)
          );
          if (!matchTitle && !matchDesc && !matchTags && !matchIngr) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') {
          return (b.rating || 0) - (a.rating || 0);
        }
        if (sortBy === 'time') {
          const timeA = (a.prepTime || 0) + (a.cookTime || 0);
          const timeB = (b.prepTime || 0) + (b.cookTime || 0);
          return timeA - timeB;
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title, 'fr');
        }
        // recent
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [recipes, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="space-y-6 pb-16">
      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${
              selectedCategory === cat.value
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200/80'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Recipes Grid */}
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 rounded-full border-4 border-orange-500 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-stone-500 text-sm">Chargement de vos recettes...</p>
        </div>
      ) : filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onFavoriteToggle={(id, isFav) => {
                setRecipes((prev) =>
                  prev.map((r) => (r.id === id ? { ...r, favorite: isFav } : r))
                );
              }}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="py-16 px-6 text-center bg-white rounded-3xl border border-stone-200/80 max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-inner">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-900">Aucune recette trouvée</h3>
            <p className="text-stone-500 text-xs mt-1">
              {searchQuery || selectedCategory !== 'ALL'
                ? 'Essayez de modifier votre recherche ou vos filtres.'
                : 'Cliquez sur « Ajouter une recette » dans la barre en haut pour commencer votre carnet !'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
