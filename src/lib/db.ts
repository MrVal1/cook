import { createClient, Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { Recipe, AiHistoryEntry } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'cook.db');
const OLD_RECIPES_FILE = path.join(DATA_DIR, 'recipes.json');
const OLD_HISTORY_FILE = path.join(DATA_DIR, 'ai_history.json');

const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'tarte-tatin-rustique',
    title: 'Tarte Tatin rustique aux pommes caramélisées',
    description: 'La vraie tarte Tatin avec des pommes fondantes caramélisées au beurre demi-sel et une pâte feuilletée croustillante.',
    sourceType: 'manual',
    category: 'Dessert',
    image: 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?auto=format&fit=crop&w=1200&q=80',
    prepTime: 25,
    cookTime: 40,
    totalTime: 65,
    servings: 6,
    difficulty: 'Moyen',
    favorite: true,
    tags: ['Dessert', 'Pommes', 'Caramel', 'Traditionnel', 'Four'],
    notes: 'Servez tiède avec une boule de glace vanille ou une cuillère de crème fraîche épaisse.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: '1', raw: '1 rouleau de pâte feuilletée pur beurre', quantity: 1, unit: 'rouleau', name: 'pâte feuilletée' },
      { id: '2', raw: '1,5 kg de pommes (Golden ou Reine des reinettes)', quantity: 1.5, unit: 'kg', name: 'pommes' },
      { id: '3', raw: '150 g de sucre en poudre', quantity: 150, unit: 'g', name: 'sucre en poudre' },
      { id: '4', raw: '80 g de beurre demi-sel', quantity: 80, unit: 'g', name: 'beurre demi-sel' },
      { id: '5', raw: '1 cuillère à café de cannelle moulue (facultatif)', quantity: 1, unit: 'c. à café', name: 'cannelle' }
    ],
    instructions: [
      { id: 's1', stepNumber: 1, text: 'Préchauffez votre four à 180°C (thermostat 6). Épluchez les pommes, retirez le cœur et coupez-les en gros quartiers.' },
      { id: 's2', stepNumber: 2, text: 'Dans un moule à manqué ou une poêle allant au four, faites fondre le beurre avec le sucre à feu moyen jusqu\'à obtenir un caramel ambré.', durationMinutes: 8 },
      { id: 's3', stepNumber: 3, text: 'Disposez les quartiers de pommes bien serrés verticalement dans le caramel chaud. Saupoudrez d\'un peu de cannelle.' },
      { id: 's4', stepNumber: 4, text: 'Laissez cuire les pommes sur feu doux pendant 15 minutes pour qu\'elles s\'imprègnent bien du caramel.', durationMinutes: 15 },
      { id: 's5', stepNumber: 5, text: 'Déposez la pâte feuilletée sur les pommes en rentrant bien les bords à l\'intérieur du moule. Piquez la pâte avec une fourchette.' },
      { id: 's6', stepNumber: 6, text: 'Enfournez pendant 35 à 40 minutes jusqu\'à ce que la pâte soit bien dorée et croustillante.', durationMinutes: 40 },
      { id: 's7', stepNumber: 7, text: 'Laissez tiédir 10 minutes avant de démouler en retournant d\'un coup sec sur un grand plat de service.' }
    ]
  },
  {
    id: 'risotto-cremeux-champignons',
    title: 'Risotto crémeux aux champignons sauvages & parmesan',
    description: 'Un risotto italien ultra onctueux, parfumé à l\'échalote, vin blanc sec et champignons rôtis.',
    sourceType: 'manual',
    category: 'Plat',
    image: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=1200&q=80',
    prepTime: 15,
    cookTime: 25,
    totalTime: 40,
    servings: 4,
    difficulty: 'Facile',
    favorite: true,
    tags: ['Italien', 'Champignons', 'Parmesan', 'Végétarien', 'Confort'],
    notes: 'Le secret réside dans le bouillon bien chaud ajouté louche après louche sans cesser de remuer.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: '1', raw: '320 g de riz Arborio ou Carnaroli', quantity: 320, unit: 'g', name: 'riz Arborio' },
      { id: '2', raw: '400 g de champignons frais (mélange forestier ou de Paris)', quantity: 400, unit: 'g', name: 'champignons frais' },
      { id: '3', raw: '1 litre de bouillon de légumes chaud', quantity: 1, unit: 'L', name: 'bouillon de légumes' },
      { id: '4', raw: '1 échalote finement ciselée', quantity: 1, unit: 'pièce', name: 'échalote' },
      { id: '5', raw: '10 cl de vin blanc sec', quantity: 10, unit: 'cl', name: 'vin blanc sec' },
      { id: '6', raw: '60 g de parmesan fraîchement râpé', quantity: 60, unit: 'g', name: 'parmesan' },
      { id: '7', raw: '40 g de beurre froid', quantity: 40, unit: 'g', name: 'beurre' },
      { id: '8', raw: '2 cuillères à soupe d\'huile d\'olive', quantity: 2, unit: 'c. à soupe', name: 'huile d\'olive' }
    ],
    instructions: [
      { id: 's1', stepNumber: 1, text: 'Nettoyez et émincez les champignons. Faites-les dorer dans une poêle avec 1 c. à soupe d\'huile d\'olive pendant 6-8 minutes. Salez, poivrez et réservez.', durationMinutes: 8 },
      { id: 's2', stepNumber: 2, text: 'Dans une sauteuse, faites suer l\'échalote dans le reste d\'huile d\'olive jusqu\'à ce qu\'elle devienne translucide.' },
      { id: 's3', stepNumber: 3, text: 'Ajoutez le riz et nacrez-le à feu moyen pendant 2 minutes jusqu\'à ce que les grains soient brillants.', durationMinutes: 2 },
      { id: 's4', stepNumber: 4, text: 'Déglacez avec le vin blanc et laissez s\'évaporer complètement.' },
      { id: 's5', stepNumber: 5, text: 'Versez une louche de bouillon chaud. Remuez doucement et attendez qu\'il soit absorbé avant d\'ajouter la suivante. Répétez l\'opération pendant environ 18 minutes.', durationMinutes: 18 },
      { id: 's6', stepNumber: 6, text: 'Incorporez les champignons réservés dans les deux dernières minutes de cuisson.' },
      { id: 's7', stepNumber: 7, text: 'Hors du feu, réalisez le "mantecare" : incorporez le beurre froid coupé en dés et le parmesan. Couvrez 2 minutes puis mélangez vivement avant de servir.' }
    ]
  },
  {
    id: 'guacamole-authentique',
    title: 'Guacamole authentique mexicain à la coriandre fraîche',
    description: 'Une recette fraîche et addictive à base d\'avocats mûrs, jus de citron vert, piment doux et coriandre.',
    sourceType: 'manual',
    category: 'Apéritif',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80',
    prepTime: 10,
    cookTime: 0,
    totalTime: 10,
    servings: 4,
    difficulty: 'Facile',
    favorite: false,
    tags: ['Apéro', 'Mexicain', 'Avocat', 'Frais', 'Sans cuisson'],
    notes: 'Ne mixez jamais le guacamole : écrasez à la fourchette pour garder de beaux morceaux fondants.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: '1', raw: '3 avocats Hass bien mûrs', quantity: 3, unit: 'pièces', name: 'avocats' },
      { id: '2', raw: '1 citron vert (jus et zeste)', quantity: 1, unit: 'pièce', name: 'citron vert' },
      { id: '3', raw: '1 petit oignon rouge finement haché', quantity: 1, unit: 'pièce', name: 'oignon rouge' },
      { id: '4', raw: '1 tomate mûre épépinée et coupée en petits dés', quantity: 1, unit: 'pièce', name: 'tomate' },
      { id: '5', raw: '1 petit bouquet de coriandre fraîche', quantity: 0.5, unit: 'bouquet', name: 'coriandre fraîche' },
      { id: '6', raw: '1 pincée de piment d\'Espelette ou Jalapeño', quantity: 1, unit: 'pincée', name: 'piment' },
      { id: '7', raw: 'Fleur de sel et poivre noir du moulin', quantity: 1, unit: 'pincée', name: 'sel et poivre' }
    ],
    instructions: [
      { id: 's1', stepNumber: 1, text: 'Coupez les avocats en deux, retirez le noyau et récupérez la chair à la cuillère dans un bol.' },
      { id: 's2', stepNumber: 2, text: 'Arrosez immédiatement avec le jus du citron vert pour éviter l\'oxydation.' },
      { id: 's3', stepNumber: 3, text: 'Écrasez la chair à l\'aide d\'une fourchette en laissant quelques petits morceaux de texture.' },
      { id: 's4', stepNumber: 4, text: 'Incorporez les dés de tomates, l\'oignon rouge et la coriandre finement ciselée.' },
      { id: 's5', stepNumber: 5, text: 'Assaisonnez avec la fleur de sel, le poivre et une touche de piment. Ajustez le jus de citron vert selon vos goûts et servez avec des tortillas de maïs.' }
    ]
  }
];

let clientInstance: Client | null = null;
let initPromise: Promise<void> | null = null;

export function getDb(): Client {
  if (!clientInstance) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const normalized = DB_FILE.replace(/\\/g, '/');
    clientInstance = createClient({
      url: `file:${normalized}`,
    });
  }
  return clientInstance;
}

export async function ensureDbInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const db = getDb();

      // Configure WAL journal mode for performance and concurrent safety
      await db.execute('PRAGMA journal_mode = WAL;');
      await db.execute('PRAGMA foreign_keys = ON;');

      // 1. Create recipes table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS recipes (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          source_url TEXT,
          source_type TEXT NOT NULL,
          image TEXT,
          category TEXT NOT NULL,
          prep_time INTEGER,
          cook_time INTEGER,
          total_time INTEGER,
          servings INTEGER,
          difficulty TEXT,
          favorite INTEGER DEFAULT 0,
          rating REAL DEFAULT 0,
          parent_id TEXT,
          variant_name TEXT,
          fork_notes TEXT,
          tags TEXT,
          notes TEXT,
          ingredients TEXT NOT NULL,
          instructions TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // Migration for existing tables: check if new columns exist
      const tableInfo = await db.execute('PRAGMA table_info(recipes);');
      const existingCols = new Set(tableInfo.rows.map((r) => String(r.name)));
      if (!existingCols.has('rating')) {
        await db.execute('ALTER TABLE recipes ADD COLUMN rating REAL DEFAULT 0;');
      }
      if (!existingCols.has('parent_id')) {
        await db.execute('ALTER TABLE recipes ADD COLUMN parent_id TEXT;');
      }
      if (!existingCols.has('variant_name')) {
        await db.execute('ALTER TABLE recipes ADD COLUMN variant_name TEXT;');
      }
      if (!existingCols.has('fork_notes')) {
        await db.execute('ALTER TABLE recipes ADD COLUMN fork_notes TEXT;');
      }

      await db.execute('CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_recipes_favorite ON recipes(favorite);');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_recipes_rating ON recipes(rating);');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_recipes_parent_id ON recipes(parent_id);');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at);');

      // 2. Create ai_history table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS ai_history (
          id TEXT PRIMARY KEY,
          prompt TEXT NOT NULL,
          recipe TEXT NOT NULL,
          saved_to_recipes INTEGER DEFAULT 0,
          saved_recipe_id TEXT,
          created_at TEXT NOT NULL
        );
      `);

      await db.execute('CREATE INDEX IF NOT EXISTS idx_ai_history_created_at ON ai_history(created_at);');

      // 3. Migrate recipes from existing recipes.json if DB is empty
      const recipeCountRes = await db.execute('SELECT COUNT(*) as cnt FROM recipes;');
      const recipeCount = Number(recipeCountRes.rows[0]?.cnt || 0);

      if (recipeCount === 0) {
        let recipesToInsert = INITIAL_RECIPES;

        if (fs.existsSync(OLD_RECIPES_FILE)) {
          try {
            const raw = fs.readFileSync(OLD_RECIPES_FILE, 'utf-8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              recipesToInsert = parsed;
            }
          } catch (e) {
            console.error('Error reading recipes.json during SQLite migration:', e);
          }
        }

        for (const recipe of recipesToInsert) {
          await db.execute({
            sql: `
              INSERT OR REPLACE INTO recipes (
                id, title, description, source_url, source_type, image, category,
                prep_time, cook_time, total_time, servings, difficulty, favorite,
                tags, notes, ingredients, instructions, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
              recipe.id,
              recipe.title,
              recipe.description || null,
              recipe.sourceUrl || null,
              recipe.sourceType || 'manual',
              recipe.image || null,
              recipe.category || 'Plat',
              recipe.prepTime ?? null,
              recipe.cookTime ?? null,
              recipe.totalTime ?? null,
              recipe.servings ?? null,
              recipe.difficulty || null,
              recipe.favorite ? 1 : 0,
              JSON.stringify(recipe.tags || []),
              recipe.notes || null,
              JSON.stringify(recipe.ingredients || []),
              JSON.stringify(recipe.instructions || []),
              recipe.createdAt || new Date().toISOString(),
              recipe.updatedAt || new Date().toISOString(),
            ],
          });
        }
      }

      // 4. Migrate AI history from ai_history.json if DB is empty
      const historyCountRes = await db.execute('SELECT COUNT(*) as cnt FROM ai_history;');
      const historyCount = Number(historyCountRes.rows[0]?.cnt || 0);

      if (historyCount === 0 && fs.existsSync(OLD_HISTORY_FILE)) {
        try {
          const raw = fs.readFileSync(OLD_HISTORY_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            for (const item of parsed) {
              await db.execute({
                sql: `
                  INSERT OR REPLACE INTO ai_history (
                    id, prompt, recipe, saved_to_recipes, saved_recipe_id, created_at
                  ) VALUES (?, ?, ?, ?, ?, ?)
                `,
                args: [
                  item.id,
                  item.prompt,
                  JSON.stringify(item.recipe),
                  item.savedToRecipes ? 1 : 0,
                  item.savedRecipeId || null,
                  item.createdAt || new Date().toISOString(),
                ],
              });
            }
          }
        } catch (e) {
          console.error('Error reading ai_history.json during SQLite migration:', e);
        }
      }
    })();
  }
  return initPromise;
}

export function rowToRecipe(row: any): Recipe {
  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description ? String(row.description) : undefined,
    sourceUrl: row.source_url ? String(row.source_url) : undefined,
    sourceType: (row.source_type as any) || 'manual',
    image: row.image ? String(row.image) : undefined,
    category: (row.category as any) || 'Plat',
    prepTime: row.prep_time !== null && row.prep_time !== undefined ? Number(row.prep_time) : undefined,
    cookTime: row.cook_time !== null && row.cook_time !== undefined ? Number(row.cook_time) : undefined,
    totalTime: row.total_time !== null && row.total_time !== undefined ? Number(row.total_time) : undefined,
    servings: row.servings !== null && row.servings !== undefined ? Number(row.servings) : 4,
    difficulty: (row.difficulty as any) || undefined,
    favorite: Boolean(row.favorite),
    rating: row.rating !== null && row.rating !== undefined ? Number(row.rating) : 0,
    parentId: row.parent_id ? String(row.parent_id) : undefined,
    variantName: row.variant_name ? String(row.variant_name) : undefined,
    forkNotes: row.fork_notes ? String(row.fork_notes) : undefined,
    variantsCount:
      row.variants_count !== null && row.variants_count !== undefined
        ? Number(row.variants_count)
        : undefined,
    tags: row.tags ? JSON.parse(String(row.tags)) : [],
    notes: row.notes ? String(row.notes) : undefined,
    ingredients: typeof row.ingredients === 'string' ? JSON.parse(row.ingredients) : row.ingredients || [],
    instructions: typeof row.instructions === 'string' ? JSON.parse(row.instructions) : row.instructions || [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function rowToAiHistory(row: any): AiHistoryEntry {
  return {
    id: String(row.id),
    prompt: String(row.prompt),
    createdAt: String(row.created_at),
    recipe: typeof row.recipe === 'string' ? JSON.parse(row.recipe) : row.recipe,
    savedToRecipes: Boolean(row.saved_to_recipes),
    savedRecipeId: row.saved_recipe_id ? String(row.saved_recipe_id) : undefined,
  };
}
