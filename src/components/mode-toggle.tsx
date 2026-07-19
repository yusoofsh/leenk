import { useSyncExternalStore } from "react";

import { bioMode, toggleBioMode } from "~/lib/stores/bio-mode";

import { PreferenceControl } from "./preference-control";

const subscribeToBioMode = (onStoreChange: () => void) =>
  bioMode.subscribe(onStoreChange);
const getBioModeSnapshot = () => bioMode.get();
const getServerBioModeSnapshot = () => "full" as const;

export function ModeToggle() {
  const mode = useSyncExternalStore(
    subscribeToBioMode,
    getBioModeSnapshot,
    getServerBioModeSnapshot,
  );

  const isTldr = mode === "tldr";

  return (
    <PreferenceControl
      buttonLabel="TL;DR biography mode"
      dataSlot="bio-mode-toggle"
      label="Bio"
      onToggle={toggleBioMode}
      pressed={isTldr}
      value="TL;DR"
    />
  );
}

export default ModeToggle;
