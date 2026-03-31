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

const MONTH_COLORS = [
  "#7C3AED", "#EA580C", "#059669", "#3B82F6", "#EC4899", "#F59E0B",
  "#06B6D4", "#EF4444", "#8B5CF6", "#10B981", "#F97316", "#6366F1"
];

const PROJECT_PALETTE = [
  "#7C3AED", "#EA580C", "#059669", "#3B82F6", "#EC4899",
  "#F59E0B", "#06B6D4", "#EF4444", "#8B5CF6", "#10B981",
];

const MONTH_NAMES = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

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

// 获取日期所在的月份（1-12）
const getMonthFromDate = (dateStr: string) => {
  return parseInt(dateStr.split("-")[1]);
};

// 获取月份的天数
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month, 0).getDate();
};

export default function Schedule() {
  const { user, canManageSchedule } = usePlatformAuth();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
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

  // 筛选设计师
  const filteredDesigners = useMemo(() => {
    return (designers ?? []).filter((d) => {
      if (filterRole !== "all" && d.roleType !== filterRole) return false;
      return true;
    });
  }, [designers, filterRole]);

  // 获取设计师在指定月份的排期
  const getDesignerMonthSchedules = (designerId: number, month: number) => {
    const monthStart = `${viewYear}-${String(month).padStart(2, "0")}-01`;
    const monthEnd = `${viewYear}-${String(month).padStart(2, "0")}-${String(getDaysInMonth(viewYear, month)).padStart(2, "0")}`;
    return (schedules ?? []).filter(
      (s) =>
        s.designerId === designerId &&
        s.startDate <= monthEnd &&
        s.endDate >= monthStart
    );
  };

  // 计算甘特条在月份中的位置和宽度
  const getBarStyle = (schedule: any, month: number) => {
    const monthStart = `${viewYear}-${String(month).padStart(2, "0")}-01`;
    const monthEnd = `${viewYear}-${String(month).padStart(2, "0")}-${String(getDaysInMonth(viewYear, month)).padStart(2, "0")}`;
    const daysInMonth = getDaysInMonth(viewYear, month);

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

  // 获取排期跨越的月份
  const getScheduleSpanMonths = (schedule: any) => {
    const startMonth = getMonthFromDate(schedule.startDate);
    const endMonth = getMonthFromDate(schedule.endDate);
    const months = [];
    for (let m = startMonth; m <= endMonth; m++) {
      months.push(m);
    }
    return months;
  };

  const prevYear = () => setViewYear(viewYear - 1);
  const nextYear = () => setViewYear(viewYear + 1);

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
    
    // 检测排期冲突
    const utils = trpc.useUtils();
    try {
      const conflictCheck = await utils.schedules.checkConflicts.fetch({
        designerId: parseInt(form.designerId),
        startDate: form.startDate,
        endDate: form.endDate,
      });
      
      if (conflictCheck.hasConflicts) {
        toast.warning(`检测到 ${conflictCheck.conflictCount} 个排期冲突，但仍然保存`, { duration: 5000 });
      }
    } catch (error) {
      console.error('检测冲突失败:', error);
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
    
    // 检测排期冲突
    try {
      const conflictCheck = await utils.schedules.checkConflicts.fetch({
        designerId: editingSchedule.designerId,
        startDate: form.startDate,
        endDate: form.endDate,
        excludeScheduleId: editingSchedule.id,
      });
      
      if (conflictCheck.hasConflicts) {
        toast.warning(`检测到 ${conflictCheck.conflictCount} 个排期冲突，但仍然保存`, { duration: 5000 });
      }
    } catch (error) {
      console.error('检测冲突失败:', error);
    }
    
    await updateMutation.mutateAsync({
      id: editingSchedule.id,
      startDate: form.startDate,
      endDate: form.endDate,
      workloadPercent: parseInt(form.workloadPercent),
      notes: form.notes,
    });
  };

  const todayStr = today.toISOString().split("T")[0];
  const currentMonth = today.getFullYear() === viewYear ? today.getMonth() + 1 : null;

  const isLoading = designersLoading || schedulesLoading;

  return (
    <div className="p-6 space-y-5">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">排期管理</h1>
          <p className="text-sm text-muted-foreground mt-1">全年排期视图，以月为单位管理设计师项目排期</p>
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
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={prevYear}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-base font-semibold min-w-24 text-center">
            {viewYear}年
          </span>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={nextYear}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs ml-2"
            onClick={() => setViewYear(today.getFullYear())}
          >
            今年
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

      {/* 全年甘特图 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: "1200px" }}>
              {/* 月份头部 */}
              <div className="flex border-b bg-muted/30" style={{ paddingLeft: "160px" }}>
                {MONTH_NAMES.map((monthName, idx) => {
                  const month = idx + 1;
                  const isCurrentMonth = month === currentMonth;
                  return (
                    <div
                      key={month}
                      className="flex-1 text-center py-2 text-xs border-r last:border-r-0"
                      style={{
                        color: isCurrentMonth ? "#7C3AED" : "#6B7280",
                        fontWeight: isCurrentMonth ? "700" : "500",
                        background: isCurrentMonth ? "#F3F0FF" : undefined,
                        minWidth: "80px",
                      }}
                    >
                      {monthName}
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
                  return (
                    <div
                      key={designer.id}
                      className="flex border-b last:border-b-0 hover:bg-muted/20 transition-colors"
                      style={{ minHeight: "80px" }}
                    >
                      {/* 设计师名称 */}
                      <div
                        className="flex items-center gap-2 px-3 flex-shrink-0 border-r"
                        style={{ width: "160px", background: "white" }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: ROLE_COLORS[designer.roleType] }}
                        >
                          {designer.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{designer.name}</div>
                          <div className="text-xs text-muted-foreground">{designer.roleType}</div>
                        </div>
                      </div>

                      {/* 12个月份单元格 */}
                      <div className="flex-1 flex">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                          const monthSchedules = getDesignerMonthSchedules(designer.id, month);
                          const isCurrentMonth = month === currentMonth;
                          const daysInMonth = getDaysInMonth(viewYear, month);
                          
                          return (
                            <div
                              key={month}
                              className="flex-1 border-r last:border-r-0 relative"
                              style={{
                                background: isCurrentMonth ? "#F3F0FF" : "#FAFAFA",
                                minWidth: "80px",
                                minHeight: "80px",
                              }}
                            >
                              {/* 月份内日期细分（可选显示） */}
                              <div className="absolute inset-0 flex">
                                {Array.from({ length: Math.min(daysInMonth, 10) }, (_, i) => i + 1).map((day) => (
                                  <div
                                    key={day}
                                    className="flex-1 border-r border-dashed"
                                    style={{ borderColor: "#E5E7EB" }}
                                  />
                                ))}
                              </div>

                              {/* 排期条 */}
                              <div className="relative h-full py-1 px-0.5">
                                {monthSchedules.slice(0, 3).map((schedule, idx) => {
                                  const { left, width, color } = getBarStyle(schedule, month);
                                  const project = projects?.find((p) => p.id === schedule.projectId);
                                  return (
                                    <div
                                      key={schedule.id}
                                      className="gantt-bar-mini absolute group cursor-pointer"
                                      style={{
                                        left,
                                        width,
                                        background: color,
                                        top: `${idx * 22 + 4}px`,
                                        height: "18px",
                                        zIndex: 1,
                                        borderRadius: "2px",
                                      }}
                                      title={`${project?.name || "未知项目"} (${schedule.startDate} ~ ${schedule.endDate})`}
                                      onClick={() => canManageSchedule && openEdit(schedule)}
                                    >
                                      <span className="truncate text-[10px] text-white px-1 leading-[18px] block">
                                        {project?.name || "项目"}
                                      </span>
                                    </div>
                                  );
                                })}
                                {monthSchedules.length > 3 && (
                                  <div 
                                    className="absolute text-[10px] text-muted-foreground"
                                    style={{ bottom: "2px", right: "4px" }}
                                  >
                                    +{monthSchedules.length - 3}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
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
          {projects.filter(p => p.status === "active").slice(0, 8).map((p, i) => (
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

      {/* 月份颜色说明 */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>月份标识:</span>
        {MONTH_NAMES.map((name, idx) => (
          <span key={idx} className="flex items-center gap-1">
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ background: MONTH_COLORS[idx] }}
            />
            {name}
          </span>
        ))}
      </div>

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
