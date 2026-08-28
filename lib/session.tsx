"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Role } from "@/lib/auth";

export interface Session {
  user: string;
  role: Role;
}

const SessionContext = createContext<Session>({ user: "", role: "player" });

export function SessionProvider({ value, children }: { value: Session; children: ReactNode }) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
