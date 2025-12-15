import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const CASHBACK_EXPIRY_DAYS = 90;

// ======================
// Helper: Sozlamalarni olish yoki yaratish
// ======================
async function getOrCreateSettings(ctx: any, accountId: string, userId: string) {
  let settings = await ctx.db
    .query("cashbackSettings")
    .withIndex("by_account", (q: any) => q.eq("accountId", accountId))
    .first();

  if (!settings) {
    const now = Date.now();
    const defaults = {
      accountId,
      percentage: 5,
      minAmount: 1000,
      applyOnDebt: false,
      maxUsagePercent: 30,
      applyOnExtras: true,
      enabled: true,
      updatedBy: userId,
      updatedAt: now,
    };
    const id = await ctx.db.insert("cashbackSettings", defaults);
    settings = { _id: id, ...defaults };
  }

  return settings;
}

// ======================
// Query: Cashback sozlamalari
// ======================
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const settings = await getOrCreateSettings(ctx, userId, userId);
    return settings;
  },
});

// ======================
// Query: Cashback balans
// ======================
export const getBalance = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const cashbacks = await ctx.db
      .query("cashbacks")
      .withIndex("by_account", (q) => q.eq("accountId", userId))
      .collect();

    const totals = cashbacks.reduce(
      (acc, cb) => {
        if (cb.type === "earned" && cb.status !== "expired") acc.balance += cb.amount;
        if (cb.type === "earned") acc.totalEarned += cb.amount;
        if (cb.type === "spent") {
          acc.balance -= cb.amount;
          acc.totalSpent += cb.amount;
        }
        return acc;
      },
      { balance: 0, totalEarned: 0, totalSpent: 0 }
    );

    return totals;
  },
});

// ======================
// Mutation: Cashback ishlatish
// ======================
export const useCashback = mutation({
  args: { amount: v.number(), sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.accountId !== userId) throw new Error("Sessiya topilmadi");

    if (!session.customerId) throw new Error("Mijoz kerak");

    const customer = await ctx.db.get(session.customerId);
    if (!customer) throw new Error("Mijoz topilmadi");

    const settings = await getOrCreateSettings(ctx, userId, userId);

    const totalAmount = session.totalAmount ?? 0;
    const maxAllowed = Math.min(
      customer.cashbackBalance ?? 0,
      Math.floor((totalAmount * settings.maxUsagePercent) / 100)
    );

    if (args.amount > maxAllowed) throw new Error("Cashbackdan foydalanish limiti oshib ketdi");

    const cashbackId = await ctx.db.insert("cashbacks", {
      accountId: userId,
      customerId: session.customerId,
      amount: args.amount,
      type: "spent",
      source: "session_payment",
      sessionId: args.sessionId,
      description: "Sessiya to‘lovida ishlatildi",
      status: "used",
      createdAt: Date.now(),
    });

    await ctx.db.patch(session.customerId, {
      cashbackBalance: (customer.cashbackBalance || 0) - args.amount,
      totalCashbackSpent: (customer.totalCashbackSpent || 0) + args.amount,
    });

    return cashbackId;
  },
});

// ======================
// Mutation: Cashback qo‘shish (earn)
// ======================
export const addCashback = mutation({
  args: { customerId: v.id("customers"), amount: v.number(), source: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.accountId !== userId) throw new Error("Mijoz topilmadi");

    const cashbackId = await ctx.db.insert("cashbacks", {
      accountId: userId,
      customerId: args.customerId,
      amount: args.amount,
      type: "earned",
      source: args.source,
      description: "Cashback qo‘shildi",
      status: "active",
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.customerId, {
      cashbackBalance: (customer.cashbackBalance || 0) + args.amount,
      totalCashbackEarned: (customer.totalCashbackEarned || 0) + args.amount,
    });

    return cashbackId;
  },
});

// ======================
// Mutation: Cashback sozlamalarini yangilash
// ======================
export const updateSettings = mutation({
  args: {
    enabled: v.boolean(),
    percentage: v.number(),
    minAmount: v.number(),
    applyOnDebt: v.boolean(),
    maxUsagePercent: v.number(),
    applyOnExtras: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const settings = await getOrCreateSettings(ctx, userId, userId);

    await ctx.db.patch(settings._id, {
      enabled: args.enabled,
      percentage: args.percentage,
      minAmount: args.minAmount,
      applyOnDebt: args.applyOnDebt,
      maxUsagePercent: args.maxUsagePercent,
      applyOnExtras: args.applyOnExtras,
      updatedAt: Date.now(),
      updatedBy: userId,
    });

    return { success: true };
  },
});
