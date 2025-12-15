import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Barcha stollarni olish
export const getAllTables = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Tizimga kirish talab qilinadi");
    }

    const tables = await ctx.db.query("tables").collect();
    
    // Har bir stol uchun faol sessiyani tekshirish
    const tablesWithStatus = await Promise.all(
      tables.map(async (table) => {
        const activeSession = await ctx.db
          .query("sessions")
          .withIndex("by_table", (q) => q.eq("tableId", table._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .first();

        return {
          ...table,
          isOccupied: !!activeSession,
          activeSession: activeSession || null,
        };
      })
    );

    return tablesWithStatus;
  },
});

// Yangi stol qo'shish
export const createTable = mutation({
  args: {
    name: v.string(),
    hourlyRate: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Tizimga kirish talab qilinadi");
    }

    return await ctx.db.insert("tables", {
      name: args.name,
      hourlyRate: args.hourlyRate,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

// Stol tarifini yangilash
export const updateTableRate = mutation({
  args: {
    tableId: v.id("tables"),
    newRate: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Tizimga kirish talab qilinadi");
    }

    const table = await ctx.db.get(args.tableId);
    if (!table) {
      throw new Error("Stol topilmadi");
    }

    // Tarif tarixini saqlash
    await ctx.db.insert("rateHistory", {
      tableId: args.tableId,
      oldRate: table.hourlyRate,
      newRate: args.newRate,
      changedBy: userId,
      changedAt: Date.now(),
    });

    // Stolni yangilash
    await ctx.db.patch(args.tableId, {
      hourlyRate: args.newRate,
    });

    return { success: true };
  },
});

// Stolni faollashtirish/o'chirish
export const toggleTableStatus = mutation({
  args: {
    tableId: v.id("tables"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Tizimga kirish talab qilinadi");
    }

    const table = await ctx.db.get(args.tableId);
    if (!table) {
      throw new Error("Stol topilmadi");
    }

    await ctx.db.patch(args.tableId, {
      isActive: !table.isActive,
    });

    return { success: true };
  },
});

// Stolni butunlay o'chirish
export const deleteTable = mutation({
  args: {
    tableId: v.id("tables"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Tizimga kirish talab qilinadi");
    }

    const table = await ctx.db.get(args.tableId);
    if (!table) {
      throw new Error("Stol topilmadi");
    }

    // Faol sessiya borligini tekshirish
    const activeSession = await ctx.db
      .query("sessions")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (activeSession) {
      throw new Error("Bu stolda faol sessiya mavjud. Avval sessiyani tugatib, keyin stolni o'chiring");
    }

    // Stolni o'chirish
    await ctx.db.delete(args.tableId);

    return { success: true };
  },
});
