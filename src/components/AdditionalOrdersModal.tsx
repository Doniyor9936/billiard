import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface AdditionalOrdersModalProps {
  sessionId: Id<"sessions">;
  onClose: () => void;
}

export function AdditionalOrdersModal({ sessionId, onClose }: AdditionalOrdersModalProps) {
  const orders = useQuery(api.additionalOrders.getOrdersBySession, { sessionId });
  const addOrder = useMutation(api.additionalOrders.addOrder);
  const removeOrder = useMutation(api.additionalOrders.removeOrder);

  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || unitPrice <= 0) {
      toast.error("Barcha maydonlarni to'ldiring");
      return;
    }

    try {
      setIsAdding(true);
      await addOrder({
        sessionId,
        itemName: itemName.trim(),
        quantity,
        unitPrice,
      });
      toast.success("Buyurtma qo'shildi");
      setItemName("");
      setQuantity(1);
      setUnitPrice(0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xatolik yuz berdi");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveOrder = async (orderId: Id<"additionalOrders">) => {
    try {
      await removeOrder({ orderId });
      toast.success("Buyurtma o'chirildi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xatolik yuz berdi");
    }
  };

  const totalAmount = orders?.reduce((sum, order) => sum + order.totalPrice, 0) || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Qo'shimcha Buyurtmalar</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Yangi buyurtma qo'shish */}
        <form onSubmit={handleAddOrder} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium mb-4">Yangi Buyurtma</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mahsulot nomi
              </label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Masalan: Choy"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Miqdori
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Narxi (so'm)
              </label>
              <input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                required
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Jami: <span className="font-medium">{(quantity * unitPrice).toLocaleString()} so'm</span>
            </div>
            <button
              type="submit"
              disabled={isAdding}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isAdding ? "Qo'shilmoqda..." : "Qo'shish"}
            </button>
          </div>
        </form>

        {/* Buyurtmalar ro'yxati */}
        <div>
          <h3 className="text-lg font-medium mb-4">Mavjud Buyurtmalar</h3>
          
          {!orders ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Hozircha buyurtmalar yo'q
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order._id} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{order.itemName}</div>
                    <div className="text-sm text-gray-600">
                      {order.quantity} x {order.unitPrice.toLocaleString()} so'm
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="font-medium">
                      {order.totalPrice.toLocaleString()} so'm
                    </div>
                    <button
                      onClick={() => handleRemoveOrder(order._id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      O'chirish
                    </button>
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-3 flex justify-between items-center font-medium text-lg">
                <span>Jami qo'shimcha:</span>
                <span className="text-blue-600">{totalAmount.toLocaleString()} so'm</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}
