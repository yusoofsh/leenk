/* oxlint-disable */
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useSyncExternalStore } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { themeMode } from "~/lib/stores/theme";

const subscribeToThemeMode = (onStoreChange: () => void) =>
  themeMode.subscribe(onStoreChange);
const getThemeModeSnapshot = () => themeMode.get();
const getServerThemeModeSnapshot = () => "light" as const;

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useSyncExternalStore(
    subscribeToThemeMode,
    getThemeModeSnapshot,
    getServerThemeModeSnapshot,
  );

  return (
    <Sonner
      {...props}
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
    />
  );
};

export { Toaster };
