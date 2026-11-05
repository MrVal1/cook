import { NextResponse } from 'next/server';
import { markHistoryEntrySaved } from '@/lib/aiHistory';

export async function POST(request: Request) {
  try {
    const { historyId, recipeId } = await request.json();
    if (!historyId || !recipeId) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    const success = await markHistoryEntrySaved(historyId, recipeId);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
