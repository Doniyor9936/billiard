import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

export function SettingsView() {
  const tables = useQuery(api.tables.getAllTables);
  const cashbackSettings = useQuery(api.cashbacks.getSettings);
  const createTable = useMutation(api.tables.createTable);
  const updateTableRate = useMutation(api.tables.updateTableRate);
  const toggleTableStatus = useMutation(api.tables.toggleTableStatus);
  const deleteTable = useMutation(api.tables.deleteTable);
  const updateCashbackSettings = useMutation(api.cashbacks.updateSettings);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableRate, setNewTableRate] = useState(0);
  const [isAdding, setIsAdding] = useState(false);

  // Cashback sozlamalari form holati
  const [cbEnabled, setCbEnabled] = useState(true);
  const [cbPercent, setCbPercent] = useState(5);
  const [cbMinAmount, setCbMinAmount] = useState(1000);
  const [cbApplyOnDebt, setCbApplyOnDebt] = useState(false);
  const [cbMaxUsagePercent, setCbMaxUsagePercent] = useState(30);
  const [cbApplyOnExtras, setCbApplyOnExtras] = useState(true);
  const [isSavingCb, setIsSavingCb] = useState(false);

  // Mavjud stollar ro'yxati
  const availableTableNames = [
    "Stol 1", "Stol 2", "Stol 3", "Stol 4", "Stol 5",
    "Stol 6", "Stol 7", "Stol 8", "Stol 9", "Stol 10",
    "VIP Stol 1", "VIP Stol 2", "VIP Stol 3"
  ];

  // Allaqachon ishlatilgan stol nomlarini topish
  const usedTableNames = tables?.map(table => table.name) || [];
  const availableNames = availableTableNames.filter(name => !usedTableNames.includes(name));

  const [editingTable, setEditingTable] = useState<{
    id: Id<"tables">;
    name: string;
    currentRate: number;
  } | null>(null);
  const [newRate, setNewRate] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName || newTableRate <= 0) {
      toast.error("Barcha maydonlarni to'g'ri to'ldiring");
      return;
    }

    if (usedTableNames.includes(newTableName)) {
      toast.error("Bu stol nomi allaqachon ishlatilgan");
      return;
    }

    try {
      setIsAdding(true);
      await createTable({
        name: newTableName,
        hourlyRate: newTableRate,
      });
      toast.success("Stol muvaffaqiyatli qo'shildi");
      setNewTableName("");
      setNewTableRate(0);
      setShowAddForm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xatolik yuz berdi");
    } finally {
      setIsAdding(false);
    }
  };

  const handleSaveCashbackSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cbPercent < 0 || cbPercent > 100) {
      toast.error("Cashback foizi 0 va 100 orasida bo'lishi kerak");
      return;
    }

    if (cbMaxUsagePercent < 0 || cbMaxUsagePercent > 100) {
      toast.error("Maksimal cashback ishlatish foizi 0 va 100 orasida bo'lishi kerak");
      return;
    }

    if (cbMinAmount < 0) {
      toast.error("Minimal summa manfiy bo'lishi mumkin emas");
      return;
    }

    try {
      setIsSavingCb(true);
      await updateCashbackSettings({
        percentage: cbPercent,
        minAmount: cbMinAmount,
        applyOnDebt: cbApplyOnDebt,
        maxUsagePercent: cbMaxUsagePercent,
        applyOnExtras: cbApplyOnExtras,
        enabled: cbEnabled,
      });
      toast.success("Cashback sozlamalari saqlandi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xatolik yuz berdi");
    } finally {
      setIsSavingCb(false);
    }
  };

  const handleUpdateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable || newRate <= 0) {
      toast.error("Yangi tarif 0 dan katta bo'lishi kerak");
      return;
    }

    try {
      setIsUpdating(true);
      await updateTableRate({
        tableId: editingTable.id,
        newRate,
      });
      toast.success("Tarif muvaffaqiyatli yangilandi");
      setEditingTable(null);
      setNewRate(0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xatolik yuz berdi");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleStatus = async (tableId: Id<"tables">) => {
    try {
      await toggleTableStatus({ tableId });
      toast.success("Stol holati o'zgartirildi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xatolik yuz berdi");
    }
  };

  const handleDeleteTable = async (tableId: Id<"tables">) => {
    if (!confirm("Bu stolni butunlay o'chirishni xohlaysizmi? Bu amalni bekor qilib bo'lmaydi.")) {
      return;
    }

    try {
      await deleteTable({ tableId });
      toast.success("Stol muvaffaqiyatli o'chirildi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xatolik yuz berdi");
    }
  };

  // Cashback sozlamalari kelganda form holatini sinxronlashtirish
  if (cashbackSettings && !isSavingCb) {
    // Bu komponent har renderda ishlamasligi uchun faqat birinchi yuklanishda ishlatilishi kerak,
    // ammo soddalik uchun faqat qiymatlar bo'sh bo'lganda yangilaymiz.
    if (cbPercent === 5 && cbMinAmount === 1000 && cbMaxUsagePercent === 30) {
      setCbEnabled(cashbackSettings.enabled ?? true);
      setCbPercent(cashbackSettings.percentage ?? 5);
      setCbMinAmount(cashbackSettings.minAmount ?? 1000);
      setCbApplyOnDebt(cashbackSettings.applyOnDebt ?? false);
      setCbMaxUsagePercent(cashbackSettings.maxUsagePercent ?? 30);
      setCbApplyOnExtras(cashbackSettings.applyOnExtras ?? true);
    }
  }

  if (!tables) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sozlamalar</h1>
        <button
          onClick={() => setShowAddForm(true)}
          disabled={availableNames.length === 0}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {availableNames.length === 0 ? "Barcha stollar qo'shilgan" : "Yangi Stol Qo'shish"}
        </button>
      </div>

      {/* Cashback sozlamalari */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Cashback Sozlamalari</h2>
            <p className="text-sm text-gray-500">
              Mijozlar uchun bonus (cashback) qoidalarini sozlang
            </p>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <span className="mr-2 text-sm text-gray-700">Cashback tizimi</span>
            <button
              type="button"
              onClick={() => setCbEnabled(!cbEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                cbEnabled ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  cbEnabled ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        </div>
        <form onSubmit={handleSaveCashbackSettings} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cashback foizi (%)
            </label>
            <input
              type="number"
              value={cbPercent}
              onChange={(e) => setCbPercent(Math.max(0, Math.min(100, parseInt(e.target.value || "0", 10))))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={0}
              max={100}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimal summa (so'm)
            </label>
            <input
              type="number"
              value={cbMinAmount}
              onChange={(e) => setCbMinAmount(Math.max(0, parseInt(e.target.value || "0", 10)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cashbackdan maksimal foydalanish (%)
            </label>
            <input
              type="number"
              value={cbMaxUsagePercent}
              onChange={(e) =>
                setCbMaxUsagePercent(
                  Math.max(0, Math.min(100, parseInt(e.target.value || "0", 10))),
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={0}
              max={100}
            />
            <p className="mt-1 text-xs text-gray-500">
              Masalan, 30% bo'lsa, sessiya summasining maksimal 30% qismi cashback bilan yopiladi.
            </p>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Qoidalar
            </label>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={cbApplyOnDebt}
                onChange={(e) => setCbApplyOnDebt(e.target.checked)}
              />
              <span>Qarzga yozilgan sessiyalar uchun ham cashback berilsin</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={cbApplyOnExtras}
                onChange={(e) => setCbApplyOnExtras(e.target.checked)}
              />
              <span>Qo'shimcha buyurtmalar uchun ham cashback hisoblasin</span>
            </label>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={isSavingCb}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isSavingCb ? "Saqlanmoqda..." : "Cashback sozlamalarini saqlash"}
            </button>
          </div>
        </form>
      </div>

      {/* Stollar boshqaruvi */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Stollar Boshqaruvi</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stol nomi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Soatlik tarif
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Holati
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Band/Bo'sh
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amallar
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tables.map((table) => (
                <tr key={table._id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {table.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {table.hourlyRate.toLocaleString()} so'm
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      table.isActive 
                        ? "bg-green-100 text-green-800" 
                        : "bg-red-100 text-red-800"
                    }`}>
                      {table.isActive ? "Faol" : "Faol emas"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      table.isOccupied 
                        ? "bg-red-100 text-red-800" 
                        : "bg-green-100 text-green-800"
                    }`}>
                      {table.isOccupied ? "Band" : "Bo'sh"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => {
                        setEditingTable({
                          id: table._id,
                          name: table.name,
                          currentRate: table.hourlyRate,
                        });
                        setNewRate(table.hourlyRate);
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                      disabled={table.isOccupied}
                    >
                      Tarifni O'zgartirish
                    </button>
                    <button
                      onClick={() => handleToggleStatus(table._id)}
                      className={`font-medium ${
                        table.isActive 
                          ? "text-red-600 hover:text-red-800" 
                          : "text-green-600 hover:text-green-800"
                      }`}
                      disabled={table.isOccupied}
                    >
                      {table.isActive ? "O'chirish" : "Faollashtirish"}
                    </button>
                    <button
                      onClick={() => handleDeleteTable(table._id)}
                      className="text-red-600 hover:text-red-800 font-medium"
                      disabled={table.isOccupied}
                    >
                      Butunlay O'chirish
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tables.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">Hozircha stollar yo'q</div>
            <div className="text-gray-400 text-sm mt-2">
              Birinchi stolni qo'shing
            </div>
          </div>
        )}
      </div>

      {/* Yangi stol qo'shish modali */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Yangi Stol Qo'shish</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAddTable}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stol nomi *
                  </label>
                  {availableNames.length > 0 ? (
                    <select
                      value={newTableName}
                      onChange={(e) => setNewTableName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Stol nomini tanlang</option>
                      {availableNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500">
                      Barcha stollar allaqachon qo'shilgan
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Soatlik tarif (so'm) *
                  </label>
                  <input
                    type="number"
                    value={newTableRate}
                    onChange={(e) => setNewTableRate(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="50000"
                    min="0"
                    required
                  />
                </div>
              </div>
              
              <div className="mt-6 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isAdding || availableNames.length === 0}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isAdding ? "Qo'shilmoqda..." : "Qo'shish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tarif o'zgartirish modali */}
      {editingTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Tarif O'zgartirish</h2>
              <button
                onClick={() => setEditingTable(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="font-medium">{editingTable.name}</div>
              <div className="text-sm text-gray-600">
                Joriy tarif: <span className="font-medium">
                  {editingTable.currentRate.toLocaleString()} so'm/soat
                </span>
              </div>
            </div>
            
            <form onSubmit={handleUpdateRate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Yangi tarif (so'm/soat) *
                  </label>
                  <input
                    type="number"
                    value={newRate}
                    onChange={(e) => setNewRate(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    required
                  />
                </div>
              </div>
              
              <div className="mt-6 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingTable(null)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isUpdating ? "Yangilanmoqda..." : "Yangilash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
