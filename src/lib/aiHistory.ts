import { AiHistoryEntry } from './types';
import { getDb, ensureDbInitialized, rowToAiHistory } from './db';

export async function getAiHistory(): Promise<AiHistoryEntry[]> {
  await ensureDbInitialized();
  const db = getDb();
  const res = await db.execute('SELECT * FROM ai_history ORDER BY datetime(created_at) DESC;');
  return res.rows.map(rowToAiHistory);
}

export async function saveAiHistoryEntry(entry: AiHistoryEntry): Promise<AiHistoryEntry> {
  await ensureDbInitialized();
  const db = getDb();

  await db.execute({
    sql: `
      INSERT INTO ai_history (
        id, prompt, recipe, saved_to_recipes, saved_recipe_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        prompt = excluded.prompt,
        recipe = excluded.recipe,
        saved_to_recipes = excluded.saved_to_recipes,
        saved_recipe_id = excluded.saved_recipe_id;
    `,
    args: [
      entry.id,
      entry.prompt,
      JSON.stringify(entry.recipe),
      entry.savedToRecipes ? 1 : 0,
      entry.savedRecipeId || null,
      entry.createdAt || new Date().toISOString(),
    ],
  });

  return entry;
}

export async function markHistoryEntrySaved(
  historyId: string,
  recipeId: string
): Promise<boolean> {
  await ensureDbInitialized();
  const db = getDb();
  const res = await db.execute({
    sql: 'UPDATE ai_history SET saved_to_recipes = 1, saved_recipe_id = ? WHERE id = ?;',
    args: [recipeId, historyId],
  });
  return res.rowsAffected > 0;
}

export async function deleteHistoryEntry(id: string): Promise<boolean> {
  await ensureDbInitialized();
  const db = getDb();
  const res = await db.execute({
    sql: 'DELETE FROM ai_history WHERE id = ?;',
    args: [id],
  });
  return res.rowsAffected > 0;
}

export async function clearAiHistory(): Promise<boolean> {
  await ensureDbInitialized();
  const db = getDb();
  await db.execute('DELETE FROM ai_history;');
  return true;
}
