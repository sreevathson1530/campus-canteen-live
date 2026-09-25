// Idempotent seed: creates only what's missing (never overwrites menu edits or stock) and never creates orders.
// Production (NODE_ENV=production) requires ADMIN_PASSWORD and STAFF_PASSWORD, and skips the demo
// students, whose made-up phone numbers must never receive real SMS.
import nextEnv from "@next/env";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

nextEnv.loadEnvConfig(process.cwd());
const prisma = new PrismaClient();
const isProd = process.env.NODE_ENV === "production";

function secret(name: string, devDefault: string): string {
  const v = process.env[name];
  if (v) {
    if (v.length < 8) throw new Error(`${name} must be at least 8 characters`);
    return v;
  }
  if (isProd) throw new Error(`${name} is required in production`);
  return devDefault;
}

type SeedUser = { role: string; name: string; email: string; password: string; phone: string | null };

const users: SeedUser[] = [
  { role: "ADMIN", name: "Canteen Admin", email: process.env.ADMIN_EMAIL || "admin@canteen.test", password: secret("ADMIN_PASSWORD", "admin123"), phone: null },
  { role: "STAFF", name: "Kitchen Staff", email: process.env.STAFF_EMAIL || "kitchen@canteen.test", password: secret("STAFF_PASSWORD", "kitchen123"), phone: null },
  ...(!isProd || process.env.SEED_DEMO_STUDENTS === "1"
    ? [
        { role: "STUDENT", name: "Asha Raman", email: "asha@canteen.test", password: "student123", phone: "+919000000001" },
        { role: "STUDENT", name: "Ravi Kumar", email: "ravi@canteen.test", password: "student123", phone: "+919000000002" },
        { role: "STUDENT", name: "Meena Iyer", email: "meena@canteen.test", password: "student123", phone: "+919000000003" },
      ]
    : []),
];

type SeedItem = [name: string, rupees: number, isVeg: boolean, stock: number | null, modelKey: string, prep: number, desc: string];

const menu: Record<string, SeedItem[]> = {
  Breakfast: [
    ["Idli (2 pcs)", 30, true, null, "idli", 3, "Soft steamed rice cakes with sambar and coconut chutney."],
    ["Masala Dosa", 50, true, null, "masala-dosa", 6, "Crisp rice-lentil crepe with spiced potato, sambar and chutney."],
    ["Pongal", 40, true, null, "pongal", 4, "Ghee-rich rice and moong dal with pepper and cumin."],
    ["Poori Masala", 45, true, null, "poori", 5, "Puffed wheat pooris with potato masala."],
  ],
  Meals: [
    ["Veg Meals", 70, true, 40, "veg-meals", 5, "Rice, sambar, rasam, poriyal, curd and papad."],
    ["Curd Rice", 40, true, null, "curd-rice", 3, "Cool curd rice tempered with mustard and curry leaves."],
    ["Lemon Rice", 40, true, null, "lemon-rice", 3, "Tangy lemon rice with peanuts."],
    ["Chicken Biryani", 110, false, 25, "biryani", 8, "Fragrant seeraga samba biryani with raita."],
    ["Egg Fried Rice", 80, false, null, "egg-fried-rice", 7, "Wok-tossed rice with egg and vegetables."],
  ],
  Snacks: [
    ["Samosa", 15, true, 20, "samosa", 2, "Crisp pastry stuffed with spiced potato."],
    ["Veg Puff", 20, true, 15, "veg-puff", 2, "Flaky puff pastry with vegetable masala."],
    ["Egg Puff", 25, false, 12, "egg-puff", 2, "Flaky puff pastry with a spiced egg."],
    ["Onion Bajji", 25, true, null, "onion-bajji", 4, "Gram-flour fritters of sliced onion."],
  ],
  Beverages: [
    ["Filter Coffee", 15, true, null, "filter-coffee", 2, "Strong decoction coffee with frothy milk."],
    ["Tea", 12, true, null, "tea", 2, "Hot ginger masala chai."],
    ["Fresh Lime Juice", 25, true, null, "lime-juice", 2, "Freshly squeezed lime, sweet or salted."],
  ],
};

// Dish details: [spice 0-3, kcal, ingredients, allergens, tags, pairs-with]. Filled on first seed, and
// back-filled once onto existing items that have none yet (admin edits are never overwritten).
type Details = [spice: number, kcal: number, ingredients: string, allergens: string, tags: string, pairsWith: string];
const details: Record<string, Details> = {
  "Idli (2 pcs)": [0, 160, "Rice, Urad dal, Sambar, Coconut chutney", "", "bestseller", "Filter Coffee, Samosa"],
  "Masala Dosa": [1, 380, "Rice, Urad dal, Potato, Onion, Mustard, Curry leaves", "", "bestseller", "Filter Coffee, Tea"],
  "Pongal": [1, 330, "Rice, Moong dal, Ghee, Pepper, Cumin, Cashew", "Dairy, Nuts", "", "Filter Coffee, Idli (2 pcs)"],
  "Poori Masala": [1, 420, "Wheat flour, Potato, Onion, Green chilli", "Gluten", "", "Tea, Filter Coffee"],
  "Veg Meals": [2, 650, "Rice, Sambar, Rasam, Poriyal, Curd, Papad", "Dairy", "chef-special", "Fresh Lime Juice"],
  "Curd Rice": [0, 300, "Rice, Curd, Mustard, Curry leaves, Ginger", "Dairy", "", "Onion Bajji"],
  "Lemon Rice": [1, 340, "Rice, Lemon, Peanuts, Turmeric, Curry leaves", "Peanuts", "", "Curd Rice, Fresh Lime Juice"],
  "Chicken Biryani": [2, 720, "Seeraga samba rice, Chicken, Spices, Mint, Raita", "Dairy", "bestseller", "Fresh Lime Juice, Egg Puff"],
  "Egg Fried Rice": [1, 560, "Rice, Egg, Carrot, Beans, Soy sauce", "Egg, Soy", "new", "Fresh Lime Juice"],
  "Samosa": [2, 260, "Wheat flour, Potato, Peas, Spices", "Gluten", "", "Tea, Filter Coffee"],
  "Veg Puff": [1, 280, "Puff pastry, Mixed vegetables, Spices", "Gluten, Dairy", "", "Tea"],
  "Egg Puff": [1, 300, "Puff pastry, Egg, Onion masala", "Gluten, Dairy, Egg", "new", "Tea"],
  "Onion Bajji": [2, 240, "Onion, Gram flour, Chilli powder", "", "", "Tea, Filter Coffee"],
  "Filter Coffee": [0, 110, "Coffee decoction, Milk, Sugar", "Dairy", "bestseller", "Idli (2 pcs), Masala Dosa"],
  "Tea": [0, 90, "Tea, Milk, Ginger, Sugar", "Dairy", "", "Samosa, Onion Bajji"],
  "Fresh Lime Juice": [0, 80, "Lime, Sugar, Salt, Water", "", "", "Chicken Biryani, Veg Meals"],
};

function detailData(name: string) {
  const d = details[name];
  if (!d) return {};
  const [spiceLevel, calories, ingredients, allergens, tags, pairsWith] = d;
  return { spiceLevel, calories, ingredients, allergens: allergens || null, tags, pairsWith };
}

async function main() {
  let createdUsers = 0;
  for (const u of users) {
    if (await prisma.user.findUnique({ where: { email: u.email } })) continue;
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.create({ data: { name: u.name, email: u.email, role: u.role, passwordHash, phone: u.phone } });
    createdUsers++;
  }

  let catOrder = 0;
  let itemCount = 0;
  for (const [catName, items] of Object.entries(menu)) {
    const category = await prisma.category.upsert({
      where: { name: catName },
      update: {},
      create: { name: catName, sortOrder: catOrder },
    });
    catOrder++;
    let sort = 0;
    for (const [name, rupees, isVeg, stock, modelKey, prepMinutes, description] of items) {
      const existing = await prisma.menuItem.findFirst({ where: { name, categoryId: category.id } });
      const data = {
        name,
        description,
        pricePaise: rupees * 100,
        isVeg,
        stock,
        modelKey,
        imageUrl: `/photos/${modelKey}.webp`, // real photo; the 3D still is derived from modelKey
        prepMinutes,
        sortOrder: sort++,
        categoryId: category.id,
      };
      if (!existing) {
        await prisma.menuItem.create({ data: { ...data, ...detailData(name) } });
        itemCount++;
      } else if (existing.calories === null && existing.ingredients === null && existing.tags === "") {
        await prisma.menuItem.update({ where: { id: existing.id }, data: detailData(name) });
      }
    }
  }

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, canteenName: "Campus Canteen", isOpen: true, minutesPerOrder: 3, maxActiveOrders: 3 },
  });

  console.log(`Seed: ${createdUsers} new users, ${itemCount} new menu items (existing data left untouched).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
