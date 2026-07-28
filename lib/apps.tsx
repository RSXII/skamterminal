// FCOS application registry.
//
// To add a new app: build its component under components/apps/, pick an
// icon in components/os/icons.tsx (or add one), and append an entry here.
// It will automatically appear on the desktop and work in the taskbar.

import type { AppDefinition } from "@/lib/types";
import { BrowserApp } from "@/components/apps/BrowserApp";
import { RealEstateApp } from "@/components/apps/RealEstateApp";
import { PeopleApp } from "@/components/apps/PeopleApp";
import { BrowserIcon, EstateIcon, PeopleIcon } from "@/components/os/icons";

export const APP_LIST: AppDefinition[] = [
  {
    id: "browser",
    name: "AetherNet",
    icon: BrowserIcon,
    component: BrowserApp,
    defaultSize: { w: 860, h: 620 },
  },
  {
    id: "estates",
    name: "Gilded Key",
    icon: EstateIcon,
    component: RealEstateApp,
    defaultSize: { w: 900, h: 640 },
  },
  {
    id: "profiles",
    name: "Profiles",
    icon: PeopleIcon,
    component: PeopleApp,
    defaultSize: { w: 820, h: 600 },
  },
];

export const APPS: Record<string, AppDefinition> = Object.fromEntries(
  APP_LIST.map((a) => [a.id, a])
);
