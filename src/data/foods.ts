/**
 * Built-in food database — ~230 common foods with nutritional data per 100g.
 * Plug in Spoonacular API key in .env (SPOONACULAR_API_KEY) to override with live search.
 *
 * Tags available: keto | fit | high-protein | vegan | vegetarian | integral
 *                 low-carb | fruit | vegetable | dairy | legume | mix
 *                 meat | seafood | cheese | soup | sausage | pasta
 *                 japanese | italian | mexican | middle-eastern | korean
 */

export interface FoodItem {
  id: string;
  name: string;
  calories: number;   // per 100g (or per default unit for non-100g items)
  protein: number;
  carbs: number;
  fats: number;
  defaultQty: number;
  defaultUnit: string;
  tags?: string[];
}

export const FOOD_DB: FoodItem[] = [
  // ── Proteins ─────────────────────────────────────────────────────────────
  { id: "f001", name: "Chicken Breast (cooked)", calories: 165, protein: 31, carbs: 0,  fats: 3.6, defaultQty: 150, defaultUnit: "g",       tags: ["fit","high-protein","keto","low-carb"] },
  { id: "f002", name: "Chicken Thigh (cooked)",  calories: 209, protein: 26, carbs: 0,  fats: 11,  defaultQty: 150, defaultUnit: "g",       tags: ["high-protein","keto","low-carb"] },
  { id: "f003", name: "Ground Beef 80/20",        calories: 254, protein: 26, carbs: 0,  fats: 17,  defaultQty: 150, defaultUnit: "g",       tags: ["high-protein","keto","low-carb"] },
  { id: "f004", name: "Ground Beef 93/7",         calories: 176, protein: 28, carbs: 0,  fats: 7,   defaultQty: 150, defaultUnit: "g",       tags: ["fit","high-protein","keto","low-carb"] },
  { id: "f005", name: "Salmon (cooked)",           calories: 208, protein: 20, carbs: 0,  fats: 13,  defaultQty: 150, defaultUnit: "g",       tags: ["fit","high-protein","keto","low-carb"] },
  { id: "f006", name: "Tuna (canned in water)",   calories: 116, protein: 26, carbs: 0,  fats: 1,   defaultQty: 100, defaultUnit: "g",       tags: ["fit","high-protein","keto","low-carb"] },
  { id: "f007", name: "Tilapia (cooked)",          calories: 128, protein: 26, carbs: 0,  fats: 3,   defaultQty: 150, defaultUnit: "g",       tags: ["fit","high-protein","keto","low-carb"] },
  { id: "f008", name: "Shrimp (cooked)",           calories: 99,  protein: 24, carbs: 0,  fats: 0.3, defaultQty: 100, defaultUnit: "g",       tags: ["fit","high-protein","keto","low-carb"] },
  { id: "f009", name: "Turkey Breast (cooked)",    calories: 135, protein: 30, carbs: 0,  fats: 1,   defaultQty: 150, defaultUnit: "g",       tags: ["fit","high-protein","keto","low-carb"] },
  { id: "f010", name: "Pork Loin (cooked)",        calories: 187, protein: 29, carbs: 0,  fats: 7,   defaultQty: 150, defaultUnit: "g",       tags: ["high-protein","keto","low-carb"] },
  { id: "f011", name: "Eggs",                      calories: 155, protein: 13, carbs: 1,  fats: 11,  defaultQty: 2,   defaultUnit: "large",   tags: ["high-protein","keto","low-carb","vegetarian"] },
  { id: "f012", name: "Egg Whites",                calories: 52,  protein: 11, carbs: 1,  fats: 0.2, defaultQty: 100, defaultUnit: "g",       tags: ["fit","high-protein","keto","low-carb","vegetarian"] },
  { id: "f013", name: "Greek Yogurt (0% fat)",     calories: 59,  protein: 10, carbs: 4,  fats: 0.4, defaultQty: 200, defaultUnit: "g",       tags: ["fit","high-protein","vegetarian","dairy"] },
  { id: "f014", name: "Greek Yogurt (2% fat)",     calories: 73,  protein: 9,  carbs: 5,  fats: 2,   defaultQty: 200, defaultUnit: "g",       tags: ["high-protein","vegetarian","dairy"] },
  { id: "f015", name: "Cottage Cheese (low fat)",  calories: 72,  protein: 12, carbs: 3,  fats: 1,   defaultQty: 200, defaultUnit: "g",       tags: ["fit","high-protein","vegetarian","dairy"] },
  { id: "f016", name: "Whey Protein Powder",       calories: 370, protein: 75, carbs: 8,  fats: 4,   defaultQty: 30,  defaultUnit: "g",       tags: ["fit","high-protein","vegetarian"] },
  { id: "f017", name: "Casein Protein Powder",     calories: 360, protein: 72, carbs: 10, fats: 3,   defaultQty: 30,  defaultUnit: "g",       tags: ["high-protein","vegetarian"] },
  { id: "f018", name: "Beef Steak (sirloin)",      calories: 207, protein: 26, carbs: 0,  fats: 11,  defaultQty: 200, defaultUnit: "g",       tags: ["high-protein","keto","low-carb"] },
  { id: "f019", name: "Tofu (firm)",               calories: 76,  protein: 8,  carbs: 2,  fats: 4,   defaultQty: 150, defaultUnit: "g",       tags: ["high-protein","vegan","vegetarian","low-carb"] },
  { id: "f020", name: "Edamame",                   calories: 122, protein: 11, carbs: 10, fats: 5,   defaultQty: 100, defaultUnit: "g",       tags: ["high-protein","vegan","vegetarian"] },

  // ── Dairy ─────────────────────────────────────────────────────────────────
  { id: "f021", name: "Whole Milk",                calories: 61,  protein: 3.2, carbs: 5,  fats: 3.3, defaultQty: 250, defaultUnit: "ml",     tags: ["vegetarian","dairy"] },
  { id: "f022", name: "Skim Milk",                 calories: 34,  protein: 3.4, carbs: 5,  fats: 0.1, defaultQty: 250, defaultUnit: "ml",     tags: ["fit","vegetarian","dairy"] },
  { id: "f023", name: "Cheddar Cheese",            calories: 402, protein: 25, carbs: 1,  fats: 33,  defaultQty: 30,  defaultUnit: "g",       tags: ["keto","vegetarian","dairy"] },
  { id: "f024", name: "Mozzarella (part skim)",    calories: 254, protein: 24, carbs: 3,  fats: 16,  defaultQty: 50,  defaultUnit: "g",       tags: ["keto","vegetarian","dairy"] },
  { id: "f025", name: "Butter",                    calories: 717, protein: 0.9, carbs: 0.1,fats: 81,  defaultQty: 10,  defaultUnit: "g",      tags: ["keto","vegetarian","dairy"] },

  // ── Carbs / Grains ────────────────────────────────────────────────────────
  { id: "f030", name: "White Rice (cooked)",       calories: 130, protein: 2.7, carbs: 28, fats: 0.3, defaultQty: 200, defaultUnit: "g",      tags: ["vegan","vegetarian"] },
  { id: "f031", name: "Brown Rice (cooked)",       calories: 112, protein: 2.6, carbs: 23, fats: 0.9, defaultQty: 200, defaultUnit: "g",      tags: ["integral","vegan","vegetarian"] },
  { id: "f032", name: "Oats (dry)",                calories: 389, protein: 17,  carbs: 66, fats: 7,   defaultQty: 80,  defaultUnit: "g",      tags: ["integral","vegan","vegetarian"] },
  { id: "f033", name: "Pasta (cooked)",            calories: 131, protein: 5,   carbs: 25, fats: 1.1, defaultQty: 200, defaultUnit: "g",      tags: ["vegan","vegetarian","pasta"] },
  { id: "f034", name: "White Bread",               calories: 265, protein: 9,   carbs: 49, fats: 3.2, defaultQty: 2,   defaultUnit: "slices", tags: ["vegetarian"] },
  { id: "f035", name: "Whole Wheat Bread",         calories: 247, protein: 13,  carbs: 41, fats: 4,   defaultQty: 2,   defaultUnit: "slices", tags: ["integral","vegan","vegetarian"] },
  { id: "f036", name: "Sweet Potato (cooked)",     calories: 86,  protein: 1.6, carbs: 20, fats: 0.1, defaultQty: 150, defaultUnit: "g",      tags: ["vegan","vegetarian","fit"] },
  { id: "f037", name: "White Potato (baked)",      calories: 93,  protein: 2.5, carbs: 21, fats: 0.1, defaultQty: 150, defaultUnit: "g",      tags: ["vegan","vegetarian"] },
  { id: "f038", name: "Quinoa (cooked)",           calories: 120, protein: 4.4, carbs: 21, fats: 1.9, defaultQty: 180, defaultUnit: "g",      tags: ["integral","vegan","vegetarian","high-protein"] },
  { id: "f039", name: "Bagel (plain)",             calories: 257, protein: 10,  carbs: 50, fats: 1.6, defaultQty: 1,   defaultUnit: "medium", tags: ["vegetarian"] },
  { id: "f040", name: "Tortilla (flour)",          calories: 297, protein: 8,   carbs: 50, fats: 7,   defaultQty: 1,   defaultUnit: "medium", tags: ["vegetarian","mexican"] },
  { id: "f041", name: "Corn Tortilla",             calories: 218, protein: 5.7, carbs: 46, fats: 2.5, defaultQty: 2,   defaultUnit: "medium", tags: ["vegan","vegetarian","mexican"] },
  { id: "f042", name: "Granola",                   calories: 471, protein: 10,  carbs: 64, fats: 20,  defaultQty: 50,  defaultUnit: "g",      tags: ["vegetarian","integral"] },
  { id: "f043", name: "Cereal (corn flakes)",      calories: 357, protein: 7.5, carbs: 84, fats: 0.4, defaultQty: 40,  defaultUnit: "g",      tags: ["vegetarian"] },

  // ── Vegetables ────────────────────────────────────────────────────────────
  { id: "f050", name: "Broccoli",                  calories: 34,  protein: 2.8, carbs: 7,  fats: 0.4, defaultQty: 150, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","vegetable"] },
  { id: "f051", name: "Spinach",                   calories: 23,  protein: 2.9, carbs: 3.6,fats: 0.4, defaultQty: 100, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","keto","vegetable"] },
  { id: "f052", name: "Kale",                      calories: 49,  protein: 4.3, carbs: 9,  fats: 0.9, defaultQty: 100, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","keto","vegetable"] },
  { id: "f053", name: "Mixed Greens",              calories: 20,  protein: 1.8, carbs: 3,  fats: 0.3, defaultQty: 100, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","keto","vegetable"] },
  { id: "f054", name: "Bell Pepper",               calories: 31,  protein: 1,   carbs: 6,  fats: 0.3, defaultQty: 150, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","vegetable"] },
  { id: "f055", name: "Tomato",                    calories: 18,  protein: 0.9, carbs: 3.9,fats: 0.2, defaultQty: 150, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","vegetable"] },
  { id: "f056", name: "Carrot",                    calories: 41,  protein: 0.9, carbs: 10, fats: 0.2, defaultQty: 100, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","vegetable"] },
  { id: "f057", name: "Cucumber",                  calories: 15,  protein: 0.7, carbs: 3.6,fats: 0.1, defaultQty: 100, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","keto","vegetable"] },
  { id: "f058", name: "Asparagus",                 calories: 20,  protein: 2.2, carbs: 3.7,fats: 0.1, defaultQty: 150, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","keto","vegetable"] },
  { id: "f059", name: "Zucchini",                  calories: 17,  protein: 1.2, carbs: 3.1,fats: 0.3, defaultQty: 150, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","keto","vegetable"] },
  { id: "f060", name: "Green Beans",               calories: 31,  protein: 1.8, carbs: 7,  fats: 0.1, defaultQty: 150, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","vegetable"] },
  { id: "f061", name: "Mushrooms",                 calories: 22,  protein: 3.1, carbs: 3.3,fats: 0.3, defaultQty: 100, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","keto","vegetable"] },
  { id: "f062", name: "Onion",                     calories: 40,  protein: 1.1, carbs: 9,  fats: 0.1, defaultQty: 80,  defaultUnit: "g",      tags: ["vegan","vegetarian","vegetable"] },
  { id: "f063", name: "Garlic",                    calories: 149, protein: 6.4, carbs: 33, fats: 0.5, defaultQty: 10,  defaultUnit: "g",      tags: ["vegan","vegetarian","vegetable"] },

  // ── Fruits ───────────────────────────────────────────────────────────────
  { id: "f070", name: "Banana",                    calories: 89,  protein: 1.1, carbs: 23, fats: 0.3, defaultQty: 1,   defaultUnit: "medium", tags: ["vegan","vegetarian","fruit"] },
  { id: "f071", name: "Apple",                     calories: 52,  protein: 0.3, carbs: 14, fats: 0.2, defaultQty: 1,   defaultUnit: "medium", tags: ["vegan","vegetarian","fruit","fit"] },
  { id: "f072", name: "Blueberries",               calories: 57,  protein: 0.7, carbs: 14, fats: 0.3, defaultQty: 100, defaultUnit: "g",      tags: ["vegan","vegetarian","fruit","fit"] },
  { id: "f073", name: "Strawberries",              calories: 32,  protein: 0.7, carbs: 8,  fats: 0.3, defaultQty: 150, defaultUnit: "g",      tags: ["vegan","vegetarian","fruit","fit","low-carb"] },
  { id: "f074", name: "Orange",                    calories: 47,  protein: 0.9, carbs: 12, fats: 0.1, defaultQty: 1,   defaultUnit: "medium", tags: ["vegan","vegetarian","fruit","fit"] },
  { id: "f075", name: "Mango",                     calories: 60,  protein: 0.8, carbs: 15, fats: 0.4, defaultQty: 150, defaultUnit: "g",      tags: ["vegan","vegetarian","fruit"] },
  { id: "f076", name: "Avocado",                   calories: 160, protein: 2,   carbs: 9,  fats: 15,  defaultQty: 0.5, defaultUnit: "medium", tags: ["keto","vegan","vegetarian","fruit","low-carb"] },
  { id: "f077", name: "Watermelon",                calories: 30,  protein: 0.6, carbs: 8,  fats: 0.2, defaultQty: 300, defaultUnit: "g",      tags: ["vegan","vegetarian","fruit","fit"] },
  { id: "f078", name: "Grapes",                    calories: 69,  protein: 0.7, carbs: 18, fats: 0.2, defaultQty: 150, defaultUnit: "g",      tags: ["vegan","vegetarian","fruit"] },
  { id: "f079", name: "Pineapple",                 calories: 50,  protein: 0.5, carbs: 13, fats: 0.1, defaultQty: 150, defaultUnit: "g",      tags: ["vegan","vegetarian","fruit","fit"] },

  // ── Fats & Oils ───────────────────────────────────────────────────────────
  { id: "f080", name: "Olive Oil",                 calories: 884, protein: 0,   carbs: 0,  fats: 100, defaultQty: 15,  defaultUnit: "ml",     tags: ["keto","vegan","vegetarian","low-carb"] },
  { id: "f081", name: "Coconut Oil",               calories: 862, protein: 0,   carbs: 0,  fats: 100, defaultQty: 15,  defaultUnit: "ml",     tags: ["keto","vegan","vegetarian","low-carb"] },
  { id: "f082", name: "Almonds",                   calories: 579, protein: 21,  carbs: 22, fats: 50,  defaultQty: 30,  defaultUnit: "g",      tags: ["keto","vegan","vegetarian","high-protein"] },
  { id: "f083", name: "Cashews",                   calories: 553, protein: 18,  carbs: 30, fats: 44,  defaultQty: 30,  defaultUnit: "g",      tags: ["vegan","vegetarian"] },
  { id: "f084", name: "Walnuts",                   calories: 654, protein: 15,  carbs: 14, fats: 65,  defaultQty: 30,  defaultUnit: "g",      tags: ["keto","vegan","vegetarian"] },
  { id: "f085", name: "Peanut Butter",             calories: 588, protein: 25,  carbs: 20, fats: 50,  defaultQty: 32,  defaultUnit: "g",      tags: ["vegan","vegetarian","high-protein"] },
  { id: "f086", name: "Almond Butter",             calories: 614, protein: 21,  carbs: 19, fats: 56,  defaultQty: 32,  defaultUnit: "g",      tags: ["keto","vegan","vegetarian","high-protein"] },
  { id: "f087", name: "Chia Seeds",                calories: 486, protein: 17,  carbs: 42, fats: 31,  defaultQty: 25,  defaultUnit: "g",      tags: ["vegan","vegetarian","integral"] },
  { id: "f088", name: "Flaxseeds",                 calories: 534, protein: 18,  carbs: 29, fats: 42,  defaultQty: 15,  defaultUnit: "g",      tags: ["vegan","vegetarian"] },

  // ── Legumes ───────────────────────────────────────────────────────────────
  { id: "f090", name: "Black Beans (cooked)",      calories: 132, protein: 8.9, carbs: 24, fats: 0.5, defaultQty: 200, defaultUnit: "g",      tags: ["vegan","vegetarian","high-protein","legume"] },
  { id: "f091", name: "Chickpeas (cooked)",        calories: 164, protein: 8.9, carbs: 27, fats: 2.6, defaultQty: 200, defaultUnit: "g",      tags: ["vegan","vegetarian","high-protein","legume"] },
  { id: "f092", name: "Lentils (cooked)",          calories: 116, protein: 9,   carbs: 20, fats: 0.4, defaultQty: 200, defaultUnit: "g",      tags: ["vegan","vegetarian","high-protein","legume"] },
  { id: "f093", name: "Kidney Beans (cooked)",     calories: 127, protein: 8.7, carbs: 23, fats: 0.5, defaultQty: 200, defaultUnit: "g",      tags: ["vegan","vegetarian","high-protein","legume"] },

  // ── Fast Food / Meals ─────────────────────────────────────────────────────
  { id: "f100", name: "Burger (beef, plain)",      calories: 295, protein: 17,  carbs: 24, fats: 14,  defaultQty: 1,   defaultUnit: "medium", tags: [] },
  { id: "f101", name: "Pizza (cheese, 1 slice)",   calories: 272, protein: 12,  carbs: 33, fats: 10,  defaultQty: 1,   defaultUnit: "slice",  tags: ["vegetarian"] },
  { id: "f102", name: "French Fries (medium)",     calories: 312, protein: 3.4, carbs: 41, fats: 15,  defaultQty: 1,   defaultUnit: "medium", tags: ["vegan","vegetarian"] },
  { id: "f103", name: "Burrito (chicken)",         calories: 206, protein: 14,  carbs: 22, fats: 7,   defaultQty: 1,   defaultUnit: "medium", tags: ["mexican"] },
  { id: "f104", name: "Sushi Roll (8pc)",          calories: 255, protein: 9,   carbs: 38, fats: 7,   defaultQty: 1,   defaultUnit: "roll",   tags: [] },

  // ── Beverages ─────────────────────────────────────────────────────────────
  { id: "f110", name: "Orange Juice",              calories: 45,  protein: 0.7, carbs: 10, fats: 0.2, defaultQty: 250, defaultUnit: "ml",     tags: ["vegan","vegetarian","fruit"] },
  { id: "f111", name: "Whole Milk",                calories: 61,  protein: 3.2, carbs: 5,  fats: 3.3, defaultQty: 250, defaultUnit: "ml",     tags: ["vegetarian","dairy"] },
  { id: "f112", name: "Sports Drink (Gatorade)",  calories: 26,  protein: 0,   carbs: 7,  fats: 0,   defaultQty: 500, defaultUnit: "ml",     tags: ["vegan","vegetarian"] },
  { id: "f113", name: "Protein Shake (mixed)",    calories: 200, protein: 30,  carbs: 15, fats: 3,   defaultQty: 1,   defaultUnit: "serving",tags: ["fit","high-protein"] },
  { id: "f114", name: "Black Coffee",             calories: 2,   protein: 0.3, carbs: 0,  fats: 0,   defaultQty: 250, defaultUnit: "ml",     tags: ["vegan","vegetarian","keto","low-carb","fit"] },
  { id: "f115", name: "Latte (whole milk)",       calories: 100, protein: 6,   carbs: 10, fats: 4,   defaultQty: 1,   defaultUnit: "medium", tags: ["vegetarian","dairy"] },
  { id: "f116", name: "Beer (regular)",           calories: 43,  protein: 0.5, carbs: 3.6,fats: 0,   defaultQty: 330, defaultUnit: "ml",     tags: ["vegan","vegetarian"] },

  // ── Snacks / Misc ─────────────────────────────────────────────────────────
  { id: "f120", name: "Rice Cakes",               calories: 387, protein: 8,   carbs: 82, fats: 3,   defaultQty: 2,   defaultUnit: "cakes",  tags: ["vegan","vegetarian","fit"] },
  { id: "f121", name: "Dark Chocolate (70%)",     calories: 598, protein: 8,   carbs: 46, fats: 43,  defaultQty: 30,  defaultUnit: "g",      tags: ["vegan","vegetarian"] },
  { id: "f122", name: "Protein Bar",              calories: 200, protein: 20,  carbs: 22, fats: 6,   defaultQty: 1,   defaultUnit: "bar",    tags: ["fit","high-protein"] },
  { id: "f123", name: "Trail Mix",               calories: 462, protein: 12,  carbs: 46, fats: 28,  defaultQty: 50,  defaultUnit: "g",      tags: ["vegan","vegetarian"] },
  { id: "f124", name: "Hummus",                  calories: 177, protein: 8,   carbs: 14, fats: 10,  defaultQty: 60,  defaultUnit: "g",      tags: ["vegan","vegetarian","high-protein"] },
  { id: "f125", name: "Pita Bread",              calories: 275, protein: 9,   carbs: 56, fats: 1.2, defaultQty: 1,   defaultUnit: "medium", tags: ["vegan","vegetarian"] },
  { id: "f126", name: "Honey",                   calories: 304, protein: 0.3, carbs: 82, fats: 0,   defaultQty: 20,  defaultUnit: "g",      tags: ["vegetarian"] },

  // ── Integral / Whole Grain ────────────────────────────────────────────────
  { id: "f130", name: "Whole Grain Bread (integral)",  calories: 252, protein: 13,  carbs: 41, fats: 4.2, defaultQty: 2,   defaultUnit: "slices", tags: ["integral","vegan","vegetarian"] },
  { id: "f131", name: "Multigrain Bread",              calories: 265, protein: 12,  carbs: 44, fats: 4.5, defaultQty: 2,   defaultUnit: "slices", tags: ["integral","vegan","vegetarian"] },
  { id: "f132", name: "Rye Bread (dark)",              calories: 259, protein: 9,   carbs: 48, fats: 3.3, defaultQty: 2,   defaultUnit: "slices", tags: ["integral","vegan","vegetarian"] },
  { id: "f133", name: "Sprouted Grain Bread (Ezekiel)",calories: 247, protein: 15,  carbs: 36, fats: 1.5, defaultQty: 2,   defaultUnit: "slices", tags: ["integral","vegan","vegetarian","high-protein"] },
  { id: "f134", name: "Whole Wheat Pasta (cooked)",    calories: 124, protein: 5.4, carbs: 24, fats: 0.8, defaultQty: 200, defaultUnit: "g",      tags: ["integral","vegan","vegetarian","pasta"] },
  { id: "f135", name: "Whole Wheat Penne (cooked)",    calories: 126, protein: 5.5, carbs: 25, fats: 0.9, defaultQty: 200, defaultUnit: "g",      tags: ["integral","vegan","vegetarian","pasta"] },
  { id: "f136", name: "Whole Grain Rice (cooked)",     calories: 111, protein: 2.6, carbs: 23, fats: 0.9, defaultQty: 200, defaultUnit: "g",      tags: ["integral","vegan","vegetarian"] },
  { id: "f137", name: "Wild Rice (cooked)",            calories: 101, protein: 4,   carbs: 21, fats: 0.3, defaultQty: 200, defaultUnit: "g",      tags: ["integral","vegan","vegetarian"] },
  { id: "f138", name: "Rolled Oats (whole grain, dry)",calories: 379, protein: 13,  carbs: 68, fats: 7,   defaultQty: 80,  defaultUnit: "g",      tags: ["integral","vegan","vegetarian"] },
  { id: "f139", name: "Steel Cut Oats (cooked)",       calories: 71,  protein: 2.5, carbs: 12, fats: 1.4, defaultQty: 240, defaultUnit: "g",      tags: ["integral","vegan","vegetarian","fit"] },
  { id: "f140", name: "Buckwheat (cooked)",            calories: 92,  protein: 3.4, carbs: 20, fats: 0.6, defaultQty: 200, defaultUnit: "g",      tags: ["integral","vegan","vegetarian"] },
  { id: "f141", name: "Farro (cooked)",                calories: 127, protein: 5,   carbs: 26, fats: 0.5, defaultQty: 200, defaultUnit: "g",      tags: ["integral","vegetarian"] },
  { id: "f142", name: "Barley (cooked)",               calories: 123, protein: 2.3, carbs: 28, fats: 0.4, defaultQty: 200, defaultUnit: "g",      tags: ["integral","vegan","vegetarian"] },
  { id: "f143", name: "Crispbread (whole grain, Wasa)",calories: 335, protein: 10,  carbs: 67, fats: 2,   defaultQty: 2,   defaultUnit: "crackers",tags: ["integral","vegan","vegetarian"] },
  { id: "f144", name: "Whole Grain Tortilla",          calories: 218, protein: 6,   carbs: 36, fats: 5.5, defaultQty: 1,   defaultUnit: "medium", tags: ["integral","vegetarian"] },
  { id: "f145", name: "Corn (whole grain, cooked)",    calories: 86,  protein: 3.3, carbs: 19, fats: 1.2, defaultQty: 150, defaultUnit: "g",      tags: ["integral","vegan","vegetarian"] },
  { id: "f146", name: "Freekeh (cooked)",              calories: 113, protein: 4.3, carbs: 21, fats: 0.5, defaultQty: 200, defaultUnit: "g",      tags: ["integral","vegan","vegetarian"] },

  // ── Fit / High-Protein / Health Options ───────────────────────────────────
  { id: "f150", name: "Skyr (Icelandic yogurt)",       calories: 63,  protein: 11,  carbs: 4,  fats: 0.2, defaultQty: 200, defaultUnit: "g",      tags: ["fit","high-protein","vegetarian","dairy"] },
  { id: "f151", name: "Quark (low-fat)",               calories: 67,  protein: 12,  carbs: 4,  fats: 0.3, defaultQty: 200, defaultUnit: "g",      tags: ["fit","high-protein","vegetarian","dairy"] },
  { id: "f152", name: "Egg White Omelette (3 whites)", calories: 51,  protein: 11,  carbs: 1,  fats: 0.2, defaultQty: 1,   defaultUnit: "serving",tags: ["fit","high-protein","keto","low-carb","vegetarian"] },
  { id: "f153", name: "Tuna Steak (grilled)",          calories: 144, protein: 30,  carbs: 0,  fats: 1.5, defaultQty: 150, defaultUnit: "g",      tags: ["fit","high-protein","keto","low-carb"] },
  { id: "f154", name: "Tempeh",                        calories: 193, protein: 19,  carbs: 9,  fats: 11,  defaultQty: 100, defaultUnit: "g",      tags: ["high-protein","vegan","vegetarian"] },
  { id: "f155", name: "Seitan",                        calories: 120, protein: 21,  carbs: 4,  fats: 2,   defaultQty: 100, defaultUnit: "g",      tags: ["high-protein","vegan","vegetarian","low-carb"] },
  { id: "f156", name: "Lupin Beans (cooked)",          calories: 119, protein: 16,  carbs: 10, fats: 3,   defaultQty: 100, defaultUnit: "g",      tags: ["high-protein","vegan","vegetarian","legume"] },
  { id: "f157", name: "Chicken Breast Strips (plain)", calories: 110, protein: 23,  carbs: 0,  fats: 2,   defaultQty: 100, defaultUnit: "g",      tags: ["fit","high-protein","keto","low-carb"] },
  { id: "f158", name: "Turkey Meatballs",              calories: 149, protein: 20,  carbs: 3,  fats: 6,   defaultQty: 150, defaultUnit: "g",      tags: ["fit","high-protein","low-carb"] },
  { id: "f159", name: "Low-Fat Protein Shake",         calories: 120, protein: 24,  carbs: 5,  fats: 1.5, defaultQty: 1,   defaultUnit: "serving",tags: ["fit","high-protein","smoothie"] },
  { id: "f160", name: "Rice Protein Powder",           calories: 360, protein: 70,  carbs: 15, fats: 6,   defaultQty: 30,  defaultUnit: "g",      tags: ["high-protein","vegan","vegetarian"] },
  { id: "f161", name: "Canned Sardines (in water)",    calories: 108, protein: 23,  carbs: 0,  fats: 1.5, defaultQty: 100, defaultUnit: "g",      tags: ["fit","high-protein","keto","low-carb"] },
  { id: "f162", name: "Smoked Salmon",                 calories: 117, protein: 18,  carbs: 0,  fats: 4.3, defaultQty: 100, defaultUnit: "g",      tags: ["fit","high-protein","keto","low-carb"] },
  { id: "f163", name: "Broccoli Sprouts",              calories: 27,  protein: 2.8, carbs: 3,  fats: 0.3, defaultQty: 100, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","vegetable"] },
  { id: "f164", name: "Cauliflower",                   calories: 25,  protein: 1.9, carbs: 5,  fats: 0.3, defaultQty: 200, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","keto","vegetable"] },
  { id: "f165", name: "Baby Spinach",                  calories: 23,  protein: 2.9, carbs: 3.6,fats: 0.4, defaultQty: 80,  defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","keto","vegetable"] },
  { id: "f166", name: "Rice Cake with PB",             calories: 130, protein: 4,   carbs: 16, fats: 6,   defaultQty: 1,   defaultUnit: "serving",tags: ["fit","vegetarian"] },
  { id: "f167", name: "Fat-Free Greek Yogurt",         calories: 57,  protein: 10,  carbs: 4,  fats: 0.2, defaultQty: 150, defaultUnit: "g",      tags: ["fit","high-protein","vegetarian","dairy"] },
  { id: "f168", name: "Protein Pudding (ready-made)",  calories: 100, protein: 15,  carbs: 5,  fats: 2,   defaultQty: 1,   defaultUnit: "cup",    tags: ["fit","high-protein","vegetarian"] },
  { id: "f169", name: "Veggie Omelette (2 eggs + veg)",calories: 175, protein: 16,  carbs: 6,  fats: 9,   defaultQty: 1,   defaultUnit: "serving",tags: ["fit","high-protein","low-carb","vegetarian"] },

  // ── Keto / Low-Carb Options ───────────────────────────────────────────────
  { id: "f170", name: "Avocado (whole)",               calories: 160, protein: 2,   carbs: 2,  fats: 15,  defaultQty: 1,   defaultUnit: "medium", tags: ["keto","vegan","vegetarian","low-carb"] },
  { id: "f171", name: "Almond Flour",                  calories: 571, protein: 21,  carbs: 11, fats: 50,  defaultQty: 30,  defaultUnit: "g",      tags: ["keto","vegan","vegetarian","low-carb"] },
  { id: "f172", name: "Coconut Flour",                 calories: 400, protein: 18,  carbs: 21, fats: 14,  defaultQty: 30,  defaultUnit: "g",      tags: ["keto","vegan","vegetarian"] },
  { id: "f173", name: "MCT Oil",                       calories: 857, protein: 0,   carbs: 0,  fats: 100, defaultQty: 14,  defaultUnit: "ml",     tags: ["keto","vegan","vegetarian","low-carb"] },
  { id: "f174", name: "Brie Cheese",                   calories: 334, protein: 21,  carbs: 0,  fats: 28,  defaultQty: 50,  defaultUnit: "g",      tags: ["keto","vegetarian","dairy","low-carb"] },
  { id: "f175", name: "Parmesan Cheese",               calories: 431, protein: 38,  carbs: 4,  fats: 29,  defaultQty: 30,  defaultUnit: "g",      tags: ["keto","vegetarian","dairy","high-protein"] },
  { id: "f176", name: "Cream Cheese",                  calories: 342, protein: 6,   carbs: 4,  fats: 34,  defaultQty: 30,  defaultUnit: "g",      tags: ["keto","vegetarian","dairy","low-carb"] },
  { id: "f177", name: "Heavy Cream",                   calories: 340, protein: 2.8, carbs: 2.8,fats: 36,  defaultQty: 30,  defaultUnit: "ml",     tags: ["keto","vegetarian","dairy","low-carb"] },
  { id: "f178", name: "Sour Cream (full-fat)",         calories: 198, protein: 2.4, carbs: 3.8,fats: 19,  defaultQty: 60,  defaultUnit: "g",      tags: ["keto","vegetarian","dairy"] },
  { id: "f179", name: "Bacon (pan-fried)",             calories: 541, protein: 37,  carbs: 1.4,fats: 42,  defaultQty: 30,  defaultUnit: "g",      tags: ["keto","low-carb","high-protein"] },
  { id: "f180", name: "Pepperoni",                     calories: 504, protein: 21,  carbs: 1,  fats: 45,  defaultQty: 30,  defaultUnit: "g",      tags: ["keto","low-carb"] },
  { id: "f181", name: "Pork Rinds (chicharrón)",       calories: 544, protein: 61,  carbs: 0,  fats: 31,  defaultQty: 30,  defaultUnit: "g",      tags: ["keto","low-carb","high-protein"] },
  { id: "f182", name: "Zucchini Noodles (zoodles)",    calories: 17,  protein: 1.2, carbs: 3.1,fats: 0.3, defaultQty: 200, defaultUnit: "g",      tags: ["keto","vegan","vegetarian","low-carb","vegetable"] },
  { id: "f183", name: "Cauliflower Rice",              calories: 25,  protein: 1.9, carbs: 5,  fats: 0.3, defaultQty: 200, defaultUnit: "g",      tags: ["keto","vegan","vegetarian","low-carb","vegetable"] },
  { id: "f184", name: "Shirataki Noodles",             calories: 9,   protein: 0.1, carbs: 2,  fats: 0.1, defaultQty: 200, defaultUnit: "g",      tags: ["keto","vegan","vegetarian","low-carb"] },
  { id: "f185", name: "Macadamia Nuts",                calories: 718, protein: 8,   carbs: 14, fats: 76,  defaultQty: 30,  defaultUnit: "g",      tags: ["keto","vegan","vegetarian"] },
  { id: "f186", name: "Pecans",                        calories: 691, protein: 9,   carbs: 14, fats: 72,  defaultQty: 30,  defaultUnit: "g",      tags: ["keto","vegan","vegetarian"] },
  { id: "f187", name: "Brazil Nuts",                   calories: 659, protein: 14,  carbs: 12, fats: 67,  defaultQty: 30,  defaultUnit: "g",      tags: ["keto","vegan","vegetarian"] },
  { id: "f188", name: "Beef Jerky (low carb)",         calories: 369, protein: 33,  carbs: 11, fats: 22,  defaultQty: 30,  defaultUnit: "g",      tags: ["keto","low-carb","high-protein"] },
  { id: "f189", name: "Keto Bread (almond-based)",     calories: 228, protein: 7,   carbs: 4,  fats: 21,  defaultQty: 2,   defaultUnit: "slices", tags: ["keto","low-carb","vegetarian"] },
  { id: "f190", name: "Coconut Milk (full fat)",       calories: 230, protein: 2.3, carbs: 3.3,fats: 24,  defaultQty: 100, defaultUnit: "ml",     tags: ["keto","vegan","vegetarian","low-carb"] },
  { id: "f191", name: "Olives (black)",                calories: 115, protein: 0.8, carbs: 6,  fats: 11,  defaultQty: 50,  defaultUnit: "g",      tags: ["keto","vegan","vegetarian"] },
  { id: "f192", name: "Salami",                        calories: 407, protein: 22,  carbs: 2,  fats: 34,  defaultQty: 40,  defaultUnit: "g",      tags: ["keto","low-carb"] },
  { id: "f193", name: "Keto Protein Bar",              calories: 190, protein: 20,  carbs: 4,  fats: 10,  defaultQty: 1,   defaultUnit: "bar",    tags: ["keto","low-carb","high-protein","fit"] },

  // ── Oats & Oat Products ───────────────────────────────────────────────────
  { id: "f194", name: "Oatmeal Powder (instant oat flour)", calories: 375, protein: 13, carbs: 66, fats: 7, defaultQty: 40, defaultUnit: "g", tags: ["integral","vegan","vegetarian","fit"] },

  // ── More Fruits ───────────────────────────────────────────────────────────
  { id: "f195", name: "Raspberries",                   calories: 52,  protein: 1.2, carbs: 12, fats: 0.7, defaultQty: 100, defaultUnit: "g",      tags: ["vegan","vegetarian","fruit","fit","low-carb"] },
  { id: "f196", name: "Cherries",                      calories: 63,  protein: 1.1, carbs: 16, fats: 0.2, defaultQty: 100, defaultUnit: "g",      tags: ["vegan","vegetarian","fruit"] },
  { id: "f197", name: "Kiwi",                          calories: 61,  protein: 1.1, carbs: 15, fats: 0.5, defaultQty: 2,   defaultUnit: "medium", tags: ["vegan","vegetarian","fruit","fit"] },
  { id: "f198", name: "Peach",                         calories: 39,  protein: 0.9, carbs: 10, fats: 0.3, defaultQty: 1,   defaultUnit: "medium", tags: ["vegan","vegetarian","fruit","fit"] },
  { id: "f199", name: "Pear",                          calories: 57,  protein: 0.4, carbs: 15, fats: 0.1, defaultQty: 1,   defaultUnit: "medium", tags: ["vegan","vegetarian","fruit"] },
  { id: "f200", name: "Grapefruit",                    calories: 42,  protein: 0.8, carbs: 11, fats: 0.1, defaultQty: 0.5, defaultUnit: "medium", tags: ["vegan","vegetarian","fruit","fit"] },
  { id: "f201", name: "Pomegranate Seeds",             calories: 83,  protein: 1.7, carbs: 19, fats: 1.2, defaultQty: 100, defaultUnit: "g",      tags: ["vegan","vegetarian","fruit"] },
  { id: "f202", name: "Cantaloupe Melon",              calories: 34,  protein: 0.8, carbs: 8,  fats: 0.2, defaultQty: 200, defaultUnit: "g",      tags: ["vegan","vegetarian","fruit","fit"] },
  { id: "f203", name: "Lemon",                         calories: 29,  protein: 1.1, carbs: 9,  fats: 0.3, defaultQty: 1,   defaultUnit: "medium", tags: ["vegan","vegetarian","fruit","keto"] },
  { id: "f204", name: "Blackberries",                  calories: 43,  protein: 1.4, carbs: 10, fats: 0.5, defaultQty: 100, defaultUnit: "g",      tags: ["vegan","vegetarian","fruit","fit","low-carb"] },
  { id: "f205", name: "Plum",                          calories: 46,  protein: 0.7, carbs: 11, fats: 0.3, defaultQty: 2,   defaultUnit: "medium", tags: ["vegan","vegetarian","fruit"] },

  // ── More Vegetables ───────────────────────────────────────────────────────
  { id: "f210", name: "Eggplant (aubergine)",          calories: 25,  protein: 1,   carbs: 6,  fats: 0.2, defaultQty: 150, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","vegetable"] },
  { id: "f211", name: "Brussels Sprouts",              calories: 43,  protein: 3.4, carbs: 9,  fats: 0.3, defaultQty: 150, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","vegetable"] },
  { id: "f212", name: "Artichoke",                     calories: 47,  protein: 3.3, carbs: 11, fats: 0.2, defaultQty: 1,   defaultUnit: "medium", tags: ["vegan","vegetarian","fit","vegetable"] },
  { id: "f213", name: "Celery",                        calories: 16,  protein: 0.7, carbs: 3,  fats: 0.2, defaultQty: 100, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","keto","vegetable"] },
  { id: "f214", name: "Romaine Lettuce",               calories: 17,  protein: 1.2, carbs: 3.3,fats: 0.3, defaultQty: 100, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","keto","vegetable"] },
  { id: "f215", name: "Cabbage (green)",               calories: 25,  protein: 1.3, carbs: 6,  fats: 0.1, defaultQty: 150, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","keto","vegetable"] },
  { id: "f216", name: "Leek",                          calories: 61,  protein: 1.5, carbs: 14, fats: 0.3, defaultQty: 100, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","vegetable"] },
  { id: "f217", name: "Beetroot",                      calories: 43,  protein: 1.6, carbs: 10, fats: 0.2, defaultQty: 100, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","vegetable"] },
  { id: "f218", name: "Peas (frozen/cooked)",          calories: 81,  protein: 5.4, carbs: 14, fats: 0.4, defaultQty: 100, defaultUnit: "g",      tags: ["vegan","vegetarian","high-protein","vegetable"] },
  { id: "f219", name: "Radish",                        calories: 16,  protein: 0.7, carbs: 3.4,fats: 0.1, defaultQty: 100, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","keto","vegetable"] },

  // ── Common Mixes & Meals ──────────────────────────────────────────────────
  { id: "f220", name: "Overnight Oats (base)",         calories: 165, protein: 7,   carbs: 28, fats: 4,   defaultQty: 1,   defaultUnit: "serving",tags: ["integral","vegetarian","fit","mix"] },
  { id: "f221", name: "Greek Salad",                   calories: 80,  protein: 3,   carbs: 6,  fats: 5,   defaultQty: 1,   defaultUnit: "serving",tags: ["vegetarian","keto","low-carb","fit","mix","salad"] },
  { id: "f222", name: "Berry Smoothie",                calories: 90,  protein: 3,   carbs: 19, fats: 0.5, defaultQty: 350, defaultUnit: "ml",     tags: ["vegan","vegetarian","fruit","fit","mix","smoothie"] },
  { id: "f223", name: "Banana Protein Smoothie",       calories: 210, protein: 28,  carbs: 25, fats: 2,   defaultQty: 400, defaultUnit: "ml",     tags: ["high-protein","fit","vegetarian","mix","smoothie"] },
  { id: "f224", name: "Acai Bowl (base)",              calories: 210, protein: 3,   carbs: 30, fats: 9,   defaultQty: 1,   defaultUnit: "bowl",   tags: ["vegan","vegetarian","fruit","mix","smoothie"] },
  { id: "f225", name: "Mixed Green Salad",             calories: 22,  protein: 1.5, carbs: 4,  fats: 0.3, defaultQty: 200, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","keto","mix","vegetable"] },
  { id: "f226", name: "Avocado Toast + Egg",           calories: 290, protein: 14,  carbs: 22, fats: 16,  defaultQty: 1,   defaultUnit: "serving",tags: ["vegetarian","fit","mix"] },
  { id: "f227", name: "Tuna Salad (no mayo)",          calories: 140, protein: 28,  carbs: 2,  fats: 2,   defaultQty: 1,   defaultUnit: "serving",tags: ["fit","high-protein","keto","low-carb","mix","salad"] },
  { id: "f228", name: "Protein Oatmeal",               calories: 380, protein: 32,  carbs: 52, fats: 8,   defaultQty: 1,   defaultUnit: "serving",tags: ["high-protein","fit","integral","vegetarian","mix"] },
  { id: "f229", name: "Chicken & Rice Bowl",           calories: 195, protein: 22,  carbs: 19, fats: 3,   defaultQty: 1,   defaultUnit: "bowl",   tags: ["fit","high-protein","mix"] },
  { id: "f230", name: "Veggie Stir-Fry (no sauce)",   calories: 65,  protein: 3,   carbs: 10, fats: 2,   defaultQty: 200, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","mix","vegetable"] },

  // ── Fast Food & Burgers ───────────────────────────────────────────────────
  { id: "f240", name: "Big Mac",                       calories: 550, protein: 25,  carbs: 45, fats: 30,  defaultQty: 1,   defaultUnit: "burger", tags: ["fast-food","high-fat"] },
  { id: "f241", name: "Cheeseburger (basic)",          calories: 300, protein: 16,  carbs: 28, fats: 14,  defaultQty: 1,   defaultUnit: "burger", tags: ["fast-food","high-fat"] },
  { id: "f242", name: "Double Cheeseburger",           calories: 440, protein: 25,  carbs: 35, fats: 23,  defaultQty: 1,   defaultUnit: "burger", tags: ["fast-food","high-fat"] },
  { id: "f243", name: "Quarter Pounder w/ Cheese",    calories: 520, protein: 30,  carbs: 41, fats: 26,  defaultQty: 1,   defaultUnit: "burger", tags: ["fast-food","high-fat"] },
  { id: "f244", name: "Chicken Burger (crispy)",       calories: 490, protein: 27,  carbs: 42, fats: 22,  defaultQty: 1,   defaultUnit: "burger", tags: ["fast-food","high-fat"] },
  { id: "f245", name: "Fish Burger",                   calories: 380, protein: 16,  carbs: 38, fats: 18,  defaultQty: 1,   defaultUnit: "burger", tags: ["fast-food"] },
  { id: "f246", name: "Veggie Burger",                 calories: 390, protein: 14,  carbs: 44, fats: 17,  defaultQty: 1,   defaultUnit: "burger", tags: ["fast-food","vegetarian"] },
  { id: "f247", name: "Hot Dog (with bun)",            calories: 290, protein: 11,  carbs: 24, fats: 17,  defaultQty: 1,   defaultUnit: "hotdog", tags: ["fast-food","high-fat"] },
  { id: "f248", name: "Chicken Nuggets (6 pcs)",       calories: 280, protein: 15,  carbs: 18, fats: 17,  defaultQty: 1,   defaultUnit: "serving",tags: ["fast-food","high-fat"] },
  { id: "f249", name: "Fried Chicken Piece",           calories: 260, protein: 23,  carbs: 10, fats: 15,  defaultQty: 1,   defaultUnit: "piece",  tags: ["fast-food","high-fat"] },
  { id: "f250", name: "Hot Wings (6 pcs)",             calories: 310, protein: 25,  carbs: 8,  fats: 20,  defaultQty: 1,   defaultUnit: "serving",tags: ["fast-food","high-fat"] },
  { id: "f251", name: "Onion Rings (small)",           calories: 276, protein: 4,   carbs: 31, fats: 16,  defaultQty: 1,   defaultUnit: "serving",tags: ["fast-food","high-fat","vegan","vegetarian"] },
  { id: "f252", name: "Nachos with Cheese",            calories: 346, protein: 9,   carbs: 36, fats: 19,  defaultQty: 1,   defaultUnit: "serving",tags: ["fast-food","high-fat","vegetarian","mexican"] },
  { id: "f253", name: "Burrito (beef & bean)",         calories: 490, protein: 22,  carbs: 56, fats: 18,  defaultQty: 1,   defaultUnit: "large",  tags: ["fast-food","high-fat","mexican"] },
  { id: "f254", name: "Quesadilla (cheese)",           calories: 370, protein: 16,  carbs: 32, fats: 20,  defaultQty: 1,   defaultUnit: "serving",tags: ["fast-food","high-fat","vegetarian","mexican"] },
  { id: "f255", name: "Taco (ground beef)",            calories: 170, protein: 10,  carbs: 14, fats: 8,   defaultQty: 1,   defaultUnit: "taco",   tags: ["fast-food","mexican"] },
  { id: "f256", name: "Milkshake (chocolate)",         calories: 430, protein: 10,  carbs: 68, fats: 14,  defaultQty: 1,   defaultUnit: "large",  tags: ["fast-food","high-sugar","dairy"] },
  { id: "f257", name: "Milkshake (vanilla)",           calories: 390, protein: 10,  carbs: 61, fats: 13,  defaultQty: 1,   defaultUnit: "large",  tags: ["fast-food","high-sugar","dairy"] },
  { id: "f258", name: "Corn Dog",                      calories: 250, protein: 10,  carbs: 28, fats: 12,  defaultQty: 1,   defaultUnit: "piece",  tags: ["fast-food"] },
  { id: "f259", name: "Gyro / Doner Kebab",            calories: 490, protein: 26,  carbs: 44, fats: 22,  defaultQty: 1,   defaultUnit: "serving",tags: ["fast-food"] },

  // ── Pizza Varieties ───────────────────────────────────────────────────────
  { id: "f260", name: "Margherita Pizza (slice)",      calories: 272, protein: 13,  carbs: 34, fats: 10,  defaultQty: 1,   defaultUnit: "slice",  tags: ["fast-food","vegetarian","italian"] },
  { id: "f261", name: "Pepperoni Pizza (slice)",       calories: 298, protein: 14,  carbs: 34, fats: 13,  defaultQty: 1,   defaultUnit: "slice",  tags: ["fast-food","high-fat","italian"] },
  { id: "f262", name: "Four Cheese Pizza (slice)",     calories: 322, protein: 16,  carbs: 34, fats: 14,  defaultQty: 1,   defaultUnit: "slice",  tags: ["fast-food","high-fat","vegetarian","italian"] },
  { id: "f263", name: "Veggie Supreme Pizza (slice)",  calories: 248, protein: 11,  carbs: 35, fats: 8,   defaultQty: 1,   defaultUnit: "slice",  tags: ["fast-food","vegetarian","italian"] },
  { id: "f264", name: "BBQ Chicken Pizza (slice)",     calories: 290, protein: 16,  carbs: 36, fats: 10,  defaultQty: 1,   defaultUnit: "slice",  tags: ["fast-food","italian"] },
  { id: "f265", name: "Hawaiian Pizza (slice)",        calories: 255, protein: 12,  carbs: 35, fats: 9,   defaultQty: 1,   defaultUnit: "slice",  tags: ["fast-food","italian"] },
  { id: "f266", name: "Meat Lovers Pizza (slice)",     calories: 370, protein: 18,  carbs: 33, fats: 18,  defaultQty: 1,   defaultUnit: "slice",  tags: ["fast-food","high-fat","italian"] },
  { id: "f267", name: "Calzone (cheese & ham)",        calories: 680, protein: 32,  carbs: 72, fats: 28,  defaultQty: 1,   defaultUnit: "medium", tags: ["fast-food","high-fat","italian"] },

  // ── Greek Yogurts ─────────────────────────────────────────────────────────
  { id: "f270", name: "Greek Yogurt (full fat, plain)",calories: 97,  protein: 9,   carbs: 4,  fats: 5,   defaultQty: 150, defaultUnit: "g",      tags: ["vegetarian","dairy","fit"] },
  { id: "f271", name: "Greek Yogurt (honey)",          calories: 120, protein: 8,   carbs: 18, fats: 2.5, defaultQty: 150, defaultUnit: "g",      tags: ["vegetarian","dairy"] },
  { id: "f272", name: "Greek Yogurt (strawberry)",     calories: 100, protein: 7.5, carbs: 15, fats: 1.5, defaultQty: 150, defaultUnit: "g",      tags: ["vegetarian","dairy"] },
  { id: "f273", name: "Greek Yogurt (vanilla)",        calories: 105, protein: 8,   carbs: 16, fats: 2,   defaultQty: 150, defaultUnit: "g",      tags: ["vegetarian","dairy"] },
  { id: "f274", name: "Greek Yogurt (peach)",          calories: 98,  protein: 7.5, carbs: 14, fats: 1.5, defaultQty: 150, defaultUnit: "g",      tags: ["vegetarian","dairy"] },
  { id: "f275", name: "Greek Yogurt (blueberry)",      calories: 102, protein: 7.5, carbs: 15, fats: 2,   defaultQty: 150, defaultUnit: "g",      tags: ["vegetarian","dairy"] },
  { id: "f276", name: "Greek Yogurt (high protein, 0%)",calories: 59, protein: 10,  carbs: 4,  fats: 0.4, defaultQty: 200, defaultUnit: "g",      tags: ["fit","high-protein","vegetarian","dairy"] },

  // ── Ice Cream & Frozen Desserts ───────────────────────────────────────────
  { id: "f280", name: "Vanilla Ice Cream",             calories: 207, protein: 3.5, carbs: 23, fats: 11,  defaultQty: 100, defaultUnit: "g",      tags: ["vegetarian","dairy","high-sugar","dessert"] },
  { id: "f281", name: "Chocolate Ice Cream",           calories: 216, protein: 3.8, carbs: 25, fats: 11,  defaultQty: 100, defaultUnit: "g",      tags: ["vegetarian","dairy","high-sugar","dessert"] },
  { id: "f282", name: "Strawberry Ice Cream",          calories: 192, protein: 3.2, carbs: 24, fats: 9,   defaultQty: 100, defaultUnit: "g",      tags: ["vegetarian","dairy","high-sugar","dessert"] },
  { id: "f283", name: "Gelato (vanilla/chocolate)",    calories: 175, protein: 4,   carbs: 27, fats: 6,   defaultQty: 100, defaultUnit: "g",      tags: ["vegetarian","dairy","high-sugar","dessert"] },
  { id: "f284", name: "Frozen Yogurt (plain)",         calories: 127, protein: 4,   carbs: 22, fats: 3,   defaultQty: 100, defaultUnit: "g",      tags: ["vegetarian","dairy","high-sugar","dessert"] },
  { id: "f285", name: "Ice Cream Bar (chocolate coat)",calories: 280, protein: 3.5, carbs: 26, fats: 18,  defaultQty: 1,   defaultUnit: "bar",    tags: ["vegetarian","dairy","high-sugar","high-fat","dessert"] },
  { id: "f286", name: "Sorbet (fruit, mixed)",         calories: 130, protein: 0.5, carbs: 33, fats: 0.1, defaultQty: 100, defaultUnit: "g",      tags: ["vegan","vegetarian","high-sugar","dessert"] },
  { id: "f287", name: "Popsicle / Ice Lolly",         calories: 45,  protein: 0.5, carbs: 11, fats: 0,   defaultQty: 1,   defaultUnit: "piece",  tags: ["vegan","vegetarian","dessert"] },

  // ── Cakes, Pastries & Desserts ────────────────────────────────────────────
  { id: "f290", name: "Cheesecake (slice)",            calories: 320, protein: 6,   carbs: 32, fats: 20,  defaultQty: 1,   defaultUnit: "slice",  tags: ["vegetarian","dairy","high-fat","high-sugar","dessert"] },
  { id: "f291", name: "Chocolate Cake (slice)",        calories: 370, protein: 5,   carbs: 54, fats: 16,  defaultQty: 1,   defaultUnit: "slice",  tags: ["vegetarian","dairy","high-sugar","dessert"] },
  { id: "f292", name: "Carrot Cake (slice)",           calories: 340, protein: 4,   carbs: 49, fats: 16,  defaultQty: 1,   defaultUnit: "slice",  tags: ["vegetarian","high-sugar","dessert"] },
  { id: "f293", name: "Tiramisu",                      calories: 283, protein: 6,   carbs: 30, fats: 16,  defaultQty: 100, defaultUnit: "g",      tags: ["vegetarian","dairy","high-fat","high-sugar","dessert","italian"] },
  { id: "f294", name: "Brownie (chocolate)",           calories: 410, protein: 5,   carbs: 57, fats: 20,  defaultQty: 1,   defaultUnit: "piece",  tags: ["vegetarian","high-sugar","high-fat","dessert"] },
  { id: "f295", name: "Chocolate Chip Cookie",         calories: 148, protein: 2,   carbs: 20, fats: 7,   defaultQty: 2,   defaultUnit: "cookies",tags: ["vegetarian","high-sugar","dessert"] },
  { id: "f296", name: "Muffin (blueberry)",            calories: 430, protein: 5,   carbs: 65, fats: 18,  defaultQty: 1,   defaultUnit: "large",  tags: ["vegetarian","high-sugar","dessert"] },
  { id: "f297", name: "Donut (glazed)",                calories: 452, protein: 5,   carbs: 57, fats: 25,  defaultQty: 1,   defaultUnit: "medium", tags: ["vegetarian","high-sugar","high-fat","dessert","fast-food"] },
  { id: "f298", name: "Pancakes (stack of 3)",         calories: 350, protein: 9,   carbs: 52, fats: 12,  defaultQty: 1,   defaultUnit: "serving",tags: ["vegetarian","high-sugar","dessert"] },
  { id: "f299", name: "Waffle (standard)",             calories: 310, protein: 7,   carbs: 43, fats: 13,  defaultQty: 1,   defaultUnit: "medium", tags: ["vegetarian","dessert"] },
  { id: "f300", name: "Crêpe (plain, no filling)",     calories: 112, protein: 4,   carbs: 12, fats: 5,   defaultQty: 1,   defaultUnit: "medium", tags: ["vegetarian","dessert"] },
  { id: "f301", name: "Apple Pie (slice)",             calories: 296, protein: 3,   carbs: 43, fats: 14,  defaultQty: 1,   defaultUnit: "slice",  tags: ["vegetarian","high-sugar","dessert"] },
  { id: "f302", name: "Chocolate Mousse",              calories: 245, protein: 5,   carbs: 22, fats: 16,  defaultQty: 100, defaultUnit: "g",      tags: ["vegetarian","dairy","high-fat","dessert"] },
  { id: "f303", name: "Panna Cotta",                   calories: 218, protein: 4,   carbs: 22, fats: 13,  defaultQty: 100, defaultUnit: "g",      tags: ["vegetarian","dairy","dessert","italian"] },
  { id: "f304", name: "Croissant (plain, butter)",     calories: 406, protein: 9,   carbs: 46, fats: 21,  defaultQty: 1,   defaultUnit: "medium", tags: ["vegetarian","high-fat","dessert"] },
  { id: "f305", name: "Cinnamon Roll",                 calories: 420, protein: 7,   carbs: 59, fats: 18,  defaultQty: 1,   defaultUnit: "medium", tags: ["vegetarian","high-sugar","high-fat","dessert"] },
  { id: "f306", name: "Éclair (chocolate)",            calories: 262, protein: 6,   carbs: 29, fats: 14,  defaultQty: 1,   defaultUnit: "piece",  tags: ["vegetarian","dairy","high-sugar","dessert"] },
  { id: "f307", name: "Baklava (2 pieces)",            calories: 290, protein: 4,   carbs: 36, fats: 15,  defaultQty: 1,   defaultUnit: "serving",tags: ["vegetarian","high-sugar","dessert"] },
  { id: "f308", name: "Pudding (chocolate, ready-made)",calories: 130, protein: 3,  carbs: 22, fats: 4,   defaultQty: 100, defaultUnit: "g",      tags: ["vegetarian","dairy","high-sugar","dessert"] },

  // ── Breakfast items ───────────────────────────────────────────────────────
  { id: "f310", name: "French Toast (2 slices)",       calories: 330, protein: 12,  carbs: 40, fats: 14,  defaultQty: 1,   defaultUnit: "serving",tags: ["vegetarian","dessert"] },
  { id: "f311", name: "Cereal with Milk (bowl)",       calories: 260, protein: 9,   carbs: 44, fats: 5,   defaultQty: 1,   defaultUnit: "bowl",   tags: ["vegetarian","dairy"] },

  // ── Sushi & Japanese ─────────────────────────────────────────────────────
  { id: "f320", name: "Salmon Nigiri (2 pieces)",      calories: 120, protein: 9,   carbs: 14, fats: 2.5, defaultQty: 2,   defaultUnit: "pieces", tags: ["high-protein","seafood","sushi","fit","japanese"] },
  { id: "f321", name: "Tuna Nigiri (2 pieces)",        calories: 110, protein: 10,  carbs: 13, fats: 1.5, defaultQty: 2,   defaultUnit: "pieces", tags: ["high-protein","seafood","sushi","fit","keto","japanese"] },
  { id: "f322", name: "California Roll (6 pieces)",    calories: 255, protein: 8,   carbs: 38, fats: 7,   defaultQty: 6,   defaultUnit: "pieces", tags: ["seafood","sushi","japanese"] },
  { id: "f323", name: "Philadelphia Roll (6 pieces)",  calories: 320, protein: 12,  carbs: 32, fats: 14,  defaultQty: 6,   defaultUnit: "pieces", tags: ["seafood","sushi","dairy","japanese"] },
  { id: "f324", name: "Dragon Roll (6 pieces)",        calories: 350, protein: 14,  carbs: 42, fats: 11,  defaultQty: 6,   defaultUnit: "pieces", tags: ["seafood","sushi","japanese"] },
  { id: "f325", name: "Salmon Sashimi (3 pieces)",     calories: 120, protein: 18,  carbs: 0,  fats: 5,   defaultQty: 3,   defaultUnit: "pieces", tags: ["high-protein","seafood","sushi","keto","fit","japanese"] },
  { id: "f326", name: "Tuna Sashimi (3 pieces)",       calories: 90,  protein: 20,  carbs: 0,  fats: 1,   defaultQty: 3,   defaultUnit: "pieces", tags: ["high-protein","seafood","sushi","keto","fit","japanese"] },
  { id: "f327", name: "Vegetable Maki (6 pieces)",     calories: 170, protein: 4,   carbs: 36, fats: 1.5, defaultQty: 6,   defaultUnit: "pieces", tags: ["vegan","vegetarian","sushi","japanese"] },
  { id: "f328", name: "Shrimp Tempura Roll (6 pieces)",calories: 380, protein: 12,  carbs: 50, fats: 14,  defaultQty: 6,   defaultUnit: "pieces", tags: ["seafood","sushi","high-fat","japanese"] },
  { id: "f329", name: "Edamame (steamed, salted)",     calories: 122, protein: 11,  carbs: 10, fats: 5,   defaultQty: 100, defaultUnit: "g",      tags: ["vegan","vegetarian","high-protein","sushi","fit","japanese"] },

  // ── Kebab & Middle Eastern ────────────────────────────────────────────────
  { id: "f330", name: "Döner Kebab (wrap)",            calories: 480, protein: 28,  carbs: 42, fats: 20,  defaultQty: 1,   defaultUnit: "wrap",   tags: ["high-protein","middle-eastern"] },
  { id: "f331", name: "Shish Kebab (skewer)",          calories: 180, protein: 22,  carbs: 3,  fats: 9,   defaultQty: 1,   defaultUnit: "skewer", tags: ["high-protein","keto","fit","middle-eastern"] },
  { id: "f332", name: "Kofta (2 skewers)",             calories: 240, protein: 20,  carbs: 4,  fats: 16,  defaultQty: 2,   defaultUnit: "skewers",tags: ["high-protein","middle-eastern"] },
  { id: "f333", name: "Chicken Shawarma (wrap)",       calories: 430, protein: 26,  carbs: 38, fats: 18,  defaultQty: 1,   defaultUnit: "wrap",   tags: ["high-protein","middle-eastern"] },
  { id: "f334", name: "Gyros (wrap)",                  calories: 440, protein: 25,  carbs: 40, fats: 18,  defaultQty: 1,   defaultUnit: "wrap",   tags: ["high-protein","middle-eastern"] },
  { id: "f335", name: "Falafel (4 pieces)",            calories: 260, protein: 10,  carbs: 28, fats: 14,  defaultQty: 4,   defaultUnit: "pieces", tags: ["vegan","vegetarian","middle-eastern","legume"] },
  { id: "f336", name: "Falafel Wrap",                  calories: 450, protein: 16,  carbs: 54, fats: 18,  defaultQty: 1,   defaultUnit: "wrap",   tags: ["vegan","vegetarian","middle-eastern","legume"] },
  { id: "f337", name: "Hummus (dip)",                  calories: 166, protein: 8,   carbs: 14, fats: 9.5, defaultQty: 100, defaultUnit: "g",      tags: ["vegan","vegetarian","middle-eastern","legume","fit"] },
  { id: "f338", name: "Pita Bread",                    calories: 165, protein: 6,   carbs: 33, fats: 1.5, defaultQty: 1,   defaultUnit: "piece",  tags: ["vegan","vegetarian","middle-eastern"] },

  // ── Seafood ───────────────────────────────────────────────────────────────
  { id: "f340", name: "Shrimp / Prawns",               calories: 85,  protein: 18,  carbs: 0.9,fats: 0.9, defaultQty: 100, defaultUnit: "g",      tags: ["high-protein","seafood","keto","fit"] },
  { id: "f341", name: "Lobster",                       calories: 89,  protein: 19,  carbs: 0.5,fats: 0.9, defaultQty: 100, defaultUnit: "g",      tags: ["high-protein","seafood","keto","fit"] },
  { id: "f342", name: "Crab Meat",                     calories: 83,  protein: 18,  carbs: 0,  fats: 1,   defaultQty: 100, defaultUnit: "g",      tags: ["high-protein","seafood","keto","fit"] },
  { id: "f343", name: "Mussels (cooked)",              calories: 86,  protein: 12,  carbs: 3.7,fats: 2.2, defaultQty: 100, defaultUnit: "g",      tags: ["high-protein","seafood","fit"] },
  { id: "f344", name: "Clams (cooked)",                calories: 74,  protein: 13,  carbs: 2.6,fats: 1,   defaultQty: 100, defaultUnit: "g",      tags: ["high-protein","seafood","fit"] },
  { id: "f345", name: "Oysters (6 pieces)",            calories: 80,  protein: 9,   carbs: 5,  fats: 2,   defaultQty: 6,   defaultUnit: "pieces", tags: ["seafood","high-protein"] },
  { id: "f346", name: "Scallops (seared)",             calories: 88,  protein: 17,  carbs: 3.2,fats: 0.8, defaultQty: 100, defaultUnit: "g",      tags: ["high-protein","seafood","keto","fit"] },
  { id: "f347", name: "Octopus (cooked)",              calories: 82,  protein: 15,  carbs: 2.2,fats: 1,   defaultQty: 100, defaultUnit: "g",      tags: ["high-protein","seafood","keto","fit"] },
  { id: "f348", name: "Squid / Calamari (raw)",        calories: 92,  protein: 15.6,carbs: 3.1,fats: 1.4, defaultQty: 100, defaultUnit: "g",      tags: ["high-protein","seafood","fit"] },
  { id: "f349", name: "Sea Bass (fillet)",             calories: 97,  protein: 18,  carbs: 0,  fats: 2,   defaultQty: 100, defaultUnit: "g",      tags: ["high-protein","seafood","keto","fit"] },

  // ── Meats (expanded) ─────────────────────────────────────────────────────
  { id: "f350", name: "Veal Chop",                     calories: 172, protein: 26,  carbs: 0,  fats: 7,   defaultQty: 100, defaultUnit: "g",      tags: ["high-protein","keto","fit","meat"] },
  { id: "f351", name: "Lamb Chop",                     calories: 234, protein: 25,  carbs: 0,  fats: 15,  defaultQty: 100, defaultUnit: "g",      tags: ["high-protein","keto","meat"] },
  { id: "f352", name: "Duck Breast (skinless)",        calories: 201, protein: 19,  carbs: 0,  fats: 13.5,defaultQty: 100, defaultUnit: "g",      tags: ["high-protein","keto","meat","high-fat"] },
  { id: "f353", name: "Venison / Deer",                calories: 158, protein: 30,  carbs: 0,  fats: 3.2, defaultQty: 100, defaultUnit: "g",      tags: ["high-protein","keto","fit","meat"] },
  { id: "f354", name: "Rabbit",                        calories: 173, protein: 33,  carbs: 0,  fats: 3.5, defaultQty: 100, defaultUnit: "g",      tags: ["high-protein","keto","fit","meat"] },
  { id: "f355", name: "Bison / Buffalo",               calories: 146, protein: 28,  carbs: 0,  fats: 3,   defaultQty: 100, defaultUnit: "g",      tags: ["high-protein","keto","fit","meat"] },
  { id: "f356", name: "Turkey Breast (roasted)",       calories: 135, protein: 30,  carbs: 0,  fats: 1,   defaultQty: 100, defaultUnit: "g",      tags: ["high-protein","keto","fit","meat"] },
  { id: "f357", name: "Pork Loin (lean)",              calories: 182, protein: 25,  carbs: 0,  fats: 9,   defaultQty: 100, defaultUnit: "g",      tags: ["high-protein","keto","meat"] },
  { id: "f358", name: "Beef Liver",                    calories: 135, protein: 20,  carbs: 3.8,fats: 3.6, defaultQty: 100, defaultUnit: "g",      tags: ["high-protein","fit","meat"] },
  { id: "f359", name: "Prosciutto (3 slices)",         calories: 85,  protein: 7,   carbs: 0.2,fats: 6,   defaultQty: 3,   defaultUnit: "slices", tags: ["high-protein","keto","meat","high-fat"] },

  // ── Soups ─────────────────────────────────────────────────────────────────
  { id: "f360", name: "Chicken Soup (bowl)",           calories: 75,  protein: 8,   carbs: 6,  fats: 2,   defaultQty: 1,   defaultUnit: "bowl",   tags: ["fit","soup","high-protein"] },
  { id: "f361", name: "Tomato Soup",                   calories: 90,  protein: 2,   carbs: 14, fats: 3,   defaultQty: 250, defaultUnit: "ml",     tags: ["vegan","vegetarian","soup"] },
  { id: "f362", name: "Minestrone",                    calories: 95,  protein: 5,   carbs: 16, fats: 2,   defaultQty: 250, defaultUnit: "ml",     tags: ["vegan","vegetarian","soup","legume"] },
  { id: "f363", name: "Lentil Soup",                   calories: 130, protein: 9,   carbs: 22, fats: 1.5, defaultQty: 250, defaultUnit: "ml",     tags: ["vegan","vegetarian","soup","legume","fit"] },
  { id: "f364", name: "French Onion Soup (bowl)",      calories: 180, protein: 10,  carbs: 22, fats: 5,   defaultQty: 1,   defaultUnit: "bowl",   tags: ["vegetarian","soup"] },
  { id: "f365", name: "Miso Soup",                     calories: 40,  protein: 3,   carbs: 5,  fats: 1,   defaultQty: 250, defaultUnit: "ml",     tags: ["vegan","vegetarian","soup","fit","keto","japanese"] },
  { id: "f366", name: "Ramen (bowl)",                  calories: 430, protein: 22,  carbs: 55, fats: 12,  defaultQty: 1,   defaultUnit: "bowl",   tags: ["soup","japanese"] },
  { id: "f367", name: "Gazpacho (cold tomato soup)",   calories: 70,  protein: 2,   carbs: 12, fats: 2,   defaultQty: 250, defaultUnit: "ml",     tags: ["vegan","vegetarian","soup","fit"] },
  { id: "f368", name: "Pho (beef noodle soup)",        calories: 350, protein: 24,  carbs: 45, fats: 7,   defaultQty: 1,   defaultUnit: "bowl",   tags: ["soup","high-protein"] },
  { id: "f369", name: "Cream of Mushroom Soup",        calories: 130, protein: 4,   carbs: 11, fats: 8,   defaultQty: 250, defaultUnit: "ml",     tags: ["vegetarian","soup","dairy"] },

  // ── Cheeses ───────────────────────────────────────────────────────────────
  { id: "f370", name: "Mozzarella (fresh)",            calories: 280, protein: 22,  carbs: 2.2,fats: 21,  defaultQty: 100, defaultUnit: "g",      tags: ["vegetarian","dairy","high-protein","cheese","keto"] },
  { id: "f371", name: "Parmesan (grated)",             calories: 122, protein: 11,  carbs: 0.9,fats: 8,   defaultQty: 30,  defaultUnit: "g",      tags: ["vegetarian","dairy","high-protein","cheese","keto"] },
  { id: "f372", name: "Cheddar (slice)",               calories: 120, protein: 7,   carbs: 0.4,fats: 10,  defaultQty: 30,  defaultUnit: "g",      tags: ["vegetarian","dairy","cheese","keto"] },
  { id: "f373", name: "Brie",                          calories: 95,  protein: 5.9, carbs: 0.1,fats: 8,   defaultQty: 30,  defaultUnit: "g",      tags: ["vegetarian","dairy","cheese","keto"] },
  { id: "f374", name: "Camembert",                     calories: 85,  protein: 5.5, carbs: 0.2,fats: 7,   defaultQty: 30,  defaultUnit: "g",      tags: ["vegetarian","dairy","cheese","keto"] },
  { id: "f375", name: "Gouda",                         calories: 101, protein: 7,   carbs: 0.6,fats: 8,   defaultQty: 30,  defaultUnit: "g",      tags: ["vegetarian","dairy","cheese","keto"] },
  { id: "f376", name: "Feta",                          calories: 264, protein: 14,  carbs: 4,  fats: 21,  defaultQty: 100, defaultUnit: "g",      tags: ["vegetarian","dairy","high-protein","cheese","keto"] },
  { id: "f377", name: "Ricotta",                       calories: 174, protein: 11,  carbs: 3,  fats: 13,  defaultQty: 100, defaultUnit: "g",      tags: ["vegetarian","dairy","cheese"] },
  { id: "f378", name: "Cottage Cheese",                calories: 98,  protein: 11,  carbs: 3.4,fats: 4.3, defaultQty: 100, defaultUnit: "g",      tags: ["vegetarian","dairy","high-protein","cheese","fit"] },
  { id: "f379", name: "Cream Cheese",                  calories: 100, protein: 1.8, carbs: 1.2,fats: 10,  defaultQty: 30,  defaultUnit: "g",      tags: ["vegetarian","dairy","cheese","high-fat"] },
  { id: "f380", name: "Swiss / Emmental",              calories: 117, protein: 8.5, carbs: 0.6,fats: 9,   defaultQty: 30,  defaultUnit: "g",      tags: ["vegetarian","dairy","cheese","keto"] },
  { id: "f381", name: "Blue Cheese",                   calories: 100, protein: 6,   carbs: 0.7,fats: 8.5, defaultQty: 30,  defaultUnit: "g",      tags: ["vegetarian","dairy","cheese","keto"] },

  // ── Sausages & Cured Meats ────────────────────────────────────────────────
  { id: "f382", name: "Bratwurst",                     calories: 333, protein: 13,  carbs: 2,  fats: 30,  defaultQty: 100, defaultUnit: "g",      tags: ["meat","high-fat","sausage"] },
  { id: "f383", name: "Chorizo (sliced)",              calories: 196, protein: 10,  carbs: 0.5,fats: 17,  defaultQty: 50,  defaultUnit: "g",      tags: ["meat","high-fat","sausage","keto"] },
  { id: "f384", name: "Salami (4 slices)",             calories: 119, protein: 6.5, carbs: 0.6,fats: 10,  defaultQty: 30,  defaultUnit: "g",      tags: ["meat","high-fat","sausage","keto"] },
  { id: "f385", name: "Pepperoni",                     calories: 149, protein: 6,   carbs: 0.9,fats: 13,  defaultQty: 30,  defaultUnit: "g",      tags: ["meat","high-fat","sausage","fast-food","keto"] },
  { id: "f386", name: "Mortadella",                    calories: 150, protein: 8,   carbs: 1.5,fats: 13,  defaultQty: 50,  defaultUnit: "g",      tags: ["meat","high-fat","sausage"] },
  { id: "f387", name: "Kielbasa (Polish sausage)",     calories: 301, protein: 13,  carbs: 3,  fats: 27,  defaultQty: 100, defaultUnit: "g",      tags: ["meat","high-fat","sausage"] },
  { id: "f388", name: "Italian Sausage",               calories: 344, protein: 14,  carbs: 3,  fats: 31,  defaultQty: 100, defaultUnit: "g",      tags: ["meat","high-fat","sausage","italian"] },
  { id: "f389", name: "Blood Sausage / Morcilla",      calories: 379, protein: 14,  carbs: 2,  fats: 34,  defaultQty: 100, defaultUnit: "g",      tags: ["meat","high-fat","sausage"] },
  { id: "f390", name: "Frankfurter / Hot Dog Sausage", calories: 173, protein: 7,   carbs: 2,  fats: 15,  defaultQty: 1,   defaultUnit: "piece",  tags: ["meat","high-fat","sausage","fast-food"] },
  // ── Healthy Shakes & Smoothies ────────────────────────────────────────────────
  { id: "f500", name: "Green Smoothie (spinach, banana, almond milk)", calories: 145, protein: 4,  carbs: 30, fats: 2.5, defaultQty: 400, defaultUnit: "ml",     tags: ["vegan","vegetarian","fit","fruit","vegetable","mix","smoothie"] },
  { id: "f501", name: "Berry Protein Smoothie",                         calories: 220, protein: 25, carbs: 28, fats: 2,   defaultQty: 400, defaultUnit: "ml",     tags: ["high-protein","fit","fruit","mix","vegetarian","smoothie"] },
  { id: "f502", name: "Peanut Butter Banana Shake",                     calories: 380, protein: 18, carbs: 42, fats: 14,  defaultQty: 400, defaultUnit: "ml",     tags: ["high-protein","vegetarian","mix","smoothie"] },
  { id: "f503", name: "Chocolate Protein Smoothie",                     calories: 280, protein: 30, carbs: 25, fats: 5,   defaultQty: 400, defaultUnit: "ml",     tags: ["high-protein","fit","mix","vegetarian","smoothie"] },
  { id: "f504", name: "Tropical Smoothie (mango, pineapple, coconut)",  calories: 190, protein: 2,  carbs: 40, fats: 4,   defaultQty: 400, defaultUnit: "ml",     tags: ["vegan","vegetarian","fruit","mix","smoothie"] },
  { id: "f505", name: "Green Detox Smoothie (kale, lemon, ginger)",     calories: 75,  protein: 3,  carbs: 14, fats: 1,   defaultQty: 350, defaultUnit: "ml",     tags: ["vegan","vegetarian","fit","vegetable","low-carb","mix","smoothie"] },
  { id: "f506", name: "Mango Lassi",                                     calories: 170, protein: 6,  carbs: 30, fats: 3,   defaultQty: 300, defaultUnit: "ml",     tags: ["vegetarian","dairy","fruit","mix","smoothie"] },
  { id: "f507", name: "Meal Replacement Shake (vanilla)",                calories: 210, protein: 25, carbs: 22, fats: 4,   defaultQty: 1,   defaultUnit: "serving",tags: ["high-protein","fit","mix","smoothie"] },
  { id: "f508", name: "Avocado Green Smoothie",                          calories: 220, protein: 5,  carbs: 22, fats: 14,  defaultQty: 350, defaultUnit: "ml",     tags: ["vegan","vegetarian","fit","keto","low-carb","mix","smoothie"] },
  { id: "f509", name: "Oat & Banana Shake",                              calories: 290, protein: 10, carbs: 52, fats: 4,   defaultQty: 400, defaultUnit: "ml",     tags: ["vegan","vegetarian","integral","fit","mix","smoothie"] },
  { id: "f510", name: "Post-Workout Recovery Shake",                     calories: 310, protein: 35, carbs: 35, fats: 3,   defaultQty: 1,   defaultUnit: "serving",tags: ["high-protein","fit","mix","smoothie"] },
  { id: "f511", name: "Strawberry Banana Smoothie",                      calories: 160, protein: 3,  carbs: 36, fats: 1,   defaultQty: 400, defaultUnit: "ml",     tags: ["vegan","vegetarian","fruit","fit","mix","smoothie"] },
  { id: "f512", name: "Coffee Protein Shake",                            calories: 180, protein: 25, carbs: 12, fats: 3,   defaultQty: 350, defaultUnit: "ml",     tags: ["high-protein","fit","keto","mix","vegetarian","smoothie"] },
  { id: "f513", name: "Blueberry Açaí Smoothie",                        calories: 200, protein: 4,  carbs: 42, fats: 3,   defaultQty: 400, defaultUnit: "ml",     tags: ["vegan","vegetarian","fruit","fit","mix","smoothie"] },
  { id: "f514", name: "Spinach & Apple Detox Juice",                    calories: 90,  protein: 2,  carbs: 20, fats: 0.5, defaultQty: 350, defaultUnit: "ml",     tags: ["vegan","vegetarian","fit","vegetable","fruit","mix","smoothie"] },

  // ── Salads ───────────────────────────────────────────────────────────────────
  { id: "f520", name: "Caesar Salad (no croutons)",                      calories: 180, protein: 5,  carbs: 6,  fats: 16,  defaultQty: 200, defaultUnit: "g",      tags: ["vegetarian","keto","low-carb","fit","mix","salad"] },
  { id: "f521", name: "Chicken Caesar Salad",                            calories: 310, protein: 30, carbs: 8,  fats: 17,  defaultQty: 300, defaultUnit: "g",      tags: ["high-protein","keto","low-carb","fit","mix","salad"] },
  { id: "f522", name: "Cobb Salad",                                       calories: 350, protein: 28, carbs: 6,  fats: 24,  defaultQty: 300, defaultUnit: "g",      tags: ["high-protein","keto","low-carb","fit","mix","salad"] },
  { id: "f523", name: "Quinoa & Roasted Veggie Salad",                   calories: 280, protein: 9,  carbs: 38, fats: 10,  defaultQty: 250, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","integral","mix","salad"] },
  { id: "f524", name: "Mediterranean Salad",                              calories: 190, protein: 5,  carbs: 12, fats: 14,  defaultQty: 200, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","low-carb","mix","middle-eastern","salad"] },
  { id: "f525", name: "Tuna & Veggie Salad",                             calories: 220, protein: 28, carbs: 6,  fats: 8,   defaultQty: 250, defaultUnit: "g",      tags: ["high-protein","fit","keto","low-carb","mix","salad"] },
  { id: "f526", name: "Caprese Salad",                                    calories: 210, protein: 12, carbs: 4,  fats: 16,  defaultQty: 200, defaultUnit: "g",      tags: ["vegetarian","keto","low-carb","italian","mix","salad"] },
  { id: "f527", name: "Nicoise Salad",                                    calories: 280, protein: 22, carbs: 12, fats: 15,  defaultQty: 300, defaultUnit: "g",      tags: ["high-protein","fit","mix","salad"] },
  { id: "f528", name: "Asian Sesame Chicken Salad",                       calories: 290, protein: 25, carbs: 18, fats: 12,  defaultQty: 300, defaultUnit: "g",      tags: ["high-protein","fit","mix","salad"] },
  { id: "f529", name: "Kale & Chickpea Salad",                           calories: 240, protein: 10, carbs: 28, fats: 10,  defaultQty: 250, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","high-protein","mix","vegetable","salad"] },
  { id: "f530", name: "Superfood Salad (kale, quinoa, seeds)",           calories: 310, protein: 12, carbs: 32, fats: 15,  defaultQty: 250, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","integral","mix","salad"] },
  { id: "f531", name: "Waldorf Salad",                                    calories: 260, protein: 3,  carbs: 20, fats: 19,  defaultQty: 200, defaultUnit: "g",      tags: ["vegetarian","mix","salad"] },
  { id: "f532", name: "Pasta Salad (whole wheat)",                        calories: 280, protein: 9,  carbs: 42, fats: 9,   defaultQty: 250, defaultUnit: "g",      tags: ["vegetarian","integral","pasta","mix","salad"] },
  { id: "f533", name: "Fattoush Salad",                                   calories: 130, protein: 3,  carbs: 18, fats: 6,   defaultQty: 200, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","middle-eastern","mix","salad"] },
  { id: "f534", name: "Salmon & Avocado Salad",                          calories: 350, protein: 28, carbs: 6,  fats: 24,  defaultQty: 280, defaultUnit: "g",      tags: ["high-protein","fit","keto","low-carb","mix","salad"] },
  { id: "f535", name: "Egg & Spinach Salad",                             calories: 190, protein: 14, carbs: 5,  fats: 13,  defaultQty: 200, defaultUnit: "g",      tags: ["vegetarian","fit","keto","low-carb","mix","salad"] },
  { id: "f536", name: "Sweet Potato & Black Bean Salad",                 calories: 290, protein: 9,  carbs: 48, fats: 7,   defaultQty: 250, defaultUnit: "g",      tags: ["vegan","vegetarian","fit","legume","mix","salad"] },
  { id: "f537", name: "Thai Peanut Noodle Salad",                        calories: 340, protein: 12, carbs: 44, fats: 14,  defaultQty: 250, defaultUnit: "g",      tags: ["vegan","vegetarian","mix","salad"] },
  { id: "f538", name: "Tortilla (small / mini)",                         calories: 30,  protein: 0,  carbs: 6,  fats: 0.5, defaultQty: 1,   defaultUnit: "unit",   tags: ["vegan","vegetarian","mexican","snack"] },

  // ── Korean Cuisine ───────────────────────────────────────────────────────────
  { id: "f400", name: "Bibimbap (rice bowl)",           calories: 490, protein: 22,  carbs: 70, fats: 12,  defaultQty: 1,   defaultUnit: "bowl",   tags: ["korean","high-protein","mix"] },
  { id: "f401", name: "Bulgogi (Korean BBQ beef)",      calories: 215, protein: 26,  carbs: 8,  fats: 10,  defaultQty: 150, defaultUnit: "g",      tags: ["korean","high-protein","meat"] },
  { id: "f402", name: "Tteokbokki (spicy rice cakes)", calories: 285, protein: 6,   carbs: 57, fats: 4,   defaultQty: 1,   defaultUnit: "serving",tags: ["korean","vegan","vegetarian"] },
  { id: "f403", name: "Kimchi",                         calories: 15,  protein: 1,   carbs: 2.4,fats: 0.5, defaultQty: 100, defaultUnit: "g",      tags: ["korean","vegan","vegetarian","low-carb","keto","fit"] },
  { id: "f404", name: "Korean Fried Chicken",           calories: 310, protein: 24,  carbs: 14, fats: 18,  defaultQty: 200, defaultUnit: "g",      tags: ["korean","high-protein","high-fat"] },
  { id: "f405", name: "Japchae (glass noodles)",        calories: 290, protein: 8,   carbs: 50, fats: 6,   defaultQty: 1,   defaultUnit: "serving",tags: ["korean","vegan","vegetarian"] },
  { id: "f406", name: "Samgyeopsal (pork belly)",       calories: 518, protein: 17,  carbs: 0,  fats: 50,  defaultQty: 150, defaultUnit: "g",      tags: ["korean","keto","high-fat","meat"] },
  { id: "f407", name: "Doenjang Jjigae (soybean soup)", calories: 130, protein: 9,   carbs: 10, fats: 5,   defaultQty: 1,   defaultUnit: "bowl",   tags: ["korean","vegan","vegetarian","soup"] },
  { id: "f408", name: "Sundubu Jjigae (soft tofu stew)",calories: 180, protein: 12,  carbs: 8,  fats: 9,   defaultQty: 1,   defaultUnit: "bowl",   tags: ["korean","vegetarian","soup","high-protein"] },
  { id: "f409", name: "Kimbap (seaweed rice roll)",     calories: 320, protein: 12,  carbs: 55, fats: 7,   defaultQty: 1,   defaultUnit: "roll",   tags: ["korean","mix"] },

];

/**
 * Search the food database by name (case-insensitive, partial match).
 * Optionally filter by tag (e.g. "keto", "fit", "high-protein", "vegan").
 * Returns up to `limit` results sorted by relevance (prefix match ranked higher).
 */
export function searchFoods(query: string, limit = 20, tags?: string | string[]): FoodItem[] {
  const q    = query.toLowerCase().trim();
  const tagList: string[] = Array.isArray(tags)
    ? tags.map((t) => t.toLowerCase().trim()).filter(Boolean)
    : tags ? [tags.toLowerCase().trim()] : [];

  // AND logic: item must have ALL selected tags
  let pool = tagList.length > 0
    ? FOOD_DB.filter((f) => tagList.every((t) => f.tags?.includes(t)))
    : FOOD_DB;

  if (!q) return pool.slice(0, limit);

  const scored = pool
    .filter((f) => f.name.toLowerCase().includes(q))
    .map((f) => ({
      item:  f,
      score: f.name.toLowerCase().startsWith(q) ? 2 : 1,
    }));

  scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
  return scored.slice(0, limit).map((s) => s.item);
}
