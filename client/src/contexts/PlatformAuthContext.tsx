import React, { createContext, useContext, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

export type PlatformUser = {
  id: number;
  username: string;
  name: string;
  platformRole: string;
  designerId: number | null;
  dept: string | null;
};

type PlatformAuthContextType = {
  user: PlatformUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  canEdit: boolean;
  canManageSchedule: boolean;
  canManageUsers: boolean;
  isDesigner: boolean;
};

const PlatformAuthContext = createContext<PlatformAuthContextType | null>(null);

export function PlatformAuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, refetch } = trpc.platform.me.useQuery();
  const loginMutation = trpc.platform.login.useMutation();
  const logoutMutation = trpc.platform.logout.useMutation();

  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
    await refetch();
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
    await refetch();
  };

  const roleLevel = (role: string) => {
    const levels: Record<string, number> = {
      super_admin: 5,
      pm_manager: 4,
      team_lead: 3,
      designer: 2,
      viewer: 1,
    };
    return levels[role] ?? 0;
  };

  const userRole = user?.platformRole ?? "viewer";

  return (
    <PlatformAuthContext.Provider
      value={{
        user: user ?? null,
        loading: isLoading,
        login,
        logout,
        isAuthenticated: !!user,
        canEdit: roleLevel(userRole) >= 2,
        canManageSchedule: roleLevel(userRole) >= 4,
        canManageUsers: roleLevel(userRole) >= 5,
        isDesigner: userRole === "designer",
      }}
    >
      {children}
    </PlatformAuthContext.Provider>
  );
}

export function usePlatformAuth() {
  const ctx = useContext(PlatformAuthContext);
  if (!ctx) throw new Error("usePlatformAuth must be used within PlatformAuthProvider");
  return ctx;
}
