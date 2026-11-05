import { NextResponse } from 'next/server';
import { toggleFavorite } from '@/lib/storage';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const updated = await toggleFavorite(params.id);
    if (!updated) {
      return NextResponse.json({ error: 'Recette non trouvée' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
