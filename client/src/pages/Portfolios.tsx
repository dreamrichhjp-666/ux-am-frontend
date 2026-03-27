import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Loader2, Search, Star, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const ROLE_COLORS: Record<string, string> = {
  GUI: "#7C3AED",
  VX: "#EA580C",
  ICON: "#059669",
};

export default function Portfolios() {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterFeatured, setFilterFeatured] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState("");

  const { data: designers, isLoading: designersLoading } = trpc.designers.list.useQuery();
  const { data: allPortfolios, isLoading: portfoliosLoading } = trpc.portfolios.listAll.useQuery();

  const filteredDesigners = useMemo(() => {
    return (designers ?? []).filter((d) => {
      const matchRole = filterRole === "all" || d.roleType === filterRole;
      const matchSearch = !search || d.name.includes(search);
      return matchRole && matchSearch;
    });
  }, [designers, filterRole, search]);

  // 按设计师分组的作品
  const portfoliosByDesigner = useMemo(() => {
    const map: Record<number, any[]> = {};
    for (const p of allPortfolios ?? []) {
      if (!map[p.designerId]) map[p.designerId] = [];
      const portfolios = filterFeatured ? (p.isFeatured ? [p] : []) : [p];
      map[p.designerId] = [...(map[p.designerId] ?? []), ...portfolios];
    }
    return map;
  }, [allPortfolios, filterFeatured]);

  const isLoading = designersLoading || portfoliosLoading;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">作品集</h1>
        <p className="text-sm text-muted-foreground mt-1">浏览全体设计师的代表作品</p>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索设计师姓名..."
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
        <button
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            filterFeatured
              ? "bg-amber-50 text-amber-600 border-amber-200"
              : "bg-white text-muted-foreground border-border hover:border-amber-200"
          }`}
          onClick={() => setFilterFeatured(!filterFeatured)}
        >
          <Star className={`w-3.5 h-3.5 ${filterFeatured ? "fill-amber-500 text-amber-500" : ""}`} />
          仅看代表作
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-8">
          {filteredDesigners
            .filter((d) => {
              const portfolios = portfoliosByDesigner[d.id] ?? [];
              return portfolios.length > 0;
            })
            .map((designer) => {
              const portfolios = portfoliosByDesigner[designer.id] ?? [];
              if (portfolios.length === 0) return null;

              return (
                <div key={designer.id}>
                  {/* 设计师信息 */}
                  <div className="flex items-center gap-3 mb-3">
                    <Link href={`/designers/${designer.id}`}>
                      <Avatar className="w-9 h-9 cursor-pointer">
                        <AvatarImage src={designer.avatarUrl ?? undefined} />
                        <AvatarFallback
                          className="text-sm font-bold text-white"
                          style={{ background: ROLE_COLORS[designer.roleType] }}
                        >
                          {designer.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div>
                      <Link href={`/designers/${designer.id}`}>
                        <span className="font-semibold text-sm hover:text-primary cursor-pointer">
                          {designer.name}
                        </span>
                      </Link>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge
                          variant="outline"
                          className="text-xs px-1.5 py-0 h-4"
                          style={{
                            color: ROLE_COLORS[designer.roleType],
                            borderColor: ROLE_COLORS[designer.roleType] + "50",
                            background: ROLE_COLORS[designer.roleType] + "10",
                          }}
                        >
                          {designer.roleType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{portfolios.length} 件作品</span>
                      </div>
                    </div>
                    <Link href={`/designers/${designer.id}`} className="ml-auto">
                      <span className="text-xs text-primary hover:underline cursor-pointer">
                        查看主页 →
                      </span>
                    </Link>
                  </div>

                  {/* 作品网格 */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                    {portfolios.slice(0, 12).map((p) => (
                      <div
                        key={p.id}
                        className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
                        onClick={() => { setLightboxSrc(p.fileUrl); setLightboxTitle(p.title); }}
                      >
                        {p.fileType === "video" ? (
                          <video
                            src={p.fileUrl}
                            className="w-full h-full object-cover"
                            muted
                            loop
                            onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                            onMouseLeave={(e) => (e.target as HTMLVideoElement).pause()}
                          />
                        ) : (
                          <img
                            src={p.thumbnailUrl || p.fileUrl}
                            alt={p.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        )}
                        {p.isFeatured && (
                          <div className="absolute top-1 left-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
                      </div>
                    ))}
                    {portfolios.length > 12 && (
                      <Link href={`/designers/${designer.id}`}>
                        <div className="aspect-square rounded-lg overflow-hidden bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
                          <div className="text-center">
                            <span className="text-lg font-bold text-muted-foreground">+{portfolios.length - 12}</span>
                            <p className="text-xs text-muted-foreground mt-0.5">查看更多</p>
                          </div>
                        </div>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}

          {filteredDesigners.filter((d) => (portfoliosByDesigner[d.id] ?? []).length > 0).length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>暂无作品数据</p>
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85"
          onClick={() => setLightboxSrc(null)}
        >
          <div className="text-white text-sm mb-3 font-medium">{lightboxTitle}</div>
          <img
            src={lightboxSrc}
            alt={lightboxTitle}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70"
            onClick={() => setLightboxSrc(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
