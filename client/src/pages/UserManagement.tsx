import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePlatformAuth } from "@/contexts/PlatformAuthContext";
import { toast } from "sonner";
import { Loader2, Plus, Edit2, Trash2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ROLE_MAP: Record<string, { label: string; color: string; bg: string }> = {
  super_admin: { label: "超级管理员", color: "#EF4444", bg: "#FEF2F2" },
  pm_manager: { label: "PM经理", color: "#7C3AED", bg: "#F3F0FF" },
  team_lead: { label: "组长", color: "#3B82F6", bg: "#EFF6FF" },
  designer: { label: "设计师", color: "#059669", bg: "#ECFDF5" },
  viewer: { label: "访客", color: "#9CA3AF", bg: "#F9FAFB" },
};

type PlatformUser = {
  id: number;
  username: string;
  name: string;
  platformRole: string;
  designerId: number | null;
  dept: string | null;
  status: string;
};

type UserForm = {
  username: string;
  password: string;
  name: string;
  platformRole: string;
  designerId: string;
  dept: string;
};

const defaultForm: UserForm = {
  username: "",
  password: "",
  name: "",
  platformRole: "viewer",
  designerId: "",
  dept: "",
};

export default function UserManagement() {
  const { user: currentUser } = usePlatformAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [form, setForm] = useState<UserForm>(defaultForm);
  const [showResetPwd, setShowResetPwd] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.users.list.useQuery();
  const { data: designers } = trpc.designers.list.useQuery();

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success("用户已创建");
      setShowCreate(false);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success("用户已更新");
      setEditingUser(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success("用户已删除");
    },
    onError: (e) => toast.error(e.message),
  });

  // 重置密码通过update接口
  const resetPwdMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("密码已重置");
      setShowResetPwd(null);
      setNewPassword("");
    },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (user: PlatformUser) => {
    setForm({
      username: user.username,
      password: "",
      name: user.name,
      platformRole: user.platformRole,
      designerId: user.designerId ? String(user.designerId) : "",
      dept: user.dept ?? "",
    });
    setEditingUser(user);
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
          <h1 className="text-2xl font-bold">用户管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理平台账号与权限</p>
        </div>
        <Button
          onClick={() => { setForm(defaultForm); setShowCreate(true); }}
          className="gap-2"
          style={{ background: "#7C3AED", color: "white" }}
        >
          <Plus className="w-4 h-4" />
          新建用户
        </Button>
      </div>

      {/* 权限说明 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            权限层级说明
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(ROLE_MAP).map(([role, info]) => (
              <div key={role} className="text-center p-3 rounded-lg" style={{ background: info.bg }}>
                <div className="text-xs font-semibold mb-1" style={{ color: info.color }}>{info.label}</div>
                <div className="text-xs text-muted-foreground">
                  {role === "super_admin" && "全部权限"}
                  {role === "pm_manager" && "排期+项目管理"}
                  {role === "team_lead" && "设计师管理"}
                  {role === "designer" && "编辑自己信息"}
                  {role === "viewer" && "只读查看"}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 用户列表 */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户名</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>关联设计师</TableHead>
                <TableHead>部门</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users ?? []).map((user) => {
                const roleInfo = ROLE_MAP[user.platformRole] ?? ROLE_MAP.viewer;
                const linkedDesigner = designers?.find((d) => d.id === user.designerId);
                const isSelf = currentUser?.id === user.id;
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: roleInfo.color }}
                        >
                          {user.name.charAt(0)}
                        </div>
                        {user.username}
                        {isSelf && <span className="text-xs text-muted-foreground">(我)</span>}
                      </div>
                    </TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ color: roleInfo.color, background: roleInfo.bg }}
                      >
                        {roleInfo.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      {linkedDesigner ? (
                        <span className="text-sm">{linkedDesigner.name}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>{user.dept || "-"}</TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          user.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {user.status === "active" ? "正常" : "已禁用"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => { setShowResetPwd(user.id); setNewPassword(""); }}
                        >
                          重置密码
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(user as PlatformUser)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        {!isSelf && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate({ id: user.id })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 新建弹窗 */}
      <Dialog open={showCreate} onOpenChange={(o) => !o && setShowCreate(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新建用户</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">用户名 *</Label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">初始密码 *</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">姓名 *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">角色</Label>
                <Select value={form.platformRole} onValueChange={(v) => setForm({ ...form, platformRole: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">超级管理员</SelectItem>
                    <SelectItem value="pm_manager">PM经理</SelectItem>
                    <SelectItem value="team_lead">组长</SelectItem>
                    <SelectItem value="designer">设计师</SelectItem>
                    <SelectItem value="viewer">访客</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">关联设计师</Label>
                <Select value={form.designerId || "none"} onValueChange={(v) => setForm({ ...form, designerId: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="不关联" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不关联</SelectItem>
                    {(designers ?? []).map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name} ({d.roleType})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">部门</Label>
                <Input value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button
              onClick={() => createMutation.mutate({
                username: form.username,
                password: form.password,
                name: form.name,
                platformRole: form.platformRole,
                designerId: form.designerId ? parseInt(form.designerId) : undefined,
                dept: form.dept,
              })}
              disabled={createMutation.isPending || !form.username || !form.password || !form.name}
              style={{ background: "#7C3AED", color: "white" }}
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑弹窗 */}
      <Dialog open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">姓名 *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">角色</Label>
                <Select value={form.platformRole} onValueChange={(v) => setForm({ ...form, platformRole: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">超级管理员</SelectItem>
                    <SelectItem value="pm_manager">PM经理</SelectItem>
                    <SelectItem value="team_lead">组长</SelectItem>
                    <SelectItem value="designer">设计师</SelectItem>
                    <SelectItem value="viewer">访客</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">关联设计师</Label>
                <Select value={form.designerId || "none"} onValueChange={(v) => setForm({ ...form, designerId: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="不关联" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不关联</SelectItem>
                    {(designers ?? []).map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name} ({d.roleType})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">部门</Label>
                <Input value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>取消</Button>
            <Button
              onClick={() => editingUser && updateMutation.mutate({
                id: editingUser.id,
                name: form.name,
                platformRole: form.platformRole,
                designerId: form.designerId ? parseInt(form.designerId) : undefined,
                dept: form.dept,
              })}
              disabled={updateMutation.isPending}
              style={{ background: "#7C3AED", color: "white" }}
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重置密码弹窗 */}
      <Dialog open={showResetPwd !== null} onOpenChange={(o) => !o && setShowResetPwd(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-sm">新密码</Label>
            <Input
              type="password"
              className="mt-1.5"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="请输入新密码（至少6位）"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetPwd(null)}>取消</Button>
            <Button
              onClick={() => showResetPwd && resetPwdMutation.mutate({ id: showResetPwd, newPassword })}
              disabled={resetPwdMutation.isPending || newPassword.length < 6}
              style={{ background: "#7C3AED", color: "white" }}
            >
              {resetPwdMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              确认重置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
