import { NextResponse } from 'next/server';
import { scrapeRecipeFromUrl } from '@/lib/scraper';
import { searchCoherentRecipeImage } from '@/lib/imageSearch';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return NextResponse.json(
        { error: 'Veuillez fournir une URL valide commençant par http:// ou https://' },
        { status: 400 }
      );
    }

    const draft = await scrapeRecipeFromUrl(url);
    if (!draft.image || draft.image.includes('photo-1498837167922-ddd27525d352')) {
      const searched = await searchCoherentRecipeImage(draft.title, draft.category);
      if (searched) {
        draft.image = searched;
      }
    }
    return NextResponse.json(draft);
  } catch (error: any) {
    console.error('Scrape error:', error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Impossible d'extraire la recette depuis cette URL. Vérifiez le lien ou essayez l'option Copier-Coller.",
      },
      { status: 500 }
    );
  }
}
