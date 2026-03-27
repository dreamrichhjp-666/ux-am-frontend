import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock a super_admin platform user context
function createPlatformAdminContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      cookies: { platform_session: "mock_token" },
    } as unknown as TrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
  return { ctx };
}

describe("platform.me (unauthenticated)", () => {
  it("returns null when no session cookie is present", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
        cookies: {},
      } as unknown as TrpcContext["req"],
      res: {
        cookie: () => {},
        clearCookie: () => {},
      } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.platform.me();
    expect(result).toBeNull();
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "test-user",
        email: "test@example.com",
        name: "Test User",
        loginMethod: "manus",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {
        protocol: "https",
        headers: {},
        cookies: {},
      } as unknown as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as unknown as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe("app_session_id");
  });
});

describe("platform.login validation", () => {
  it("rejects login with empty username", async () => {
    const { ctx } = createPlatformAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.platform.login({ username: "", password: "test123" })
    ).rejects.toThrow();
  });

  it("rejects login with empty password", async () => {
    const { ctx } = createPlatformAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.platform.login({ username: "admin", password: "" })
    ).rejects.toThrow();
  });
});
