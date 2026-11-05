import { NextResponse } from 'next/server';
import { promoteVariantToMaster } from '@/lib/storage';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const updated = await promoteVariantToMaster(params.id);
    if (!updated) {
      return NextResponse.json({ error: 'Recette ou variante introuvable' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'La variante a été promue en recette principale avec succès !',
      recipe: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur lors de la promotion de la variante' }, { status: 500 });
  }
}
