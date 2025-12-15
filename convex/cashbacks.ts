// ============================================
// FAYL 1: convex/cashbacks.ts
// ============================================

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Sozlamalar
const CASHBACK_PERCENTAGE = 5; // 5% cashback
const MIN_CASHBACK_AMOUNT = 1000; // Minimal 1000 so'm
const CASHBACK_EXPIRY_DAYS = 90; // 90 kun amal qiladi

// Cashback balansini olish
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
        if (cb.type === "earned" && cb.status !== "expired") {
          acc.balance += cb.amount;
          acc.totalEarned += cb.amount;
        }
        if (cb.type === "spent") {
          acc.balance -= cb.amount;
          acc.totalSpent += cb.amount;
        }
        return acc;
      },
      { balance: 0, totalEarned: 0, totalSpent: 0 },
    );

    return totals;
  },
});

// Cashback tarixini olish
export const getHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const cashbacks = await ctx.db
      .query("cashbacks")
      .withIndex("by_account", (q) => q.eq("accountId", userId))
      .order("desc")
      .take(args.limit || 50);

    return cashbacks;
  },
});

// Sessiya to'lovidan cashback berish
export const earnFromSession = mutation({
  args: {
    sessionId: v.id("sessions"),
    sessionAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.accountId !== userId) {
      throw new Error("Sessiya topilmadi yoki ruxsat yo'q");
    }

    if (!session.customerId) {
      throw new Error("Sessiya uchun mijoz talab qilinadi");
    }

    // Cashback miqdorini hisoblash
    const cashbackAmount = Math.floor((args.sessionAmount * CASHBACK_PERCENTAGE) / 100);

    // Minimal miqdordan kam bo'lsa, berilmaydi
    if (cashbackAmount < MIN_CASHBACK_AMOUNT) {
      return null;
    }

    // Amal qilish muddatini hisoblash
    const expiresAt = Date.now() + CASHBACK_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    // Cashback yozuvi yaratish
    const cashbackId = await ctx.db.insert("cashbacks", {
      accountId: userId,
      customerId: session.customerId,
      amount: cashbackAmount,
      type: "earned",
      source: "session_payment",
      sessionId: args.sessionId,
      description: `${CASHBACK_PERCENTAGE}% cashback (${args.sessionAmount.toLocaleString()} so'mdan)`,
      expiresAt,
      status: "active",
      createdAt: Date.now(),
    });

    // Foydalanuvchi balansini yangilash
    const customer = await ctx.db.get(session.customerId);
    if (customer) {
      await ctx.db.patch(session.customerId, {
        cashbackBalance: (customer.cashbackBalance || 0) + cashbackAmount,
        totalCashbackEarned: (customer.totalCashbackEarned || 0) + cashbackAmount,
      });
    }

    return cashbackId;
  },
});

// Cashback ishlatish (to'lovda)
export const useCashback = mutation({
  args: {
    amount: v.number(),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.accountId !== userId) {
      throw new Error("Sessiya topilmadi yoki ruxsat yo'q");
    }

    if (!session.customerId) {
      throw new Error("Mijoz talab qilinadi");
    }

    const customer = await ctx.db.get(session.customerId);
    const currentBalance = customer?.cashbackBalance || 0;

    // Yetarli balans borligini tekshirish
    if (currentBalance < args.amount) {
      throw new Error("Yetarli cashback balansi yo'q");
    }

    // Cashback ishlatish yozuvi
    const cashbackId = await ctx.db.insert("cashbacks", {
      accountId: userId,
      customerId: session.customerId,
      amount: args.amount,
      type: "spent",
      source: "session_payment",
      sessionId: args.sessionId,
      description: `Sessiya to'lovida ishlatildi`,
      status: "used",
      createdAt: Date.now(),
    });

    // Balansni yangilash
    await ctx.db.patch(session.customerId, {
      cashbackBalance: currentBalance - args.amount,
      totalCashbackSpent: (customer?.totalCashbackSpent || 0) + args.amount,
    });

    return cashbackId;
  },
});

// Muddati o'tgan cashback'larni tozalash (cron job uchun)
export const expireOldCashbacks = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const now = Date.now();
    
    const expiredCashbacks = await ctx.db
      .query("cashbacks")
      .withIndex("by_account_and_status", (q) =>
        q.eq("accountId", userId).eq("status", "active"),
      )
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const cashback of expiredCashbacks) {
      // Statusni o'zgartirish
      await ctx.db.patch(cashback._id, { status: "expired" });

      // Foydalanuvchi balansidan ayirish
      if (cashback.customerId) {
        const customer = await ctx.db.get(cashback.customerId);
        if (customer) {
          await ctx.db.patch(cashback.customerId, {
            cashbackBalance: Math.max(0, (customer.cashbackBalance || 0) - cashback.amount),
          });
        }
      }
    }

    return expiredCashbacks.length;
  },
});