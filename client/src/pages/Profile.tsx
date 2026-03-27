import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { usePlatformAuth } from "@/contexts/PlatformAuthContext";
import { toast } from "sonner";
import {
  Loader2, Save, Camera, User, Tag, FileText, Lock, Eye, EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLE_COLORS: Record<string, string> = {
  GUI: "#7C3AED",
  VX: "#EA580C",
  ICON: "#059669",
};

const STATUS_OPTIONS = [
  { value: "busy", label: "忙碌" },
  { value: "available", label: "空闲" },
  { value: "leave", label: "请假" },
];

const STYLE_PRESETS = [
  "欧美", "国风写实", "二次元", "科幻", "国风", "写实", "卡通", "复古", "极简", "赛博朋克",
  "GB", "VX作品集", "写实", "欧美插画", "扁平", "像素"
];

export default function Profile() {
  const { user } = usePlatformAuth();
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Only show if user has a linked designer
  const designerId = user?.designerId;
  const { data: designer, isLoading } = trpc.designers.get.useQuery(
    { id: designerId! },
    { enabled: !!designerId }
  );

  const [form, setForm] = useState({
    bio: "",
    status: "busy",
    styleTagsInput: "",
  });

  // Initialize form from designer data using useEffect to avoid render-phase setState
  useEffect(() => {
    if (designer) {
      setForm({
        bio: designer.bio ?? "",
        status: designer.status,
        styleTagsInput: (designer.styleTags ?? []).join("、"),
      });
    }
  }, [designer?.id]);

  // Password change state
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  const updateMutation = trpc.designers.update.useMutation({
    onSuccess: () => {
      utils.designers.get.invalidate({ id: designerId! });
      toast.success("个人信息已更新");
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadAvatarMutation = trpc.designers.uploadAvatar.useMutation({
    onSuccess: () => {
      utils.designers.get.invalidate({ id: designerId! });
      toast.success("头像已更新");
    },
    onError: (e) => toast.error(e.message),
  });

  const changePwMutation = trpc.platform.changePassword.useMutation({
    onSuccess: () => {
      toast.success("密码修改成功，请重新登录");
      setPwForm({ current: "", next: "", confirm: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!designerId) return;
    const tags = form.styleTagsInput
      .split(/[,，、\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    updateMutation.mutate({
      id: designerId,
      bio: form.bio,
      status: form.status as "busy" | "available" | "leave",
      styleTags: tags,
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !designerId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("头像文件不能超过 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      uploadAvatarMutation.mutate({ id: designerId, fileBase64: base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleChangePw = () => {
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      toast.error("请填写所有密码字段");
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      toast.error("两次输入的新密码不一致");
      return;
    }
    if (pwForm.next.length < 6) {
      toast.error("新密码长度不能少于6位");
      return;
    }
    changePwMutation.mutate({ oldPassword: pwForm.current, newPassword: pwForm.next });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">请先登录</p>
      </div>
    );
  }

  const isDesigner = user.platformRole === "designer";

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">个人信息</h1>
        <p className="text-muted-foreground text-sm mt-1">管理你的账号信息和个人资料</p>
      </div>

      {/* 账号信息 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            账号信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">用户名</Label>
              <p className="font-medium mt-1">{user.username}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">角色</Label>
              <div className="mt-1">
                <Badge variant="outline" className="text-xs">
                  {user.platformRole === "super_admin" && "超级管理员"}
                  {user.platformRole === "pm_manager" && "PM经理"}
                  {user.platformRole === "team_lead" && "职能组长"}
                  {user.platformRole === "designer" && "设计师"}
                  {user.platformRole === "viewer" && "访客"}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">显示名称</Label>
              <p className="font-medium mt-1">{user.name || user.username}</p>
            </div>
            {user.dept && (
              <div>
                <Label className="text-xs text-muted-foreground">部门</Label>
                <p className="font-medium mt-1">{user.dept}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 设计师信息（仅设计师角色可见） */}
      {isDesigner && designerId && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="w-4 h-4" />
              设计师资料
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : designer ? (
              <>
                {/* 头像 */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={designer.avatarUrl ?? undefined} />
                      <AvatarFallback
                        className="text-xl font-bold text-white"
                        style={{ background: ROLE_COLORS[designer.roleType] }}
                      >
                        {designer.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadAvatarMutation.isPending}
                    >
                      {uploadAvatarMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Camera className="w-3 h-3" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                  <div>
                    <p className="font-semibold">{designer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {designer.roleType} · AM: {designer.am}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">点击头像可更换</p>
                  </div>
                </div>

                <Separator />

                {/* 状态 */}
                <div className="space-y-2">
                  <Label>当前状态</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 个人简介 */}
                <div className="space-y-2">
                  <Label>个人简介</Label>
                  <Textarea
                    placeholder="介绍一下你的设计风格和专长..."
                    value={form.bio}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* 风格标签 */}
                <div className="space-y-2">
                  <Label>设计风格标签</Label>
                  <Input
                    placeholder="用逗号或顿号分隔，如：欧美、国风写实、二次元"
                    value={form.styleTagsInput}
                    onChange={(e) => setForm((f) => ({ ...f, styleTagsInput: e.target.value }))}
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {STYLE_PRESETS.map((tag) => (
                      <button
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full border border-border hover:border-primary hover:text-primary transition-colors"
                        onClick={() => {
                          const current = form.styleTagsInput;
                          const tags = current ? current.split(/[,，、]+/).map((t) => t.trim()) : [];
                          if (!tags.includes(tag)) {
                            setForm((f) => ({
                              ...f,
                              styleTagsInput: [...tags, tag].join("、"),
                            }));
                          }
                        }}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="gap-2"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  保存资料
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">未关联设计师档案</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 修改密码 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4" />
            修改密码
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>当前密码</Label>
            <div className="relative">
              <Input
                type={showPw.current ? "text" : "password"}
                placeholder="请输入当前密码"
                value={pwForm.current}
                onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                className="pr-10"
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPw((s) => ({ ...s, current: !s.current }))}
              >
                {showPw.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>新密码</Label>
            <div className="relative">
              <Input
                type={showPw.next ? "text" : "password"}
                placeholder="至少6位"
                value={pwForm.next}
                onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                className="pr-10"
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPw((s) => ({ ...s, next: !s.next }))}
              >
                {showPw.next ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>确认新密码</Label>
            <div className="relative">
              <Input
                type={showPw.confirm ? "text" : "password"}
                placeholder="再次输入新密码"
                value={pwForm.confirm}
                onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                className="pr-10"
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPw((s) => ({ ...s, confirm: !s.confirm }))}
              >
                {showPw.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleChangePw}
            disabled={changePwMutation.isPending}
            className="gap-2"
          >
            {changePwMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            确认修改密码
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
