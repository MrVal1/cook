import { NextResponse } from 'next/server';
import { searchRecipeImages } from '@/lib/imageSearch';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || undefined;

    if (!query.trim()) {
      return NextResponse.json({ error: 'Paramètre de recherche q manquant' }, { status: 400 });
    }

    const images = await searchRecipeImages(query, category, 6);
    const imageUrl = images[0] || null;

    return NextResponse.json({ imageUrl, images });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Erreur lors de la recherche d'image" },
      { status: 500 }
    );
  }
}
