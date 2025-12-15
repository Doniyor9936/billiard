import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

const PREDEFINED_TABLES = [
  "Stol 1",
  "Stol 2",
  "Stol 3",
  "Stol 4",
  "Stol 5",
  "Stol 6",
  "Stol 7",
  "Stol 8",
  "Stol 9",
  "Stol 10",
  "Stol 11",
  "Stol 12",
];

export function TablesView() {
  const tables = useQuery(api.tables.getAllTables);
  const customers = useQuery(api.customers.getAllCustomers);
  const startSession = useMutation(api.sessions.startSession);
  const createTable = useMutation(api.tables.createTable);
  const createCustomer = useMutation(api.customers.createCustomer);
  
  const [startingTable, setStartingTable] = useState<Id<"tables"> | null>(null);
  const [showStartSessionModal, setShowStartSessionModal] = useState(false);
  const [selectedTableForSession, setSelectedTableForSession] = useState<Id<"tables"> | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Id<"customers"> | "">("");
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newHourlyRate, setNewHourlyRate] = useState(50000);
  const [isCreatingTable, setIsCreatingTable] = useState(false);

  const availableTableNames = useMemo(() => {
    if (!tables) return PREDEFINED_TABLES;
    const used = new Set(tables.map((t) => t.name.toLowerCase().trim()));
    return PREDEFINED_TABLES.filter(
      (name) => !used.has(name.toLowerCase().trim()),
    );
  }, [tables]);

  const handleOpenAddTableModal = () => {
    setNewTableName(availableTableNames[0] || "");
    setShowAddTableModal(true);
  };

  const handleStartSessionClick = (tableId: Id<"tables">) => {
    setSelectedTableForSession(tableId);
    setShowStartSessionModal(true);
    setSelectedCustomer("");
  };

  const handleStartSession = async () => {
    if (!selectedTableForSession) return;
    
    if (!selectedCustomer) {
      toast.error("Mijozni tanlash majburiy!");
      return;
    }

    try {
      setStartingTable(selectedTableForSession);
      await startSession({
        tableId: selectedTableForSession,
        customerId: selectedCustomer,
      });
      toast.success("Sessiya muvaffaqiyatli boshlandi!");
      setShowStartSessionModal(false);
      setSelectedTableForSession(null);
      setSelectedCustomer("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xatolik yuz berdi");
    } finally {
      setStartingTable(null);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) {
      toast.error("Mijoz nomini kiriting");
      return;
    }

    try {
      setIsCreatingCustomer(true);
      const customerId = await createCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
      });
      toast.success("Mijoz qo'shildi");
      setSelectedCustomer(customerId);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setShowNewCustomerForm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xatolik yuz berdi");
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("uz-UZ");
  };

  const formatDuration = (startTime: number) => {
    const now = Date.now();
    const durationMs = now - startTime;
    const minutes = Math.floor(durationMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}s ${remainingMinutes}d`;
    }
    return `${remainingMinutes}d`;
  };

  if (!tables) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const selectedTable = selectedTableForSession ? tables.find(t => t._id === selectedTableForSession) : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stollar Boshqaruvi</h1>
        <button
          onClick={handleOpenAddTableModal}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
        >
          Stol qo'shish
        </button>
      </div>

      {/* Stollar ro'yxati */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tables.map((table) => (
          <div
            key={table._id}
            className={`bg-white rounded-lg shadow-md p-6 border-2 ${
              table.isOccupied
                ? "border-red-200 bg-red-50"
                : table.isActive
                ? "border-green-200 bg-green-50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{table.name}</h3>
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  table.isOccupied
                    ? "bg-red-100 text-red-800"
                    : table.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {table.isOccupied ? "Band" : table.isActive ? "Bo'sh" : "Faol emas"}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-sm text-gray-600">
                Soatlik tarif: <span className="font-medium">{table.hourlyRate.toLocaleString()} so'm</span>
              </div>

              {table.activeSession && (
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">
                    Boshlangan: <span className="font-medium">{formatTime(table.activeSession.startTime)}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Davomiyligi: <span className="font-medium text-blue-600">{formatDuration(table.activeSession.startTime)}</span>
                  </div>
                </div>
              )}
            </div>

            {table.isActive && !table.isOccupied && (
              <button
                onClick={() => handleStartSessionClick(table._id)}
                disabled={startingTable === table._id}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {startingTable === table._id ? "Boshlanmoqda..." : "O'yinni Boshlash"}
              </button>
            )}

            {table.isOccupied && (
              <div className="text-center text-sm text-red-600 font-medium">
                Stol band
              </div>
            )}

            {!table.isActive && (
              <div className="text-center text-sm text-gray-500">
                Stol faol emas
              </div>
            )}
          </div>
        ))}
      </div>

      {tables.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">Hozircha stollar mavjud emas</div>
          <div className="text-gray-400 text-sm mt-2">
            "Stol qo'shish" tugmasidan yangi stol qo'shing
          </div>
        </div>
      )}

      {/* O'yinni boshlash modali */}
      {showStartSessionModal && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">O'yinni Boshlash</h2>
              <button
                onClick={() => {
                  setShowStartSessionModal(false);
                  setSelectedTableForSession(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="font-medium text-blue-900">{selectedTable.name}</div>
              <div className="text-sm text-blue-700">
                Soatlik tarif: {selectedTable.hourlyRate.toLocaleString()} so'm
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mijozni tanlang *
                </label>
                <div className="flex space-x-2">
                  <select
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value as Id<"customers"> | "")}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Mijozni tanlang</option>
                    {customers?.map((customer) => (
                      <option key={customer._id} value={customer._id}>
                        {customer.name} {customer.phone && `(${customer.phone})`}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowNewCustomerForm(true)}
                    className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                  >
                    Yangi +
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowStartSessionModal(false);
                  setSelectedTableForSession(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleStartSession}
                disabled={!selectedCustomer || startingTable === selectedTableForSession}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {startingTable === selectedTableForSession ? "Boshlanmoqda..." : "O'yinni Boshlash"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yangi mijoz qo'shish modali */}
      {showNewCustomerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Yangi Mijoz Qo'shish</h2>
              <button
                onClick={() => setShowNewCustomerForm(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateCustomer}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mijoz nomi *
                  </label>
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon raqami
                  </label>
                  <input
                    type="tel"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+998 90 123 45 67"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCustomer}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isCreatingCustomer ? "Qo'shilmoqda..." : "Qo'shish va Tanlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Yangi stol qo'shish modali */}
      {showAddTableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Yangi Stol Qo'shish</h2>
              <button
                onClick={() => setShowAddTableModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stol nomi
                </label>
                <select
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Nomni tanlang</option>
                  {availableTableNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                {availableTableNames.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Barcha oldindan belgilangan nomlar ishlatilgan.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Soatlik tarif (so'm)
                </label>
                <input
                  type="number"
                  value={newHourlyRate}
                  onChange={(e) => setNewHourlyRate(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  min={0}
                />
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                type="button"
                onClick={() => setShowAddTableModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                onClick={async () => {
                  if (!newTableName.trim()) {
                    toast.error("Stol nomini tanlang");
                    return;
                  }
                  if (tables?.some((t) => t.name.toLowerCase().trim() === newTableName.toLowerCase().trim())) {
                    toast.error("Bu stol nomi allaqachon mavjud");
                    return;
                  }
                  try {
                    setIsCreatingTable(true);
                    await createTable({
                      name: newTableName.trim(),
                      hourlyRate: newHourlyRate || 0,
                    });
                    toast.success("Stol qo'shildi");
                    setShowAddTableModal(false);
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Xatolik yuz berdi");
                  } finally {
                    setIsCreatingTable(false);
                  }
                }}
                disabled={isCreatingTable}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isCreatingTable ? "Qo'shilmoqda..." : "Qo'shish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
