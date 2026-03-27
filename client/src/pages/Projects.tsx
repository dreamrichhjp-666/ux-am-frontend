import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePlatformAuth } from "@/contexts/PlatformAuthContext";
import { toast } from "sonner";
import { Loader2, Plus, Edit2, Trash2, FolderOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const STATUS_MAP = {
  active: { label: "进行中", color: "#059669", bg: "#ECFDF5" },
  completed: { label: "已完成", color: "#3B82F6", bg: "#EFF6FF" },
  paused: { label: "已暂停", color: "#F59E0B", bg: "#FFFBEB" },
  cancelled: { label: "已取消", color: "#9CA3AF", bg: "#F9FAFB" },
};

const PROJECT_PALETTE = [
  "#7C3AED", "#EA580C", "#059669", "#3B82F6", "#EC4899",
  "#F59E0B", "#06B6D4", "#EF4444", "#8B5CF6", "#10B981",
];

type ProjectForm = {
  name: string;
  code: string;
  status: "active" | "completed" | "paused" | "cancelled";
  startDate: string;
  endDate: string;
  pm: string;
  description: string;
  color: string;
};

const defaultForm: ProjectForm = {
  name: "",
  code: "",
  status: "active",
  startDate: "",
  endDate: "",
  pm: "",
  description: "",
  color: "#7C3AED",
};

export default function Projects() {
  const { canManageSchedule } = usePlatformAuth();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [form, setForm] = useState<ProjectForm>(defaultForm);

  const utils = trpc.useUtils();
  const { data: projects, isLoading } = trpc.projects.list.useQuery();
  const { data: schedules } = trpc.schedules.list.useQuery();

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      toast.success("项目已创建");
      setShowCreate(false);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      toast.success("项目已更新");
      setEditingProject(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      toast.success("项目已删除");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (projects ?? []).filter((p) => {
    const matchSearch = !search || p.name.includes(search) || (p.code && p.code.includes(search));
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openEdit = (project: any) => {
    setForm({
      name: project.name,
      code: project.code ?? "",
      status: project.status,
      startDate: project.startDate ?? "",
      endDate: project.endDate ?? "",
      pm: project.pm ?? "",
      description: project.description ?? "",
      color: project.color ?? "#7C3AED",
    });
    setEditingProject(project);
  };

  const getProjectDesignerCount = (projectId: number) => {
    return new Set((schedules ?? []).filter((s) => s.projectId === projectId).map((s) => s.designerId)).size;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">项目管理</h1>
          <p className="text-sm text-muted-foreground mt-1">共 {projects?.length ?? 0} 个项目</p>
        </div>
        {canManageSchedule && (
          <Button
            onClick={() => { setForm(defaultForm); setShowCreate(true); }}
            className="gap-2"
            style={{ background: "#7C3AED", color: "white" }}
          >
            <Plus className="w-4 h-4" />
            新建项目
          </Button>
        )}
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索项目名称或代号..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">进行中</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="paused">已暂停</SelectItem>
            <SelectItem value="cancelled">已取消</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 项目列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((project) => {
          const statusInfo = STATUS_MAP[project.status];
          const designerCount = getProjectDesignerCount(project.id);
          return (
            <Card key={project.id} className="border-0 shadow-sm designer-card overflow-hidden">
              <CardContent className="p-0">
                <div className="h-1.5" style={{ background: project.color || "#7C3AED" }} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate">{project.name}</h3>
                        {project.code && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">#{project.code}</span>
                        )}
                      </div>
                      {project.pm && (
                        <p className="text-xs text-muted-foreground mt-0.5">PM: {project.pm}</p>
                      )}
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                      style={{ color: statusInfo.color, background: statusInfo.bg }}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  {project.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{project.description}</p>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {project.startDate && <span>{project.startDate}</span>}
                      {project.startDate && project.endDate && <span>→</span>}
                      {project.endDate && <span>{project.endDate}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{designerCount} 位设计师</span>
                      {canManageSchedule && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground"
                            onClick={() => openEdit(project)}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteMutation.mutate({ id: project.id })}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>暂无项目数据</p>
        </div>
      )}

      {/* 新建/编辑弹窗 */}
      {[
        { open: showCreate, onClose: () => setShowCreate(false), title: "新建项目", onSave: () => createMutation.mutateAsync({ ...form, startDate: form.startDate || undefined, endDate: form.endDate || undefined }), isPending: createMutation.isPending },
        { open: !!editingProject, onClose: () => setEditingProject(null), title: "编辑项目", onSave: () => updateMutation.mutateAsync({ id: editingProject.id, ...form, startDate: form.startDate || undefined, endDate: form.endDate || undefined }), isPending: updateMutation.isPending },
      ].map(({ open, onClose, title, onSave, isPending }) => (
        <Dialog key={title} open={open} onOpenChange={(o) => !o && onClose()}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-sm">项目名称 *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">项目代号</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="如 PRJ-001" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">状态</Label>
                  <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">进行中</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                      <SelectItem value="paused">已暂停</SelectItem>
                      <SelectItem value="cancelled">已取消</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">开始日期</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">结束日期</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">对接PM</Label>
                  <Input value={form.pm} onChange={(e) => setForm({ ...form, pm: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">甘特图颜色</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {PROJECT_PALETTE.map((c) => (
                      <button
                        key={c}
                        className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          background: c,
                          borderColor: form.color === c ? "white" : "transparent",
                          boxShadow: form.color === c ? `0 0 0 2px ${c}` : undefined,
                        }}
                        onClick={() => setForm({ ...form, color: c })}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">项目描述</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>取消</Button>
              <Button
                onClick={onSave}
                disabled={isPending || !form.name}
                style={{ background: "#7C3AED", color: "white" }}
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}
