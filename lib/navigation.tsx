// Cross-app deep links — lets one FCOS app open another already focused on a
// specific record (e.g. Gilded Key's "Show on Map" -> Field Map zoomed to a
// pin, or the Field Map's "Open in Gilded Key" -> that listing's detail view).
// Desktop.tsx owns the actual window-opening logic; this just carries the
// "and once it's open, focus this" request across to the target app.

"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";

export type AppFocus =
  | { app: "map"; locationId: string }
  | { app: "estates"; listingId: string }
  | { app: "profiles"; entityId: string };

interface NavigationContextValue {
  navigate: (focus: AppFocus) => void;
  pendingFocus: Partial<Record<string, AppFocus>>;
  consumeFocus: (appId: string) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({
  value,
  children,
}: {
  value: NavigationContextValue;
  children: ReactNode;
}) {
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigation must be used within NavigationProvider");
  return ctx;
}

/** For an app to read (and clear) any pending focus request addressed to it. */
export function useAppFocus<T extends AppFocus>(appId: T["app"]): [T | undefined, () => void] {
  const ctx = useNavigation();
  const focus = ctx.pendingFocus[appId] as T | undefined;
  const consume = useCallback(() => ctx.consumeFocus(appId), [ctx, appId]);
  return [focus, consume];
}
