"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Product {
  product_id: number;
  product_name: string;
  category: string;
  price: number;
  sku: string;
}

interface CartItem {
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
}

export default function NewOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [customerName, setCustomerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/customers/${id}`).then((r) => r.json()),
      fetch(`/api/products`).then((r) => r.json()),
    ]).then(([cust, prods]) => {
      setCustomerName(cust.full_name ?? "");
      setProducts(prods);
    });
  }, [id]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.product_id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.product_id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product_id: product.product_id, product_name: product.product_name, price: product.price, quantity: 1 }];
    });
  };

  const removeFromCart = (product_id: number) => {
    setCart((prev) => prev.filter((i) => i.product_id !== product_id));
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = subtotal * 0.08;
  const shipping = cart.length > 0 ? 5.99 : 0;
  const total = subtotal + tax + shipping;

  const handleSubmit = async () => {
    if (cart.length === 0) { setError("Add at least one item."); return; }
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: parseInt(id),
        payment_method: paymentMethod,
        items: cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setSubmitting(false);
    } else {
      setSuccess(true);
      setTimeout(() => router.push(`/customers/${id}/orders`), 1500);
    }
  };

  const categories = [...new Set(products.map((p) => p.category))].sort();

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="text-5xl mb-4">✓</div>
        <h2 className="text-xl font-bold text-green-700">Order placed successfully!</h2>
        <p className="text-gray-500 mt-1">Redirecting to order history…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Link href={`/customers/${id}`} className="text-sm text-blue-500 hover:underline">← Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mt-1 mb-6">New Order — {customerName}</h1>

      <div className="grid grid-cols-3 gap-6">
        {/* Product catalog */}
        <div className="col-span-2">
          {categories.map((cat) => (
            <div key={cat} className="mb-5">
              <h2 className="text-sm font-semibold uppercase text-gray-500 mb-2">{cat}</h2>
              <div className="grid grid-cols-2 gap-2">
                {products.filter((p) => p.category === cat).map((p) => (
                  <button
                    key={p.product_id}
                    onClick={() => addToCart(p)}
                    className="text-left border border-gray-200 rounded p-3 hover:border-blue-400 hover:bg-blue-50 transition"
                  >
                    <p className="font-medium text-sm">{p.product_name}</p>
                    <p className="text-xs text-gray-400">{p.sku}</p>
                    <p className="text-blue-600 font-semibold mt-1">${p.price.toFixed(2)}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Cart */}
        <div className="bg-white border border-gray-200 rounded p-4 self-start sticky top-6">
          <h2 className="font-semibold mb-3">Cart</h2>
          {cart.length === 0 ? (
            <p className="text-gray-400 text-sm">Click products to add them.</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {cart.map((item) => (
                <li key={item.product_id} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.product_name} × {item.quantity}</span>
                  <span className="flex items-center gap-2">
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                    <button onClick={() => removeFromCart(item.product_id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t pt-3 text-sm space-y-1 text-gray-600">
            <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>${shipping.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Tax (8%)</span><span>${tax.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-gray-900 pt-1 border-t"><span>Total</span><span>${total.toFixed(2)}</span></div>
          </div>

          <div className="mt-4">
            <label className="text-xs text-gray-500 uppercase block mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            >
              <option value="card">Credit Card</option>
              <option value="paypal">PayPal</option>
              <option value="bank">Bank Transfer</option>
              <option value="crypto">Crypto</option>
            </select>
          </div>

          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting || cart.length === 0}
            className="w-full mt-4 bg-blue-600 text-white py-2 rounded font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Placing Order…" : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
