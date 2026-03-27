import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { usePlatformAuth } from "@/contexts/PlatformAuthContext";
import { toast } from "sonner";
import { Loader2, Plus, Search, Edit2, Upload, X, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";

const ROLE_COLORS: Record<string, string> = {
  GUI: "#7C3AED",
  VX: "#EA580C",
  ICON: "#059669",
};

const STATUS_MAP = {
  busy: { label: "忙碌", class: "status-busy" },
  available: { label: "空闲", class: "status-available" },
  leave: { label: "请假", class: "status-leave" },
};

type DesignerForm = {
  name: string;
  roleType: string;
  status: "available" | "busy" | "leave";
  am: string;
  bio: string;
  contact: string;
  joinDate: string;
  styleTags: string;
};

const defaultForm: DesignerForm = {
  name: "",
  roleType: "GUI",
  status: "available",
  am: "",
  bio: "",
  contact: "",
  joinDate: "",
  styleTags: "",
};

export default function Designers() {
  const { user, canEdit } = usePlatformAuth();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<DesignerForm>(defaultForm);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: designers, isLoading } = trpc.designers.list.useQuery();

  const createMutation = trpc.designers.create.useMutation({
    onSuccess: () => {
      utils.designers.list.invalidate();
      toast.success("设计师已创建");
      setShowCreate(false);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.designers.update.useMutation({
    onSuccess: () => {
      utils.designers.list.invalidate();
      toast.success("信息已更新");
      setEditingId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadAvatarMutation = trpc.designers.uploadAvatar.useMutation({
    onSuccess: () => {
      utils.designers.list.invalidate();
      toast.success("头像已更新");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (designers ?? []).filter((d) => {
    const matchSearch = !search || d.name.includes(search) || (d.am && d.am.includes(search));
    const matchRole = filterRole === "all" || d.roleType === filterRole;
    const matchStatus = filterStatus === "all" || d.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  const openEdit = (designer: typeof filtered[0]) => {
    setForm({
      name: designer.name,
      roleType: designer.roleType,
      status: designer.status,
      am: designer.am ?? "",
      bio: designer.bio ?? "",
      contact: designer.contact ?? "",
      joinDate: designer.joinDate ?? "",
      styleTags: (designer.styleTags as string[] ?? []).join("、"),
    });
    setAvatarPreview(designer.avatarUrl ?? null);
    setEditingId(designer.id);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async (id: number) => {
    const tags = form.styleTags.split(/[,，、\s]+/).filter(Boolean);
    await updateMutation.mutateAsync({
      id,
      name: form.name,
      roleType: form.roleType,
      status: form.status,
      am: form.am,
      bio: form.bio,
      contact: form.contact,
      joinDate: form.joinDate || null,
      styleTags: tags,
    });

    // 上传头像
    if (avatarFile) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1];
        await uploadAvatarMutation.mutateAsync({
          id,
          fileBase64: base64,
          mimeType: avatarFile.type,
        });
      };
      reader.readAsDataURL(avatarFile);
    }
  };

  const handleCreate = async () => {
    const tags = form.styleTags.split(/[,，、\s]+/).filter(Boolean);
    await createMutation.mutateAsync({
      name: form.name,
      roleType: form.roleType,
      status: form.status,
      am: form.am,
      bio: form.bio,
      contact: form.contact,
      joinDate: form.joinDate || undefined,
      styleTags: tags,
    });
  };

  const canEditDesigner = (designerId: number) => {
    if (!user) return false;
    if (["super_admin", "pm_manager", "team_lead"].includes(user.platformRole)) return true;
    if (user.platformRole === "designer" && user.designerId === designerId) return true;
    return false;
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
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">设计师</h1>
          <p className="text-sm text-muted-foreground mt-1">共 {designers?.length ?? 0} 位设计师</p>
        </div>
        {["super_admin", "pm_manager", "team_lead"].includes(user?.platformRole ?? "") && (
          <Button
            onClick={() => { setForm(defaultForm); setShowCreate(true); }}
            className="gap-2"
            style={{ background: "#7C3AED", color: "white" }}
          >
            <Plus className="w-4 h-4" />
            添加设计师
          </Button>
        )}
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索姓名或AM..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-28 h-9">
            <SelectValue placeholder="职能" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部职能</SelectItem>
            <SelectItem value="GUI">GUI</SelectItem>
            <SelectItem value="VX">VX</SelectItem>
            <SelectItem value="ICON">ICON</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-28 h-9">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="busy">忙碌</SelectItem>
            <SelectItem value="available">空闲</SelectItem>
            <SelectItem value="leave">请假</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 设计师卡片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((designer) => (
          <Card key={designer.id} className="border-0 shadow-sm designer-card overflow-hidden">
            <CardContent className="p-0">
              {/* 顶部色条 */}
              <div className="h-1.5" style={{ background: ROLE_COLORS[designer.roleType] }} />

              <div className="p-4">
                <div className="flex items-start gap-3">
                  <Link href={`/designers/${designer.id}`}>
                    <Avatar className="w-12 h-12 cursor-pointer flex-shrink-0">
                      <AvatarImage src={designer.avatarUrl ?? undefined} />
                      <AvatarFallback
                        className="text-sm font-bold text-white"
                        style={{ background: ROLE_COLORS[designer.roleType] }}
                      >
                        {designer.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/designers/${designer.id}`}>
                        <span className="font-semibold text-sm hover:text-primary cursor-pointer">
                          {designer.name}
                        </span>
                      </Link>
                      <Badge
                        variant="outline"
                        className="text-xs px-1.5 py-0 h-5 flex-shrink-0"
                        style={{
                          color: ROLE_COLORS[designer.roleType],
                          borderColor: ROLE_COLORS[designer.roleType] + "50",
                          background: ROLE_COLORS[designer.roleType] + "10",
                        }}
                      >
                        {designer.roleType}
                      </Badge>
                    </div>
                    {designer.am && (
                      <p className="text-xs text-muted-foreground mt-0.5">AM: {designer.am}</p>
                    )}
                  </div>
                </div>

                {/* 状态 */}
                <div className="flex items-center justify-between mt-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_MAP[designer.status]?.class}`}
                  >
                    {STATUS_MAP[designer.status]?.label}
                  </span>
                  {canEditDesigner(designer.id) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(designer)}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                {/* 风格标签 */}
                {(designer.styleTags as string[] ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(designer.styleTags as string[]).slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    {(designer.styleTags as string[]).length > 3 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        +{(designer.styleTags as string[]).length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>暂无设计师数据</p>
        </div>
      )}

      {/* 编辑弹窗 */}
      <Dialog open={editingId !== null} onOpenChange={(o) => !o && setEditingId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑设计师信息</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 头像上传 */}
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={avatarPreview ?? undefined} />
                <AvatarFallback
                  className="text-lg font-bold text-white"
                  style={{ background: ROLE_COLORS[form.roleType] }}
                >
                  {form.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5" />
                  更换头像
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <p className="text-xs text-muted-foreground mt-1">支持 JPG、PNG 格式</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">姓名</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">职能</Label>
                <Select value={form.roleType} onValueChange={(v) => setForm({ ...form, roleType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GUI">GUI</SelectItem>
                    <SelectItem value="VX">VX</SelectItem>
                    <SelectItem value="ICON">ICON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">状态</Label>
                <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">空闲</SelectItem>
                    <SelectItem value="busy">忙碌</SelectItem>
                    <SelectItem value="leave">请假</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">对接AM</Label>
                <Input value={form.am} onChange={(e) => setForm({ ...form, am: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">联系方式</Label>
                <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="企业微信等" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">入职日期</Label>
                <Input type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">风格标签</Label>
              <Input
                value={form.styleTags}
                onChange={(e) => setForm({ ...form, styleTags: e.target.value })}
                placeholder="用逗号或顿号分隔，如：欧美、国风、二次元"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">个人简介</Label>
              <Textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={3}
                placeholder="简单介绍设计师的专长和经历..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>取消</Button>
            <Button
              onClick={() => editingId && handleSave(editingId)}
              disabled={updateMutation.isPending}
              style={{ background: "#7C3AED", color: "white" }}
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建弹窗 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>添加设计师</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">姓名 *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">职能 *</Label>
                <Select value={form.roleType} onValueChange={(v) => setForm({ ...form, roleType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GUI">GUI</SelectItem>
                    <SelectItem value="VX">VX</SelectItem>
                    <SelectItem value="ICON">ICON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">状态</Label>
                <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">空闲</SelectItem>
                    <SelectItem value="busy">忙碌</SelectItem>
                    <SelectItem value="leave">请假</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">对接AM</Label>
                <Input value={form.am} onChange={(e) => setForm({ ...form, am: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">风格标签</Label>
              <Input
                value={form.styleTags}
                onChange={(e) => setForm({ ...form, styleTags: e.target.value })}
                placeholder="用逗号或顿号分隔"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">个人简介</Label>
              <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !form.name}
              style={{ background: "#7C3AED", color: "white" }}
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Users({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}
