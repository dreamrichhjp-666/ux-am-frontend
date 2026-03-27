import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  boolean,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================
// 平台内部账号表（用户名密码登录，独立于Manus OAuth）
// ============================================================
export const platformUsers = mysqlTable("platform_users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 256 }).notNull(),
  name: varchar("name", { length: 64 }).notNull(),
  /** 角色：super_admin | pm_manager | team_lead | designer | viewer */
  platformRole: varchar("platformRole", { length: 32 }).notNull().default("viewer"),
  /** 关联的设计师ID（如果该账号对应一位设计师） */
  designerId: int("designerId"),
  dept: varchar("dept", { length: 64 }),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlatformUser = typeof platformUsers.$inferSelect;
export type InsertPlatformUser = typeof platformUsers.$inferInsert;

// ============================================================
// 设计师表
// ============================================================
export const designers = mysqlTable("designers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  /** 职能类型：GUI | VX | ICON */
  roleType: varchar("roleType", { length: 16 }).notNull(),
  /** 风格标签，JSON数组 */
  styleTags: json("styleTags").$type<string[]>(),
  /** 当前状态：available | busy | leave */
  status: mysqlEnum("status", ["available", "busy", "leave"]).default("available").notNull(),
  /** 对接AM */
  am: varchar("am", { length: 64 }),
  /** 头像URL（存储在S3） */
  avatarUrl: text("avatarUrl"),
  /** 个人简介 */
  bio: text("bio"),
  /** 联系方式（企业微信等） */
  contact: varchar("contact", { length: 128 }),
  /** 入职日期 (YYYY-MM-DD) */
  joinDate: varchar("joinDate", { length: 10 }),
  /** 是否在职 */
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Designer = typeof designers.$inferSelect;
export type InsertDesigner = typeof designers.$inferInsert;

// ============================================================
// 作品集表（设计师代表作品）
// ============================================================
export const portfolios = mysqlTable("portfolios", {
  id: int("id").autoincrement().primaryKey(),
  designerId: int("designerId").notNull(),
  /** 作品标题 */
  title: varchar("title", { length: 128 }).notNull(),
  /** 作品描述 */
  description: text("description"),
  /** 文件URL（存储在S3） */
  fileUrl: text("fileUrl").notNull(),
  /** 文件类型：image | gif | video */
  fileType: varchar("fileType", { length: 16 }).notNull().default("image"),
  /** 缩略图URL */
  thumbnailUrl: text("thumbnailUrl"),
  /** 所属项目名称（可选） */
  projectName: varchar("projectName", { length: 128 }),
  /** 风格标签 */
  tags: json("tags").$type<string[]>(),
  /** 排序权重（越大越靠前） */
  sortOrder: int("sortOrder").default(0),
  /** 是否为代表作（置顶展示） */
  isFeatured: boolean("isFeatured").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Portfolio = typeof portfolios.$inferSelect;
export type InsertPortfolio = typeof portfolios.$inferInsert;

// ============================================================
// 项目表
// ============================================================
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  /** 项目代号 */
  code: varchar("code", { length: 32 }),
  /** 项目状态：active | completed | paused | cancelled */
  status: mysqlEnum("status", ["active", "completed", "paused", "cancelled"]).default("active").notNull(),
  startDate: varchar("startDate", { length: 10 }),
  endDate: varchar("endDate", { length: 10 }),
  /** 对接PM */
  pm: varchar("pm", { length: 64 }),
  /** 项目描述 */
  description: text("description"),
  /** 项目颜色（用于甘特图显示） */
  color: varchar("color", { length: 16 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ============================================================
// 排期表（设计师-项目分配关系）
// ============================================================
export const schedules = mysqlTable("schedules", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  designerId: int("designerId").notNull(),
  /** 职能类型（冗余字段，方便查询） */
  roleType: varchar("roleType", { length: 16 }).notNull(),
  startDate: varchar("startDate", { length: 10 }).notNull(),
  endDate: varchar("endDate", { length: 10 }).notNull(),
  /** 工作比例（0-100，100表示全职） */
  workloadPercent: int("workloadPercent").default(100),
  /** 备注 */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = typeof schedules.$inferInsert;