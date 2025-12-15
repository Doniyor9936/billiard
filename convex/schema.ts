// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // Stollar
  tables: defineTable({
    accountId: v.id("users"),
    name: v.string(),
    isActive: v.boolean(),
    hourlyRate: v.number(),
    createdAt: v.number(),
  }).index("by_account", ["accountId"]),

  // Mijozlar
  customers: defineTable({
    accountId: v.id("users"),
    name: v.string(),
    phone: v.optional(v.string()),
    totalDebt: v.number(),
    cashbackBalance: v.optional(v.number()),
    totalCashbackEarned: v.optional(v.number()),
    totalCashbackSpent: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_account", ["accountId"]),

  // Sessiyalar
  sessions: defineTable({
    accountId: v.id("users"),
    tableId: v.id("tables"),
    customerId: v.optional(v.id("customers")),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    duration: v.optional(v.number()),
    hourlyRate: v.number(),
    gameAmount: v.optional(v.number()),
    additionalAmount: v.optional(v.number()),
    totalAmount: v.optional(v.number()),
    paidAmount: v.optional(v.number()),
    cashbackUsed: v.optional(v.number()),
    debtAmount: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("completed")),
    completedBy: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  })
    .index("by_account_and_table", ["accountId", "tableId"])
    .index("by_account_and_status", ["accountId", "status"])
    .index("by_account_and_customer", ["accountId", "customerId"]),

  // Qo'shimcha buyurtmalar
  additionalOrders: defineTable({
    accountId: v.id("users"),
    sessionId: v.id("sessions"),
    itemName: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    totalPrice: v.number(),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),

  // To‘lovlar
  payments: defineTable({
    accountId: v.id("users"),
    sessionId: v.optional(v.id("sessions")),
    customerId: v.optional(v.id("customers")),
    amount: v.number(),
    paymentType: v.union(v.literal("cash"), v.literal("card"), v.literal("debt_payment")),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),

  // Tariflar tarixi
  rateHistory: defineTable({
    accountId: v.id("users"),
    tableId: v.id("tables"),
    oldRate: v.number(),
    newRate: v.number(),
    changedBy: v.id("users"),
    changedAt: v.number(),
  }).index("by_table", ["tableId"]),

  // Cashback yozuvlari
  cashbacks: defineTable({
    accountId: v.id("users"),
    customerId: v.optional(v.id("customers")),
    amount: v.number(),
    type: v.union(v.literal("earned"), v.literal("spent")),
    source: v.string(),
    sessionId: v.optional(v.id("sessions")),
    description: v.string(),
    expiresAt: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("used"), v.literal("expired")),
    createdAt: v.number(),
  }).index("by_account", ["accountId"]),

  // Cashback sozlamalari
  cashbackSettings: defineTable({
    accountId: v.id("users"),
    percentage: v.number(),
    minAmount: v.number(),
    applyOnDebt: v.boolean(),
    maxUsagePercent: v.number(),
    applyOnExtras: v.boolean(),
    enabled: v.boolean(),
    updatedBy: v.id("users"),
    updatedAt: v.number(),
  }).index("by_account", ["accountId"]),
});
