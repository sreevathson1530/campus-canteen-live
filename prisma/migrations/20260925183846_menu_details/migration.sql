-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pricePaise" INTEGER NOT NULL,
    "isVeg" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "modelKey" TEXT,
    "spiceLevel" INTEGER NOT NULL DEFAULT 0,
    "calories" INTEGER,
    "ingredients" TEXT,
    "allergens" TEXT,
    "tags" TEXT NOT NULL DEFAULT '',
    "pairsWith" TEXT NOT NULL DEFAULT '',
    "prepMinutes" INTEGER NOT NULL DEFAULT 5,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "stock" INTEGER,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MenuItem" ("categoryId", "description", "id", "imageUrl", "isArchived", "isAvailable", "isVeg", "modelKey", "name", "prepMinutes", "pricePaise", "sortOrder", "stock", "updatedAt") SELECT "categoryId", "description", "id", "imageUrl", "isArchived", "isAvailable", "isVeg", "modelKey", "name", "prepMinutes", "pricePaise", "sortOrder", "stock", "updatedAt" FROM "MenuItem";
DROP TABLE "MenuItem";
ALTER TABLE "new_MenuItem" RENAME TO "MenuItem";
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "canteenName" TEXT NOT NULL DEFAULT 'Campus Canteen',
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "closedMessage" TEXT,
    "minutesPerOrder" INTEGER NOT NULL DEFAULT 3,
    "maxActiveOrders" INTEGER NOT NULL DEFAULT 3,
    "openingHours" TEXT NOT NULL DEFAULT 'Mon–Sat · 7:30 AM – 7:30 PM',
    "location" TEXT NOT NULL DEFAULT 'Main Block, Ground Floor',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("canteenName", "closedMessage", "id", "isOpen", "maxActiveOrders", "minutesPerOrder", "updatedAt") SELECT "canteenName", "closedMessage", "id", "isOpen", "maxActiveOrders", "minutesPerOrder", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
