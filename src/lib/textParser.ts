import { ScrapedRecipeDraft, RecipeCategory } from './types';
import { parseIngredient, parseMinutesDuration } from './ingredientParser';

function cleanConversationalPreamble(line: string): string {
  return line
    .replace(/^[\p{Extended_Pictographic}\s]+/u, '')
    .replace(/^#+\s*/, '')
    .replace(/^\*\*|\*\*$/g, '')
    .replace(/^["'«\s]+|["'»\s]+$/g, '')
    .replace(/^(?:voici|voil[aà]|bien s[uû]r[!,.]?\s*voici|d'accord[!,.]?\s*voici|absolument[!,.]?\s*voici)\s+(?:une\s+(?:super|bonne|nouvelle|vraie|vraiment|excellente|d[eé]licieuse)?\s*recette\s+d[e']|comment\s+pr[eé]parer\s+(?:un|une|des|le|la)?\s*)/i, '')
    .replace(/^recette\s+(?:facile\s+|rapide\s+|maison\s+)?d[e']\s*/i, '')
    .replace(/^comment\s+faire\s+(?:un|une|des)?\s*/i, '')
    .trim();
}

function extractTimerMinutes(text: string): number | undefined {
  const match = text.match(
    /(?:pendant|durant|environ|cuire|laisser|mijoter|reposer|enfourner|attendre)?\s*(\d+)\s*(?:min|minute|minutes)\b/i
  );
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

function detectCategory(title: string, fullText: string): RecipeCategory {
  const combined = `${title} ${fullText}`.toLowerCase();

  if (
    /(dessert|gâteau|gateau|tarte|chocolat|mousse|crêpe|crepe|cookie|biscuit|flan|muffin|sucré|pain perdu|fondant|clafoutis|tiramisu|panforte|brownie|financier)/i.test(
      combined
    )
  ) {
    return 'Dessert';
  }
  if (
    /(pain\b|baguette|brioche|focaccia|ciabatta|levain|boulangerie|miche|pain de mie|naan|pita|challah|buns)/i.test(
      combined
    ) &&
    !/pain perdu/i.test(combined)
  ) {
    return 'Pains';
  }
  if (
    /(apéro|apéritif|tapas|dips|guacamole|houmous|hummus|chips|cocktail|amuse-bouche|rillettes|bruschetta)/i.test(
      combined
    )
  ) {
    return 'Apéritif';
  }
  if (/(entrée|soupe|salade|velouté|potage|carpaccio|tartare|gaspacho)/i.test(combined)) {
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

export function parseRawRecipeText(rawText: string): ScrapedRecipeDraft {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new Error('Le texte fourni est vide.');
  }

  let title = '';
  let description = '';
  let servings = 4;
  let prepTime: number | undefined = undefined;
  let cookTime: number | undefined = undefined;
  let totalTime: number | undefined = undefined;
  let notes = '';

  const rawIngredients: string[] = [];
  const rawSteps: string[] = [];

  type SectionType = 'UNKNOWN' | 'INGREDIENTS' | 'INSTRUCTIONS' | 'NOTES';
  let currentSection: SectionType = 'UNKNOWN';
  let currentSubgroup = '';

  const isIngredientHeader = (line: string) =>
    /^(?:#+\s*)?(?:[\*\*_]*)?(?:ingr[eé]dients?|ce qu'il vous faut|pour la recette|la liste de courses|courses)(?:[\*\*_]*)\s*:?$/i.test(
      line
    );

  const isInstructionHeader = (line: string) =>
    /^(?:#+\s*)?(?:[\*\*_]*)?(?:pr[eé]paration|instructions?|[eé]tapes?|la marche [aà] suivre|d[eé]roul[eé]|recette|comment faire|r[eé]alisation)(?:[\*\*_]*)\s*:?$/i.test(
      line
    );

  const isNotesHeader = (line: string) =>
    /^(?:#+\s*)?(?:[\*\*_]*)?(?:astuces?|conseils?|notes?|variantes?|secret du chef)(?:[\*\*_]*)\s*:?$/i.test(
      line
    );

  const isSubgroupHeader = (line: string) =>
    /^(?:pour\s+(?:la|le|les)\s+.*|garniture|sauce|p[aâ]te|base|appareils?)\s*:?$/i.test(line);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check meta info when not inside instructions
    if (currentSection !== 'INSTRUCTIONS') {
      const servingsMatch = line.match(
        /(?:pour|portions?|rendement)\s*:?\s*(\d+)\s*(?:personnes?|parts?|cookies?|pi[eè]ces?)?/i
      );
      if (servingsMatch && !title.includes(servingsMatch[0])) {
        const parsed = parseInt(servingsMatch[1], 10);
        if (parsed > 0 && parsed <= 100) {
          servings = parsed;
        }
      }

      const prepMatch = line.match(/^(?:temps\s+de\s+)?pr[eé]paration\s*:?\s*([^\n,;]+)/i);
      if (prepMatch && !isInstructionHeader(line)) {
        const duration = parseMinutesDuration(prepMatch[1]);
        if (duration) prepTime = duration;
      }

      const cookMatch = line.match(/^(?:temps\s+de\s+)?(?:cuisson|four)\s*:?\s*([^\n,;]+)/i);
      if (cookMatch && !isInstructionHeader(line)) {
        const duration = parseMinutesDuration(cookMatch[1]);
        if (duration) cookTime = duration;
      }

      const totalMatch = line.match(/(?:temps\s+total|dur[eé]e\s+totale)\s*:?\s*([^\n,;]+)/i);
      if (totalMatch) {
        const duration = parseMinutesDuration(totalMatch[1]);
        if (duration) totalTime = duration;
      }
    }

    // Section transitions
    if (isIngredientHeader(line)) {
      currentSection = 'INGREDIENTS';
      continue;
    }

    if (isInstructionHeader(line)) {
      currentSection = 'INSTRUCTIONS';
      continue;
    }

    if (isNotesHeader(line)) {
      currentSection = 'NOTES';
      continue;
    }

    // Check conversational AI preamble to extract title
    if (!title) {
      const aiIntroMatch = line.match(
        /^(?:voici|voil[aà]|bien s[uû]r[!,.]?\s*voici|d'accord[!,.]?\s*voici)\s+(?:une\s+(?:super|bonne|vraie|excellente|d[eé]licieuse)?\s*recette\s+d[e']|comment\s+pr[eé]parer\s+(?:un|une|des|le|la)?\s*)(.*?)(?::|!|\.|$)/i
      );
      if (aiIntroMatch && aiIntroMatch[1]) {
        title = cleanConversationalPreamble(aiIntroMatch[1]);
        continue;
      }

      if (line.startsWith('#') || line.startsWith('**')) {
        const cleaned = cleanConversationalPreamble(line);
        if (cleaned && !isIngredientHeader(cleaned) && !isInstructionHeader(cleaned)) {
          title = cleaned;
          continue;
        }
      }

      if (
        line.length < 90 &&
        !isIngredientHeader(line) &&
        !isInstructionHeader(line) &&
        !line.startsWith('-') &&
        !line.startsWith('*') &&
        !/^\d+\./.test(line) &&
        !/^(bonjour|salut|voici)/i.test(line)
      ) {
        title = cleanConversationalPreamble(line);
        continue;
      }
    }

    // Process section items
    if (currentSection === 'INGREDIENTS') {
      if (isSubgroupHeader(line)) {
        currentSubgroup = line.replace(/[:*#]/g, '').trim();
        continue;
      }

      // Check if line is an instruction that was placed after ingredients without header
      if (
        /^\d+[\.)]\s+[A-ZÀ-Ö]/.test(line) &&
        (line.length > 40 || /cuire|mélanger|préchauffer|verser|ajouter|couper|enfourner/i.test(line))
      ) {
        currentSection = 'INSTRUCTIONS';
        rawSteps.push(line);
        continue;
      }

      // If line contains multiple comma-separated ingredients
      if (line.includes(',') && !line.match(/\d+,\d+/) && line.split(',').length >= 3) {
        const parts = line.split(',');
        for (const p of parts) {
          const item = p.replace(/^[-*•–\s]+/, '').trim();
          if (item) {
            rawIngredients.push(currentSubgroup ? `(${currentSubgroup}) ${item}` : item);
          }
        }
        continue;
      }

      const cleanedLine = line.replace(/^[\p{Extended_Pictographic}\s\-\*•–]+/u, '').trim();
      if (cleanedLine.length > 0) {
        rawIngredients.push(currentSubgroup ? `(${currentSubgroup}) ${cleanedLine}` : cleanedLine);
      }
    } else if (currentSection === 'INSTRUCTIONS') {
      const isStepNumbered = /^(?:[eé]tape\s*\d+|step\s*\d+|\d+[\.)])\s*/i;
      const cleanedLine = line.replace(isStepNumbered, '').trim();

      if (cleanedLine.length > 0) {
        if (/^(?:bon\s+app[eé]tit|r[eé]galez-vous|astuce\s*:|conseil\s*:)/i.test(cleanedLine)) {
          notes += (notes ? '\n' : '') + cleanedLine;
        } else {
          rawSteps.push(cleanedLine);
        }
      }
    } else if (currentSection === 'NOTES') {
      notes += (notes ? '\n' : '') + line;
    } else {
      // Unknown section heuristics
      if (
        /^[\p{Extended_Pictographic}\s\-\*•–]/u.test(line) ||
        /^\d+\s*(?:g|kg|ml|cl|l|càs|càc|cuill[eè]re|pinc[eé]e)/i.test(line)
      ) {
        rawIngredients.push(line.replace(/^[\p{Extended_Pictographic}\s\-\*•–]+/u, '').trim());
      } else if (
        /^\d+[\.)]\s*/.test(line) ||
        /^(?:pr[eé]chauffez|m[eé]langez|faites|mettez|dans un|coupez|versez)/i.test(line)
      ) {
        rawSteps.push(line.replace(/^\d+[\.)]\s*/, '').trim());
      } else if (!description && title && line.length > 20 && !line.startsWith('http')) {
        description = line;
      }
    }
  }

  if (!title) {
    title = 'Recette importée';
  }

  const ingredients = rawIngredients.map((raw, idx) => parseIngredient(raw, `ing-${idx + 1}`));
  const instructions = rawSteps.map((stepText, idx) => ({
    id: `step-${idx + 1}`,
    stepNumber: idx + 1,
    text: stepText,
    durationMinutes: extractTimerMinutes(stepText),
  }));

  const category = detectCategory(title, rawText);

  const tags: string[] = [category];
  if (cookTime && cookTime <= 20) tags.push('Rapide');
  if (/chocolat/i.test(title + rawText)) tags.push('Chocolat');
  if (/fromage|parmesan|mozzarella/i.test(title + rawText)) tags.push('Fromage');
  if (/végétarien|vegan/i.test(title + rawText)) tags.push('Végétarien');
  if (/four/i.test(rawText)) tags.push('Four');

  const computedPrep = prepTime !== undefined ? prepTime : 15;
  const computedCook = cookTime !== undefined ? cookTime : 20;
  const computedTotal = totalTime !== undefined ? totalTime : computedPrep + computedCook;

  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    description,
    category,
    servings: servings || 4,
    prepTime: computedPrep,
    cookTime: computedCook,
    totalTime: computedTotal,
    difficulty: 'Moyen',
    ingredients,
    instructions,
    tags,
    notes: notes || undefined,
  };
}
