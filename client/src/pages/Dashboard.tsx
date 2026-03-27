import { trpc } from "@/lib/trpc";
import { usePlatformAuth } from "@/contexts/PlatformAuthContext";
import { Loader2, Users, Briefcase, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useMemo, useState } from "react";

const ROLE_COLORS: Record<string, string> = {
  GUI: "#7C3AED",
  VX: "#EA580C",
  ICON: "#059669",
};

const STATUS_COLORS = {
  busy: "#EF4444",
  available: "#10B981",
  leave: "#9CA3AF",
};

export default function Dashboard() {
  const { user } = usePlatformAuth();
  const [selectedYear] = useState(new Date().getFullYear());

  const { data: overview, isLoading } = trpc.analytics.overview.useQuery();
  const { data: monthly } = trpc.analytics.monthlyUtilization.useQuery({ year: selectedYear });
  const { data: designers } = trpc.designers.list.useQuery();
  const { data: schedules } = trpc.schedules.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();

  const statusData = useMemo(() => {
    if (!overview) return [];
    return [
      { name: "忙碌", value: overview.busyCount, color: STATUS_COLORS.busy },
      { name: "空闲", value: overview.availableCount, color: STATUS_COLORS.available },
      { name: "请假", value: overview.leaveCount, color: STATUS_COLORS.leave },
    ].filter((d) => d.value > 0);
  }, [overview]);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // 今日有排期的设计师
  const todayBusyDesigners = useMemo(() => {
    if (!schedules || !designers) return [];
    const busyIds = new Set(
      schedules
        .filter((s) => s.startDate <= todayStr && s.endDate >= todayStr)
        .map((s) => s.designerId)
    );
    return designers.filter((d) => busyIds.has(d.id));
  }, [schedules, designers, todayStr]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页头 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">总览</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {today.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
          {user && <span className="ml-2">· 欢迎回来，{user.name}</span>}
        </p>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">设计师总数</p>
                <p className="stat-number mt-1" style={{ color: "#7C3AED" }}>{overview?.totalDesigners ?? 0}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F3F0FF" }}>
                <Users className="w-5 h-5" style={{ color: "#7C3AED" }} />
              </div>
            </div>
            <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
              <span>GUI {overview?.roleStats.find(r => r.role === "GUI")?.total ?? 0}</span>
              <span>VX {overview?.roleStats.find(r => r.role === "VX")?.total ?? 0}</span>
              <span>ICON {overview?.roleStats.find(r => r.role === "ICON")?.total ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">活跃项目</p>
                <p className="stat-number mt-1" style={{ color: "#EA580C" }}>{overview?.activeProjects ?? 0}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#FFF3EE" }}>
                <Briefcase className="w-5 h-5" style={{ color: "#EA580C" }} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              共 {projects?.length ?? 0} 个项目
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">当月人效</p>
                <p className="stat-number mt-1" style={{ color: "#059669" }}>{overview?.avgUtilization ?? 0}%</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#ECFDF5" }}>
                <TrendingUp className="w-5 h-5" style={{ color: "#059669" }} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              平均排期覆盖率
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">今日在岗</p>
                <p className="stat-number mt-1" style={{ color: "#3B82F6" }}>{todayBusyDesigners.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#EFF6FF" }}>
                <Clock className="w-5 h-5" style={{ color: "#3B82F6" }} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              空闲 {(overview?.totalDesigners ?? 0) - todayBusyDesigners.length} 人
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 图表区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 月度人效趋势 */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">月度人效趋势（{selectedYear}年）</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly ?? []} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="monthName" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
                <Tooltip
                  formatter={(value) => [`${value}%`, "人效"]}
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                />
                <Bar dataKey="utilization" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 忙闲占比 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">当前忙闲占比</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 职能分组统计 + 今日在岗 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 职能分组 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">职能分组状态</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {overview?.roleStats.map((stat) => (
              <div key={stat.role}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ background: ROLE_COLORS[stat.role] }}
                    />
                    <span className="text-sm font-medium">{stat.role} 设计师</span>
                    <span className="text-xs text-muted-foreground">共 {stat.total} 人</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-red-500">忙碌 {stat.busy}</span>
                    <span className="text-green-600">空闲 {stat.available}</span>
                    {stat.leave > 0 && <span className="text-gray-400">请假 {stat.leave}</span>}
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${stat.total > 0 ? (stat.busy / stat.total) * 100 : 0}%`,
                      background: ROLE_COLORS[stat.role],
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 今日在岗设计师 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">今日在岗设计师</CardTitle>
          </CardHeader>
          <CardContent>
            {todayBusyDesigners.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                今日暂无排期数据
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {todayBusyDesigners.map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: ROLE_COLORS[d.roleType] || "#7C3AED" }}
                      >
                        {d.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-xs px-2 py-0"
                        style={{
                          color: ROLE_COLORS[d.roleType],
                          borderColor: ROLE_COLORS[d.roleType] + "40",
                          background: ROLE_COLORS[d.roleType] + "10",
                        }}
                      >
                        {d.roleType}
                      </Badge>
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
