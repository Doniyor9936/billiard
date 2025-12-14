import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

export function CustomersView() {
  const customers = useQuery(api.customers.getAllCustomers);
  const createCustomer = useMutation(api.customers.createCustomer);
  const payCustomerDebt = useMutation(api.customers.payCustomerDebt);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [paymentModal, setPaymentModal] = useState<{
    customerId: Id<"customers">;
    customerName: string;
    totalDebt: number;
  } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentType, setPaymentType] = useState<"cash" | "card">("cash");
  const [isPaying, setIsPaying] = useState(false);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) {
      toast.error("Mijoz nomini kiriting");
      return;
    }

    try {
      setIsAdding(true);
      await createCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
      });
      toast.success("Mijoz qo'shildi");
      setNewCustomerName("");
      setNewCustomerPhone("");
      setShowAddForm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xatolik yuz berdi");
    } finally {
      setIsAdding(false);
    }
  };

  const handlePayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal) return;

    if (paymentAmount <= 0) {
      toast.error("To'lov summasi 0 dan katta bo'lishi kerak");
      return;
    }

    if (paymentAmount > paymentModal.totalDebt) {
      toast.error("To'lov summasi qarz summasidan ko'p bo'lishi mumkin emas");
      return;
    }

    try {
      setIsPaying(true);
      await payCustomerDebt({
        customerId: paymentModal.customerId,
        amount: paymentAmount,
        paymentType,
      });
      toast.success("Qarz to'lovi muvaffaqiyatli amalga oshirildi");
      setPaymentModal(null);
      setPaymentAmount(0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xatolik yuz berdi");
    } finally {
      setIsPaying(false);
    }
  };

  if (!customers) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const customersWithDebt = customers.filter(c => c.totalDebt > 0);
  const totalDebt = customers.reduce((sum, customer) => sum + customer.totalDebt, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mijozlar</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Yangi Mijoz
        </button>
      </div>

      {/* Statistika */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">{customers.length}</div>
          <div className="text-gray-600">Jami mijozlar</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-red-600">{customersWithDebt.length}</div>
          <div className="text-gray-600">Qarzdor mijozlar</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-red-600">{totalDebt.toLocaleString()}</div>
          <div className="text-gray-600">Umumiy qarz (so'm)</div>
        </div>
      </div>

      {/* Yangi mijoz qo'shish formi */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Yangi Mijoz</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAddCustomer}>
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
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isAdding ? "Qo'shilmoqda..." : "Qo'shish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mijozlar ro'yxati */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mijoz
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Telefon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qarz summasi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qo'shilgan sana
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amallar
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{customer.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {customer.phone || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`font-medium ${customer.totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {customer.totalDebt.toLocaleString()} so'm
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {new Date(customer.createdAt).toLocaleDateString("uz-UZ")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {customer.totalDebt > 0 && (
                      <button
                        onClick={() => setPaymentModal({
                          customerId: customer._id,
                          customerName: customer.name,
                          totalDebt: customer.totalDebt,
                        })}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Qarz to'lash
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {customers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">Hozircha mijozlar yo'q</div>
            <div className="text-gray-400 text-sm mt-2">
              Birinchi mijozni qo'shing
            </div>
          </div>
        )}
      </div>

      {/* Qarz to'lash modali */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Qarz To'lash</h2>
              <button
                onClick={() => setPaymentModal(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="font-medium">{paymentModal.customerName}</div>
              <div className="text-sm text-gray-600">
                Umumiy qarz: <span className="font-medium text-red-600">
                  {paymentModal.totalDebt.toLocaleString()} so'm
                </span>
              </div>
            </div>
            
            <form onSubmit={handlePayDebt}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To'lov summasi (so'm)
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max={paymentModal.totalDebt}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(paymentModal.totalDebt)}
                    className="mt-1 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded"
                  >
                    To'liq to'lash
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To'lov turi
                  </label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value as "cash" | "card")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Naqd</option>
                    <option value="card">Karta</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setPaymentModal(null)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isPaying}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isPaying ? "To'lanmoqda..." : "To'lash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
