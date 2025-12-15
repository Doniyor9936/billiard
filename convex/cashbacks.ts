// ============================================
// FAYL 1: convex/cashbacks.ts
// ============================================

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Umumiy sozlama: cashback yozuvlari uchun amal qilish muddati
const CASHBACK_EXPIRY_DAYS = 90; // 90 kun amal qiladi

// Ichki yordamchi: joriy akkaunt uchun cashback sozlamalarini olish yoki yaratish
async function getOrCreateSettings(ctx: any, accountId: string) {
  const existing = await ctx.db
    .query("cashbackSettings")
    .withIndex("by_account", (q: any) => q.eq("accountId", accountId))
    .first();

  if (existing) return existing;

  const now = Date.now();
  const defaults = {
    accountId,
    percentage: 5,
    minAmount: 1000,
    applyOnDebt: false,
    maxUsagePercent: 30,
    applyOnExtras: true,
    enabled: true,
    updatedAt: now,
  };

  const id = await ctx.db.insert("cashbackSettings", defaults);
  return { _id: id, ...defaults };
}

// Cashback balansini olish
export const getBalance = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Asosiy (yangi) yozuvlar
    const cashbacks = await ctx.db
      .query("cashbacks")
      .withIndex("by_account", (q) => q.eq("accountId", userId))
      .collect();

    // Legacy (accountId bo'lmagan eski yozuvlar) uchun zaxira
    const legacyCashbacks = await ctx.db
      .query("cashbacks")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    const allCashbacks = [...cashbacks, ...legacyCashbacks];

    const totals = allCashbacks.reduce(
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

// Cashback sozlamalarini olish
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tizimga kirish talab qilinadi");

    const settings = await getOrCreateSettings(ctx, userId);
    return settings;
  },
});

// Cashback sozlamalarini yangilash
export const updateSettings = mutation({
  args: {
    percentage: v.number(),
    minAmount: v.number(),
    applyOnDebt: v.boolean(),
    maxUsagePercent: v.number(),
    applyOnExtras: v.boolean(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tizimga kirish talab qilinadi");

    const existing = await ctx.db
      .query("cashbackSettings")
      .withIndex("by_account", (q) => q.eq("accountId", userId))
      .first();

    const updatedAt = Date.now();

    if (!existing) {
      await ctx.db.insert("cashbackSettings", {
        accountId: userId,
        ...args,
        updatedAt,
      });
    } else {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt,
      });
    }

    return { success: true };
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

    const limit = args.limit || 50;

    // Asosiy (yangi) yozuvlar
    const cashbacks = await ctx.db
      .query("cashbacks")
      .withIndex("by_account", (q) => q.eq("accountId", userId))
      .order("desc")
      .take(limit);

    // Legacy (accountId bo'lmagan eski yozuvlar) uchun zaxira
    const legacyCashbacks = await ctx.db
      .query("cashbacks")
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("desc")
      .take(limit);

    // Birlashtirish va so'nggi limitni olish
    const combined = [...cashbacks, ...legacyCashbacks]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, limit);

    return combined;
  },
});

// Sessiya to'lovidan cashback berish
export const earnFromSession = mutation({
  args: {
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
      throw new Error("Sessiya uchun mijoz talab qilinadi");
    }

    // Joriy akkaunt uchun cashback sozlamalarini olish
    const settings = await getOrCreateSettings(ctx, userId);

    // Cashback tizimi o'chirilgan bo'lsa, hech narsa qilmaymiz
    if (!settings.enabled) {
      return null;
    }

    const paidAmount = session.paidAmount ?? 0;
    const totalAmount = session.totalAmount ?? 0;
    const gameAmount = session.gameAmount ?? 0;
    const debtAmount = session.debtAmount ?? 0;

    // To'lov bo'lmasa cashback yo'q
    if (paidAmount <= 0) {
      return null;
    }

    // Agar sozlamada qarzga yozilgan sessiyalar uchun cashback berilmasin deyilgan bo'lsa,
    // va sessiyada qarz mavjud bo'lsa, cashback bermaymiz
    if (!settings.applyOnDebt && debtAmount > 0) {
      return null;
    }

    // Cashback bazasi: faqat haqiqatan to'langan summa
    let baseAmount = paidAmount;

    // Agar cashback faqat o'yin qismiga berilsa, paidAmountni o'yin / umumiy nisbatiga ko'paytiramiz
    if (!settings.applyOnExtras && totalAmount > 0 && gameAmount > 0) {
      baseAmount = Math.floor((paidAmount * gameAmount) / totalAmount);
    }

    if (baseAmount <= 0) {
      return null;
    }

    // Cashback miqdorini hisoblash
    const cashbackAmount = Math.floor(
      (baseAmount * settings.percentage) / 100,
    );

    // Minimal miqdordan kam bo'lsa, berilmaydi
    if (cashbackAmount < settings.minAmount) {
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
      description: `${settings.percentage}% cashback (${baseAmount.toLocaleString()} so'mdan)`,
      expiresAt,
      status: "active",
      createdAt: Date.now(),
    });

    // Mijoz cashback balansini yangilash
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

    // Joriy akkaunt uchun cashback sozlamalarini olish
    const settings = await getOrCreateSettings(ctx, userId);

    if (!settings.enabled) {
      throw new Error("Cashback tizimi o'chirilgan");
    }

    // Maksimal foydalanish limiti: sessiya umumiy summasining foizidan oshmasin
    const totalAmount = session.totalAmount ?? 0;
    const maxUsagePercent = settings.maxUsagePercent ?? 0;
    const maxByPercent =
      totalAmount > 0 ? Math.floor((totalAmount * maxUsagePercent) / 100) : 0;

    const customer = await ctx.db.get(session.customerId);
    const currentBalance = customer?.cashbackBalance || 0;

    const maxAllowed = Math.min(
      currentBalance,
      maxByPercent > 0 ? maxByPercent : currentBalance,
    );

    if (args.amount > maxAllowed) {
      throw new Error(
        `Cashbackdan foydalanish limiti oshib ketdi (maks: ${maxAllowed.toLocaleString()} so'm)`,
      );
    }

    // Yetarli balans borligini tekshirish (qo'shimcha)
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