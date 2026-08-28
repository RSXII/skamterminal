// Cosmetic role gate, not a security boundary — the real lock is the Firestore
// write rules (see lib/entities.ts). This just decides which UI a given login
// sees; anyone typing the admin credentials gets the GM tools.

export type Role = "admin" | "player";

const ADMIN_USERNAME = "gm";
const ADMIN_PASSWORD = "skam1999";

export function resolveRole(username: string, password: string): Role {
  return username.trim().toLowerCase() === ADMIN_USERNAME && password === ADMIN_PASSWORD
    ? "admin"
    : "player";
}
