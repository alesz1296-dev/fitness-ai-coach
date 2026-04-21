/**
 * Built-in food database — ~180 common foods with nutritional data per 100g.
 * Plug in Spoonacular API key in .env (SPOONACULAR_API_KEY) to override with live search.
 */

export interface FoodItem {
  id: string;
  name: string;
  calories: number;   // per 100g
  protein: number;
  carbs: number;
  fats: number;
  defaultQty: number;
  defaultUnit: string;
}

export const FOOD_DB: FoodItem[] = [
  // ── Proteins ─────────────────────────────────────────────────────────────
  { id: "f001", name: "Chicken Breast (cooked)", calories: 165, protein: 31, carbs: 0,  fats: 3.6, defaultQty: 150, defaultUnit: "g" },
  { id: "f002", name: "Chicken Thigh (cooked)",  calories: 209, protein: 26, carbs: 0,  fats: 11,  defaultQty: 150, defaultUnit: "g" },
  { id: "f003", name: "Ground Beef 80/20",        calories: 254, protein: 26, carbs: 0,  fats: 17,  defaultQty: 150, defaultUnit: "g" },
  { id: "f004", name: "Ground Beef 93/7",         calories: 176, protein: 28, carbs: 0,  fats: 7,   defaultQty: 150, defaultUnit: "g" },
  { id: "f005", name: "Salmon (cooked)",           calories: 208, protein: 20, carbs: 0,  fats: 13,  defaultQty: 150, defaultUnit: "g" },
  { id: "f006", name: "Tuna (canned in water)",   calories: 116, protein: 26, carbs: 0,  fats: 1,   defaultQty: 100, defaultUnit: "g" },
  { id: "f007", name: "Tilapia (cooked)",          calories: 128, protein: 26, carbs: 0,  fats: 3,   defaultQty: 150, defaultUnit: "g" },
  { id: "f008", name: "Shrimp (cooked)",           calories: 99,  protein: 24, carbs: 0,  fats: 0.3, defaultQty: 100, defaultUnit: "g" },
  { id: "f009", name: "Turkey Breast (cooked)",    calories: 135, protein: 30, carbs: 0,  fats: 1,   defaultQty: 150, defaultUnit: "g" },
  { id: "f010", name: "Pork Loin (cooked)",        calories: 187, protein: 29, carbs: 0,  fats: 7,   defaultQty: 150, defaultUnit: "g" },
  { id: "f011", name: "Eggs",                      calories: 155, protein: 13, carbs: 1,  fats: 11,  defaultQty: 2,   defaultUnit: "large" },
  { id: "f012", name: "Egg Whites",                calories: 52,  protein: 11, carbs: 1,  fats: 0.2, defaultQty: 100, defaultUnit: "g" },
  { id: "f013", name: "Greek Yogurt (0% fat)",     calories: 59,  protein: 10, carbs: 4,  fats: 0.4, defaultQty: 200, defaultUnit: "g" },
  { id: "f014", name: "Greek Yogurt (2% fat)",     calories: 73,  protein: 9,  carbs: 5,  fats: 2,   defaultQty: 200, defaultUnit: "g" },
  { id: "f015", name: "Cottage Cheese (low fat)",  calories: 72,  protein: 12, carbs: 3,  fats: 1,   defaultQty: 200, defaultUnit: "g" },
  { id: "f016", name: "Whey Protein Powder",       calories: 370, protein: 75, carbs: 8,  fats: 4,   defaultQty: 30,  defaultUnit: "g" },
  { id: "f017", name: "Casein Protein Powder",     calories: 360, protein: 72, carbs: 10, fats: 3,   defaultQty: 30,  defaultUnit: "g" },
  { id: "f018", name: "Beef Steak (sirloin)",      calories: 207, protein: 26, carbs: 0,  fats: 11,  defaultQty: 200, defaultUnit: "g" },
  { id: "f019", name: "Tofu (firm)",               calories: 76,  protein: 8,  carbs: 2,  fats: 4,   defaultQty: 150, defaultUnit: "g" },
  { id: "f020", name: "Edamame",                   calories: 122, protein: 11, carbs: 10, fats: 5,   defaultQty: 100, defaultUnit: "g" },

  // ── Dairy ─────────────────────────────────────────────────────────────────
  { id: "f021", name: "Whole Milk",                calories: 61,  protein: 3.2, carbs: 5, fats: 3.3, defaultQty: 250, defaultUnit: "ml" },
  { id: "f022", name: "Skim Milk",                 calories: 34,  protein: 3.4, carbs: 5, fats: 0.1, defaultQty: 250, defaultUnit: "ml" },
  { id: "f023", name: "Cheddar Cheese",            calories: 402, protein: 25, carbs: 1, fats: 33,  defaultQty: 30,  defaultUnit: "g" },
  { id: "f024", name: "Mozzarella (part skim)",    calories: 254, protein: 24, carbs: 3, fats: 16,  defaultQty: 50,  defaultUnit: "g" },
  { id: "f025", name: "Butter",                    calories: 717, protein: 0.9, carbs: 0.1, fats: 81, defaultQty: 10, defaultUnit: "g" },

  // ── Carbs / Grains ────────────────────────────────────────────────────────
  { id: "f030", name: "White Rice (cooked)",       calories: 130, protein: 2.7, carbs: 28, fats: 0.3, defaultQty: 200, defaultUnit: "g" },
  { id: "f031", name: "Brown Rice (cooked)",       calories: 112, protein: 2.6, carbs: 23, fats: 0.9, defaultQty: 200, defaultUnit: "g" },
  { id: "f032", name: "Oats (dry)",                calories: 389, protein: 17,  carbs: 66, fats: 7,   defaultQty: 80,  defaultUnit: "g" },
  { id: "f033", name: "Pasta (cooked)",            calories: 131, protein: 5,   carbs: 25, fats: 1.1, defaultQty: 200, defaultUnit: "g" },
  { id: "f034", name: "White Bread",               calories: 265, protein: 9,   carbs: 49, fats: 3.2, defaultQty: 2,   defaultUnit: "slices" },
  { id: "f035", name: "Whole Wheat Bread",         calories: 247, protein: 13,  carbs: 41, fats: 4,   defaultQty: 2,   defaultUnit: "slices" },
  { id: "f036", name: "Sweet Potato (cooked)",     calories: 86,  protein: 1.6, carbs: 20, fats: 0.1, defaultQty: 150, defaultUnit: "g" },
  { id: "f037", name: "White Potato (baked)",      calories: 93,  protein: 2.5, carbs: 21, fats: 0.1, defaultQty: 150, defaultUnit: "g" },
  { id: "f038", name: "Quinoa (cooked)",           calories: 120, protein: 4.4, carbs: 21, fats: 1.9, defaultQty: 180, defaultUnit: "g" },
  { id: "f039", name: "Bagel (plain)",             calories: 257, protein: 10,  carbs: 50, fats: 1.6, defaultQty: 1,   defaultUnit: "medium" },
  { id: "f040", name: "Tortilla (flour)",          calories: 297, protein: 8,   carbs: 50, fats: 7,   defaultQty: 1,   defaultUnit: "medium" },
  { id: "f041", name: "Corn Tortilla",             calories: 218, protein: 5.7, carbs: 46, fats: 2.5, defaultQty: 2,   defaultUnit: "medium" },
  { id: "f042", name: "Granola",                   calories: 471, protein: 10,  carbs: 64, fats: 20,  defaultQty: 50,  defaultUnit: "g" },
  { id: "f043", name: "Cereal (corn flakes)",      calories: 357, protein: 7.5, carbs: 84, fats: 0.4, defaultQty: 40,  defaultUnit: "g" },

  // ── Vegetables ────────────────────────────────────────────────────────────
  { id: "f050", name: "Broccoli",                  calories: 34,  protein: 2.8, carbs: 7,  fats: 0.4, defaultQty: 150, defaultUnit: "g" },
  { id: "f051", name: "Spinach",                   calories: 23,  protein: 2.9, carbs: 3.6,fats: 0.4, defaultQty: 100, defaultUnit: "g" },
  { id: "f052", name: "Kale",                      calories: 49,  protein: 4.3, carbs: 9,  fats: 0.9, defaultQty: 100, defaultUnit: "g" },
  { id: "f053", name: "Mixed Greens",              calories: 20,  protein: 1.8, carbs: 3,  fats: 0.3, defaultQty: 100, defaultUnit: "g" },
  { id: "f054", name: "Bell Pepper",               calories: 31,  protein: 1,   carbs: 6,  fats: 0.3, defaultQty: 150, defaultUnit: "g" },
  { id: "f055", name: "Tomato",                    calories: 18,  protein: 0.9, carbs: 3.9,fats: 0.2, defaultQty: 150, defaultUnit: "g" },
  { id: "f056", name: "Carrot",                    calories: 41,  protein: 0.9, carbs: 10, fats: 0.2, defaultQty: 100, defaultUnit: "g" },
  { id: "f057", name: "Cucumber",                  calories: 15,  protein: 0.7, carbs: 3.6,fats: 0.1, defaultQty: 100, defaultUnit: "g" },
  { id: "f058", name: "Asparagus",                 calories: 20,  protein: 2.2, carbs: 3.7,fats: 0.1, defaultQty: 150, defaultUnit: "g" },
  { id: "f059", name: "Zucchini",                  calories: 17,  protein: 1.2, carbs: 3.1,fats: 0.3, defaultQty: 150, defaultUnit: "g" },
  { id: "f060", name: "Green Beans",               calories: 31,  protein: 1.8, carbs: 7,  fats: 0.1, defaultQty: 150, defaultUnit: "g" },
  { id: "f061", name: "Mushrooms",                 calories: 22,  protein: 3.1, carbs: 3.3,fats: 0.3, defaultQty: 100, defaultUnit: "g" },
  { id: "f062", name: "Onion",                     calories: 40,  protein: 1.1, carbs: 9,  fats: 0.1, defaultQty: 80,  defaultUnit: "g" },
  { id: "f063", name: "Garlic",                    calories: 149, protein: 6.4, carbs: 33, fats: 0.5, defaultQty: 10,  defaultUnit: "g" },

  // ── Fruits ───────────────────────────────────────────────────────────────
  { id: "f070", name: "Banana",                    calories: 89,  protein: 1.1, carbs: 23, fats: 0.3, defaultQty: 1,   defaultUnit: "medium" },
  { id: "f071", name: "Apple",                     calories: 52,  protein: 0.3, carbs: 14, fats: 0.2, defaultQty: 1,   defaultUnit: "medium" },
  { id: "f072", name: "Blueberries",               calories: 57,  protein: 0.7, carbs: 14, fats: 0.3, defaultQty: 100, defaultUnit: "g" },
  { id: "f073", name: "Strawberries",              calories: 32,  protein: 0.7, carbs: 8,  fats: 0.3, defaultQty: 150, defaultUnit: "g" },
  { id: "f074", name: "Orange",                    calories: 47,  protein: 0.9, carbs: 12, fats: 0.1, defaultQty: 1,   defaultUnit: "medium" },
  { id: "f075", name: "Mango",                     calories: 60,  protein: 0.8, carbs: 15, fats: 0.4, defaultQty: 150, defaultUnit: "g" },
  { id: "f076", name: "Avocado",                   calories: 160, protein: 2,   carbs: 9,  fats: 15,  defaultQty: 0.5, defaultUnit: "medium" },
  { id: "f077", name: "Watermelon",                calories: 30,  protein: 0.6, carbs: 8,  fats: 0.2, defaultQty: 300, defaultUnit: "g" },
  { id: "f078", name: "Grapes",                    calories: 69,  protein: 0.7, carbs: 18, fats: 0.2, defaultQty: 150, defaultUnit: "g" },
  { id: "f079", name: "Pineapple",                 calories: 50,  protein: 0.5, carbs: 13, fats: 0.1, defaultQty: 150, defaultUnit: "g" },

  // ── Fats & Oils ───────────────────────────────────────────────────────────
  { id: "f080", name: "Olive Oil",                 calories: 884, protein: 0,   carbs: 0,  fats: 100, defaultQty: 15,  defaultUnit: "ml" },
  { id: "f081", name: "Coconut Oil",               calories: 862, protein: 0,   carbs: 0,  fats: 100, defaultQty: 15,  defaultUnit: "ml" },
  { id: "f082", name: "Almonds",                   calories: 579, protein: 21,  carbs: 22, fats: 50,  defaultQty: 30,  defaultUnit: "g" },
  { id: "f083", name: "Cashews",                   calories: 553, protein: 18,  carbs: 30, fats: 44,  defaultQty: 30,  defaultUnit: "g" },
  { id: "f084", name: "Walnuts",                   calories: 654, protein: 15,  carbs: 14, fats: 65,  defaultQty: 30,  defaultUnit: "g" },
  { id: "f085", name: "Peanut Butter",             calories: 588, protein: 25,  carbs: 20, fats: 50,  defaultQty: 32,  defaultUnit: "g" },
  { id: "f086", name: "Almond Butter",             calories: 614, protein: 21,  carbs: 19, fats: 56,  defaultQty: 32,  defaultUnit: "g" },
  { id: "f087", name: "Chia Seeds",                calories: 486, protein: 17,  carbs: 42, fats: 31,  defaultQty: 25,  defaultUnit: "g" },
  { id: "f088", name: "Flaxseeds",                 calories: 534, protein: 18,  carbs: 29, fats: 42,  defaultQty: 15,  defaultUnit: "g" },

  // ── Legumes ───────────────────────────────────────────────────────────────
  { id: "f090", name: "Black Beans (cooked)",      calories: 132, protein: 8.9, carbs: 24, fats: 0.5, defaultQty: 200, defaultUnit: "g" },
  { id: "f091", name: "Chickpeas (cooked)",        calories: 164, protein: 8.9, carbs: 27, fats: 2.6, defaultQty: 200, defaultUnit: "g" },
  { id: "f092", name: "Lentils (cooked)",          calories: 116, protein: 9,   carbs: 20, fats: 0.4, defaultQty: 200, defaultUnit: "g" },
  { id: "f093", name: "Kidney Beans (cooked)",     calories: 127, protein: 8.7, carbs: 23, fats: 0.5, defaultQty: 200, defaultUnit: "g" },

  // ── Fast Food / Meals ─────────────────────────────────────────────────────
  { id: "f100", name: "Burger (beef, plain)",      calories: 295, protein: 17,  carbs: 24, fats: 14,  defaultQty: 1,   defaultUnit: "medium" },
  { id: "f101", name: "Pizza (cheese, 1 slice)",   calories: 272, protein: 12,  carbs: 33, fats: 10,  defaultQty: 1,   defaultUnit: "slice" },
  { id: "f102", name: "French Fries (medium)",     calories: 312, protein: 3.4, carbs: 41, fats: 15,  defaultQty: 1,   defaultUnit: "medium" },
  { id: "f103", name: "Burrito (chicken)",         calories: 206, protein: 14,  carbs: 22, fats: 7,   defaultQty: 1,   defaultUnit: "medium" },
  { id: "f104", name: "Sushi Roll (8pc)",          calories: 255, protein: 9,   carbs: 38, fats: 7,   defaultQty: 1,   defaultUnit: "roll" },

  // ── Beverages ─────────────────────────────────────────────────────────────
  { id: "f110", name: "Orange Juice",              calories: 45,  protein: 0.7, carbs: 10, fats: 0.2, defaultQty: 250, defaultUnit: "ml" },
  { id: "f111", name: "Whole Milk",                calories: 61,  protein: 3.2, carbs: 5,  fats: 3.3, defaultQty: 250, defaultUnit: "ml" },
  { id: "f112", name: "Sports Drink (Gatorade)",  calories: 26,  protein: 0,   carbs: 7,  fats: 0,   defaultQty: 500, defaultUnit: "ml" },
  { id: "f113", name: "Protein Shake (mixed)",    calories: 200, protein: 30,  carbs: 15, fats: 3,   defaultQty: 1,   defaultUnit: "serving" },
  { id: "f114", name: "Black Coffee",             calories: 2,   protein: 0.3, carbs: 0,  fats: 0,   defaultQty: 250, defaultUnit: "ml" },
  { id: "f115", name: "Latte (whole milk)",       calories: 100, protein: 6,   carbs: 10, fats: 4,   defaultQty: 1,   defaultUnit: "medium" },
  { id: "f116", name: "Beer (regular)",           calories: 43,  protein: 0.5, carbs: 3.6,fats: 0,   defaultQty: 330, defaultUnit: "ml" },

  // ── Snacks / Misc ─────────────────────────────────────────────────────────
  { id: "f120", name: "Rice Cakes",               calories: 387, protein: 8,   carbs: 82, fats: 3,   defaultQty: 2,   defaultUnit: "cakes" },
  { id: "f121", name: "Dark Chocolate (70%)",     calories: 598, protein: 8,   carbs: 46, fats: 43,  defaultQty: 30,  defaultUnit: "g" },
  { id: "f122", name: "Protein Bar",              calories: 200, protein: 20,  carbs: 22, fats: 6,   defaultQty: 1,   defaultUnit: "bar" },
  { id: "f123", name: "Trail Mix",               calories: 462, protein: 12,  carbs: 46, fats: 28,  defaultQty: 50,  defaultUnit: "g" },
  { id: "f124", name: "Hummus",                  calories: 177, protein: 8,   carbs: 14, fats: 10,  defaultQty: 60,  defaultUnit: "g" },
  { id: "f125", name: "Pita Bread",              calories: 275, protein: 9,   carbs: 56, fats: 1.2, defaultQty: 1,   defaultUnit: "medium" },
  { id: "f126", name: "Honey",                   calories: 304, protein: 0.3, carbs: 82, fats: 0,   defaultQty: 20,  defaultUnit: "g" },
];

/**
 * Search the food database by name (case-insensitive, partial match).
 * Returns up to `limit` results sorted by relevance (prefix match ranked higher).
 */
export function searchFoods(query: string, limit = 20): FoodItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return FOOD_DB.slice(0, limit);

  const scored = FOOD_DB
    .filter((f) => f.name.toLowerCase().includes(q))
    .map((f) => ({
      item:  f,
      score: f.name.toLowerCase().startsWith(q) ? 2 : 1,
    }));

  scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
  return scored.slice(0, limit).map((s) => s.item);
}
