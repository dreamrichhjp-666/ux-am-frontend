import { useState } from "react";
import { Link, useLocation } from "wouter";
import { usePlatformAuth } from "@/contexts/PlatformAuthContext";
import {
  LayoutDashboard,
  Users,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Palette,
  ChevronLeft,
  ChevronRight,
  Image,
  FolderOpen,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link as WouterLink } from "wouter";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "总览", path: "/", roles: ["super_admin", "pm_manager", "team_lead", "designer", "viewer"] },
  { icon: Users, label: "设计师", path: "/designers", roles: ["super_admin", "pm_manager", "team_lead", "designer", "viewer"] },
  { icon: Image, label: "作品集", path: "/portfolios", roles: ["super_admin", "pm_manager", "team_lead", "designer", "viewer"] },
  { icon: Calendar, label: "排期管理", path: "/schedule", roles: ["super_admin", "pm_manager", "team_lead", "designer", "viewer"] },
  { icon: FolderOpen, label: "项目管理", path: "/projects", roles: ["super_admin", "pm_manager"] },
  { icon: BarChart3, label: "经营数据", path: "/analytics", roles: ["super_admin", "pm_manager", "team_lead"] },
  { icon: Settings, label: "用户管理", path: "/users", roles: ["super_admin"] },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();
  const { user, logout } = usePlatformAuth();

  const handleLogout = async () => {
    await logout();
    toast.success("已退出登录");
  };

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !user?.platformRole || item.roles.includes(user.platformRole)
  );

  const roleLabel: Record<string, string> = {
    super_admin: "超级管理员",
    pm_manager: "PM经理",
    team_lead: "组长",
    designer: "设计师",
    viewer: "访客",
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "oklch(0.98 0.005 250)" }}>
      {/* 侧边栏 */}
      <aside
        className="flex flex-col transition-all duration-300 flex-shrink-0"
        style={{
          width: collapsed ? "64px" : "220px",
          background: "oklch(0.16 0.04 255)",
          borderRight: "1px solid oklch(0.22 0.04 255)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 flex-shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "oklch(0.55 0.2 265)" }}
          >
            <Palette className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-white font-bold text-sm leading-tight">UX Design</div>
              <div className="text-xs leading-tight" style={{ color: "oklch(0.5 0.03 250)" }}>
                中台管理平台
              </div>
            </div>
          )}
        </div>

        {/* 导航 */}
        <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive = location === item.path || location.startsWith(item.path + "/");
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={cn("sidebar-nav-item", isActive && "active")}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* 用户信息 + 折叠按钮 */}
        <div className="flex-shrink-0 p-3 border-t" style={{ borderColor: "oklch(0.22 0.04 255)" }}>
          {!collapsed && user && (
            <div className="flex items-center gap-2 mb-3 px-1">
              <Avatar className="w-7 h-7 flex-shrink-0">
                <AvatarFallback
                  className="text-xs font-bold text-white"
                  style={{ background: "oklch(0.55 0.2 265)" }}
                >
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="overflow-hidden flex-1">
                <div className="text-xs font-medium text-white truncate">{user.name}</div>
                <div className="text-xs truncate" style={{ color: "oklch(0.5 0.03 250)" }}>
                  {roleLabel[user.platformRole] || user.platformRole}
                </div>
              </div>
            </div>
          )}

          <div className={cn("flex", collapsed ? "flex-col gap-2" : "gap-2")}>
            <WouterLink href="/profile">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 h-8 text-xs justify-start gap-2"
                style={{ color: "oklch(0.55 0.03 250)" }}
                title="个人信息"
              >
                <UserCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {!collapsed && "我的"}
              </Button>
            </WouterLink>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs justify-start gap-2"
              style={{ color: "oklch(0.55 0.03 250)" }}
              onClick={handleLogout}
              title="退出登录"
            >
              <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
              {!collapsed && "退出"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 flex-shrink-0"
              style={{ color: "oklch(0.55 0.03 250)" }}
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "展开侧边栏" : "收起侧边栏"}
            >
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
