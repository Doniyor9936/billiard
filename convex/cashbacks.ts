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

    const user = await ctx.db.get(userId);
    return {
      balance: user?.cashbackBalance || 0,
      totalEarned: user?.totalCashbackEarned || 0,
      totalSpent: user?.totalCashbackSpent || 0,
    };
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
      .withIndex("by_user", (q) => q.eq("userId", userId))
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

    // Cashback miqdorini hisoblash
    const cashbackAmount = Math.floor(
      (args.sessionAmount * CASHBACK_PERCENTAGE) / 100
    );

    // Minimal miqdordan kam bo'lsa, berilmaydi
    if (cashbackAmount < MIN_CASHBACK_AMOUNT) {
      return null;
    }

    // Amal qilish muddatini hisoblash
    const expiresAt = Date.now() + CASHBACK_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    // Cashback yozuvi yaratish
    const cashbackId = await ctx.db.insert("cashbacks", {
      userId,
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
    const user = await ctx.db.get(userId);
    await ctx.db.patch(userId, {
      cashbackBalance: (user?.cashbackBalance || 0) + cashbackAmount,
      totalCashbackEarned: (user?.totalCashbackEarned || 0) + cashbackAmount,
    });

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

    const user = await ctx.db.get(userId);
    const currentBalance = user?.cashbackBalance || 0;

    // Yetarli balans borligini tekshirish
    if (currentBalance < args.amount) {
      throw new Error("Yetarli cashback balansi yo'q");
    }

    // Cashback ishlatish yozuvi
    const cashbackId = await ctx.db.insert("cashbacks", {
      userId,
      amount: args.amount,
      type: "spent",
      source: "session_payment",
      sessionId: args.sessionId,
      description: `Sessiya to'lovida ishlatildi`,
      status: "used",
      createdAt: Date.now(),
    });

    // Balansni yangilash
    await ctx.db.patch(userId, {
      cashbackBalance: currentBalance - args.amount,
      totalCashbackSpent: (user?.totalCashbackSpent || 0) + args.amount,
    });

    return cashbackId;
  },
});

// Muddati o'tgan cashback'larni tozalash (cron job uchun)
export const expireOldCashbacks = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    const expiredCashbacks = await ctx.db
      .query("cashbacks")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "active"),
          q.lt(q.field("expiresAt"), now)
        )
      )
      .collect();

    for (const cashback of expiredCashbacks) {
      // Statusni o'zgartirish
      await ctx.db.patch(cashback._id, { status: "expired" });

      // Foydalanuvchi balansidan ayirish
      const user = await ctx.db.get(cashback.userId);
      if (user) {
        await ctx.db.patch(cashback.userId, {
          cashbackBalance: Math.max(0, (user.cashbackBalance || 0) - cashback.amount),
        });
      }
    }

    return expiredCashbacks.length;
  },
});