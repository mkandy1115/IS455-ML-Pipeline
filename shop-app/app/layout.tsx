import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shop App",
  description: "IS 455 Deployment Project",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex gap-6 text-sm font-medium">
          <a href="/" className="text-blue-600 hover:underline">Customers</a>
          <a href="/warehouse" className="text-blue-600 hover:underline">Warehouse Queue</a>
        </nav>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
