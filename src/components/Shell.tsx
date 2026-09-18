"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, LogOut, Globe, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; disabled?: boolean };
export type NavGroup = { title?: string; items: NavItem[] };

export function Shell({
  groups,
  brand,
  contextLine,
  userName,
  impersonating,
  children,
}: {
  groups: NavGroup[];
  brand: string;
  contextLine?: string;
  userName: string;
  impersonating?: { companyName: string; companyId: string } | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function endImpersonation() {
    if (!impersonating) return;
    await fetch(`/api/admin/companies/${impersonating.companyId}/impersonate`, { method: "DELETE" });
    router.push("/admin");
    router.refresh();
  }

  function switchLocale() {
    const current = document.cookie.match(/(?:^|; )locale=([^;]*)/)?.[1] ?? "tr";
    const next = current === "tr" ? "en" : "tr";
    document.cookie = `locale=${next}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 flex-col bg-sidebar text-slate-300 lg:static lg:flex",
          open ? "flex" : "hidden lg:flex",
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <span className="font-semibold text-white">{brand}</span>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Kapat">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
          {groups.map((group, gi) => (
            <div key={gi} className="space-y-1">
              {group.title ? (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {group.title}
                </p>
              ) : null}
              {group.items.map((item) =>
                item.disabled ? (
                  <span
                    key={item.href}
                    className="block cursor-not-allowed rounded-lg px-3 py-2 text-sm text-slate-600"
                    title="Sonraki fazda"
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm",
                      pathname === item.href
                        ? "bg-brand-600 text-white"
                        : "hover:bg-sidebar-hover hover:text-white",
                    )}
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            {contextLine ? <p className="truncate text-sm text-slate-600">{contextLine}</p> : null}
          </div>
          {impersonating ? (
            <button
              onClick={endImpersonation}
              className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800"
            >
              {impersonating.companyName} · goruntuleme modundan cik
            </button>
          ) : null}
          <button onClick={switchLocale} className="text-slate-500 hover:text-slate-900" aria-label="Dil">
            <Globe className="h-5 w-5" />
          </button>
          <span className="hidden text-sm text-slate-600 sm:inline">{userName}</span>
          <button onClick={logout} className="text-slate-500 hover:text-slate-900" aria-label="Cikis">
            <LogOut className="h-5 w-5" />
          </button>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
