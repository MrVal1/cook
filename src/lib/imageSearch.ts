/**
 * High-accuracy web image search for culinary recipes.
 * Queries authentic culinary sources to find exact, appetizing recipe photos
 * rather than ambiguous or random images.
 */

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export function cleanDishTitle(title: string): string {
  if (!title) return '';
  let cleaned = title
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^(?:recette\s+(?:de\s+|du\s+|des\s+|d')?)/i, '')
    .replace(
      /\b(fondant(?:e|s)?|croustillant(?:e|s)?|onctueux|onctueuse|crémeux|crémeuse|maison|facile|rapide|express|délicieux|délicieuse|savoureux|savoureuse|inratable|authentique|véritable|traditionnel(?:le)?|super)\b/gi,
      ''
    )
    .replace(/[:\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  cleaned = cleaned.replace(/^(?:et|au|aux|à la|à l'|de|du|des|d')\s+/i, '');
  cleaned = cleaned.replace(/\s+(?:et|au|aux|à la|à l'|de|du|des|d')$/i, '');
  return cleaned.trim() || title.trim();
}

function isBadImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return true;
  const l = url.toLowerCase();
  const badPatterns = [
    '.svg',
    '.gif',
    'logo',
    'icon',
    'favicon',
    'avatar',
    'banner',
    'author',
    'badge',
    'placeholder',
    'pixel',
    'tracking',
    'advertisement',
    'wikimedia_commons',
    'button',
    'arrow',
    'star',
    'rating',
    'user',
  ];
  if (badPatterns.some((bp) => l.includes(bp))) return true;
  if (!url.startsWith('https://') && !url.startsWith('http://')) return true;
  return false;
}

/**
 * Searches the web for authentic recipe photos matching the dish name.
 * Returns up to `limit` high quality image URLs.
 */
export async function searchRecipeImages(
  title: string,
  category?: string,
  limit = 5
): Promise<string[]> {
  const cleanedTitle = cleanDishTitle(title);
  if (!cleanedTitle) return [];

  const results: string[] = [];
  const seen = new Set<string>();

  // 1. Primary: Targeted Web Culinary Search
  try {
    const q = `${cleanedTitle} recette plat cuisine`;
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(q)}&FORM=HDRSC2`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const html = await res.text();
      const matches = [...html.matchAll(/&quot;murl&quot;:&quot;(https?:\/\/[^&]+)&quot;/g)];

      for (const match of matches) {
        const imgUrl = match[1];
        if (imgUrl && !seen.has(imgUrl) && !isBadImageUrl(imgUrl)) {
          seen.add(imgUrl);
          results.push(imgUrl);
          if (results.length >= limit) break;
        }
      }
    }
  } catch (err) {
    // Continue to fallbacks
  }

  if (results.length >= 1) {
    return results;
  }

  // 2. Secondary: French Wikipedia with strict food verification
  try {
    const wikiImages = await fetchWikipediaFoodImages(cleanedTitle, 'fr', limit);
    for (const img of wikiImages) {
      if (!seen.has(img) && !isBadImageUrl(img)) {
        seen.add(img);
        results.push(img);
        if (results.length >= limit) break;
      }
    }
  } catch (err) {
    // Continue to next fallback
  }

  if (results.length >= 1) {
    return results;
  }

  // 3. Fallback: Curated culinary food category image
  const fallback = getCategorySpecificFallback(cleanedTitle, category);
  if (fallback) {
    results.push(fallback);
  }

  return results;
}

/**
 * Searches and returns the best single coherent image URL for a dish.
 */
export async function searchCoherentRecipeImage(
  title: string,
  category?: string
): Promise<string | null> {
  const images = await searchRecipeImages(title, category, 1);
  return images[0] || null;
}

const FOOD_SNIPPET_KEYWORDS = [
  'recette',
  'cuisine',
  'plat',
  'pâtisserie',
  'patisserie',
  'gâteau',
  'gateau',
  'dessert',
  'entremets',
  'aliment',
  'gastronomie',
  'culinaire',
  'sauce',
  'viande',
  'poisson',
  'salade',
  'soupe',
  'cuisson',
  'ingrédient',
  'biscuit',
  'tarte',
  'dish',
  'food',
  'recipe',
  'pastry',
  'cake',
];

async function fetchWikipediaFoodImages(
  query: string,
  lang: 'fr' | 'en',
  limit: number
): Promise<string[]> {
  const found: string[] = [];
  try {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      query + ' cuisine'
    )}&gsrlimit=5&prop=pageimages|extracts&exintro=1&explaintext=1&piprop=original|thumbnail&pithumbsize=1200&format=json`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'MonCarnetGourmand/2.0 (contact@cook.app)',
        Accept: 'application/json',
      },
    });

    if (!res.ok) return [];
    const data = await res.json();
    const pages = Object.values(data.query?.pages || {}) as any[];

    for (const page of pages) {
      const text = `${page.title} ${page.extract || ''}`.toLowerCase();
      // Ensure the article is actually about food/cooking
      const isFood = FOOD_SNIPPET_KEYWORDS.some((kw) => text.includes(kw));
      if (!isFood) continue;

      const src = page.thumbnail?.source || page.original?.source;
      if (src && !isBadImageUrl(src)) {
        found.push(src);
        if (found.length >= limit) break;
      }
    }
  } catch (err) {
    // Ignore
  }
  return found;
}

function getCategorySpecificFallback(title: string, category?: string): string {
  const t = `${title} ${category || ''}`.toLowerCase();
  if (
    t.includes('chocolat') ||
    t.includes('gateau') ||
    t.includes('gâteau') ||
    t.includes('fondant') ||
    t.includes('brownie')
  ) {
    return 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('cookie') || t.includes('biscuit') || t.includes('sablé')) {
    return 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('tarte') || t.includes('pomme') || t.includes('tatin') || t.includes('crumble')) {
    return 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?auto=format&fit=crop&w=1200&q=80';
  }
  if (
    t.includes('pâte') ||
    t.includes('pasta') ||
    t.includes('spaghetti') ||
    t.includes('carbonara') ||
    t.includes('lasagne')
  ) {
    return 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('pizza')) {
    return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('salade') || t.includes('bowl')) {
    return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('soupe') || t.includes('velouté') || t.includes('potage')) {
    return 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('burger')) {
    return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('curry') || t.includes('riz') || t.includes('indien')) {
    return 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('crêpe') || t.includes('pancake') || t.includes('gaufre')) {
    return 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=1200&q=80';
  }
  if (
    t.includes('pain') ||
    t.includes('baguette') ||
    t.includes('brioche') ||
    t.includes('focaccia') ||
    t.includes('ciabatta') ||
    t.includes('levain') ||
    t.includes('boulangerie')
  ) {
    return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80';
  }
  if (t.includes('poisson') || t.includes('saumon') || t.includes('cabillaud')) {
    return 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80';
  }
  return 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80';
}
