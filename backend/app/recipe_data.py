"""Seed data for the ingredient catalog and the starter recipes.

Recipe macros are **computed** from the ingredient quantities below rather than
typed in by hand, so the numbers the app shows always add up to what is actually
in the recipe. The per-100 nutrition values live here (seed-time only) — the
database keeps macros per serving on the Recipe row, as planned.
"""

from dataclasses import dataclass, field

from .models import IngredientCategory, MealType


@dataclass(frozen=True)
class IngredientDef:
    name: str
    category: IngredientCategory
    unit: str  # the unit recipes measure it in
    kcal: float  # per 100 g / 100 ml
    protein: float
    carbs: float
    fat: float
    # Weight of ONE `unit`: 1 for g/ml, the real item weight for piece/slice.
    grams_per_unit: float = 1.0


def _g(name, category, kcal, protein, carbs, fat):
    return IngredientDef(name, category, "g", kcal, protein, carbs, fat)


def _ml(name, category, kcal, protein, carbs, fat):
    return IngredientDef(name, category, "ml", kcal, protein, carbs, fat)


def _piece(name, category, kcal, protein, carbs, fat, grams, unit="piece"):
    return IngredientDef(name, category, unit, kcal, protein, carbs, fat, grams)


P = IngredientCategory.produce
PR = IngredientCategory.protein
D = IngredientCategory.dairy
PA = IngredientCategory.pantry
F = IngredientCategory.frozen

# name -> nutrition per 100 g/ml (values are for the ingredient as bought/used)
INGREDIENTS: list[IngredientDef] = [
    # Produce
    _g("Blueberries", P, 57, 0.7, 14.0, 0.3),
    _piece("Banana", P, 89, 1.1, 23.0, 0.3, 120),
    _piece("Apple", P, 52, 0.3, 14.0, 0.2, 180),
    _piece("Avocado", P, 160, 2.0, 9.0, 15.0, 150),
    _g("Spinach", P, 23, 2.9, 3.6, 0.4),
    _g("Sweet potato", P, 86, 1.6, 20.0, 0.1),
    _g("Broccoli", P, 34, 2.8, 7.0, 0.4),
    _g("Zucchini", P, 17, 1.2, 3.1, 0.3),
    _g("Bell pepper", P, 31, 1.0, 6.0, 0.3),
    _g("Carrot", P, 41, 0.9, 10.0, 0.2),
    _g("Onion", P, 40, 1.1, 9.0, 0.1),
    _g("Garlic", P, 149, 6.4, 33.0, 0.5),
    _g("Tomato", P, 18, 0.9, 3.9, 0.2),
    _g("Cucumber", P, 15, 0.7, 3.6, 0.1),
    _g("Mushrooms", P, 22, 3.1, 3.3, 0.3),
    _piece("Lemon", P, 29, 1.1, 9.0, 0.3, 60),
    # Protein
    _g("Chicken breast", PR, 120, 23.0, 0.0, 2.6),
    _g("Salmon fillet", PR, 208, 20.0, 0.0, 13.0),
    _g("Ground turkey", PR, 148, 20.0, 0.0, 7.0),
    _g("Beef strips", PR, 150, 21.0, 0.0, 7.0),
    _g("Tofu", PR, 144, 15.0, 2.8, 8.7),
    _g("Canned tuna", PR, 116, 26.0, 0.0, 1.0),
    _piece("Egg", PR, 143, 13.0, 0.7, 9.5, 55),
    # Dairy
    _g("Greek yogurt", D, 73, 10.0, 3.9, 2.0),
    _g("Cottage cheese", D, 98, 11.0, 3.4, 4.3),
    _ml("Milk", D, 47, 3.4, 4.8, 1.5),
    _g("Feta", D, 264, 14.0, 4.1, 21.0),
    # Pantry
    _g("Rolled oats", PA, 380, 13.0, 60.0, 7.0),
    _g("Chia seeds", PA, 486, 17.0, 42.0, 31.0),
    _g("Rice", PA, 360, 7.0, 78.0, 1.0),
    _g("Quinoa", PA, 368, 14.0, 64.0, 6.0),
    _g("Wholewheat pasta", PA, 348, 13.0, 67.0, 2.5),
    _g("Red lentils", PA, 352, 25.0, 63.0, 1.0),
    _g("Chickpeas", PA, 139, 7.4, 21.0, 2.6),  # canned, drained
    _g("Almonds", PA, 579, 21.0, 22.0, 50.0),
    _g("Peanut butter", PA, 588, 25.0, 20.0, 50.0),
    _g("Protein powder", PA, 380, 80.0, 8.0, 5.0),
    _g("Honey", PA, 304, 0.3, 82.0, 0.0),
    _ml("Olive oil", PA, 884, 0.0, 0.0, 100.0),
    _ml("Soy sauce", PA, 60, 8.0, 6.0, 0.1),
    _g("Tomato passata", PA, 35, 1.6, 6.0, 0.2),
    _g("Vegetable stock", PA, 4, 0.2, 0.6, 0.1),
    _piece("Wholegrain bread", PA, 250, 10.0, 41.0, 3.5, 40, unit="slice"),
    # Frozen
    _g("Frozen mixed berries", F, 50, 1.0, 10.0, 0.3),
    _g("Frozen peas", F, 81, 5.4, 14.0, 0.4),
]


@dataclass(frozen=True)
class RecipeDef:
    title: str
    meal_type: MealType
    servings: int
    prep_minutes: int
    tags: list[str]
    instructions: str
    # (ingredient name, quantity in that ingredient's unit)
    ingredients: list[tuple[str, float]] = field(default_factory=list)


RECIPES: list[RecipeDef] = [
    # ---------------- Breakfast ----------------
    RecipeDef(
        title="Berry Chia Overnight Oats",
        meal_type=MealType.breakfast,
        servings=2,
        prep_minutes=10,
        tags=["High Protein", "Meal Prep", "No Cook"],
        instructions=(
            "1. Stir the oats, chia seeds and protein powder together in a jar or container.\n"
            "2. Pour in the milk and yogurt and mix until there are no dry pockets.\n"
            "3. Fold in the berries and drizzle with honey.\n"
            "4. Cover and refrigerate overnight (at least 6 hours).\n"
            "5. Keeps 3 days — make both servings at once."
        ),
        ingredients=[
            ("Rolled oats", 100),
            ("Chia seeds", 20),
            ("Protein powder", 30),
            ("Milk", 250),
            ("Greek yogurt", 150),
            ("Blueberries", 100),
            ("Honey", 15),
        ],
    ),
    RecipeDef(
        title="Scrambled Eggs on Wholegrain Toast",
        meal_type=MealType.breakfast,
        servings=1,
        prep_minutes=10,
        tags=["High Protein", "Quick Prep"],
        instructions=(
            "1. Whisk the eggs with a pinch of salt and pepper.\n"
            "2. Warm the olive oil in a non-stick pan over medium-low heat.\n"
            "3. Add the eggs and stir gently and constantly until just set — take them off "
            "the heat while still slightly glossy.\n"
            "4. Toast the bread, pile the eggs on top and add the spinach alongside."
        ),
        ingredients=[
            ("Egg", 3),
            ("Wholegrain bread", 2),
            ("Spinach", 50),
            ("Olive oil", 5),
        ],
    ),
    RecipeDef(
        title="Greek Yogurt Protein Bowl",
        meal_type=MealType.breakfast,
        servings=1,
        prep_minutes=5,
        tags=["High Protein", "Quick Prep", "No Cook"],
        instructions=(
            "1. Spoon the yogurt into a bowl and stir the protein powder through it.\n"
            "2. Top with the berries, chopped almonds and banana.\n"
            "3. Finish with honey."
        ),
        ingredients=[
            ("Greek yogurt", 250),
            ("Protein powder", 20),
            ("Frozen mixed berries", 80),
            ("Almonds", 20),
            ("Banana", 0.5),
            ("Honey", 10),
        ],
    ),
    RecipeDef(
        title="Banana Protein Pancakes",
        meal_type=MealType.breakfast,
        servings=2,
        prep_minutes=15,
        tags=["High Protein", "Post-Workout"],
        instructions=(
            "1. Blend the banana, eggs, oats and protein powder into a smooth batter.\n"
            "2. Let it rest 5 minutes so the oats absorb the liquid.\n"
            "3. Cook in a lightly oiled pan over medium heat, roughly 2 minutes a side, "
            "flipping once bubbles form.\n"
            "4. Serve topped with yogurt and berries."
        ),
        ingredients=[
            ("Banana", 2),
            ("Egg", 3),
            ("Rolled oats", 60),
            ("Protein powder", 30),
            ("Greek yogurt", 100),
            ("Blueberries", 60),
            ("Olive oil", 5),
        ],
    ),
    # ---------------- Lunch ----------------
    RecipeDef(
        title="Chicken & Rice Meal-Prep Bowl",
        meal_type=MealType.lunch,
        servings=4,
        prep_minutes=30,
        tags=["High Protein", "Meal Prep"],
        instructions=(
            "1. Cook the rice according to the packet and set aside.\n"
            "2. Season the chicken, then sear in olive oil over medium-high heat until "
            "cooked through, about 6-7 minutes a side. Rest, then slice.\n"
            "3. Steam or roast the broccoli and bell pepper until just tender.\n"
            "4. Divide rice, chicken and vegetables between four containers.\n"
            "5. Keeps 4 days in the fridge."
        ),
        ingredients=[
            ("Chicken breast", 600),
            ("Rice", 300),
            ("Broccoli", 400),
            ("Bell pepper", 200),
            ("Olive oil", 20),
            ("Garlic", 10),
        ],
    ),
    RecipeDef(
        title="Roasted Chickpea Grain Bowl",
        meal_type=MealType.lunch,
        servings=2,
        prep_minutes=25,
        tags=["Vegetarian", "High Fibre", "Meal Prep"],
        instructions=(
            "1. Heat the oven to 200 °C.\n"
            "2. Pat the chickpeas dry, toss with half the olive oil and roast 20 minutes "
            "until crisp.\n"
            "3. Meanwhile cook the quinoa.\n"
            "4. Toss the quinoa with spinach, tomato and cucumber and the remaining oil.\n"
            "5. Top with the chickpeas and crumbled feta, and squeeze the lemon over."
        ),
        ingredients=[
            ("Chickpeas", 400),
            ("Quinoa", 150),
            ("Spinach", 100),
            ("Tomato", 150),
            ("Cucumber", 100),
            ("Feta", 60),
            ("Olive oil", 20),
            ("Lemon", 0.5),
        ],
    ),
    RecipeDef(
        title="Tuna Pasta Salad",
        meal_type=MealType.lunch,
        servings=3,
        prep_minutes=20,
        tags=["High Protein", "Meal Prep", "Quick Prep"],
        instructions=(
            "1. Cook the pasta, drain and rinse under cold water to stop it cooking.\n"
            "2. Drain the tuna and flake it into a large bowl.\n"
            "3. Add the pasta, tomato, cucumber, bell pepper and finely chopped onion.\n"
            "4. Dress with olive oil and lemon juice, season, and chill before serving."
        ),
        ingredients=[
            ("Wholewheat pasta", 240),
            ("Canned tuna", 300),
            ("Tomato", 200),
            ("Cucumber", 150),
            ("Bell pepper", 150),
            ("Onion", 50),
            ("Olive oil", 20),
            ("Lemon", 1),
        ],
    ),
    RecipeDef(
        title="Spiced Red Lentil Soup",
        meal_type=MealType.lunch,
        servings=4,
        prep_minutes=35,
        tags=["Vegan", "High Fibre", "Meal Prep"],
        instructions=(
            "1. Soften the diced onion, carrot and garlic in olive oil for 5 minutes.\n"
            "2. Add the lentils, passata and stock, bring to a boil, then simmer 25 minutes "
            "until the lentils collapse.\n"
            "3. Blend partially for a thicker texture and season well.\n"
            "4. Freezes well — portion into four containers."
        ),
        ingredients=[
            ("Red lentils", 300),
            ("Carrot", 200),
            ("Onion", 150),
            ("Garlic", 15),
            ("Tomato passata", 400),
            ("Vegetable stock", 1200),
            ("Olive oil", 20),
        ],
    ),
    # ---------------- Dinner ----------------
    RecipeDef(
        title="Baked Salmon with Sweet Potato",
        meal_type=MealType.dinner,
        servings=2,
        prep_minutes=35,
        tags=["High Protein", "Omega-3"],
        instructions=(
            "1. Heat the oven to 200 °C.\n"
            "2. Cut the sweet potato into wedges, toss with olive oil and roast 25 minutes.\n"
            "3. Add the salmon to the tray, season, and bake a further 12-14 minutes until "
            "it flakes.\n"
            "4. Steam the broccoli and serve with a squeeze of lemon."
        ),
        ingredients=[
            ("Salmon fillet", 300),
            ("Sweet potato", 400),
            ("Broccoli", 300),
            ("Olive oil", 15),
            ("Lemon", 0.5),
        ],
    ),
    RecipeDef(
        title="Turkey Meatballs in Tomato Sauce",
        meal_type=MealType.dinner,
        servings=4,
        prep_minutes=35,
        tags=["High Protein", "Meal Prep"],
        instructions=(
            "1. Mix the ground turkey with the egg, oats, grated onion and garlic. Season "
            "and roll into roughly 20 meatballs.\n"
            "2. Brown them in olive oil in batches, then set aside.\n"
            "3. Pour in the passata, return the meatballs and simmer 15 minutes.\n"
            "4. Serve over zucchini noodles."
        ),
        ingredients=[
            ("Ground turkey", 600),
            ("Egg", 1),
            ("Rolled oats", 50),
            ("Onion", 100),
            ("Garlic", 15),
            ("Tomato passata", 500),
            ("Zucchini", 600),
            ("Olive oil", 20),
        ],
    ),
    RecipeDef(
        title="Beef & Vegetable Stir-Fry",
        meal_type=MealType.dinner,
        servings=3,
        prep_minutes=25,
        tags=["High Protein", "Quick Prep"],
        instructions=(
            "1. Cook the rice and keep it warm.\n"
            "2. Get a wok very hot, add half the oil and sear the beef in a single layer "
            "for 2 minutes. Remove.\n"
            "3. Add the rest of the oil, then the bell pepper, carrot, mushrooms and garlic; "
            "stir-fry 4 minutes.\n"
            "4. Return the beef, add the soy sauce and peas, toss for 1 minute and serve "
            "over the rice."
        ),
        ingredients=[
            ("Beef strips", 450),
            ("Rice", 225),
            ("Bell pepper", 200),
            ("Carrot", 150),
            ("Mushrooms", 150),
            ("Frozen peas", 150),
            ("Garlic", 15),
            ("Soy sauce", 40),
            ("Olive oil", 20),
        ],
    ),
    RecipeDef(
        title="Crispy Tofu & Broccoli Bowl",
        meal_type=MealType.dinner,
        servings=2,
        prep_minutes=30,
        tags=["Vegan", "High Protein"],
        instructions=(
            "1. Press the tofu 10 minutes, then cube it.\n"
            "2. Cook the quinoa.\n"
            "3. Fry the tofu in olive oil until golden on all sides, about 8 minutes.\n"
            "4. Add the broccoli, mushrooms and garlic, cook 4 minutes, then add the soy "
            "sauce and toss.\n"
            "5. Serve over the quinoa."
        ),
        ingredients=[
            ("Tofu", 400),
            ("Quinoa", 150),
            ("Broccoli", 300),
            ("Mushrooms", 150),
            ("Garlic", 10),
            ("Soy sauce", 30),
            ("Olive oil", 20),
        ],
    ),
    # ---------------- Snacks ----------------
    RecipeDef(
        title="Vanilla Recovery Shake",
        meal_type=MealType.snack,
        servings=1,
        prep_minutes=3,
        tags=["Post-Workout", "High Protein", "Quick Prep"],
        instructions=(
            "1. Put the milk in the blender first, then the protein powder, banana and "
            "peanut butter.\n"
            "2. Blend 30 seconds until smooth.\n"
            "3. Drink within about 30 minutes of training."
        ),
        ingredients=[
            ("Milk", 300),
            ("Protein powder", 30),
            ("Banana", 1),
            ("Peanut butter", 15),
        ],
    ),
    RecipeDef(
        title="Greek Yogurt with Toasted Almonds",
        meal_type=MealType.snack,
        servings=1,
        prep_minutes=5,
        tags=["High Protein", "No Cook"],
        instructions=(
            "1. Toast the almonds in a dry pan for 2-3 minutes until fragrant, then chop "
            "roughly.\n"
            "2. Spoon the yogurt into a bowl, scatter the almonds over and drizzle with "
            "honey.\n"
            "3. A good slow-digesting snack before bed."
        ),
        ingredients=[
            ("Greek yogurt", 200),
            ("Almonds", 25),
            ("Honey", 10),
        ],
    ),
    RecipeDef(
        title="Peanut Butter Energy Balls",
        meal_type=MealType.snack,
        servings=10,
        prep_minutes=15,
        tags=["Meal Prep", "No Cook", "Pre-Workout"],
        instructions=(
            "1. Mix the oats, peanut butter, protein powder, honey and chia seeds into a "
            "stiff dough.\n"
            "2. If it is too dry add a splash of milk; too sticky, a little more oats.\n"
            "3. Roll into 10 balls and chill for an hour.\n"
            "4. Keeps a week in the fridge."
        ),
        ingredients=[
            ("Rolled oats", 150),
            ("Peanut butter", 120),
            ("Protein powder", 30),
            ("Honey", 60),
            ("Chia seeds", 20),
            ("Milk", 30),
        ],
    ),
    RecipeDef(
        title="Cottage Cheese with Apple",
        meal_type=MealType.snack,
        servings=1,
        prep_minutes=3,
        tags=["High Protein", "Quick Prep", "No Cook"],
        instructions=(
            "1. Spoon the cottage cheese into a bowl.\n"
            "2. Dice the apple and stir it through.\n"
            "3. Top with the almonds and a little honey."
        ),
        ingredients=[
            ("Cottage cheese", 200),
            ("Apple", 1),
            ("Almonds", 15),
            ("Honey", 5),
        ],
    ),
]
