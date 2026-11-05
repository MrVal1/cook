import { NextResponse } from 'next/server';
import { saveAiHistoryEntry } from '@/lib/aiHistory';
import { ScrapedRecipeDraft } from '@/lib/types';
import { parseIngredient } from '@/lib/ingredientParser';
import { parseRawRecipeText } from '@/lib/textParser';
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
  if (t.includes('pâte') || t.includes('pasta') || t.includes('spaghetti') || t.includes('carbonara')) {
    return 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('pizza')) {
    return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('salade') || t.includes('bowl')) {
    return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('soupe') || t.includes('velouté')) {
    return 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('burger')) {
    return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('curry') || t.includes('indien') || t.includes('riz')) {
    return 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('apéro') || t.includes('guacamole') || t.includes('tapas')) {
    return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('poisson') || t.includes('saumon')) {
    return 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('crêpe') || t.includes('pancake')) {
    return 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=1200&q=80';
  }
  return 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80';
}

export async function POST(request: Request) {
  try {
    const { prompt, apiKey, model } = await request.json();

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { error: 'Veuillez préciser votre demande de recette (ex: des ingrédients, une envie, un type de plat...)' },
        { status: 400 }
      );
    }

    const keyToUse = apiKey?.trim() || process.env.GEMINI_API_KEY;

    if (!keyToUse) {
      return NextResponse.json(
        {
          error:
            'Aucune clé API IA configurée. Veuillez renseigner votre clé Google Gemini API dans les Paramètres (icône ⚙️) en haut à droite.',
          needApiKey: true,
        },
        { status: 401 }
      );
    }

    // Determine available models for this user's key
    const availableModels = await getAvailableGeminiModels(keyToUse);
    const selectedModel = selectBestGeminiModel(availableModels, model);

    const systemPrompt = `Tu es un Chef Étoilé bienveillant et pédagogue. 
L'utilisateur te demande une recette de cuisine.
Génère une recette détaillée, savoureuse, parfaitement dosée et réalisable à la maison.

Demande de l'utilisateur :
"${prompt}"

RÈGLES IMPORTANTES :
1. Réponds UNIQUEMENT par un objet JSON valide, sans texte additionnel, sans balises de code markdown autres que le JSON.
2. Chaque élément de la liste "ingredients" DOIT OBLIGATOIREMENT commencer par sa quantité numérique et son unité (ex: "400g de spaghetti", "150g de guanciale", "4 jaunes d'oeufs", "1 oeuf entier", "100g de pecorino râpé", "1 cuillère à café de poivre"). Ne JAMAIS écrire un ingrédient sans sa quantité chiffrée !
3. Pour les étapes, sois clair, précis et indique le temps en minutes si l'étape comporte une cuisson ou un temps d'attente (durationMinutes).
4. Fournis une courte description appétissante et une astuce de chef dans notes.

FORMAT JSON REQUIS :
{
  "title": "Nom précis et alléchant de la recette",
  "description": "Courte description poétique et appétissante (1 à 2 phrases)",
  "category": "Plat" | "Entrée" | "Dessert" | "Pains" | "Apéritif" | "Petit-déjeuner" | "Boisson" | "Autre",
  "prepTime": 15,
  "cookTime": 25,
  "totalTime": 40,
  "servings": 4,
  "difficulty": "Facile" | "Moyen" | "Difficile",
  "ingredients": [
    "250g de farine de blé T55",
    "3 oeufs frais",
    "50g de beurre doux fondu"
  ],
  "instructions": [
    { "text": "Dans un grand saladier, mélangez...", "durationMinutes": null },
    { "text": "Enfournez à 180°C pendant 25 minutes", "durationMinutes": 25 }
  ],
  "tags": ["Rapide", "Chocolat", "Four"],
  "notes": "L'astuce du chef pour réussir cette recette à coup sûr."
}`;

    // Try primary model, with fallback models if 404/not supported
    const modelsToTry = [selectedModel, ...availableModels.filter((m) => m !== selectedModel)];
    let geminiResponse: Response | null = null;
    let lastError = '';

    for (const modelCandidate of modelsToTry.slice(0, 4)) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelCandidate}:generateContent?key=${keyToUse}`;
      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.7,
          },
        }),
      });

      if (res.ok) {
        geminiResponse = res;
        break;
      } else {
        const text = await res.text();
        lastError = text;
        // If not a 404 on model name, break and report error
        if (res.status !== 404 && !text.includes('not found')) {
          geminiResponse = res;
          break;
        }
      }
    }

    if (!geminiResponse || !geminiResponse.ok) {
      let errorMsg = 'Erreur lors de la communication avec Gemini API.';
      try {
        const errJson = JSON.parse(lastError);
        errorMsg = errJson.error?.message || errorMsg;
      } catch {}
      return NextResponse.json(
        { error: errorMsg },
        { status: geminiResponse?.status || 500 }
      );
    }

    const resJson = await geminiResponse.json();
    const rawContent = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawContent) {
      return NextResponse.json(
        { error: "L'IA n'a renvoyé aucune réponse. Veuillez réessayer." },
        { status: 500 }
      );
    }

    let parsed: any = extractJsonFromAiOutput(rawContent);

    // If Gemini outputted plain conversational text or markdown, use our robust NLP text parser as fallback!
    if (!parsed) {
      try {
        const fallback = parseRawRecipeText(rawContent);
        parsed = {
          title: fallback.title,
          description: fallback.description,
          category: fallback.category,
          prepTime: fallback.prepTime,
          cookTime: fallback.cookTime,
          totalTime: fallback.totalTime,
          servings: fallback.servings,
          difficulty: fallback.difficulty,
          ingredients: fallback.ingredients.map((ing) => (typeof ing === 'string' ? ing : ing.raw || ing.name)),
          instructions: fallback.instructions.map((ins) => ({
            text: typeof ins === 'string' ? ins : ins.text,
            durationMinutes: typeof ins === 'string' ? undefined : ins.durationMinutes,
          })),
          tags: fallback.tags,
          notes: fallback.notes,
        };
      } catch (e) {
        console.error('Fallback parse error:', e);
      }
    }

    if (!parsed) {
      parsed = {
        title: 'Recette du Chef IA',
        description: 'Recette générée par l\'IA',
        category: 'Plat',
        ingredients: [],
        instructions: [{ text: rawContent }],
      };
    }

    // Process ingredients with parser
    const parsedIngredients = (parsed.ingredients || []).map((raw: any, idx: number) =>
      parseIngredient(raw, `ing-${idx + 1}`)
    );

    // Process instructions
    const parsedInstructions = (parsed.instructions || []).map((step: any, idx: number) => {
      const text = typeof step === 'string' ? step : step.text;
      const duration =
        typeof step === 'object' && step.durationMinutes
          ? Number(step.durationMinutes)
          : undefined;
      return {
        id: `step-${idx + 1}`,
        stepNumber: idx + 1,
        text: text || '',
        durationMinutes: duration,
      };
    });

    const category = parsed.category || 'Plat';
    const image =
      (await searchCoherentRecipeImage(parsed.title || prompt, category)) ||
      'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80';

    const recipeDraft: ScrapedRecipeDraft = {
      title: parsed.title || 'Recette du Chef IA',
      description: parsed.description || '',
      category,
      prepTime: Number(parsed.prepTime) || 15,
      cookTime: Number(parsed.cookTime) || 20,
      totalTime:
        Number(parsed.totalTime) ||
        (Number(parsed.prepTime) || 15) + (Number(parsed.cookTime) || 20),
      servings: Number(parsed.servings) || 4,
      difficulty: parsed.difficulty || 'Moyen',
      ingredients: parsedIngredients,
      instructions: parsedInstructions,
      image,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [category],
      notes: parsed.notes || undefined,
    };

    // Save to AI History automatically!
    const historyEntry = {
      id: `ai-gen-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      prompt: prompt.trim(),
      createdAt: new Date().toISOString(),
      recipe: recipeDraft,
      savedToRecipes: false,
    };

    await saveAiHistoryEntry(historyEntry);

    return NextResponse.json({
      historyEntry,
      recipe: recipeDraft,
    });
  } catch (error: any) {
    console.error('Error generating recipe with AI:', error);
    return NextResponse.json(
      { error: error.message || 'Une erreur inattendue est survenue.' },
      { status: 500 }
    );
  }
}
