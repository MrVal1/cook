import * as cheerio from 'cheerio';
import { ScrapedRecipeDraft, RecipeCategory } from './types';
import { parseIngredient, parseMinutesDuration } from './ingredientParser';

function extractTimerMinutes(text: string): number | undefined {
  const match = text.match(/(?:pendant|durant|environ|cuire|laisser|mijoter|reposer|enfourner|attendre)?\s*(\d+)\s*(?:min|minute|minutes)\b/i);
  if (match) {
    const mins = parseInt(match[1], 10);
    if (mins > 0 && mins <= 360) return mins;
  }
  const hourMatch = text.match(/(\d+)\s*(?:h|heure|heures)\b/i);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    if (hours > 0 && hours <= 24) return hours * 60;
  }
  return undefined;
}

function detectCategory(title: string, tags: string[] = [], explicitCategory?: string): RecipeCategory {
  const combined = `${title} ${tags.join(' ')} ${explicitCategory || ''}`.toLowerCase();

  if (/(dessert|gâteau|gateau|tarte|chocolat|mousse|crêpe|crepe|cookie|biscuit|flan|muffin|sucré|pain perdu|fondant)/i.test(combined)) {
    return 'Dessert';
  }
  if (/(pain\b|baguette|brioche|focaccia|ciabatta|levain|boulangerie|miche|pain de mie|naan|pita|challah|buns)/i.test(combined) && !/pain perdu/i.test(combined)) {
    return 'Pains';
  }
  if (/(apéro|apéritif|tapas|dips|guacamole|houmous|hummus|chips|cocktail|amuse-bouche)/i.test(combined)) {
    return 'Apéritif';
  }
  if (/(entrée|soupe|salade|velouté|potage|bruschetta|carpaccio|tartare)/i.test(combined)) {
    return 'Entrée';
  }
  if (/(smoothie|jus|cocktail|boisson|thé|café|latte|infusion|sirop)/i.test(combined)) {
    return 'Boisson';
  }
  if (/(petit-déjeuner|brunch|pancake|granola|porridge|croissant|gaufre)/i.test(combined)) {
    return 'Petit-déjeuner';
  }
  return 'Plat';
}

function parseServings(yieldStr: any): number {
  if (typeof yieldStr === 'number' && yieldStr > 0) return yieldStr;
  if (Array.isArray(yieldStr)) yieldStr = yieldStr[0];
  if (typeof yieldStr === 'string') {
    const match = yieldStr.match(/\d+/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      if (parsed > 0 && parsed <= 100) return parsed;
    }
  }
  return 4;
}

export async function scrapeRecipeFromUrl(url: string): Promise<ScrapedRecipeDraft> {
  const targetUrl = url.trim();
  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Impossible d'accéder au site (${response.status}: ${response.statusText})`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // 1. Try to extract schema.org Recipe from JSON-LD
  let recipeLd: any = null;

  $('script[type="application/ld+json"]').each((_, elem) => {
    try {
      const content = $(elem).html();
      if (!content) return;
      const json = JSON.parse(content);

      if (json['@type'] === 'Recipe') {
        recipeLd = json;
        return false;
      }

      if (Array.isArray(json)) {
        const found = json.find((item) => item['@type'] === 'Recipe');
        if (found) {
          recipeLd = found;
          return false;
        }
      }

      if (json['@graph'] && Array.isArray(json['@graph'])) {
        const found = json['@graph'].find(
          (item: any) => item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))
        );
        if (found) {
          recipeLd = found;
          return false;
        }
      }
    } catch {
      // Ignore JSON parse errors in script tags
    }
  });

  if (recipeLd) {
    // We found structured recipe data!
    const title = recipeLd.name || recipeLd.headline || $('title').text().trim();
    const description = recipeLd.description || $('meta[name="description"]').attr('content') || '';
    
    // Image extraction
    let image: string | undefined = undefined;
    if (typeof recipeLd.image === 'string') {
      image = recipeLd.image;
    } else if (Array.isArray(recipeLd.image) && recipeLd.image.length > 0) {
      image = typeof recipeLd.image[0] === 'string' ? recipeLd.image[0] : recipeLd.image[0]?.url;
    } else if (recipeLd.image?.url) {
      image = recipeLd.image.url;
    }
    if (!image) {
      image = $('meta[property="og:image"]').attr('content');
    }

    // Servings
    const servings = parseServings(recipeLd.recipeYield);

    // Times
    const prepTime = recipeLd.prepTime ? parseMinutesDuration(recipeLd.prepTime) : undefined;
    const cookTime = recipeLd.cookTime ? parseMinutesDuration(recipeLd.cookTime) : undefined;
    const totalTime = recipeLd.totalTime ? parseMinutesDuration(recipeLd.totalTime) : (prepTime || 0) + (cookTime || 0) || undefined;

    // Ingredients
    const rawIngredients: string[] = [];
    if (Array.isArray(recipeLd.recipeIngredient)) {
      recipeLd.recipeIngredient.forEach((ing: any) => {
        if (typeof ing === 'string' && ing.trim()) rawIngredients.push(ing.trim());
      });
    }

    const ingredients = rawIngredients.map((raw, idx) => parseIngredient(raw, `ing-${idx + 1}`));

    // Instructions
    const rawSteps: string[] = [];
    if (Array.isArray(recipeLd.recipeInstructions)) {
      recipeLd.recipeInstructions.forEach((step: any) => {
        if (typeof step === 'string') {
          if (step.trim()) rawSteps.push(step.trim());
        } else if (typeof step === 'object') {
          if (step['@type'] === 'HowToSection' && Array.isArray(step.itemListElement)) {
            step.itemListElement.forEach((subStep: any) => {
              const text = subStep.text || subStep.name;
              if (text && typeof text === 'string') rawSteps.push(text.trim());
            });
          } else {
            const text = step.text || step.name;
            if (text && typeof text === 'string') rawSteps.push(text.trim());
          }
        }
      });
    }

    const instructions = rawSteps.map((stepText, idx) => ({
      id: `step-${idx + 1}`,
      stepNumber: idx + 1,
      text: stepText,
      durationMinutes: extractTimerMinutes(stepText),
    }));

    // Tags & Category
    const tags: string[] = [];
    if (recipeLd.recipeCategory) {
      if (Array.isArray(recipeLd.recipeCategory)) {
        tags.push(...recipeLd.recipeCategory.map((c: any) => String(c).trim()));
      } else if (typeof recipeLd.recipeCategory === 'string') {
        tags.push(recipeLd.recipeCategory.trim());
      }
    }
    if (recipeLd.keywords) {
      if (typeof recipeLd.keywords === 'string') {
        tags.push(...recipeLd.keywords.split(',').map((k: string) => k.trim()).filter(Boolean));
      } else if (Array.isArray(recipeLd.keywords)) {
        tags.push(...recipeLd.keywords.map((k: any) => String(k).trim()).filter(Boolean));
      }
    }

    const category = detectCategory(title, tags, recipeLd.recipeCategory);

    return {
      title,
      description,
      sourceUrl: targetUrl,
      image,
      category,
      prepTime,
      cookTime,
      totalTime,
      servings,
      difficulty: 'Moyen',
      ingredients,
      instructions,
      tags: Array.from(new Set(tags)).slice(0, 8),
    };
  }

  // 2. Fallback: Cheerio HTML Extraction (OpenGraph + common class names)
  const ogTitle = $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim() || $('title').text().trim();
  const ogDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
  const ogImage = $('meta[property="og:image"]').attr('content');

  // Search for ingredients in list items
  const extractedIngredients: string[] = [];
  $('ul, ol').each((_, list) => {
    const parentClass = $(list).parent().attr('class') || '';
    const parentId = $(list).parent().attr('id') || '';
    const listClass = $(list).attr('class') || '';
    const isIngredientSection = /ingredient/i.test(`${parentClass} ${parentId} ${listClass}`);

    if (isIngredientSection) {
      $(list).find('li').each((_, li) => {
        const text = $(li).text().trim().replace(/\s+/g, ' ');
        if (text && text.length < 120) {
          extractedIngredients.push(text);
        }
      });
    }
  });

  // Search for steps
  const extractedSteps: string[] = [];
  $('ol, ul, div').each((_, block) => {
    const blockClass = $(block).attr('class') || '';
    const blockId = $(block).attr('id') || '';
    const isStepSection = /(?:instruction|etape|step|preparation)/i.test(`${blockClass} ${blockId}`);

    if (isStepSection) {
      $(block).find('li, p').each((_, item) => {
        const text = $(item).text().trim().replace(/\s+/g, ' ');
        if (text && text.length > 15 && !extractedSteps.includes(text)) {
          extractedSteps.push(text);
        }
      });
    }
  });

  const parsedIngredients = extractedIngredients.map((raw, idx) => parseIngredient(raw, `ing-${idx + 1}`));
  const parsedInstructions = extractedSteps.map((stepText, idx) => ({
    id: `step-${idx + 1}`,
    stepNumber: idx + 1,
    text: stepText,
    durationMinutes: extractTimerMinutes(stepText),
  }));

  const cleanTitle = ogTitle.split(/[-|•]/)[0].trim();
  const category = detectCategory(cleanTitle);

  return {
    title: cleanTitle || 'Recette sans titre',
    description: ogDesc,
    sourceUrl: targetUrl,
    image: ogImage,
    category,
    servings: 4,
    prepTime: 15,
    cookTime: 25,
    totalTime: 40,
    difficulty: 'Moyen',
    ingredients: parsedIngredients,
    instructions: parsedInstructions,
    tags: [category],
  };
}
