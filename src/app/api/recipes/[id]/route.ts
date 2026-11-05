import { NextResponse } from 'next/server';
import { getRecipeById, getRecipeWithVariants, saveRecipe, deleteRecipe } from '@/lib/storage';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('withVariants') === 'true') {
      const data = await getRecipeWithVariants(params.id);
      if (!data) {
        return NextResponse.json({ error: 'Recette non trouvée' }, { status: 404 });
      }
      return NextResponse.json(data);
    }

    const recipe = await getRecipeById(params.id);
    if (!recipe) {
      return NextResponse.json({ error: 'Recette non trouvée' }, { status: 404 });
    }
    return NextResponse.json(recipe);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const existing = await getRecipeById(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Recette non trouvée' }, { status: 404 });
    }

    const updated = await saveRecipe({
      ...existing,
      ...body,
      id: params.id,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur lors de la mise à jour' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const deleted = await deleteRecipe(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Recette introuvable ou déjà supprimée' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur lors de la suppression' }, { status: 500 });
  }
}
