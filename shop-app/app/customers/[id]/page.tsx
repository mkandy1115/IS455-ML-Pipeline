"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface DashboardData {
  order_count: number;
  total_spend: number;
  late_deliveries: number;
  last_order: any;
  recent_orders: any[];
}

interface Customer {
  customer_id: number;
  full_name: string;
  email: string;
  city: string;
  state: string;
  loyalty_tier: string;
  customer_segment: string;
  gender: string;
}

export default function CustomerDashboard() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/customers/${id}`).then((r) => r.json()),
      fetch(`/api/customers/${id}/dashboard`).then((r) => r.json()),
    ]).then(([cust, dash]) => {
      setCustomer(cust);
      setDashboard(dash);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (!customer) return <p className="text-red-500">Customer not found.</p>;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/" className="text-sm text-blue-500 hover:underline">← All Customers</Link>
        <h1 className="text-2xl font-bold mt-1">{customer.full_name}</h1>
        <p className="text-gray-500 text-sm">{customer.email} · {[customer.city, customer.state].filter(Boolean).join(", ")}</p>
        <div className="flex gap-2 mt-2">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">{customer.customer_segment}</span>
          <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded capitalize">{customer.loyalty_tier} tier</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Orders" value={dashboard?.order_count ?? 0} />
        <StatCard label="Total Spend" value={`$${(dashboard?.total_spend ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
        <StatCard label="Late Deliveries" value={dashboard?.late_deliveries ?? 0} highlight={dashboard?.late_deliveries ? true : false} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-6">
        <Link
          href={`/customers/${id}/new-order`}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
        >
          + New Order
        </Link>
        <Link
          href={`/customers/${id}/orders`}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50"
        >
          View All Orders
        </Link>
      </div>

      {/* Recent Orders */}
      <h2 className="text-lg font-semibold mb-2">Recent Orders</h2>
      {dashboard?.recent_orders?.length ? (
        <div className="rounded border border-gray-200 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Order ID</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Total</th>
                <th className="px-4 py-2 text-left">Payment</th>
                <th className="px-4 py-2 text-left">Fraud</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dashboard.recent_orders.map((o: any) => (
                <tr key={o.order_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-gray-500">#{o.order_id}</td>
                  <td className="px-4 py-2">{new Date(o.order_datetime).toLocaleDateString()}</td>
                  <td className="px-4 py-2">${parseFloat(o.order_total).toFixed(2)}</td>
                  <td className="px-4 py-2 capitalize">{o.payment_method}</td>
                  <td className="px-4 py-2">
                    {o.is_fraud ? (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Fraud</span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Clean</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-400 text-sm">No orders yet.</p>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`rounded border p-4 ${highlight ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? "text-red-600" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}
