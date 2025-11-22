// prisma/seed.ts
import "dotenv/config";
import { PrismaClient, StoreQuestionType } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required for Prisma.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// ===============================
// Config default questions
// ===============================

const storeQuestionTemplates = [
  {
    key: "waste_types",
    label: "ขยะหรือของเสียของร้านมีอะไรบ้าง",
    description: "เลือกได้หลายข้อ",
    type: StoreQuestionType.MULTI_SELECT,
    order: 1,
    options: [
      { value: "food_waste", label: "เศษอาหาร" },
      { value: "plastic", label: "พลาสติก / ถุงพลาสติก" },
      { value: "oil", label: "น้ำมันใช้แล้ว" },
      { value: "waste_water", label: "น้ำเสียจากการล้างจาน/เตรียมอาหาร" },
      { value: "packaging", label: "บรรจุภัณฑ์ใช้แล้ว (แก้ว/กล่อง)" },
      { value: "other", label: "อื่น ๆ" },
    ],
  },
  {
    key: "waste_management",
    label: "แนวทางการจัดการขยะหรือของเสียข้างต้น",
    description: "อธิบายวิธีจัดการขยะ ของเสีย และการแยก/กำจัด",
    type: StoreQuestionType.TEXT,
    order: 2,
    options: undefined,
  },
  {
    key: "equipment",
    label: "อุปกรณ์ไฟฟ้าและอุปกรณ์ในครัวที่คาดว่าจะใช้",
    description: "เลือกอุปกรณ์หลักที่ใช้ประจำ เลือกได้หลายข้อ",
    type: StoreQuestionType.MULTI_SELECT,
    order: 3,
    options: [
      { value: "electric_stove", label: "เตาไฟฟ้า" },
      { value: "gas_stove", label: "เตาแก๊ส" },
      { value: "induction_stove", label: "เตาแม่เหล็กไฟฟ้า" },
      { value: "rice_cooker", label: "หม้อหุงข้าว" },
      { value: "fridge", label: "ตู้เย็น / ตู้แช่" },
      { value: "microwave", label: "เตาไมโครเวฟ" },
      { value: "blender", label: "เครื่องปั่น" },
      { value: "other", label: "อื่น ๆ" },
    ],
  },
] as const;

async function main() {
  console.log("Seeding store question templates...");

  for (const tpl of storeQuestionTemplates) {
    await prisma.storeQuestionTemplate.upsert({
      where: { key: tpl.key },
      create: {
        key: tpl.key,
        label: tpl.label,
        description: tpl.description ?? null,
        type: tpl.type,
        order: tpl.order ?? null,
        isActive: true,
        // options เป็น JSON → Prisma รับ object/array ได้ตรง ๆ
        options: tpl.options as any,
      },
      update: {
        label: tpl.label,
        description: tpl.description ?? null,
        type: tpl.type,
        order: tpl.order ?? null,
        isActive: true,
        options: tpl.options as any,
      },
    });
  }

  console.log("✅ Seeded store question templates successfully");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
