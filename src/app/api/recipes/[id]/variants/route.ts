import { NextResponse } from 'next/server';
import { getRecipeWithVariants } from '@/lib/storage';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await getRecipeWithVariants(params.id);
    if (!data) {
      return NextResponse.json({ error: 'Recette non trouvée' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
