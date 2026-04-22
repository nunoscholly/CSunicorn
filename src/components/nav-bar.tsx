// Globale Nav-Leiste für alle authentifizierten Views.
// - Doppel-Keil-Logo links
// - Rollenabhängige Links (Admin sieht alle vier; Lead nur Lead; etc.)
// - Rechts: User-Name + Logout-Button
// Aktive Route wird in Signal Yellow unterstrichen.

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { RoleBadge } from "@/components/status-badge";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/supabase/types";

type NavBarProps = {
    name: string;
    role: UserRole;
};

// Welche Routen dürfen von welcher Rolle aufgerufen werden?
// Ableitung aus docs/user_profiles.md → Permission Matrix.
const NAV_ITEMS: Array<{ href: string; label: string; roles: UserRole[] }> = [
    { href: "/project", label: "Projekt-Mgmt", roles: ["admin", "pm"] },
    { href: "/lead", label: "Team-Lead", roles: ["admin", "lead"] },
    { href: "/volunteer", label: "Volunteer", roles: ["admin", "volunteer"] },
    { href: "/admin", label: "Admin", roles: ["admin"] },
];

export function NavBar({ name, role }: NavBarProps) {
    const pathname = usePathname();
    const router = useRouter();

    // Logout als Client-Action: Session-Cookies räumen + zurück zur Login-Seite.
    async function handleLogout() {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
    }

    const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

    return (
        <header className="border-b border-concrete/20 bg-background">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
                <div className="flex items-center gap-8">
                    <Logo size="sm" />
                    <nav className="flex items-center gap-1">
                        {visibleItems.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={[
                                        "rounded px-3 py-1.5 text-sm font-bold transition-colors",
                                        isActive
                                            ? "text-signal-yellow"
                                            : "text-foreground/70 hover:text-foreground",
                                    ].join(" ")}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden items-center gap-2 sm:flex">
                        <span className="text-sm text-foreground/70">{name}</span>
                        <RoleBadge role={role} />
                    </div>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="rounded border border-concrete/40 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-foreground/70 hover:border-signal-yellow hover:text-signal-yellow"
                    >
                        Abmelden
                    </button>
                </div>
            </div>
        </header>
    );
}
