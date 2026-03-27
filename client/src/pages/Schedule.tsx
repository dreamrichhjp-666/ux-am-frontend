import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { usePlatformAuth } from "@/contexts/PlatformAuthContext";
import { toast } from "sonner";
import { Loader2, Plus, ChevronLeft, ChevronRight, Trash2, Edit2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROLE_COLORS: Record<string, string> = {
  GUI: "#7C3AED",
  VX: "#EA580C",
  ICON: "#059669",
};

const PROJECT_PALETTE = [
  "#7C3AED", "#EA580C", "#059669", "#3B82F6", "#EC4899",
  "#F59E0B", "#06B6D4", "#EF4444", "#8B5CF6", "#10B981",
];

type ScheduleForm = {
  projectId: string;
  designerId: string;
  startDate: string;
  endDate: string;
  workloadPercent: string;
  notes: string;
};

const defaultForm: ScheduleForm = {
  projectId: "",
  designerId: "",
  startDate: "",
  endDate: "",
  workloadPercent: "100",
  notes: "",
};

export default function Schedule() {
  const { user, canManageSchedule } = usePlatformAuth();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [filterRole, setFilterRole] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [form, setForm] = useState<ScheduleForm>(defaultForm);

  const utils = trpc.useUtils();
  const { data: designers, isLoading: designersLoading } = trpc.designers.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const { data: schedules, isLoading: schedulesLoading } = trpc.schedules.list.useQuery();

  const createMutation = trpc.schedules.create.useMutation({
    onSuccess: () => {
      utils.schedules.list.invalidate();
      utils.analytics.overview.invalidate();
      toast.success("排期已创建");
      setShowCreate(false);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.schedules.update.useMutation({
    onSuccess: () => {
      utils.schedules.list.invalidate();
      toast.success("排期已更新");
      setEditingSchedule(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.schedules.delete.useMutation({
    onSuccess: () => {
      utils.schedules.list.invalidate();
      utils.analytics.overview.invalidate();
      toast.success("排期已删除");
    },
    onError: (e) => toast.error(e.message),
  });

  // 计算当月天数和日期列表
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const daysList = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 筛选设计师
  const filteredDesigners = useMemo(() => {
    return (designers ?? []).filter((d) => {
      if (filterRole !== "all" && d.roleType !== filterRole) return false;
      return true;
    });
  }, [designers, filterRole]);

  // 获取设计师在某天的排期
  const getDesignerSchedulesForDay = (designerId: number, day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return (schedules ?? []).filter(
      (s) => s.designerId === designerId && s.startDate <= dateStr && s.endDate >= dateStr
    );
  };

  // 获取设计师在当月的所有排期段
  const getDesignerMonthSchedules = (designerId: number) => {
    const monthStart = `${viewYear}-${String(viewMonth).padStart(2, "0")}-01`;
    const monthEnd = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
    return (schedules ?? []).filter(
      (s) =>
        s.designerId === designerId &&
        s.startDate <= monthEnd &&
        s.endDate >= monthStart
    );
  };

  // 计算甘特条的位置和宽度
  const getBarStyle = (schedule: any) => {
    const monthStart = `${viewYear}-${String(viewMonth).padStart(2, "0")}-01`;
    const monthEnd = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    const effectiveStart = schedule.startDate < monthStart ? monthStart : schedule.startDate;
    const effectiveEnd = schedule.endDate > monthEnd ? monthEnd : schedule.endDate;

    const startDay = parseInt(effectiveStart.split("-")[2]) - 1;
    const endDay = parseInt(effectiveEnd.split("-")[2]);
    const spanDays = endDay - startDay;

    const cellWidth = 100 / daysInMonth;
    const left = startDay * cellWidth;
    const width = spanDays * cellWidth;

    const project = projects?.find((p) => p.id === schedule.projectId);
    const color = project?.color || ROLE_COLORS[schedule.roleType] || "#7C3AED";

    return { left: `${left}%`, width: `${width}%`, color };
  };

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(viewYear - 1); setViewMonth(12); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(viewYear + 1); setViewMonth(1); }
    else setViewMonth(viewMonth + 1);
  };

  const openEdit = (schedule: any) => {
    setForm({
      projectId: String(schedule.projectId),
      designerId: String(schedule.designerId),
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      workloadPercent: String(schedule.workloadPercent ?? 100),
      notes: schedule.notes ?? "",
    });
    setEditingSchedule(schedule);
  };

  const handleCreate = async () => {
    if (!form.projectId || !form.designerId || !form.startDate || !form.endDate) {
      toast.error("请填写必填项");
      return;
    }
    const designer = designers?.find((d) => d.id === parseInt(form.designerId));
    await createMutation.mutateAsync({
      projectId: parseInt(form.projectId),
      designerId: parseInt(form.designerId),
      roleType: designer?.roleType ?? "GUI",
      startDate: form.startDate,
      endDate: form.endDate,
      workloadPercent: parseInt(form.workloadPercent),
      notes: form.notes,
    });
  };

  const handleUpdate = async () => {
    if (!editingSchedule) return;
    await updateMutation.mutateAsync({
      id: editingSchedule.id,
      startDate: form.startDate,
      endDate: form.endDate,
      workloadPercent: parseInt(form.workloadPercent),
      notes: form.notes,
    });
  };

  const todayStr = today.toISOString().split("T")[0];
  const todayDay = today.getFullYear() === viewYear && today.getMonth() + 1 === viewMonth
    ? today.getDate() : null;

  const isLoading = designersLoading || schedulesLoading;

  return (
    <div className="p-6 space-y-5">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">排期管理</h1>
          <p className="text-sm text-muted-foreground mt-1">可视化甘特图，管理设计师项目排期</p>
        </div>
        {canManageSchedule && (
          <Button
            onClick={() => { setForm(defaultForm); setShowCreate(true); }}
            className="gap-2"
            style={{ background: "#7C3AED", color: "white" }}
          >
            <Plus className="w-4 h-4" />
            新建排期
          </Button>
        )}
      </div>

      {/* 控制栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-base font-semibold min-w-24 text-center">
            {viewYear}年{viewMonth}月
          </span>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs ml-2"
            onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth() + 1); }}
          >
            本月
          </Button>
        </div>

        <div className="flex gap-2">
          {["all", "GUI", "VX", "ICON"].map((role) => (
            <Button
              key={role}
              variant={filterRole === role ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              style={filterRole === role && role !== "all" ? { background: ROLE_COLORS[role], color: "white" } : {}}
              onClick={() => setFilterRole(role)}
            >
              {role === "all" ? "全部" : role}
            </Button>
          ))}
        </div>
      </div>

      {/* 甘特图 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: "800px" }}>
              {/* 日期头部 */}
              <div className="flex border-b bg-muted/30" style={{ paddingLeft: "160px" }}>
                {daysList.map((day) => {
                  const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const date = new Date(dateStr);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const isToday = day === todayDay;
                  return (
                    <div
                      key={day}
                      className="flex-1 text-center py-2 text-xs border-r last:border-r-0"
                      style={{
                        color: isToday ? "#7C3AED" : isWeekend ? "#9CA3AF" : "#6B7280",
                        fontWeight: isToday ? "700" : "400",
                        background: isToday ? "#F3F0FF" : isWeekend ? "#FAFAFA" : undefined,
                        minWidth: "28px",
                      }}
                    >
                      <div>{day}</div>
                      <div style={{ fontSize: "9px" }}>
                        {["日", "一", "二", "三", "四", "五", "六"][date.getDay()]}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 设计师行 */}
              {filteredDesigners.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  暂无设计师数据
                </div>
              ) : (
                filteredDesigners.map((designer) => {
                  const monthSchedules = getDesignerMonthSchedules(designer.id);
                  return (
                    <div
                      key={designer.id}
                      className="flex border-b last:border-b-0 hover:bg-muted/20 transition-colors"
                      style={{ minHeight: "52px" }}
                    >
                      {/* 设计师名称 */}
                      <div
                        className="flex items-center gap-2 px-3 flex-shrink-0 border-r"
                        style={{ width: "160px", background: "white" }}
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: ROLE_COLORS[designer.roleType] }}
                        >
                          {designer.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate">{designer.name}</div>
                          <div className="text-xs text-muted-foreground">{designer.roleType}</div>
                        </div>
                      </div>

                      {/* 甘特条区域 */}
                      <div className="flex-1 relative" style={{ minHeight: "52px" }}>
                        {/* 日期格线 */}
                        <div className="absolute inset-0 flex">
                          {daysList.map((day) => {
                            const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                            const date = new Date(dateStr);
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                            const isToday = day === todayDay;
                            return (
                              <div
                                key={day}
                                className="flex-1 border-r last:border-r-0"
                                style={{
                                  background: isToday ? "#F3F0FF" : isWeekend ? "#FAFAFA" : undefined,
                                  borderColor: "#F0F0F0",
                                  minWidth: "28px",
                                }}
                              />
                            );
                          })}
                        </div>

                        {/* 甘特条 */}
                        <div className="absolute inset-0 flex items-center px-0.5">
                          {monthSchedules.map((schedule, idx) => {
                            const { left, width, color } = getBarStyle(schedule);
                            const project = projects?.find((p) => p.id === schedule.projectId);
                            return (
                              <div
                                key={schedule.id}
                                className="gantt-bar absolute group"
                                style={{
                                  left,
                                  width,
                                  background: color,
                                  top: idx > 0 ? `${idx * 32 + 4}px` : "12px",
                                  zIndex: 1,
                                }}
                                title={`${project?.name || "未知项目"} (${schedule.startDate} ~ ${schedule.endDate})`}
                              >
                                <span className="truncate">{project?.name || "项目"}</span>
                                {canManageSchedule && (
                                  <div className="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0">
                                    <button
                                      className="hover:bg-white/20 rounded p-0.5"
                                      onClick={(e) => { e.stopPropagation(); openEdit(schedule); }}
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      className="hover:bg-white/20 rounded p-0.5"
                                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: schedule.id }); }}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 图例 */}
      {projects && projects.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {projects.filter(p => p.status === "active").map((p, i) => (
            <div key={p.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ background: p.color || PROJECT_PALETTE[i % PROJECT_PALETTE.length] }}
              />
              {p.name}
            </div>
          ))}
        </div>
      )}

      {/* 新建排期弹窗 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新建排期</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">项目 *</Label>
              <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择项目" />
                </SelectTrigger>
                <SelectContent>
                  {(projects ?? []).filter(p => p.status === "active").map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">设计师 *</Label>
              <Select value={form.designerId} onValueChange={(v) => setForm({ ...form, designerId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择设计师" />
                </SelectTrigger>
                <SelectContent>
                  {(designers ?? []).map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name} ({d.roleType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">开始日期 *</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">结束日期 *</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">工作比例（%）</Label>
              <Input
                type="number"
                min="10"
                max="100"
                value={form.workloadPercent}
                onChange={(e) => setForm({ ...form, workloadPercent: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">备注</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              style={{ background: "#7C3AED", color: "white" }}
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑排期弹窗 */}
      <Dialog open={!!editingSchedule} onOpenChange={(o) => !o && setEditingSchedule(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑排期</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">开始日期</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">结束日期</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">工作比例（%）</Label>
              <Input
                type="number"
                min="10"
                max="100"
                value={form.workloadPercent}
                onChange={(e) => setForm({ ...form, workloadPercent: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">备注</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSchedule(null)}>取消</Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              style={{ background: "#7C3AED", color: "white" }}
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
