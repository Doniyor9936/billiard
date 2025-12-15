import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Stollar jadvali
  tables: defineTable({
    accountId: v.id("users"),
    name: v.string(),
    isActive: v.boolean(),
    hourlyRate: v.number(), // soatlik tarif
    createdAt: v.number(),
  }).index("by_account", ["accountId"]),
  cashbacks: defineTable({
    accountId: v.id("users"),
    customerId: v.optional(v.id("customers")),
    amount: v.number(),
    type: v.union(v.literal("earned"), v.literal("spent")),
    source: v.string(), // "session_payment", "bonus", "refund"
    sessionId: v.optional(v.id("sessions")),
    description: v.string(),
    expiresAt: v.optional(v.number()), // Amal qilish muddati
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("used")),
    createdAt: v.number(),
  })
    .index("by_account", ["accountId"])
    .index("by_account_and_status", ["accountId", "status"])
    .index("by_account_and_customer", ["accountId", "customerId"]),

  // Cashback sozlamalari (akkaunt bo'yicha)
  cashbackSettings: defineTable({
    accountId: v.id("users"),
    percentage: v.number(), // cashback foizi (masalan: 5)
    minAmount: v.number(), // minimal summa, undan kichik bo'lsa cashback berilmaydi
    applyOnDebt: v.boolean(), // qarz bilan yopilgan sessiyalar uchun cashback berilsinmi
    maxUsagePercent: v.number(), // cashbackdan maksimal foydalanish limiti (%)
    applyOnExtras: v.boolean(), // qo'shimcha buyurtmalarga ham cashback berilsinmi
    enabled: v.boolean(), // cashback tizimi yoqilgan/ochirilgan
    updatedAt: v.number(),
  }).index("by_account", ["accountId"]),

  // O'yin sessiyalari
  sessions: defineTable({
    accountId: v.id("users"),
    tableId: v.id("tables"),
    customerId: v.optional(v.id("customers")), // Eski ma'lumotlar uchun optional qilinadi
    startTime: v.number(),
    endTime: v.optional(v.number()),
    duration: v.optional(v.number()), // daqiqalarda
    hourlyRate: v.number(), // sessiya boshlanganidagi tarif
    gameAmount: v.optional(v.number()), // o'yin uchun summa
    additionalAmount: v.optional(v.number()), // qo'shimcha buyurtmalar
    totalAmount: v.optional(v.number()), // umumiy summa
    paidAmount: v.optional(v.number()), // to'langan summa
    cashbackUsed: v.optional(v.number()), // cashback orqali yopilgan summa
    debtAmount: v.optional(v.number()), // qarz summasi
    status: v.union(v.literal("active"), v.literal("completed")),
    completedBy: v.optional(v.id("users")), // sessiyani yakunlagan admin
    notes: v.optional(v.string()),
  })
    .index("by_account_and_table", ["accountId", "tableId"])
    .index("by_account_and_status", ["accountId", "status"])
    .index("by_account_and_customer", ["accountId", "customerId"]),

  // Mijozlar
  customers: defineTable({
    accountId: v.id("users"),
    name: v.string(),
    phone: v.optional(v.string()),
    totalDebt: v.number(),
    createdAt: v.number(),
    cashbackBalance: v.optional(v.number()),
    totalCashbackEarned: v.optional(v.number()),
    totalCashbackSpent: v.optional(v.number()),
  }).index("by_account", ["accountId"]),

  // Qo'shimcha buyurtmalar
  additionalOrders: defineTable({
    accountId: v.id("users"),
    sessionId: v.id("sessions"),
    itemName: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    totalPrice: v.number(),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"])
    .index("by_account", ["accountId"]),

  // To'lovlar tarixi
  payments: defineTable({
    accountId: v.id("users"),
    sessionId: v.optional(v.id("sessions")),
    customerId: v.optional(v.id("customers")),
    amount: v.number(),
    paymentType: v.union(v.literal("cash"), v.literal("card"), v.literal("debt_payment")),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_customer", ["customerId"])
    .index("by_account", ["accountId"]),

  // Tariflar tarixi
  rateHistory: defineTable({
    accountId: v.id("users"),
    tableId: v.id("tables"),
    oldRate: v.number(),
    newRate: v.number(),
    changedBy: v.id("users"),
    changedAt: v.number(),
  })
    .index("by_table", ["tableId"])
    .index("by_account", ["accountId"]),

  // Cashback sozlamalari (akkauntga bir dona yozuv)
  cashbackSettings: defineTable({
    accountId: v.id("users"),
    enabled: v.boolean(),
    percentage: v.number(), // foiz
    minAmount: v.number(), // minimal summa
    applyOnDebt: v.boolean(), // qarzga yozilganda ham berilsinmi
    maxUsagePercent: v.number(), // cashback ishlatish limiti %
    applyOnExtras: v.boolean(), // qo'shimcha buyurtmalarga ham berilsinmi
    updatedBy: v.id("users"),
    updatedAt: v.number(),
  }).index("by_account", ["accountId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
