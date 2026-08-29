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
      className="toaster group"
      icons={{
        error: <OctagonXIcon size={16} />,
        info: <InfoIcon size={16} />,
        loading: <Loader2Icon className="animate-spin" size={16} />,
        success: <CircleCheckIcon size={16} />,
        warning: <TriangleAlertIcon size={16} />,
      }}
      theme={theme}
    />
  );
};

export { Toaster };
