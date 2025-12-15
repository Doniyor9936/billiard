import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Stollar jadvali
  tables: defineTable({
    name: v.string(),
    isActive: v.boolean(),
    hourlyRate: v.number(), // soatlik tarif
    createdAt: v.number(),
  }),
  cashbacks: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    type: v.union(v.literal("earned"), v.literal("spent")),
    source: v.string(), // "session_payment", "bonus", "refund"
    sessionId: v.optional(v.id("sessions")),
    description: v.string(),
    expiresAt: v.optional(v.number()), // Amal qilish muddati
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("used")),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"]),
  
  // Users jadvaliga qo'shing:
  cashbackBalance: v.optional(v.number()), // Joriy balans
  totalCashbackEarned: v.optional(v.number()), // Jami topilgan
  totalCashbackSpent: v.optional(v.number()), // Jami ishlatilgan

  // O'yin sessiyalari
  sessions: defineTable({
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
    debtAmount: v.optional(v.number()), // qarz summasi
    status: v.union(v.literal("active"), v.literal("completed")),
    completedBy: v.optional(v.id("users")), // sessiyani yakunlagan admin
    notes: v.optional(v.string()),
  })
    .index("by_table", ["tableId"])
    .index("by_status", ["status"])
    .index("by_customer", ["customerId"]),

  // Mijozlar
  customers: defineTable({
    name: v.string(),
    phone: v.optional(v.string()),
    totalDebt: v.number(),
    createdAt: v.number(),
  }),

  // Qo'shimcha buyurtmalar
  additionalOrders: defineTable({
    sessionId: v.id("sessions"),
    itemName: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    totalPrice: v.number(),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),

  // To'lovlar tarixi
  payments: defineTable({
    sessionId: v.optional(v.id("sessions")),
    customerId: v.optional(v.id("customers")),
    amount: v.number(),
    paymentType: v.union(v.literal("cash"), v.literal("card"), v.literal("debt_payment")),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_customer", ["customerId"]),

  // Tariflar tarixi
  rateHistory: defineTable({
    tableId: v.id("tables"),
    oldRate: v.number(),
    newRate: v.number(),
    changedBy: v.id("users"),
    changedAt: v.number(),
  }).index("by_table", ["tableId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
