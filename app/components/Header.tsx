"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Mídia" },
    { href: "/meta", label: "Criativos" },
    { href: "/producao", label: "Produção" },
  ];

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-10 bg-red rounded-full" />
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-400">
              Redline
            </p>
            <h1 className="text-xl font-bold text-black tracking-tight">
              Dashboard de Performance
            </h1>
          </div>
        </div>
        <nav className="flex gap-1 bg-stone rounded-lg p-1">
          {links.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-black text-white"
                    : "text-gray-500 hover:text-black"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
