"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Customer {
  customer_id: number;
  full_name: string;
  email: string;
  city: string;
  state: string;
  loyalty_tier: string;
  customer_segment: string;
}

export default function SelectCustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((data) => { setCustomers(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  const filtered = customers.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase())
  );

  const tierColor: Record<string, string> = {
    gold: "bg-yellow-100 text-yellow-800",
    silver: "bg-gray-100 text-gray-700",
    none: "bg-white text-gray-400 border border-gray-200",
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Select a Customer</h1>
      <p className="text-gray-500 text-sm mb-4">Click a customer to view their dashboard.</p>

      <input
        type="text"
        placeholder="Search by name, email, or city…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {loading ? (
        <p className="text-gray-400">Loading customers…</p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Location</th>
                <th className="px-4 py-2 text-left">Segment</th>
                <th className="px-4 py-2 text-left">Tier</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => (
                <tr key={c.customer_id} className="hover:bg-blue-50">
                  <td className="px-4 py-2 font-medium">{c.full_name}</td>
                  <td className="px-4 py-2 text-gray-500">{c.email}</td>
                  <td className="px-4 py-2 text-gray-500">{[c.city, c.state].filter(Boolean).join(", ")}</td>
                  <td className="px-4 py-2 capitalize">{c.customer_segment}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${tierColor[c.loyalty_tier] ?? ""}`}>
                      {c.loyalty_tier}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/customers/${c.customer_id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center py-6 text-gray-400">No customers match your search.</p>
          )}
        </div>
      )}
    </div>
  );
}
