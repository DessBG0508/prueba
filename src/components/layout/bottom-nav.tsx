import { CalendarDays, Home, Library, Sparkles, UserRound } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Inicio", icon: Home, route: "/" },
  { label: "Recursos", icon: Library, route: "/recursos" },
  { label: "Citas", icon: CalendarDays, route: "/citas" },
  { label: "Perfil", icon: UserRound, route: "/perfil" },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-nav backdrop-blur-xl lg:bottom-6 lg:left-1/2 lg:right-auto lg:w-[34rem] lg:-translate-x-1/2 lg:rounded-3xl lg:border"
    >
      <div className="grid grid-cols-5 items-end">
        {navItems.slice(0, 2).map((item) => (
          <NavItem
            key={item.label}
            {...item}
            active={item.route ? pathname === item.route : false}
          />
        ))}
        <div className="flex justify-center">
          <Link
            to="/chat"
            aria-label="Conversar con Eli"
            title="Conversar con Eli"
            className="-mt-7 flex size-14 items-center justify-center rounded-full bg-gradient-to-tr from-[#6857E4] to-[#87FFBD] shadow-float ring-4 ring-background transition-transform hover:scale-105 active:scale-95"
          >
            <Sparkles className="size-6 text-white" />
          </Link>
        </div>
        {navItems.slice(2).map((item) => (
          <NavItem
            key={item.label}
            {...item}
            active={item.route ? pathname === item.route : false}
          />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  label,
  icon: Icon,
  active,
  route,
}: (typeof navItems)[number] & { active: boolean }) {
  if (route) {
    return (
      <Button
        asChild
        variant="ghost"
        className={`h-12 flex-col gap-1 rounded-xl px-1 text-[0.68rem] ${
          active ? "text-primary font-bold" : "text-muted-foreground"
        }`}
        aria-current={active ? "page" : undefined}
      >
        <Link to={route}>
          <Icon className={active ? "fill-primary/10" : ""} />
          <span>{label}</span>
        </Link>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      onClick={() => toast("Próximamente")}
      className={`h-12 flex-col gap-1 rounded-xl px-1 text-[0.68rem] ${
        active ? "text-primary font-bold" : "text-muted-foreground"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <Icon className={active ? "fill-primary/10" : ""} />
      <span>{label}</span>
    </Button>
  );
}
