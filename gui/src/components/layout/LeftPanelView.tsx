import { Link, NavLink, Outlet } from "react-router";
import { useTranslation } from "react-i18next";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DarkmodeToggle } from "../shared/DarkmodeToggle";
import { LanguageSelector } from "../shared/LanguageSelector";
import { useSession, Mode } from "@/context/SessionContext";
import { getRouteFeatures } from "@/lib/features";

import logo from "../../assets/grapefruit.svg";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

function NavItem({ to, icon, label }: NavItemProps) {
  return (
    <NavLink
      to={to}
      aria-label={label}
      className={({ isActive }) =>
        `mx-auto flex h-9 w-9 items-center justify-center rounded-md text-sidebar-foreground/70 outline-none hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring/50 ${
          isActive ? "bg-sidebar-accent text-sidebar-foreground ring-1 ring-sidebar-border" : ""
        }`
      }
    >
      <Tooltip>
        <TooltipTrigger render={<span className="flex items-center justify-center" />}>
          {icon}
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    </NavLink>
  );
}

interface ActionNavItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function ActionNavItem({ icon, label, onClick }: ActionNavItemProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="mx-auto flex h-9 w-9 items-center justify-center rounded-md text-sidebar-foreground/70 outline-none hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <Tooltip>
        <TooltipTrigger render={<span className="flex items-center justify-center" />}>
          {icon}
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    </button>
  );
}

type NavEntry =
  | { kind: "route"; route: string; icon: React.ReactNode; label: string }
  | { kind: "action"; id: string; icon: React.ReactNode; label: string; action: () => void };

export function LeftPanelView() {
  const { t } = useTranslation();
  const { device, bundle, platform, mode, pid } = useSession();
  // Determine the target for URL (bundle for app mode, pid for daemon mode)
  const target = mode === Mode.App ? bundle : pid;
  const basePath = `/workspace/${platform}/${device}/${mode}/${target}`;

  const routeItems = getRouteFeatures(platform, mode);
  const navItems: NavEntry[] = routeItems.map((f) => {
    const Icon = f.icon;
    return {
      kind: "route" as const,
      route: f.route,
      icon: <Icon className="h-5 w-5" />,
      label: t(f.label),
    };
  });

  return (
    <div className="flex h-full">
      <div className="native-chrome flex w-14 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-12 items-center justify-center border-b border-sidebar-border">
          <Link
            to={`/list/${device}/apps`}
            aria-label={t("apps")}
            className="flex h-9 w-9 items-center justify-center rounded-md outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <img src={logo} alt={t("logo_alt")} className="h-6 w-6" />
          </Link>
        </div>

        {navItems.length > 0 ? (
          <div className="flex flex-1 flex-col gap-1 pt-2">
            {navItems.map((item) =>
              item.kind === "route" ? (
                <NavItem
                  key={item.route}
                  to={`${basePath}/${item.route}`}
                  icon={item.icon}
                  label={item.label}
                />
              ) : (
                <ActionNavItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  onClick={item.action}
                />
              ),
            )}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Settings at bottom */}
        <div className="flex flex-col items-center gap-1 py-2">
          <LanguageSelector />
          <DarkmodeToggle />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
