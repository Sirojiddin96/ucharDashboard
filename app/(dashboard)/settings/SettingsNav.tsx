"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/settings/regions",       label: "Regions",       icon: "🗺" },
  { href: "/settings/service-types", label: "Service Types", icon: "🏷" },
  { href: "/settings/tariffs",       label: "Tariffs",       icon: "💰" },
];

export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1">
      {NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
