const express = require("express");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, "recipes.db");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Failed to connect to SQLite database:", err.message);
    process.exit(1);
  }
});

const seedRecipes = [
  ["happy", "Sunshine Veggie Pasta", "A bright pasta with cherry tomatoes, basil, garlic, olive oil, and parmesan."],
  ["happy", "Berry Yogurt Parfait", "Layers of yogurt, granola, honey, and fresh berries for an uplifting snack."],
  ["sad", "Cozy Tomato Soup & Toast", "Comforting tomato soup with buttery toast and melted cheese."],
  ["sad", "Warm Mac and Cheese", "Creamy baked macaroni and cheese with a golden breadcrumb topping."],
  ["stressed", "Quick Chicken Stir Fry", "A fast stir fry with chicken, mixed vegetables, soy sauce, and ginger."],
  ["stressed", "Simple Rice Bowl", "Steamed rice with sauteed veggies, fried egg, and a drizzle of chili crisp."],
  ["tired", "5-Minute Peanut Butter Banana Toast", "Whole-grain toast topped with peanut butter, banana slices, and cinnamon."],
  ["tired", "Easy Egg Fried Rice", "Leftover rice tossed with eggs, peas, and soy sauce for a quick meal."],
  ["romantic", "Creamy Mushroom Risotto", "Creamy risotto with mushrooms, garlic, white wine, and parmesan."],
  ["romantic", "Chocolate-Dipped Strawberries", "Fresh strawberries dipped in melted dark chocolate and chilled."],
  ["adventurous", "Spicy Thai Curry Noodles", "Rice noodles in a spicy coconut curry with veggies and lime."],
  ["adventurous", "Shakshuka", "Eggs poached in a spiced tomato and pepper sauce, served with warm bread."]
];

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mood TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL
    )
  `);

  db.get("SELECT COUNT(*) AS count FROM recipes", (err, row) => {
    if (err) {
      console.error("Failed to count recipes:", err.message);
      return;
    }

    if (row.count === 0) {
      const insertStmt = db.prepare(
        "INSERT INTO recipes (mood, name, description) VALUES (?, ?, ?)"
      );
      seedRecipes.forEach((recipe) => insertStmt.run(recipe));
      insertStmt.finalize();
    }
  });
});

app.get("/api/moods", (_req, res) => {
  db.all("SELECT DISTINCT mood FROM recipes ORDER BY mood", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Failed to fetch moods." });
    }

    res.json(rows.map((row) => row.mood));
  });
});

app.get("/api/recipes", (req, res) => {
  const mood = (req.query.mood || "").toString().trim().toLowerCase();

  if (!mood) {
    return res.status(400).json({ error: "Mood is required." });
  }

  db.all(
    "SELECT id, name, description FROM recipes WHERE mood = ?",
    [mood],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Failed to fetch recipes." });
      }

      if (rows.length === 0) {
        return res.status(404).json({ error: "No recipes found for that mood." });
      }

      const randomRecipe = rows[Math.floor(Math.random() * rows.length)];
      res.json({ mood, recipe: randomRecipe });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
