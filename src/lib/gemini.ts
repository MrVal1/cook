export async function getAvailableGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`
    );
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.models || !Array.isArray(data.models)) return [];

    return data.models
      .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: any) => m.name.replace(/^models\//, ''));
  } catch {
    return [];
  }
}

export function selectBestGeminiModel(availableModels: string[], preferred?: string): string {
  if (preferred && availableModels.includes(preferred)) {
    return preferred;
  }

  // Preference hierarchy for fast, high-quality models
  const preferences = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-2.5-pro',
    'gemini-2.0-pro',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro',
    'gemini-pro',
  ];

  for (const candidate of preferences) {
    if (availableModels.includes(candidate)) {
      return candidate;
    }
  }

  // Fallback: any model containing "flash"
  const flashModel = availableModels.find((m) => m.toLowerCase().includes('flash'));
  if (flashModel) return flashModel;

  // Fallback: any model containing "gemini"
  const geminiModel = availableModels.find((m) => m.toLowerCase().includes('gemini'));
  if (geminiModel) return geminiModel;

  // Ultimate fallback if list is empty or unexpected
  return preferred || 'gemini-1.5-flash-latest';
}

export function extractJsonFromAiOutput(rawText: string): any {
  if (!rawText || typeof rawText !== 'string') return null;

  const trimmed = rawText.trim();

  // 1. Try direct parse
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2. Try fenced block ```json ... ``` or ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // 3. Extract substring between first '{' and last '}'
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonCandidate);
    } catch {
      // Clean possible trailing commas or invalid control characters
      const cleaned = jsonCandidate
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => (c === '\n' || c === '\r' || c === '\t' ? c : ''));
      try {
        return JSON.parse(cleaned);
      } catch {}
    }
  }

  return null;
}
