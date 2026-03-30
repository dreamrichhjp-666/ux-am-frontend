import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, Users, Clock, BarChart2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";

const ROLE_COLORS: Record<string, string> = {
  GUI: "#7C3AED",
  VX: "#EA580C",
  ICON: "#059669",
};

const CURRENT_YEAR = new Date().getFullYear();

export default function Analytics() {
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedRole, setSelectedRole] = useState("all");

  const { data: overview, isLoading: overviewLoading } = trpc.analytics.overview.useQuery();
  const { data: monthly, isLoading: monthlyLoading } = trpc.analytics.monthlyUtilization.useQuery({
    year: selectedYear,
    roleType: selectedRole === "all" ? undefined : selectedRole,
  });
  const { data: designers } = trpc.designers.list.useQuery();
  const { data: schedules } = trpc.schedules.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();


  // 计算每位设计师的年度人效
  const designerEfficiency = useMemo(() => {
    if (!designers || !schedules) return [];
    const year = selectedYear;
    const totalDaysInYear = 365;

    return (designers ?? [])
      .filter((d) => selectedRole === "all" || d.roleType === selectedRole)
      .map((designer) => {
        const designerSchedules = schedules.filter((s) => s.designerId === designer.id);
        let workDays = 0;
        // 统计全年工作日
        for (let month = 1; month <= 12; month++) {
          const daysInMonth = new Date(year, month, 0).getDate();
          for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            if (designerSchedules.some((s) => s.startDate <= dateStr && s.endDate >= dateStr)) workDays++;
          }
        }
        const efficiency = Math.round((workDays / totalDaysInYear) * 100);
        return {
          name: designer.name,
          roleType: designer.roleType,
          workDays,
          efficiency,
          projectCount: new Set(designerSchedules.map((s) => s.projectId)).size,
        };
      })
      .sort((a, b) => b.efficiency - a.efficiency);
  }, [designers, schedules, selectedYear, selectedRole]);

  // 忙闲分布数据
  const busyIdleData = useMemo(() => {
    if (!monthly) return [];
    return monthly.map((m) => ({
      ...m,
      idle: m.totalDesigners - m.busyCount,
    }));
  }, [monthly]);

  // 职能分布雷达图数据
  const roleRadarData = useMemo(() => {
    if (!overview) return [];
    const metrics = ["总人数", "忙碌", "空闲", "人效"];
    return overview.roleStats.map((stat) => {
      const workDays = overview.designerWorkDays?.filter((d: any) => d.roleType === stat.role) ?? [];
      const avgEff = workDays.length > 0
        ? Math.round(workDays.reduce((s: number, d: any) => s + d.workDays / d.totalDays, 0) / workDays.length * 100)
        : 0;
      return {
        role: stat.role,
        总人数: stat.total * 10,
        忙碌: stat.busy * 10,
        空闲: stat.available * 10,
        人效: avgEff,
      };
    });
  }, [overview]);

  const isLoading = overviewLoading || monthlyLoading;

  const [isExporting, setIsExporting] = useState(false);

  const handleExportAnalytics = async () => {
    setIsExporting(true);
    try {
      const utils = trpc.useUtils();
      const result = await utils.export.analytics.fetch();
      if (result.success && result.data) {
        const link = document.createElement('a');
        link.href = `data:application/octet-stream;base64,${result.data}`;
        link.download = `人效分析_${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
      }
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">经营数据</h1>
          <p className="text-sm text-muted-foreground mt-1">设计中台人效分析与运营洞察</p>
        </div>
        <Button onClick={handleExportAnalytics} disabled={isExporting} className="gap-2">
          <Download className="w-4 h-4" />
          {isExporting ? '导出中...' : '导出Excel'}
        </Button>
        <div className="flex gap-2">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-24 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}年</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-24 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="GUI">GUI</SelectItem>
              <SelectItem value="VX">VX</SelectItem>
              <SelectItem value="ICON">ICON</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 核心KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "年均人效",
            value: `${monthly ? Math.round(monthly.reduce((s, m) => s + m.utilization, 0) / (monthly.filter(m => m.utilization > 0).length || 1)) : 0}%`,
            icon: TrendingUp,
            color: "#7C3AED",
            bg: "#F3F0FF",
            desc: "排期覆盖率均值",
          },
          {
            label: "活跃设计师",
            value: overview?.totalDesigners ?? 0,
            icon: Users,
            color: "#3B82F6",
            bg: "#EFF6FF",
            desc: `忙碌 ${overview?.busyCount ?? 0} 人`,
          },
          {
            label: "进行中项目",
            value: overview?.activeProjects ?? 0,
            icon: BarChart2,
            color: "#059669",
            bg: "#ECFDF5",
            desc: `共 ${projects?.length ?? 0} 个项目`,
          },
          {
            label: "当月排期数",
            value: overview?.activeSchedules ?? 0,
            icon: Clock,
            color: "#EA580C",
            bg: "#FFF3EE",
            desc: "本月活跃排期",
          },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: kpi.color }}>{kpi.value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: kpi.bg }}>
                  <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{kpi.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 月度趋势 + 忙闲分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">月度人效趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthly ?? []} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="monthName" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                <Tooltip
                  formatter={(value) => [`${value}%`, "人效"]}
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                />
                <Line
                  type="monotone"
                  dataKey="utilization"
                  stroke="#7C3AED"
                  strokeWidth={2.5}
                  dot={{ fill: "#7C3AED", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">月度忙闲分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={busyIdleData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="monthName" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="busyCount" name="忙碌" fill="#EF4444" radius={[2, 2, 0, 0]} stackId="a" />
                <Bar dataKey="idle" name="空闲" fill="#10B981" radius={[2, 2, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 设计师人效排行 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            设计师人效排行（{selectedYear}年）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : designerEfficiency.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">暂无数据</div>
          ) : (
            <div className="space-y-3">
              {designerEfficiency.map((d, index) => (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-6 text-right flex-shrink-0">
                    {index + 1}
                  </span>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: ROLE_COLORS[d.roleType] }}
                  >
                    {d.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{d.name}</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{d.workDays} 天</span>
                        <span>{d.projectCount} 个项目</span>
                        <span className="font-semibold" style={{ color: ROLE_COLORS[d.roleType] }}>
                          {d.efficiency}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${d.efficiency}%`,
                          background: ROLE_COLORS[d.roleType],
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 职能分组对比 */}
      {overview && overview.roleStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {overview.roleStats.map((stat) => {
            const workDays = (overview.designerWorkDays ?? []).filter((d: any) => d.roleType === stat.role);
            const avgEff = workDays.length > 0
              ? Math.round(workDays.reduce((s: number, d: any) => s + d.workDays / d.totalDays, 0) / workDays.length * 100)
              : 0;
            return (
              <Card key={stat.role} className="border-0 shadow-sm">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: ROLE_COLORS[stat.role] }} />
                    <span className="font-semibold">{stat.role} 设计师</span>
                    <span className="text-sm text-muted-foreground ml-auto">{stat.total} 人</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">忙碌</span>
                      <span className="font-medium text-red-500">{stat.busy} 人</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">空闲</span>
                      <span className="font-medium text-green-600">{stat.available} 人</span>
                    </div>
                    {stat.leave > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">请假</span>
                        <span className="font-medium text-gray-400">{stat.leave} 人</span>
                      </div>
                    )}
                    <div className="pt-2 border-t flex justify-between">
                      <span className="text-muted-foreground">当月人效</span>
                      <span className="font-bold" style={{ color: ROLE_COLORS[stat.role] }}>{avgEff}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
