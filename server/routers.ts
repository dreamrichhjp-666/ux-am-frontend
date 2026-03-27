import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  getPlatformUserByUsername,
  getPlatformUserById,
  getAllPlatformUsers,
  createPlatformUser,
  updatePlatformUser,
  deletePlatformUser,
  getAllDesigners,
  getDesignerById,
  createDesigner,
  updateDesigner,
  getPortfoliosByDesigner,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getAllSchedules,
  getSchedulesByDesigner,
  getSchedulesByProject,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  hashPassword,
  verifyPassword,
  initDefaultUsers,
  initDefaultDesigners,
  initDefaultProjects,
  initDefaultSchedules,
} from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

const ROLES: Record<string, number> = {
  super_admin: 5,
  pm_manager: 4,
  team_lead: 3,
  designer: 2,
  viewer: 1,
};

function requireRole(role: string, minRole: string) {
  const userLevel = ROLES[role] ?? 0;
  const minLevel = ROLES[minRole] ?? 99;
  if (userLevel < minLevel) {
    throw new TRPCError({ code: "FORBIDDEN", message: "权限不足" });
  }
}

async function getPlatformSession(ctx: any) {
  const token = ctx.req.cookies?.["platform_session"];
  if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
  const { jwtVerify } = await import("jose");
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "ux-am-secret-key");
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as {
      platformUserId: number;
      username: string;
      name: string;
      platformRole: string;
      designerId: number | null;
    };
  } catch {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "登录已过期，请重新登录" });
  }
}

// Platform Auth
const platformAuthRouter = router({
  login: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await initDefaultUsers();
      const user = await getPlatformUserByUsername(input.username);
      if (!user || !verifyPassword(input.password, user.passwordHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "用户名或密码错误" });
      }
      if (user.status !== "active") {
        throw new TRPCError({ code: "FORBIDDEN", message: "账号已被禁用" });
      }
      const { SignJWT } = await import("jose");
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "ux-am-secret-key");
      const token = await new SignJWT({
        platformUserId: user.id,
        username: user.username,
        name: user.name,
        platformRole: user.platformRole,
        designerId: user.designerId ?? null,
        dept: user.dept ?? null,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .sign(secret);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie("platform_session", token, cookieOptions);
      return {
        success: true,
        user: { id: user.id, username: user.username, name: user.name, platformRole: user.platformRole, designerId: user.designerId, dept: user.dept },
      };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie("platform_session", { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.req.cookies?.["platform_session"];
    if (!token) return null;
    try {
      const { jwtVerify } = await import("jose");
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "ux-am-secret-key");
      const { payload } = await jwtVerify(token, secret);
      return {
        id: payload.platformUserId as number,
        username: payload.username as string,
        name: payload.name as string,
        platformRole: payload.platformRole as string,
        designerId: (payload.designerId as number) ?? null,
        dept: (payload.dept as string) ?? null,
      };
    } catch {
      return null;
    }
  }),

  changePassword: publicProcedure
    .input(z.object({ oldPassword: z.string(), newPassword: z.string().min(6) }))
    .mutation(async ({ input, ctx }) => {
      const session = await getPlatformSession(ctx);
      const user = await getPlatformUserById(session.platformUserId);
      if (!user || !verifyPassword(input.oldPassword, user.passwordHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "原密码错误" });
      }
      await updatePlatformUser(session.platformUserId, { passwordHash: hashPassword(input.newPassword) });
      return { success: true };
    }),
});

// Users Management
const usersRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const session = await getPlatformSession(ctx);
    requireRole(session.platformRole, "pm_manager");
    return getAllPlatformUsers();
  }),

  create: publicProcedure
    .input(z.object({ username: z.string().min(2), password: z.string().min(6), name: z.string().min(1), platformRole: z.string(), designerId: z.number().nullable().optional(), dept: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getPlatformSession(ctx);
      requireRole(session.platformRole, "super_admin");
      const existing = await getPlatformUserByUsername(input.username);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "用户名已存在" });
      await createPlatformUser({ username: input.username, passwordHash: hashPassword(input.password), name: input.name, platformRole: input.platformRole, designerId: input.designerId ?? null, dept: input.dept ?? null, status: "active" });
      return { success: true };
    }),

  update: publicProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), platformRole: z.string().optional(), designerId: z.number().nullable().optional(), dept: z.string().optional(), status: z.enum(["active", "inactive"]).optional(), newPassword: z.string().min(6).optional() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getPlatformSession(ctx);
      requireRole(session.platformRole, "super_admin");
      const { id, newPassword, ...data } = input;
      const updateData: Record<string, unknown> = { ...data };
      if (newPassword) updateData.passwordHash = hashPassword(newPassword);
      await updatePlatformUser(id, updateData as any);
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getPlatformSession(ctx);
      requireRole(session.platformRole, "super_admin");
      await deletePlatformUser(input.id);
      return { success: true };
    }),
});

// Designers
const designersRouter = router({
  list: publicProcedure.query(async () => {
    await initDefaultDesigners();
    return getAllDesigners();
  }),

  get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const designer = await getDesignerById(input.id);
    if (!designer) throw new TRPCError({ code: "NOT_FOUND" });
    return designer;
  }),

  create: publicProcedure
    .input(z.object({ name: z.string().min(1), roleType: z.string(), styleTags: z.array(z.string()).optional(), status: z.enum(["available", "busy", "leave"]).optional(), am: z.string().optional(), bio: z.string().optional(), contact: z.string().optional(), joinDate: z.string().nullable().optional() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getPlatformSession(ctx);
      requireRole(session.platformRole, "team_lead");
      await createDesigner({ name: input.name, roleType: input.roleType, styleTags: input.styleTags ?? [], status: input.status ?? "available", am: input.am ?? "", bio: input.bio ?? "", contact: input.contact ?? "", joinDate: input.joinDate ?? null, isActive: true });
      return { success: true };
    }),

  update: publicProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), roleType: z.string().optional(), styleTags: z.array(z.string()).optional(), status: z.enum(["available", "busy", "leave"]).optional(), am: z.string().optional(), bio: z.string().optional(), contact: z.string().optional(), joinDate: z.string().nullable().optional(), avatarUrl: z.string().nullable().optional() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getPlatformSession(ctx);
      const role = session.platformRole;
      if (role === "designer" && session.designerId !== input.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "只能编辑自己的信息" });
      }
      if (!["super_admin", "pm_manager", "team_lead", "designer"].includes(role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { id, ...data } = input;
      await updateDesigner(id, data as any);
      return { success: true };
    }),

  uploadAvatar: publicProcedure
    .input(z.object({ id: z.number(), fileBase64: z.string(), mimeType: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await getPlatformSession(ctx);
      const buffer = Buffer.from(input.fileBase64, "base64");
      const ext = input.mimeType.split("/")[1] || "png";
      const key = `avatars/${input.id}-${nanoid(8)}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      await updateDesigner(input.id, { avatarUrl: url });
      return { url };
    }),
});

// Portfolios
const portfoliosRouter = router({
  list: publicProcedure.input(z.object({ designerId: z.number() })).query(async ({ input }) => {
    return getPortfoliosByDesigner(input.designerId);
  }),

  listAll: publicProcedure.query(async () => {
    const { getDb } = await import('./db');
    const db = await getDb();
    if (!db) return [];
    const { portfolios } = await import('../drizzle/schema');
    const { desc } = await import('drizzle-orm');
    return db.select().from(portfolios).orderBy(desc(portfolios.isFeatured), desc(portfolios.createdAt));
  }),

  upload: publicProcedure
    .input(z.object({ designerId: z.number(), title: z.string().min(1), description: z.string().optional(), fileBase64: z.string(), mimeType: z.string(), fileType: z.string().default("image"), projectName: z.string().optional(), tags: z.array(z.string()).optional(), isFeatured: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getPlatformSession(ctx);
      const role = session.platformRole;
      if (role === "designer" && session.designerId !== input.designerId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "只能上传自己的作品" });
      }
      if (!["super_admin", "pm_manager", "team_lead", "designer"].includes(role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const buffer = Buffer.from(input.fileBase64, "base64");
      const ext = input.mimeType.split("/")[1] || "png";
      const key = `portfolios/${input.designerId}-${nanoid(8)}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      await createPortfolio({ designerId: input.designerId, title: input.title, description: input.description ?? "", fileUrl: url, fileType: input.fileType, thumbnailUrl: url, projectName: input.projectName ?? "", tags: input.tags ?? [], isFeatured: input.isFeatured ?? false, sortOrder: 0 });
      return { success: true, url };
    }),

  update: publicProcedure
    .input(z.object({ id: z.number(), title: z.string().optional(), description: z.string().optional(), projectName: z.string().optional(), tags: z.array(z.string()).optional(), isFeatured: z.boolean().optional(), sortOrder: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      await getPlatformSession(ctx);
      const { id, ...data } = input;
      await updatePortfolio(id, data as any);
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await getPlatformSession(ctx);
      await deletePortfolio(input.id);
      return { success: true };
    }),
});

// Projects
const projectsRouter = router({
  list: publicProcedure.query(async () => {
    await initDefaultProjects();
    return getAllProjects();
  }),

  get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const project = await getProjectById(input.id);
    if (!project) throw new TRPCError({ code: "NOT_FOUND" });
    return project;
  }),

  create: publicProcedure
    .input(z.object({ name: z.string().min(1), code: z.string().optional(), status: z.enum(["active", "completed", "paused", "cancelled"]).optional(), startDate: z.string().optional(), endDate: z.string().optional(), pm: z.string().optional(), description: z.string().optional(), color: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getPlatformSession(ctx);
      requireRole(session.platformRole, "pm_manager");
      await createProject(input as any);
      return { success: true };
    }),

  update: publicProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), code: z.string().optional(), status: z.enum(["active", "completed", "paused", "cancelled"]).optional(), startDate: z.string().nullable().optional(), endDate: z.string().nullable().optional(), pm: z.string().optional(), description: z.string().optional(), color: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getPlatformSession(ctx);
      requireRole(session.platformRole, "pm_manager");
      const { id, ...data } = input;
      await updateProject(id, data as any);
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getPlatformSession(ctx);
      requireRole(session.platformRole, "pm_manager");
      await deleteProject(input.id);
      return { success: true };
    }),
});

// Schedules
const schedulesRouter = router({
  list: publicProcedure.query(async () => {
    await initDefaultSchedules();
    return getAllSchedules();
  }),

  byDesigner: publicProcedure.input(z.object({ designerId: z.number() })).query(async ({ input }) => {
    return getSchedulesByDesigner(input.designerId);
  }),

  byProject: publicProcedure.input(z.object({ projectId: z.number() })).query(async ({ input }) => {
    return getSchedulesByProject(input.projectId);
  }),

  create: publicProcedure
    .input(z.object({ projectId: z.number(), designerId: z.number(), roleType: z.string(), startDate: z.string(), endDate: z.string(), workloadPercent: z.number().optional(), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getPlatformSession(ctx);
      requireRole(session.platformRole, "pm_manager");
      await createSchedule(input as any);
      return { success: true };
    }),

  update: publicProcedure
    .input(z.object({ id: z.number(), projectId: z.number().optional(), designerId: z.number().optional(), roleType: z.string().optional(), startDate: z.string().optional(), endDate: z.string().optional(), workloadPercent: z.number().optional(), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getPlatformSession(ctx);
      requireRole(session.platformRole, "pm_manager");
      const { id, ...data } = input;
      await updateSchedule(id, data as any);
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getPlatformSession(ctx);
      requireRole(session.platformRole, "pm_manager");
      await deleteSchedule(input.id);
      return { success: true };
    }),
});

// Analytics
const analyticsRouter = router({
  overview: publicProcedure.query(async () => {
    const [allDesigners, allProjects, allSchedules] = await Promise.all([getAllDesigners(), getAllProjects(), getAllSchedules()]);
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const busyCount = allDesigners.filter((d) => d.status === "busy").length;
    const availableCount = allDesigners.filter((d) => d.status === "available").length;
    const leaveCount = allDesigners.filter((d) => d.status === "leave").length;
    const activeProjects = allProjects.filter((p) => p.status === "active").length;
    const activeSchedules = allSchedules.filter((s) => String(s.startDate) <= todayStr && String(s.endDate) >= todayStr).length;
    const byRole = { GUI: allDesigners.filter((d) => d.roleType === "GUI"), VX: allDesigners.filter((d) => d.roleType === "VX"), ICON: allDesigners.filter((d) => d.roleType === "ICON") };
    const roleStats = Object.entries(byRole).map(([role, members]) => ({ role, total: members.length, busy: members.filter((d) => d.status === "busy").length, available: members.filter((d) => d.status === "available").length, leave: members.filter((d) => d.status === "leave").length }));
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const designerWorkDays = allDesigners.map((designer) => {
      const designerSchedules = allSchedules.filter((s) => s.designerId === designer.id);
      let workDays = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            if (designerSchedules.some((s) => String(s.startDate) <= dateStr && String(s.endDate) >= dateStr)) workDays++;
      }
      return { designerId: designer.id, name: designer.name, roleType: designer.roleType, workDays, totalDays: daysInMonth };
    });
    const avgUtilization = designerWorkDays.length > 0 ? Math.round((designerWorkDays.reduce((sum, d) => sum + d.workDays / d.totalDays, 0) / designerWorkDays.length) * 100) : 0;
    return { totalDesigners: allDesigners.length, busyCount, availableCount, leaveCount, activeProjects, activeSchedules, roleStats, avgUtilization, designerWorkDays };
  }),

  monthlyUtilization: publicProcedure
    .input(z.object({ year: z.number(), roleType: z.string().optional() }))
    .query(async ({ input }) => {
      const [allDesigners, allSchedules] = await Promise.all([getAllDesigners(), getAllSchedules()]);
      const filteredDesigners = input.roleType ? allDesigners.filter((d) => d.roleType === input.roleType) : allDesigners;
      return Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
        const daysInMonth = new Date(input.year, month, 0).getDate();
        let totalWorkDays = 0;
        const totalPossibleDays = filteredDesigners.length * daysInMonth;
        for (const designer of filteredDesigners) {
          const designerSchedules = allSchedules.filter((s) => s.designerId === designer.id);
          for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${input.year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            if (designerSchedules.some((s) => String(s.startDate) <= dateStr && String(s.endDate) >= dateStr)) totalWorkDays++;
          }
        }
        const utilization = totalPossibleDays > 0 ? Math.round((totalWorkDays / totalPossibleDays) * 100) : 0;
        const midMonthDate = `${input.year}-${String(month).padStart(2, "0")}-15`;
        const idleCount = filteredDesigners.filter((d) => !allSchedules.some((s) => s.designerId === d.id && String(s.startDate) <= midMonthDate && String(s.endDate) >= midMonthDate)).length;
        return { month, monthName: `${month}月`, utilization, busyCount: filteredDesigners.length - idleCount, idleCount, totalDesigners: filteredDesigners.length };
      });
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  platform: platformAuthRouter,
  users: usersRouter,
  designers: designersRouter,
  portfolios: portfoliosRouter,
  projects: projectsRouter,
  schedules: schedulesRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
