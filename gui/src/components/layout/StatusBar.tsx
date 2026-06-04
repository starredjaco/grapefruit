import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import {
  PanelBottomClose,
  PanelBottomOpen,
  RefreshCw,
  XCircle,
  Unplug,
  Circle,
  Loader2,
  CircleAlert,
  Command,
  RotateCcw,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Status, useSession } from "@/context/SessionContext";

interface StatusBarProps {
  bottomPanelVisible: boolean;
  setBottomPanelVisible: (visible: boolean) => void;
  onOpenCommandPalette: () => void;
  onResetLayout: () => void;
}

export function StatusBar({
  bottomPanelVisible,
  setBottomPanelVisible,
  onOpenCommandPalette,
  onResetLayout,
}: StatusBarProps) {
  const { t } = useTranslation();
  const { status, device, pid } = useSession();
  const navigate = useNavigate();
  const shortcut =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform)
      ? "K"
      : "Ctrl K";

  const getStatusClass = () => {
    switch (status) {
      case Status.Ready:
        return "text-emerald-600 dark:text-emerald-400";
      case Status.Disconnected:
        return "text-orange-600 dark:text-orange-400";
      case Status.Connecting:
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case Status.Ready:
        return <Circle className="h-2.5 w-2.5 fill-current" />;
      case Status.Disconnected:
        return <CircleAlert className="h-3.5 w-3.5" />;
      case Status.Connecting:
      default:
        return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
    }
  };

  const handleReloadPage = () => {
    window.location.reload();
  };

  const killProcessMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/device/${device}/kill/${pid}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to kill process");
    },
    onSuccess: () => {
      navigate(`/list/${device}/apps`);
    },
  });

  const handleKillProcess = () => {
    if (!device || !pid) return;
    killProcessMutation.mutate();
  };

  const handleDetach = () => {
    if (device) {
      navigate(`/list/${device}/apps`);
    }
  };

  return (
    <footer
      className="native-chrome flex h-6 items-center justify-between border-t border-border bg-background px-2 text-[11px] text-muted-foreground"
    >
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex h-5 items-center gap-1.5 rounded px-1 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            }
          >
            <span className={getStatusClass()}>{getStatusIcon()}</span>
            {status === Status.Ready && t("connected")}
            {status === Status.Connecting && t("connecting")}
            {status === Status.Disconnected && t("disconnected")}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handleReloadPage}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t("reload_page")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleKillProcess}
              disabled={status !== Status.Ready}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {t("kill_process")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDetach}>
              <Unplug className="w-4 h-4 mr-2" />
              {t("detach")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {status === Status.Disconnected && (
          <button
            type="button"
            onClick={handleReloadPage}
            className="flex h-5 items-center gap-1 rounded px-1 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <RefreshCw className="w-3 h-3" />
            {t("reload")}
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex h-5 items-center gap-1 rounded px-1.5 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          title={t("command_palette")}
        >
          <Command className="w-3 h-3" />
          {shortcut}
        </button>
        <button
          type="button"
          onClick={onResetLayout}
          className="flex h-5 items-center gap-1 rounded px-1.5 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          title={t("reset_workspace")}
        >
          <RotateCcw className="w-3 h-3" />
          {t("reset_workspace")}
        </button>
        <button
          type="button"
          onClick={() => setBottomPanelVisible(!bottomPanelVisible)}
          className="flex h-5 w-5 items-center justify-center rounded outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          title={bottomPanelVisible ? t("hide_panel") : t("show_panel")}
        >
          {bottomPanelVisible ? (
            <PanelBottomClose className="w-4 h-4" />
          ) : (
            <PanelBottomOpen className="w-4 h-4" />
          )}
        </button>
      </div>
    </footer>
  );
}
