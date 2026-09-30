// The menu the seed creates: fast food, café drinks and desserts. Photos live in public/photos/<photo>.webp.
export type SeedItem = [name: string, rupees: number, isVeg: boolean, stock: number | null, photo: string, prep: number, desc: string];

export const menu: Record<string, SeedItem[]> = {
  Pizzas: [
    ["Margherita Pizza", 199, true, null, "margherita-pizza", 12, "Classic hand-tossed pizza with tomato sauce, mozzarella and basil."],
    ["Farmhouse Veg Pizza", 269, true, null, "farmhouse-pizza", 14, "Loaded with capsicum, onion, tomato, mushroom and sweet corn."],
    ["Paneer Tikka Pizza", 289, true, null, "paneer-tikka-pizza", 14, "Tandoori paneer, onion and capsicum on a spicy makhani base."],
    ["Chicken Pepperoni Pizza", 329, false, null, "pepperoni-pizza", 14, "Chicken pepperoni and extra mozzarella on a rich tomato base."],
    ["BBQ Chicken Pizza", 319, false, 20, "bbq-chicken-pizza", 14, "Smoky barbecue chicken, onion and peppers with a BBQ drizzle."],
  ],
  Burgers: [
    ["Classic Veg Burger", 99, true, null, "veg-burger", 7, "Crispy veg patty, lettuce, tomato and house mayo in a toasted bun."],
    ["Spicy Paneer Burger", 129, true, null, "paneer-burger", 8, "Crunchy paneer patty with spicy sauce, onion and lettuce."],
    ["Crispy Chicken Burger", 149, false, null, "chicken-burger", 8, "Fried chicken fillet, lettuce and creamy mayo."],
    ["Double Cheese Burger", 189, false, 25, "cheese-burger", 9, "Two grilled chicken patties with double cheese, pickles and onion."],
  ],
  Sides: [
    ["French Fries", 89, true, null, "french-fries", 5, "Golden, salted and crisp. Served hot."],
    ["Peri Peri Fries", 109, true, null, "peri-peri-fries", 5, "Crisp fries tossed in fiery peri peri seasoning."],
    ["Garlic Bread", 99, true, null, "garlic-bread", 6, "Toasted baguette with garlic butter and herbs."],
    ["Onion Rings", 99, true, null, "onion-rings", 6, "Batter-fried onion rings with a dip."],
    ["Chicken Nuggets (6 pcs)", 129, false, null, "chicken-nuggets", 6, "Crispy chicken bites with a dip."],
    ["Hot Chicken Wings (6 pcs)", 179, false, 30, "chicken-wings", 10, "Juicy wings tossed in a hot and tangy sauce."],
  ],
  "Wraps & Sandwiches": [
    ["Paneer Tikka Wrap", 139, true, null, "paneer-wrap", 8, "Grilled paneer tikka, onion and mint mayo in a soft tortilla."],
    ["Chicken Shawarma Wrap", 149, false, null, "chicken-shawarma", 8, "Roasted chicken, garlic sauce and pickles, rolled and toasted."],
    ["Grilled Cheese Sandwich", 109, true, null, "grilled-cheese", 6, "Buttery toasted bread with melted cheese."],
    ["Chicken Club Sandwich", 159, false, null, "club-sandwich", 8, "Triple-decker with chicken, egg, lettuce, tomato and mayo."],
  ],
  "Coffee & Drinks": [
    ["Cappuccino", 129, true, null, "cappuccino", 4, "Espresso with steamed milk and a thick layer of foam."],
    ["Caffè Latte", 139, true, null, "latte", 4, "Smooth espresso with plenty of steamed milk."],
    ["Iced Latte", 149, true, null, "iced-latte", 3, "Chilled espresso and milk over ice."],
    ["Caramel Frappe", 189, true, null, "caramel-frappe", 5, "Blended iced coffee with caramel and whipped cream."],
    ["Hot Chocolate", 149, true, null, "hot-chocolate", 4, "Rich, creamy cocoa topped with froth."],
    ["Lemon Iced Tea", 99, true, null, "iced-tea", 2, "Freshly brewed tea with lemon, served over ice."],
  ],
  Desserts: [
    ["Chocolate Brownie", 99, true, null, "brownie", 3, "Fudgy, warm chocolate brownie."],
    ["Choco Lava Cake", 109, true, 20, "lava-cake", 5, "Warm chocolate cake with a molten centre."],
    ["Blueberry Cheesecake", 179, true, 15, "cheesecake", 2, "Creamy baked cheesecake with blueberry compote."],
    ["Chocolate Donut", 79, true, null, "donut", 2, "Soft ring donut with chocolate icing and sprinkles."],
    ["Chocolate Milkshake", 149, true, null, "chocolate-milkshake", 4, "Thick shake with chocolate ice cream."],
  ],
};

/**
 * The original South Indian menu. Archived once when the fast-food menu replaced it: hidden from
 * the menu but kept for old orders and bills.
 */
export const RETIRED = [
  "Idli (2 pcs)",
  "Masala Dosa",
  "Pongal",
  "Poori Masala",
  "Veg Meals",
  "Curd Rice",
  "Lemon Rice",
  "Chicken Biryani",
  "Egg Fried Rice",
  "Samosa",
  "Veg Puff",
  "Egg Puff",
  "Onion Bajji",
  "Filter Coffee",
  "Tea",
  "Fresh Lime Juice",
];

// Dish details: [spice 0-3, kcal, ingredients, allergens, tags, pairs-with]. Filled on first seed, and
// back-filled once onto existing items that have none yet (admin edits are never overwritten).
export type Details = [spice: number, kcal: number, ingredients: string, allergens: string, tags: string, pairsWith: string];

export const details: Record<string, Details> = {
  "Margherita Pizza": [0, 720, "Pizza dough, Tomato sauce, Mozzarella, Basil", "Gluten, Dairy", "bestseller", "Garlic Bread, Lemon Iced Tea"],
  "Farmhouse Veg Pizza": [1, 780, "Pizza dough, Mozzarella, Capsicum, Onion, Mushroom, Sweet corn", "Gluten, Dairy", "", "Garlic Bread, Lemon Iced Tea"],
  "Paneer Tikka Pizza": [2, 860, "Pizza dough, Paneer, Onion, Capsicum, Makhani sauce, Mozzarella", "Gluten, Dairy", "chef-special", "Peri Peri Fries, Lemon Iced Tea"],
  "Chicken Pepperoni Pizza": [1, 920, "Pizza dough, Chicken pepperoni, Mozzarella, Tomato sauce", "Gluten, Dairy", "bestseller", "Garlic Bread, Iced Latte"],
  "BBQ Chicken Pizza": [1, 900, "Pizza dough, Chicken, BBQ sauce, Onion, Peppers, Mozzarella", "Gluten, Dairy", "", "Hot Chicken Wings (6 pcs), Lemon Iced Tea"],
  "Classic Veg Burger": [0, 420, "Bun, Veg patty, Lettuce, Tomato, Mayo", "Gluten, Egg", "bestseller", "French Fries, Lemon Iced Tea"],
  "Spicy Paneer Burger": [2, 480, "Bun, Paneer patty, Spicy sauce, Onion, Lettuce", "Gluten, Dairy", "", "Peri Peri Fries, Iced Latte"],
  "Crispy Chicken Burger": [1, 520, "Bun, Fried chicken fillet, Lettuce, Mayo", "Gluten, Egg", "bestseller", "French Fries, Chocolate Milkshake"],
  "Double Cheese Burger": [1, 690, "Bun, Chicken patties, Cheese, Pickles, Onion", "Gluten, Dairy", "chef-special", "French Fries, Chocolate Milkshake"],
  "French Fries": [0, 310, "Potato, Salt, Vegetable oil", "", "bestseller", "Classic Veg Burger, Crispy Chicken Burger"],
  "Peri Peri Fries": [2, 330, "Potato, Peri peri seasoning, Vegetable oil", "", "", "Spicy Paneer Burger, Lemon Iced Tea"],
  "Garlic Bread": [0, 280, "Baguette, Garlic butter, Herbs", "Gluten, Dairy", "", "Margherita Pizza, Cappuccino"],
  "Onion Rings": [0, 300, "Onion, Batter, Vegetable oil", "Gluten", "", "Classic Veg Burger"],
  "Chicken Nuggets (6 pcs)": [0, 290, "Chicken, Breadcrumbs, Spices", "Gluten", "", "French Fries, Lemon Iced Tea"],
  "Hot Chicken Wings (6 pcs)": [3, 430, "Chicken wings, Hot sauce, Butter", "Dairy", "new", "French Fries, Lemon Iced Tea"],
  "Paneer Tikka Wrap": [2, 450, "Tortilla, Paneer tikka, Onion, Mint mayo", "Gluten, Dairy, Egg", "", "Peri Peri Fries, Lemon Iced Tea"],
  "Chicken Shawarma Wrap": [1, 470, "Tortilla, Roasted chicken, Garlic sauce, Pickles", "Gluten, Egg", "bestseller", "French Fries, Lemon Iced Tea"],
  "Grilled Cheese Sandwich": [0, 380, "Bread, Cheese, Butter", "Gluten, Dairy", "", "Cappuccino, French Fries"],
  "Chicken Club Sandwich": [0, 540, "Bread, Chicken, Egg, Lettuce, Tomato, Mayo", "Gluten, Egg", "", "French Fries, Iced Latte"],
  Cappuccino: [0, 120, "Espresso, Steamed milk, Milk foam", "Dairy", "bestseller", "Chocolate Brownie, Chocolate Donut"],
  "Caffè Latte": [0, 150, "Espresso, Steamed milk", "Dairy", "", "Blueberry Cheesecake, Chocolate Donut"],
  "Iced Latte": [0, 140, "Espresso, Milk, Ice", "Dairy", "", "Chocolate Brownie"],
  "Caramel Frappe": [0, 380, "Coffee, Milk, Caramel, Ice, Whipped cream", "Dairy", "new", "Chocolate Donut"],
  "Hot Chocolate": [0, 290, "Cocoa, Milk, Sugar", "Dairy", "", "Chocolate Brownie"],
  "Lemon Iced Tea": [0, 90, "Black tea, Lemon, Sugar, Ice", "", "", "Classic Veg Burger, French Fries"],
  "Chocolate Brownie": [0, 360, "Chocolate, Flour, Butter, Egg, Sugar", "Gluten, Dairy, Egg", "bestseller", "Cappuccino, Caffè Latte"],
  "Choco Lava Cake": [0, 340, "Chocolate, Flour, Butter, Egg", "Gluten, Dairy, Egg", "", "Cappuccino"],
  "Blueberry Cheesecake": [0, 410, "Cream cheese, Biscuit base, Blueberry compote", "Gluten, Dairy, Egg", "chef-special", "Caffè Latte"],
  "Chocolate Donut": [0, 260, "Flour, Chocolate icing, Sprinkles, Butter, Egg", "Gluten, Dairy, Egg", "", "Cappuccino"],
  "Chocolate Milkshake": [0, 420, "Milk, Chocolate ice cream, Cocoa", "Dairy", "", "Crispy Chicken Burger, French Fries"],
};
