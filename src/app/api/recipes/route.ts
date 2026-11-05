import { NextResponse } from 'next/server';
import { getRecipes, saveRecipe } from '@/lib/storage';
import { Recipe } from '@/lib/types';
import { searchCoherentRecipeImage } from '@/lib/imageSearch';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeVariants = searchParams.get('includeVariants') === 'true';
    const recipes = await getRecipes({ includeVariants, onlyMasters: !includeVariants });
    return NextResponse.json(recipes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: 'Le titre est obligatoire.' }, { status: 400 });
    }

    let resolvedImage = body.image?.trim() || undefined;
    if (!resolvedImage || resolvedImage.includes('photo-1498837167922-ddd27525d352')) {
      const searched = await searchCoherentRecipeImage(body.title.trim(), body.category);
      if (searched) {
        resolvedImage = searched;
      }
    }

    const id = body.id || `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newRecipe: Recipe = {
      id,
      title: body.title.trim(),
      description: body.description?.trim() || '',
      sourceUrl: body.sourceUrl?.trim() || undefined,
      sourceType: body.sourceType || 'manual',
      image: resolvedImage,
      category: body.category || 'Plat',
      prepTime: Number(body.prepTime) || 0,
      cookTime: Number(body.cookTime) || 0,
      totalTime: (Number(body.prepTime) || 0) + (Number(body.cookTime) || 0),
      servings: Number(body.servings) || 4,
      difficulty: body.difficulty || 'Moyen',
      rating: Number(body.rating) || 0,
      parentId: body.parentId ? String(body.parentId) : undefined,
      variantName: body.variantName?.trim() || undefined,
      forkNotes: body.forkNotes?.trim() || undefined,
      ingredients: (body.ingredients || []).map((ing: any, i: number) => ({
        id: ing.id || `ing-${i + 1}`,
        raw: ing.raw || ing.name || '',
        quantity: ing.quantity !== undefined && ing.quantity !== null && ing.quantity !== '' ? Number(ing.quantity) : undefined,
        unit: ing.unit || undefined,
        name: ing.name || ing.raw || '',
      })),
      instructions: (body.instructions || []).map((step: any, i: number) => ({
        id: step.id || `step-${i + 1}`,
        stepNumber: i + 1,
        text: step.text || '',
        durationMinutes: step.durationMinutes ? Number(step.durationMinutes) : undefined,
      })),
      tags: Array.isArray(body.tags) ? body.tags.map((t: string) => t.trim()).filter(Boolean) : [],
      favorite: !!body.favorite,
      notes: body.notes?.trim() || undefined,
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveRecipe(newRecipe);
    return NextResponse.json(saved, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur lors de la sauvegarde.' }, { status: 500 });
  }
}
