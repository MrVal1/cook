import { NextResponse } from 'next/server';
import { getAvailableGeminiModels, selectBestGeminiModel } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { apiKey, model } = await request.json();

    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json({ valid: false, error: 'La clé est vide.' }, { status: 400 });
    }

    const cleanKey = apiKey.trim();

    // 1. Query models from Google to verify API key validity and find active models
    const availableModels = await getAvailableGeminiModels(cleanKey);

    // If availableModels is empty, check why by querying directly
    if (availableModels.length === 0) {
      const directCheck = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`
      );
      if (!directCheck.ok) {
        const errText = await directCheck.text();
        let errMsg = 'Clé API Google Gemini invalide ou expirée.';
        try {
          const j = JSON.parse(errText);
          errMsg = j.error?.message || errMsg;
        } catch {}
        return NextResponse.json({ valid: false, error: errMsg }, { status: directCheck.status });
      }
    }

    // 2. Select the best available model
    const resolvedModel = selectBestGeminiModel(availableModels, model);

    // 3. Do a quick ping generateContent test
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${cleanKey}`;

    const res = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Bonjour' }] }],
        generationConfig: { maxOutputTokens: 5 },
      }),
    });

    if (!res.ok) {
      // If the selected model failed, try any other available model
      let alternativeModel: string | undefined;
      for (const cand of availableModels) {
        if (cand !== resolvedModel) {
          const altUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cand}:generateContent?key=${cleanKey}`;
          const altRes = await fetch(altUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Bonjour' }] }],
              generationConfig: { maxOutputTokens: 5 },
            }),
          });
          if (altRes.ok) {
            alternativeModel = cand;
            break;
          }
        }
      }

      if (alternativeModel) {
        return NextResponse.json({
          valid: true,
          models: availableModels,
          bestModel: alternativeModel,
          message: `Clé API valide ! Modèle configuré : ${alternativeModel}`,
        });
      }

      const errText = await res.text();
      let msg = 'Erreur lors du test du modèle.';
      try {
        const j = JSON.parse(errText);
        msg = j.error?.message || msg;
      } catch {}
      return NextResponse.json({ valid: false, error: msg }, { status: res.status });
    }

    return NextResponse.json({
      valid: true,
      models: availableModels,
      bestModel: resolvedModel,
      message: `Clé API valide et opérationnelle ! (Modèle : ${resolvedModel})`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, error: error.message || 'Erreur réseau lors de la vérification' },
      { status: 500 }
    );
  }
}
