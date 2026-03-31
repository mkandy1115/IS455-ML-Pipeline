"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function OrderHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const [orders, setOrders] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/customers/${id}`).then((r) => r.json()),
      fetch(`/api/customers/${id}/orders`).then((r) => r.json()),
    ]).then(([cust, ords]) => {
      setCustomerName(cust.full_name ?? "");
      setOrders(ords);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <p className="text-gray-400">Loading…</p>;

  return (
    <div className="max-w-5xl mx-auto">
      <Link href={`/customers/${id}`} className="text-sm text-blue-500 hover:underline">← Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mt-1 mb-4">Order History — {customerName}</h1>

      {orders.length === 0 ? (
        <p className="text-gray-400">No orders found.</p>
      ) : (
        <div className="rounded border border-gray-200 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Order ID</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Total</th>
                <th className="px-4 py-2 text-left">Payment</th>
                <th className="px-4 py-2 text-left">Device</th>
                <th className="px-4 py-2 text-left">Fraud</th>
                <th className="px-4 py-2 text-left">Carrier</th>
                <th className="px-4 py-2 text-left">Delivery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o: any) => {
                const ship = o.shipments as any;
                const isLate = ship?.late_delivery === 1;
                return (
                  <tr key={o.order_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-gray-500">#{o.order_id}</td>
                    <td className="px-4 py-2">{new Date(o.order_datetime).toLocaleDateString()}</td>
                    <td className="px-4 py-2">${parseFloat(o.order_total).toFixed(2)}</td>
                    <td className="px-4 py-2 capitalize">{o.payment_method}</td>
                    <td className="px-4 py-2 capitalize">{o.device_type}</td>
                    <td className="px-4 py-2">
                      {o.is_fraud ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Fraud</span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Clean</span>
                      )}
                    </td>
                    <td className="px-4 py-2">{ship?.carrier ?? "—"}</td>
                    <td className="px-4 py-2">
                      {ship ? (
                        <span className={`text-xs px-2 py-0.5 rounded ${isLate ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                          {isLate ? `Late (${ship.actual_days}d / ${ship.promised_days}d)` : `On time (${ship.actual_days}d)`}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
