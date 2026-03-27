import { eq, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  platformUsers,
  designers,
  portfolios,
  projects,
  schedules,
  type InsertPlatformUser,
  type InsertDesigner,
  type InsertPortfolio,
  type InsertProject,
  type InsertSchedule,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import crypto from "crypto";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "ux-am-salt-2026").digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Platform Users
export async function getPlatformUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(platformUsers).where(eq(platformUsers.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPlatformUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(platformUsers).where(eq(platformUsers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllPlatformUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(platformUsers).orderBy(asc(platformUsers.id));
}

export async function createPlatformUser(data: InsertPlatformUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(platformUsers).values(data);
}

export async function updatePlatformUser(id: number, data: Partial<InsertPlatformUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(platformUsers).set(data).where(eq(platformUsers.id, id));
}

export async function deletePlatformUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(platformUsers).where(eq(platformUsers.id, id));
}

export async function initDefaultUsers() {
  const db = await getDb();
  if (!db) return;
  const defaultUsers = [
    { username: "admin", password: "admin123", name: "系统管理员", platformRole: "super_admin", dept: "UX中台" },
    { username: "pm", password: "pm123", name: "PM负责人", platformRole: "pm_manager", dept: "UX中台" },
    { username: "gui-lead", password: "gui123", name: "GUI组长", platformRole: "team_lead", dept: "GUI风格组" },
    { username: "vx-lead", password: "vx123", name: "VX组长", platformRole: "team_lead", dept: "VX风格组" },
    { username: "icon-lead", password: "icon123", name: "图标组长", platformRole: "team_lead", dept: "图标风格组" },
  ];
  for (const u of defaultUsers) {
    const existing = await getPlatformUserByUsername(u.username);
    if (!existing) {
      await db.insert(platformUsers).values({ username: u.username, passwordHash: hashPassword(u.password), name: u.name, platformRole: u.platformRole, dept: u.dept, status: "active" });
    }
  }
}

// Designers
export async function getAllDesigners() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(designers).where(eq(designers.isActive, true)).orderBy(asc(designers.id));
}

export async function getDesignerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(designers).where(eq(designers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createDesigner(data: InsertDesigner) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(designers).values(data);
}

export async function updateDesigner(id: number, data: Partial<InsertDesigner>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(designers).set(data).where(eq(designers.id, id));
}

export async function initDefaultDesigners() {
  const db = await getDb();
  if (!db) return;
  const count = await db.select().from(designers);
  if (count.length > 0) return;
  const defaultDesigners: InsertDesigner[] = [
    { name: "张玉龙", roleType: "GUI", styleTags: ["欧美", "国风写实", "二次元", "科幻"], status: "busy", am: "陈思敏" },
    { name: "张成成", roleType: "GUI", styleTags: ["二次元", "欧美", "国风写实"], status: "busy", am: "陈思敏" },
    { name: "刘俊利", roleType: "GUI", styleTags: ["二次元", "国风", "科幻", "Q版", "写实", "GB"], status: "busy", am: "杜婷婷" },
    { name: "徐山山", roleType: "GUI", styleTags: ["国风写实", "GB"], status: "busy", am: "" },
    { name: "徐梓炜", roleType: "GUI", styleTags: ["二次元", "国风", "欧美", "复古", "赛博", "头大兵", "美式漫画", "暗黑"], status: "busy", am: "" },
    { name: "沙景豪", roleType: "GUI", styleTags: ["欧美", "科幻", "复古", "东方", "国潮"], status: "busy", am: "杜婷婷" },
    { name: "曹政", roleType: "VX", styleTags: ["VX作品集"], status: "busy", am: "" },
    { name: "张丽珠", roleType: "VX", styleTags: ["VX作品集"], status: "busy", am: "" },
    { name: "何文顺", roleType: "VX", styleTags: ["二次元", "国风", "卡通", "欧美"], status: "busy", am: "陈思敏" },
    { name: "刘长林", roleType: "ICON", styleTags: ["写实"], status: "available", am: "" },
    { name: "潘玉盈", roleType: "ICON", styleTags: ["写实", "二次元", "国风", "Q版", "欧美"], status: "available", am: "" },
    { name: "邵恩临", roleType: "ICON", styleTags: ["写实"], status: "busy", am: "" },
  ];
  for (const d of defaultDesigners) {
    await db.insert(designers).values(d);
  }
}

// Portfolios
export async function getPortfoliosByDesigner(designerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(portfolios).where(eq(portfolios.designerId, designerId)).orderBy(desc(portfolios.isFeatured), desc(portfolios.sortOrder), desc(portfolios.createdAt));
}

export async function getPortfolioById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(portfolios).where(eq(portfolios.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createPortfolio(data: InsertPortfolio) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(portfolios).values(data);
}

export async function updatePortfolio(id: number, data: Partial<InsertPortfolio>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(portfolios).set(data).where(eq(portfolios.id, id));
}

export async function deletePortfolio(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(portfolios).where(eq(portfolios.id, id));
}

// Projects
export async function getAllProjects() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createProject(data: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(projects).values(data);
}

export async function updateProject(id: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(projects).set(data).where(eq(projects.id, id));
}

export async function deleteProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(projects).where(eq(projects.id, id));
}

export async function initDefaultProjects() {
  const db = await getDb();
  if (!db) return;
  const count = await db.select().from(projects);
  if (count.length > 0) return;
  const colors = ["#7C3AED", "#EA580C", "#059669", "#3B6EE8", "#DC2626", "#D97706", "#0891B2", "#9333EA"];
  const defaultProjects: InsertProject[] = [
    { name: "S11-新赛季/黄金周包装设计", code: "S11", status: "active", startDate: "2026-03-01", endDate: "2026-05-30", pm: "陈思敏", color: colors[0] },
    { name: "X57视觉风格包装设计", code: "X57", status: "active", startDate: "2026-03-01", endDate: "2026-06-12", pm: "吴思琪", color: colors[1] },
    { name: "M2 & P21", code: "M2P21", status: "active", startDate: "2026-03-01", endDate: "2026-12-31", pm: "陈思敏", color: colors[2] },
    { name: "X56风格支援", code: "X56", status: "active", startDate: "2026-02-01", endDate: "2026-03-31", pm: "陈思敏", color: colors[3] },
    { name: "Next 01", code: "NEXT01", status: "active", startDate: "2026-03-09", endDate: "2026-03-31", pm: "陈思敏", color: colors[4] },
    { name: "S3", code: "S3", status: "active", startDate: "2026-03-14", endDate: "2026-03-24", pm: "", color: colors[5] },
    { name: "常驻S9项目", code: "S9", status: "active", startDate: "2026-01-01", endDate: "2026-12-31", pm: "", color: colors[6] },
    { name: "支援S9版本内容", code: "S9-SUP", status: "active", startDate: "2026-01-09", endDate: "2026-04-30", pm: "", color: colors[7] },
  ];
  for (const p of defaultProjects) {
    await db.insert(projects).values(p);
  }
}

// Schedules
export async function getAllSchedules() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(schedules).orderBy(asc(schedules.startDate));
}

export async function getSchedulesByDesigner(designerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(schedules).where(eq(schedules.designerId, designerId));
}

export async function getSchedulesByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(schedules).where(eq(schedules.projectId, projectId));
}

export async function createSchedule(data: InsertSchedule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(schedules).values(data);
}

export async function updateSchedule(id: number, data: Partial<InsertSchedule>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(schedules).set(data).where(eq(schedules.id, id));
}

export async function deleteSchedule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(schedules).where(eq(schedules.id, id));
}

export async function initDefaultSchedules() {
  const db = await getDb();
  if (!db) return;
  const count = await db.select().from(schedules);
  if (count.length > 0) return;
  const defaultSchedules: InsertSchedule[] = [
    { projectId: 1, designerId: 1, roleType: "GUI", startDate: "2026-03-01", endDate: "2026-05-30" },
    { projectId: 1, designerId: 2, roleType: "GUI", startDate: "2026-03-01", endDate: "2026-05-30" },
    { projectId: 1, designerId: 3, roleType: "GUI", startDate: "2026-03-01", endDate: "2026-05-30" },
    { projectId: 1, designerId: 5, roleType: "GUI", startDate: "2026-03-01", endDate: "2026-05-30" },
    { projectId: 1, designerId: 6, roleType: "GUI", startDate: "2026-03-01", endDate: "2026-05-30" },
    { projectId: 3, designerId: 9, roleType: "VX", startDate: "2026-03-01", endDate: "2026-12-31" },
    { projectId: 5, designerId: 9, roleType: "VX", startDate: "2026-03-09", endDate: "2026-03-31" },
    { projectId: 3, designerId: 2, roleType: "GUI", startDate: "2026-03-01", endDate: "2026-12-31" },
    { projectId: 4, designerId: 6, roleType: "GUI", startDate: "2026-02-01", endDate: "2026-03-31" },
    { projectId: 7, designerId: 3, roleType: "GUI", startDate: "2026-01-01", endDate: "2026-12-31" },
    { projectId: 2, designerId: 4, roleType: "GUI", startDate: "2026-03-01", endDate: "2026-05-01" },
    { projectId: 2, designerId: 4, roleType: "GUI", startDate: "2026-05-17", endDate: "2026-06-12" },
    { projectId: 6, designerId: 12, roleType: "ICON", startDate: "2026-03-14", endDate: "2026-03-24" },
    { projectId: 1, designerId: 12, roleType: "ICON", startDate: "2026-03-04", endDate: "2026-03-13" },
    { projectId: 8, designerId: 2, roleType: "GUI", startDate: "2026-01-09", endDate: "2026-04-30" },
    { projectId: 3, designerId: 7, roleType: "VX", startDate: "2026-03-01", endDate: "2026-12-31" },
    { projectId: 3, designerId: 8, roleType: "VX", startDate: "2026-03-01", endDate: "2026-12-31" },
  ];
  for (const s of defaultSchedules) {
    await db.insert(schedules).values(s);
  }
}
