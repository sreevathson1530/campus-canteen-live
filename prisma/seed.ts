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
  { role: "ADMIN", name: "Canteen Admin", email: process.env.ADMIN_EMAIL || "admin@canteen.cit", password: secret("ADMIN_PASSWORD", "admin123"), phone: null },
  { role: "STAFF", name: "Kitchen Staff", email: process.env.STAFF_EMAIL || "kitchen@canteen.cit", password: secret("STAFF_PASSWORD", "kitchen123"), phone: null },
  ...(!isProd || process.env.SEED_DEMO_STUDENTS === "1"
    ? [
        { role: "STUDENT", name: "Asha Raman", email: "asha@canteen.test", password: "student123", phone: "+919000000001" },
        { role: "STUDENT", name: "Ravi Kumar", email: "ravi@canteen.test", password: "student123", phone: "+919000000002" },
        { role: "STUDENT", name: "Meena Iyer", email: "meena@canteen.test", password: "student123", phone: "+919000000003" },
      ]
    : []),
];

import { details, menu, RETIRED } from "./menu-data";

function detailData(name: string) {
  const d = details[name];
  if (!d) return {};
  const [spiceLevel, calories, ingredients, allergens, tags, pairsWith] = d;
  return { spiceLevel, calories, ingredients, allergens: allergens || null, tags, pairsWith };
}

async function main() {
  // The staff logins moved from @canteen.test to @canteen.cit: rename the existing accounts (same
  // password, same history) rather than creating second ones.
  for (const u of users.filter((x) => x.role !== "STUDENT" && x.email.endsWith("@canteen.cit"))) {
    const legacy = u.email.replace(/@canteen\.cit$/, "@canteen.test");
    const [oldUser, newUser] = await Promise.all([
      prisma.user.findUnique({ where: { email: legacy } }),
      prisma.user.findUnique({ where: { email: u.email } }),
    ]);
    if (oldUser && !newUser) {
      await prisma.user.update({ where: { id: oldUser.id }, data: { email: u.email } });
      console.log(`Seed: renamed ${legacy} to ${u.email}.`);
    }
  }

  let createdUsers = 0;
  for (const u of users) {
    if (await prisma.user.findUnique({ where: { email: u.email } })) continue;
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.create({ data: { name: u.name, email: u.email, role: u.role, passwordHash, phone: u.phone } });
    createdUsers++;
  }

  const retired = await prisma.menuItem.updateMany({
    where: { name: { in: RETIRED }, isArchived: false },
    data: { isArchived: true, isAvailable: false },
  });
  if (retired.count) console.log(`Seed: archived ${retired.count} items from the old menu.`);

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
    for (const [name, rupees, isVeg, stock, photo, prepMinutes, description] of items) {
      const existing = await prisma.menuItem.findFirst({ where: { name, categoryId: category.id } });
      const data = {
        name,
        description,
        pricePaise: rupees * 100,
        isVeg,
        stock,
        imageUrl: `/photos/${photo}.webp`,
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
