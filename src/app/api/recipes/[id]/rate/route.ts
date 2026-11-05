import { NextResponse } from 'next/server';
import { rateRecipe } from '@/lib/storage';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { rating } = await request.json();
    if (typeof rating !== 'number' || rating < 0 || rating > 5) {
      return NextResponse.json({ error: 'La note doit être comprise entre 0 et 5.' }, { status: 400 });
    }

    const updated = await rateRecipe(params.id, rating);
    if (!updated) {
      return NextResponse.json({ error: 'Recette non trouvée' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur lors de la notation' }, { status: 500 });
  }
}
