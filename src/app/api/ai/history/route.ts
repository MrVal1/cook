import { NextResponse } from 'next/server';
import { getAiHistory, deleteHistoryEntry, clearAiHistory } from '@/lib/aiHistory';

export async function GET() {
  try {
    const history = await getAiHistory();
    return NextResponse.json(history);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const all = searchParams.get('all');

    if (all === 'true') {
      await clearAiHistory();
      return NextResponse.json({ success: true, message: 'Historique vidé avec succès' });
    }

    if (!id) {
      return NextResponse.json({ error: 'Identifiant d’historique manquant' }, { status: 400 });
    }

    const success = await deleteHistoryEntry(id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur lors de la suppression' }, { status: 500 });
  }
}
