-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "allergens" TEXT,
ADD COLUMN     "calories" INTEGER,
ADD COLUMN     "ingredients" TEXT,
ADD COLUMN     "pairsWith" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "spiceLevel" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tags" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "location" TEXT NOT NULL DEFAULT 'Main Block, Ground Floor',
ADD COLUMN     "openingHours" TEXT NOT NULL DEFAULT 'Mon–Sat · 7:30 AM – 7:30 PM';

