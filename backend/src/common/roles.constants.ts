export const ROLES = {
  ADMIN: "admin",
  SUPPORT: "support",
  USER: "user"
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
