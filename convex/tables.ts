import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/* ===============================
   BARCHA STOLLARNI OLISH
================================ */
export const getAllTables = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tizimga kirish talab qilinadi");

    // tables jadvalidagi barcha stolni olish, by_account index bilan
    const tables = await ctx.db
      .query("tables")
      .withIndex("by_account", (q) => q.eq("accountId", userId))
      .collect();

    // Har bir stol uchun faol sessionni tekshirish
    const tablesWithStatus = await Promise.all(
      tables.map(async (table) => {
        const activeSession = await ctx.db
          .query("sessions")
          .withIndex("by_account_and_table", (q) =>
            q.eq("accountId", userId).eq("tableId", table._id)
          )
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

/* ===============================
   STOLNI O'CHIRISH
================================ */
export const deleteTable = mutation({
  args: {
    tableId: v.id("tables"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Tizimga kirish talab qilinadi");

    // Stolni olish
    const table = await ctx.db.get(args.tableId);
    if (!table || table.accountId !== userId)
      throw new Error("Stol topilmadi yoki sizga tegishli emas");

    // Bu stolga tegishli faol session bor-yo'qligini tekshirish
    const activeSession = await ctx.db
      .query("sessions")
      .withIndex("by_account_and_table", (q) =>
        q.eq("accountId", userId).eq("tableId", args.tableId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (activeSession)
      throw new Error("Bu stolda faol sessiya mavjud. Avval sessiyani tugating");

    // Stolni o'chirish
    await ctx.db.delete(args.tableId);

    return { success: true };
  },
});
