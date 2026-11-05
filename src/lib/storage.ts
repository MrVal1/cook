import { Recipe } from './types';
import { getDb, ensureDbInitialized, rowToRecipe } from './db';

export interface GetRecipesOptions {
  onlyMasters?: boolean; // Default true: only return top-level master recipes
  includeVariants?: boolean;
}

export async function getRecipes(options: GetRecipesOptions = { onlyMasters: true }): Promise<Recipe[]> {
  await ensureDbInitialized();
  const db = getDb();

  const whereClause = options.onlyMasters && !options.includeVariants ? 'WHERE r.parent_id IS NULL' : '';

  const sql = `
    SELECT r.*,
           (SELECT COUNT(*) FROM recipes v WHERE v.parent_id = r.id) AS variants_count
    FROM recipes r
    ${whereClause}
    ORDER BY datetime(r.created_at) DESC;
  `;

  const res = await db.execute(sql);
  return res.rows.map(rowToRecipe);
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  await ensureDbInitialized();
  const db = getDb();
  const res = await db.execute({
    sql: `
      SELECT r.*,
             (SELECT COUNT(*) FROM recipes v WHERE v.parent_id = r.id) AS variants_count
      FROM recipes r
      WHERE r.id = ?
      LIMIT 1;
    `,
    args: [id],
  });
  if (res.rows.length === 0) return null;
  return rowToRecipe(res.rows[0]);
}

export interface RecipeWithVariantsResponse {
  recipe: Recipe;
  masterRecipe: Recipe;
  variants: Recipe[];
}

export async function getRecipeWithVariants(id: string): Promise<RecipeWithVariantsResponse | null> {
  await ensureDbInitialized();
  const current = await getRecipeById(id);
  if (!current) return null;

  const db = getDb();
  const masterId = current.parentId || current.id;
  
  const masterRes = current.parentId ? await getRecipeById(masterId) : current;
  if (!masterRes) return null;

  const variantsRes = await db.execute({
    sql: `
      SELECT r.*, 0 AS variants_count
      FROM recipes r
      WHERE r.parent_id = ?
      ORDER BY r.rating DESC, datetime(r.created_at) ASC;
    `,
    args: [masterId],
  });

  const variants = variantsRes.rows.map(rowToRecipe);

  return {
    recipe: current,
    masterRecipe: masterRes,
    variants,
  };
}

export async function saveRecipe(recipe: Recipe): Promise<Recipe> {
  await ensureDbInitialized();
  const db = getDb();

  const now = new Date().toISOString();
  const createdAt = recipe.createdAt || now;
  const updatedAt = now;

  const toSave: Recipe = {
    ...recipe,
    createdAt,
    updatedAt,
    rating: recipe.rating ?? 0,
    favorite: recipe.favorite ?? false,
  };

  await db.execute({
    sql: `
      INSERT INTO recipes (
        id, title, description, source_url, source_type, image, category,
        prep_time, cook_time, total_time, servings, difficulty, favorite,
        rating, parent_id, variant_name, fork_notes,
        tags, notes, ingredients, instructions, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        source_url = excluded.source_url,
        source_type = excluded.source_type,
        image = excluded.image,
        category = excluded.category,
        prep_time = excluded.prep_time,
        cook_time = excluded.cook_time,
        total_time = excluded.total_time,
        servings = excluded.servings,
        difficulty = excluded.difficulty,
        favorite = excluded.favorite,
        rating = excluded.rating,
        parent_id = excluded.parent_id,
        variant_name = excluded.variant_name,
        fork_notes = excluded.fork_notes,
        tags = excluded.tags,
        notes = excluded.notes,
        ingredients = excluded.ingredients,
        instructions = excluded.instructions,
        updated_at = excluded.updated_at;
    `,
    args: [
      toSave.id,
      toSave.title,
      toSave.description || null,
      toSave.sourceUrl || null,
      toSave.sourceType || 'manual',
      toSave.image || null,
      toSave.category || 'Plat',
      toSave.prepTime ?? null,
      toSave.cookTime ?? null,
      toSave.totalTime ?? null,
      toSave.servings ?? 4,
      toSave.difficulty || null,
      toSave.favorite ? 1 : 0,
      toSave.rating ?? 0,
      toSave.parentId || null,
      toSave.variantName || null,
      toSave.forkNotes || null,
      JSON.stringify(toSave.tags || []),
      toSave.notes || null,
      JSON.stringify(toSave.ingredients || []),
      JSON.stringify(toSave.instructions || []),
      toSave.createdAt,
      toSave.updatedAt,
    ],
  });

  return toSave;
}

export async function rateRecipe(id: string, rating: number): Promise<Recipe | null> {
  await ensureDbInitialized();
  const db = getDb();
  const clampedRating = Math.max(0, Math.min(5, Math.round(rating * 10) / 10));

  await db.execute({
    sql: 'UPDATE recipes SET rating = ?, updated_at = ? WHERE id = ?;',
    args: [clampedRating, new Date().toISOString(), id],
  });

  return getRecipeById(id);
}

export async function promoteVariantToMaster(variantId: string): Promise<Recipe | null> {
  await ensureDbInitialized();
  const db = getDb();

  const variant = await getRecipeById(variantId);
  if (!variant || !variant.parentId) {
    return variant; // Already a master
  }

  const oldMasterId = variant.parentId;
  const oldMaster = await getRecipeById(oldMasterId);
  if (!oldMaster) return null;

  const now = new Date().toISOString();

  // 1. Move all other siblings of old master to be children of new master
  await db.execute({
    sql: 'UPDATE recipes SET parent_id = ?, updated_at = ? WHERE parent_id = ? AND id != ?;',
    args: [variantId, now, oldMasterId, variantId],
  });

  // 2. Turn old master into a variant of the new master
  const oldMasterVariantName = oldMaster.variantName || 'Version d\'origine';
  await db.execute({
    sql: 'UPDATE recipes SET parent_id = ?, variant_name = ?, updated_at = ? WHERE id = ?;',
    args: [variantId, oldMasterVariantName, now, oldMasterId],
  });

  // 3. Promote variant to be the master (parent_id = NULL)
  await db.execute({
    sql: 'UPDATE recipes SET parent_id = NULL, variant_name = NULL, updated_at = ? WHERE id = ?;',
    args: [now, variantId],
  });

  return getRecipeById(variantId);
}

export async function deleteRecipe(id: string): Promise<boolean> {
  await ensureDbInitialized();
  const db = getDb();

  const recipe = await getRecipeById(id);
  if (!recipe) return false;

  const now = new Date().toISOString();

  // If this recipe is a master recipe and has variants:
  if (!recipe.parentId && (recipe.variantsCount || 0) > 0) {
    // Pick the best variant to promote to master before deleting this master!
    const variantsRes = await db.execute({
      sql: 'SELECT id FROM recipes WHERE parent_id = ? ORDER BY rating DESC, datetime(created_at) ASC LIMIT 1;',
      args: [id],
    });

    if (variantsRes.rows.length > 0) {
      const nextMasterId = String(variantsRes.rows[0].id);
      await promoteVariantToMaster(nextMasterId);
    }
  }

  const res = await db.execute({
    sql: 'DELETE FROM recipes WHERE id = ?;',
    args: [id],
  });
  return res.rowsAffected > 0;
}

export async function toggleFavorite(id: string): Promise<Recipe | null> {
  await ensureDbInitialized();
  const db = getDb();
  const existing = await getRecipeById(id);
  if (!existing) return null;

  const newFavorite = !existing.favorite;
  await db.execute({
    sql: 'UPDATE recipes SET favorite = ?, updated_at = ? WHERE id = ?;',
    args: [newFavorite ? 1 : 0, new Date().toISOString(), id],
  });

  return { ...existing, favorite: newFavorite };
}
