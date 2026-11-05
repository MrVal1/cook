export interface Ingredient {
  id: string;
  raw: string;
  quantity?: number;
  unit?: string;
  name: string;
}

export interface InstructionStep {
  id: string;
  stepNumber: number;
  text: string;
  durationMinutes?: number;
}

export type RecipeCategory =
  | 'Plat'
  | 'Entrée'
  | 'Dessert'
  | 'Pains'
  | 'Apéritif'
  | 'Petit-déjeuner'
  | 'Boisson'
  | 'Autre';

export type RecipeDifficulty = 'Facile' | 'Moyen' | 'Difficile';

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  sourceUrl?: string;
  sourceType: 'url' | 'paste' | 'manual';
  image?: string;
  category: RecipeCategory;
  prepTime?: number; // minutes
  cookTime?: number; // minutes
  totalTime?: number; // minutes
  servings: number;
  difficulty?: RecipeDifficulty;
  ingredients: Ingredient[];
  instructions: InstructionStep[];
  tags: string[];
  favorite: boolean;
  rating?: number; // 0 to 5 stars
  parentId?: string; // If this recipe is a variant / fork of a master recipe
  variantName?: string; // e.g. "Version Airfryer", "Sans Gluten", "Version Allégée"
  forkNotes?: string; // Changelog / what changed vs master
  variantsCount?: number; // Count of child variants
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScrapedRecipeDraft {
  title: string;
  description?: string;
  sourceUrl?: string;
  image?: string;
  category?: RecipeCategory;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  servings?: number;
  difficulty?: RecipeDifficulty;
  ingredients: Array<string | { raw: string; quantity?: number; unit?: string; name: string }>;
  instructions: Array<string | { text: string; durationMinutes?: number }>;
  tags?: string[];
  notes?: string;
}

export interface AiHistoryEntry {
  id: string;
  prompt: string;
  createdAt: string;
  recipe: ScrapedRecipeDraft;
  savedToRecipes: boolean;
  savedRecipeId?: string;
}

