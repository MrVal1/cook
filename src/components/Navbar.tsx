'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, X, ArrowUpDown, Plus, Settings, UtensilsCrossed } from 'lucide-react';
import { useFilter, SortOption } from '@/context/FilterContext';
import AddRecipeModal from './AddRecipeModal';
import SettingsModal from './SettingsModal';

export default function Navbar() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { searchQuery, setSearchQuery, sortBy, setSortBy, resetFilters } = useFilter();

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Bar */}
          <div className="h-16 flex items-center justify-between gap-3 sm:gap-4">
            {/* Brand Title */}
            <Link
              href="/"
              onClick={() => resetFilters()}
              className="group flex items-center gap-2.5 flex-shrink-0 transition-transform active:scale-95"
              title="Accueil — carnet de recettes"
            >
              <div className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shadow-xs group-hover:shadow-md group-hover:scale-105 transition-all duration-200">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-stone-900 group-hover:text-stone-700 transition-colors">
                carnet <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent font-black">de recettes</span>
              </span>
            </Link>

            {/* Desktop / Tablet Search Box */}
            <div className="hidden sm:block flex-1 max-w-md mx-2 lg:mx-4">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une recette, un ingrédient..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-stone-100 hover:bg-stone-50 focus:bg-white border border-stone-200/80 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all placeholder:text-stone-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition-colors"
                    title="Effacer la recherche"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
              {/* Desktop / Tablet Sort Select */}
              <div className="hidden sm:block relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none pl-8 pr-7 py-2 rounded-xl bg-stone-100 hover:bg-stone-50 border border-stone-200/80 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 cursor-pointer transition-colors"
                  title="Trier les recettes"
                >
                  <option value="recent">Plus récentes</option>
                  <option value="rating">Mieux notées (⭐)</option>
                  <option value="time">Temps court</option>
                  <option value="title">A à Z</option>
                </select>
                <ArrowUpDown className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-stone-400">▼</span>
              </div>

              {/* Add Recipe Button */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-medium text-xs sm:text-sm rounded-xl shadow-xs hover:shadow transition-all duration-200 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline">Ajouter une recette</span>
                <span className="md:hidden">Ajouter</span>
              </button>

              {/* Settings button */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 border border-transparent hover:border-stone-200 transition-colors"
                title="Paramètres de l'IA"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mobile Search & Sort Row (underneath, visible only on small screens < sm) */}
          <div className="sm:hidden pb-3 pt-0.5 flex items-center gap-2 border-t border-stone-100">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une recette..."
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-stone-100 text-xs focus:bg-white border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/40 placeholder:text-stone-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="relative flex-shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none pl-6 pr-5 py-1.5 rounded-xl bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-500/40 cursor-pointer"
              >
                <option value="recent">Récentes</option>
                <option value="rating">Notées ⭐</option>
                <option value="time">Temps ⏱️</option>
                <option value="title">A-Z</option>
              </select>
              <ArrowUpDown className="w-3 h-3 text-stone-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </header>

      {/* Add Recipe Modal */}
      {isModalOpen && (
        <AddRecipeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onOpenSettings={() => {
            setIsModalOpen(false);
            setIsSettingsOpen(true);
          }}
          onRecipeAdded={() => {
            setIsModalOpen(false);
            window.location.reload();
          }}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </>
  );
}
