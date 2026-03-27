import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePlatformAuth } from "@/contexts/PlatformAuthContext";
import { toast } from "sonner";
import {
  Loader2, ArrowLeft, Upload, Star, Trash2, Edit2, Plus,
  Calendar, Tag, Briefcase, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export default function DesignerDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const designerId = parseInt(params.id);
  const { user } = usePlatformAuth();

  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    projectName: "",
    tags: "",
    isFeatured: false,
  });
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: designer, isLoading } = trpc.designers.get.useQuery({ id: designerId });
  const { data: portfolios, isLoading: portfoliosLoading } = trpc.portfolios.list.useQuery({ designerId });
  const { data: schedules } = trpc.schedules.byDesigner.useQuery({ designerId });
  const { data: projects } = trpc.projects.list.useQuery();

  const uploadMutation = trpc.portfolios.upload.useMutation({
    onSuccess: () => {
      utils.portfolios.list.invalidate({ designerId });
      toast.success("作品上传成功");
      setShowUpload(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadForm({ title: "", description: "", projectName: "", tags: "", isFeatured: false });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.portfolios.delete.useMutation({
    onSuccess: () => {
      utils.portfolios.list.invalidate({ designerId });
      toast.success("作品已删除");
    },
    onError: (e) => toast.error(e.message),
  });

  const updatePortfolioMutation = trpc.portfolios.update.useMutation({
    onSuccess: () => {
      utils.portfolios.list.invalidate({ designerId });
      toast.success("已更新");
    },
    onError: (e) => toast.error(e.message),
  });

  const canEdit = () => {
    if (!user) return false;
    if (["super_admin", "pm_manager", "team_lead"].includes(user.platformRole)) return true;
    if (user.platformRole === "designer" && user.designerId === designerId) return true;
    return false;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("文件大小不能超过 20MB");
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
    if (!uploadForm.title) {
      setUploadForm((f) => ({ ...f, title: file.name.replace(/\.[^.]+$/, "") }));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.title) {
      toast.error("请选择文件并填写标题");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      const fileType = selectedFile.type.startsWith("image/gif") ? "gif"
        : selectedFile.type.startsWith("video/") ? "video" : "image";
      await uploadMutation.mutateAsync({
        designerId,
        title: uploadForm.title,
        description: uploadForm.description,
        fileBase64: base64,
        mimeType: selectedFile.type,
        fileType,
        projectName: uploadForm.projectName,
        tags: uploadForm.tags.split(/[,，、\s]+/).filter(Boolean),
        isFeatured: uploadForm.isFeatured,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  // 获取设计师关联的项目
  const designerProjects = (schedules ?? [])
    .map((s) => projects?.find((p) => p.id === s.projectId))
    .filter(Boolean)
    .filter((p, i, arr) => arr.findIndex((x) => x?.id === p?.id) === i);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!designer) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">设计师不存在</p>
        <Button variant="outline" onClick={() => navigate("/designers")}>返回列表</Button>
      </div>
    );
  }

  const featuredPortfolios = (portfolios ?? []).filter((p) => p.isFeatured);
  const otherPortfolios = (portfolios ?? []).filter((p) => !p.isFeatured);

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* 返回按钮 */}
      <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={() => navigate("/designers")}>
        <ArrowLeft className="w-4 h-4" />
        返回设计师列表
      </Button>

      {/* 设计师信息卡片 */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="h-2" style={{ background: ROLE_COLORS[designer.roleType] }} />
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="w-20 h-20 flex-shrink-0">
              <AvatarImage src={designer.avatarUrl ?? undefined} />
              <AvatarFallback
                className="text-2xl font-bold text-white"
                style={{ background: ROLE_COLORS[designer.roleType] }}
              >
                {designer.name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{designer.name}</h1>
                <Badge
                  variant="outline"
                  className="text-sm px-2"
                  style={{
                    color: ROLE_COLORS[designer.roleType],
                    borderColor: ROLE_COLORS[designer.roleType] + "50",
                    background: ROLE_COLORS[designer.roleType] + "10",
                  }}
                >
                  {designer.roleType}
                </Badge>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_MAP[designer.status]?.class}`}>
                  {STATUS_MAP[designer.status]?.label}
                </span>
              </div>

              {designer.bio && (
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{designer.bio}</p>
              )}

              <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                {designer.am && <span>AM: <span className="text-foreground font-medium">{designer.am}</span></span>}
                {designer.contact && <span>联系: <span className="text-foreground">{designer.contact}</span></span>}
                {designer.joinDate && <span>入职: <span className="text-foreground">{designer.joinDate}</span></span>}
              </div>

              {/* 风格标签 */}
              {(designer.styleTags as string[] ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(designer.styleTags as string[]).map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 关联项目 */}
          {designerProjects.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">当前参与项目</p>
              <div className="flex flex-wrap gap-2">
                {designerProjects.map((p) => p && (
                  <span
                    key={p.id}
                    className="text-xs px-2 py-1 rounded-lg font-medium text-white"
                    style={{ background: p.color || "#7C3AED" }}
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 作品集 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            作品集
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({portfolios?.length ?? 0} 件)
            </span>
          </h2>
          {canEdit() && (
            <Button
              onClick={() => setShowUpload(true)}
              size="sm"
              className="gap-2"
              style={{ background: ROLE_COLORS[designer.roleType], color: "white" }}
            >
              <Plus className="w-4 h-4" />
              上传作品
            </Button>
          )}
        </div>

        {portfoliosLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : portfolios?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">暂无作品</p>
            {canEdit() && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-2"
                onClick={() => setShowUpload(true)}
              >
                <Upload className="w-3.5 h-3.5" />
                上传第一件作品
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* 代表作 */}
            {featuredPortfolios.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-600">代表作</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {featuredPortfolios.map((p) => (
                    <PortfolioCard
                      key={p.id}
                      portfolio={p}
                      canEdit={canEdit()}
                      onDelete={() => deleteMutation.mutate({ id: p.id })}
                      onToggleFeatured={() => updatePortfolioMutation.mutate({ id: p.id, isFeatured: !p.isFeatured })}
                      onPreview={() => setLightboxSrc(p.fileUrl)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 其他作品 */}
            {otherPortfolios.length > 0 && (
              <div>
                {featuredPortfolios.length > 0 && (
                  <p className="text-sm font-medium text-muted-foreground mb-3">其他作品</p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {otherPortfolios.map((p) => (
                    <PortfolioCard
                      key={p.id}
                      portfolio={p}
                      canEdit={canEdit()}
                      onDelete={() => deleteMutation.mutate({ id: p.id })}
                      onToggleFeatured={() => updatePortfolioMutation.mutate({ id: p.id, isFeatured: !p.isFeatured })}
                      onPreview={() => setLightboxSrc(p.fileUrl)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 上传作品弹窗 */}
      <Dialog open={showUpload} onOpenChange={(o) => { if (!o) { setShowUpload(false); setSelectedFile(null); setPreviewUrl(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>上传作品</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 文件选择区 */}
            <div
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <div className="relative">
                  <img src={previewUrl} alt="预览" className="max-h-40 mx-auto rounded-lg object-contain" />
                  <p className="text-xs text-muted-foreground mt-2">{selectedFile?.name}</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">点击选择文件</p>
                  <p className="text-xs text-muted-foreground mt-1">支持 PNG、JPG、GIF、MP4，最大 20MB</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/mp4"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">作品标题 *</Label>
              <Input
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder="请输入作品标题"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">所属项目</Label>
                <Input
                  value={uploadForm.projectName}
                  onChange={(e) => setUploadForm({ ...uploadForm, projectName: e.target.value })}
                  placeholder="项目名称（可选）"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">风格标签</Label>
                <Input
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                  placeholder="逗号分隔"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">作品描述</Label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                rows={2}
                placeholder="简单描述这件作品..."
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={uploadForm.isFeatured}
                onChange={(e) => setUploadForm({ ...uploadForm, isFeatured: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">设为代表作（置顶展示）</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>取消</Button>
            <Button
              onClick={handleUpload}
              disabled={uploadMutation.isPending || !selectedFile || !uploadForm.title}
              style={{ background: ROLE_COLORS[designer.roleType], color: "white" }}
            >
              {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              上传
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 图片预览 Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="预览"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2"
            onClick={() => setLightboxSrc(null)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PortfolioCard({
  portfolio,
  canEdit,
  onDelete,
  onToggleFeatured,
  onPreview,
}: {
  portfolio: any;
  canEdit: boolean;
  onDelete: () => void;
  onToggleFeatured: () => void;
  onPreview: () => void;
}) {
  return (
    <div className="group relative rounded-xl overflow-hidden bg-muted aspect-square cursor-pointer designer-card"
      onClick={onPreview}>
      {portfolio.fileType === "video" ? (
        <video
          src={portfolio.fileUrl}
          className="w-full h-full object-cover"
          muted
          loop
          onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
          onMouseLeave={(e) => (e.target as HTMLVideoElement).pause()}
        />
      ) : (
        <img
          src={portfolio.thumbnailUrl || portfolio.fileUrl}
          alt={portfolio.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}

      {/* 悬停遮罩 */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-end">
        <div className="p-2 w-full opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-white text-xs font-medium truncate">{portfolio.title}</p>
          {portfolio.projectName && (
            <p className="text-white/70 text-xs truncate">{portfolio.projectName}</p>
          )}
        </div>
      </div>

      {/* 代表作标记 */}
      {portfolio.isFeatured && (
        <div className="absolute top-2 left-2">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
        </div>
      )}

      {/* 操作按钮 */}
      {canEdit && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}>
          <button
            className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-amber-500 transition-colors"
            onClick={onToggleFeatured}
            title={portfolio.isFeatured ? "取消代表作" : "设为代表作"}
          >
            <Star className="w-3 h-3" />
          </button>
          <button
            className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
            onClick={onDelete}
            title="删除"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
