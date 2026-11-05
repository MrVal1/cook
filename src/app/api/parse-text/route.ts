import { NextResponse } from 'next/server';
import { parseRawRecipeText } from '@/lib/textParser';
import { ScrapedRecipeDraft } from '@/lib/types';
import { parseIngredient } from '@/lib/ingredientParser';
import { getAvailableGeminiModels, selectBestGeminiModel, extractJsonFromAiOutput } from '@/lib/gemini';
import { searchCoherentRecipeImage } from '@/lib/imageSearch';

function getThematicImage(title: string, category: string): string {
  const t = `${title} ${category}`.toLowerCase();
  if (t.includes('chocolat') || t.includes('gateau') || t.includes('fondant')) {
    return 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('cookie') || t.includes('biscuit')) {
    return 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('tarte') || t.includes('pomme') || t.includes('tatin')) {
    return 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('pâte') || t.includes('pasta') || t.includes('spaghetti')) {
    return 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('salade') || t.includes('bowl')) {
    return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('crêpe') || t.includes('pancake')) {
    return 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=1200&q=80';
  }
  return 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80';
}

async function parseWithGemini(
  text: string,
  apiKey: string,
  preferredModel?: string
): Promise<ScrapedRecipeDraft | null> {
  try {
    const availableModels = await getAvailableGeminiModels(apiKey);
    const selectedModel = selectBestGeminiModel(availableModels, preferredModel);

    const prompt = `Tu es un expert culinaire hors pair.
Analyse le texte brut suivant, qui est un copier-coller (conversation ChatGPT/Claude, note rapide, message WhatsApp, etc.).
Extrais et structure la recette de cuisine complète sous un format JSON strict.

RÈGLES IMPORTANTES :
1. Réponds UNIQUEMENT par un objet JSON valide, sans texte d'introduction ni de conclusion.
2. Découpe chaque ingrédient avec sa quantité numérique et son unité usuelle (g, ml, cl, c. à soupe, pièce, etc.).
3. Découpe les instructions en étapes claires et numérotées.
4. Nettoie tout le bavardage conversationnel ("Bonjour !", "Voici la recette demandée...").

Format JSON attendu :
{
  "title": "Nom de la recette",
  "description": "Courte description appétissante",
  "category": "Plat" | "Entrée" | "Dessert" | "Pains" | "Apéritif" | "Petit-déjeuner" | "Boisson" | "Autre",
  "prepTime": 15,
  "cookTime": 25,
  "servings": 4,
  "difficulty": "Facile" | "Moyen" | "Difficile",
  "ingredients": ["250g de farine de blé", "3 oeufs", "1 pincée de sel"],
  "instructions": [
    { "text": "Dans un grand saladier, mélangez...", "durationMinutes": null },
    { "text": "Faites cuire à 180°C pendant 20 minutes", "durationMinutes": 20 }
  ],
  "tags": ["Rapide", "Chocolat"],
  "notes": "Astuces éventuelles"
}

Texte brut :
${text}`;

    const modelsToTry = [selectedModel, ...availableModels.filter((m) => m !== selectedModel)];
    let response: Response | null = null;

    for (const cand of modelsToTry.slice(0, 3)) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${cand}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.1,
          },
        }),
      });

      if (res.ok) {
        response = res;
        break;
      }
    }

    if (!response || !response.ok) return null;

    const json = await response.json();
    const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) return null;

    const parsed = extractJsonFromAiOutput(content);
    if (!parsed) return null;

    const category = parsed.category || 'Plat';
    const image =
      (await searchCoherentRecipeImage(parsed.title || '', category)) ||
      'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80';

    return {
      title: parsed.title || 'Recette sans titre',
      description: parsed.description || '',
      category,
      prepTime: Number(parsed.prepTime) || 15,
      cookTime: Number(parsed.cookTime) || 20,
      totalTime: (Number(parsed.prepTime) || 15) + (Number(parsed.cookTime) || 20),
      servings: Number(parsed.servings) || 4,
      difficulty: parsed.difficulty || 'Moyen',
      image,
      ingredients: (parsed.ingredients || []).map((raw: any, idx: number) => {
        const str = typeof raw === 'string' ? raw : raw?.raw || `${raw?.quantity || ''} ${raw?.unit || ''} ${raw?.name || ''}`;
        return parseIngredient(str, `ing-${idx + 1}`);
      }),
      instructions: (parsed.instructions || []).map((step: any, idx: number) => {
        const stepText = typeof step === 'string' ? step : step?.text || '';
        const dur = typeof step === 'object' && step?.durationMinutes ? Number(step.durationMinutes) : undefined;
        return {
          id: `step-${idx + 1}`,
          stepNumber: idx + 1,
          text: stepText,
          durationMinutes: dur,
        };
      }),
      tags: Array.isArray(parsed.tags) ? parsed.tags : [category],
      notes: parsed.notes || undefined,
    };
  } catch (e) {
    console.error('Gemini parse error:', e);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const { text, apiKey, model } = await request.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: 'Veuillez coller le texte de votre recette.' },
        { status: 400 }
      );
    }

    const keyToUse = apiKey?.trim() || process.env.GEMINI_API_KEY;

    // 1. If an API key is available, use AI extraction
    if (keyToUse) {
      const aiResult = await parseWithGemini(text, keyToUse, model);
      if (aiResult && aiResult.ingredients.length > 0) {
        return NextResponse.json(aiResult);
      }
    }

    // 2. High-performance offline NLP heuristic parser fallback
    const draft = parseRawRecipeText(text);
    if (!draft.image || draft.image.includes('photo-1498837167922-ddd27525d352')) {
      const searched = await searchCoherentRecipeImage(draft.title, draft.category);
      if (searched) draft.image = searched;
    }
    return NextResponse.json(draft);
  } catch (error: any) {
    console.error('Parse text error:', error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Impossible d'analyser le texte de la recette. Vérifiez son contenu.",
      },
      { status: 500 }
    );
  }
}
