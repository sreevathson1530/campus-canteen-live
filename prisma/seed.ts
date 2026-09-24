// Idempotent seed: safe to run again; it upserts and never creates orders.
import nextEnv from "@next/env";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

nextEnv.loadEnvConfig(process.cwd());
const prisma = new PrismaClient();

const users = [
  { role: "ADMIN", name: "Canteen Admin", email: "admin@canteen.test", password: "admin123", phone: null },
  { role: "STAFF", name: "Kitchen Staff", email: "kitchen@canteen.test", password: "kitchen123", phone: null },
  { role: "STUDENT", name: "Asha Raman", email: "asha@canteen.test", password: "student123", phone: "+919000000001" },
  { role: "STUDENT", name: "Ravi Kumar", email: "ravi@canteen.test", password: "student123", phone: "+919000000002" },
  { role: "STUDENT", name: "Meena Iyer", email: "meena@canteen.test", password: "student123", phone: "+919000000003" },
] as const;

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

async function main() {
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, phone: u.phone },
      create: { name: u.name, email: u.email, role: u.role, passwordHash, phone: u.phone },
    });
  }

  let catOrder = 0;
  let itemCount = 0;
  for (const [catName, items] of Object.entries(menu)) {
    const category = await prisma.category.upsert({
      where: { name: catName },
      update: { sortOrder: catOrder },
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
      if (existing) await prisma.menuItem.update({ where: { id: existing.id }, data });
      else await prisma.menuItem.create({ data });
      itemCount++;
    }
  }

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, canteenName: "Campus Canteen", isOpen: true, minutesPerOrder: 3, maxActiveOrders: 3 },
  });

  console.log(`Seeded ${users.length} users, ${catOrder} categories, ${itemCount} items and settings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
