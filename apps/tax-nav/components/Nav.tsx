"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/",                  label: "ダッシュボード" },
  { href: "/receipts/upload",   label: "領収書を追加" },
  { href: "/transactions",      label: "仕訳帳" },
  { href: "/reports",           label: "レポート出力" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 h-14">
        <span className="font-bold text-blue-700 mr-4 text-lg">tax-nav</span>
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              pathname === l.href
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
