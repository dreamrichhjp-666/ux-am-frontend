import { useState } from "react";
import { usePlatformAuth } from "@/contexts/PlatformAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Palette } from "lucide-react";

export default function Login() {
  const { login } = usePlatformAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("请输入用户名和密码");
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      toast.success("登录成功");
    } catch (err: any) {
      toast.error(err?.message || "登录失败，请检查用户名和密码");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "oklch(0.16 0.04 255)" }}>
      {/* 左侧品牌区 */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12"
        style={{ background: "linear-gradient(135deg, oklch(0.18 0.06 265) 0%, oklch(0.22 0.08 280) 100%)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "oklch(0.55 0.2 265)" }}>
            <Palette className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg">UX Design Hub</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            UX设计中台
            <br />
            <span style={{ color: "oklch(0.75 0.15 265)" }}>人力资源管理平台</span>
          </h1>
          <p className="text-lg" style={{ color: "oklch(0.65 0.05 250)" }}>
            统一管理设计师人力、作品展示与项目排期，
            <br />
            让中台运营更高效、更透明。
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { label: "GUI设计师", value: "6", color: "oklch(0.65 0.2 265)" },
              { label: "VX设计师", value: "3", color: "oklch(0.65 0.2 50)" },
              { label: "图标设计师", value: "3", color: "oklch(0.65 0.2 160)" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl p-4"
                style={{ background: "oklch(0.22 0.05 255)" }}>
                <div className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</div>
                <div className="text-sm mt-1" style={{ color: "oklch(0.6 0.03 250)" }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-sm" style={{ color: "oklch(0.45 0.03 250)" }}>
          © 2026 UX Design Hub · 仅限内部使用
        </div>
      </div>

      {/* 右侧登录区 */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* 移动端 logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "oklch(0.55 0.2 265)" }}>
              <Palette className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg">UX Design Hub</span>
          </div>

          <div className="rounded-2xl p-8" style={{ background: "oklch(0.2 0.04 255)" }}>
            <h2 className="text-2xl font-bold text-white mb-2">欢迎回来</h2>
            <p className="text-sm mb-8" style={{ color: "oklch(0.55 0.03 250)" }}>
              请使用内部账号登录系统
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium" style={{ color: "oklch(0.75 0.03 250)" }}>
                  用户名
                </Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  className="h-11"
                  style={{
                    background: "oklch(0.26 0.05 255)",
                    border: "1px solid oklch(0.32 0.05 255)",
                    color: "white",
                  }}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium" style={{ color: "oklch(0.75 0.03 250)" }}>
                  密码
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="h-11"
                  style={{
                    background: "oklch(0.26 0.05 255)",
                    border: "1px solid oklch(0.32 0.05 255)",
                    color: "white",
                  }}
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold"
                style={{ background: "oklch(0.55 0.2 265)", color: "white" }}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {loading ? "登录中..." : "登录"}
              </Button>
            </form>

            <div className="mt-6 p-4 rounded-xl text-xs space-y-1"
              style={{ background: "oklch(0.24 0.04 255)", color: "oklch(0.55 0.03 250)" }}>
              <div className="font-medium mb-2" style={{ color: "oklch(0.65 0.03 250)" }}>默认账号（首次使用）</div>
              <div>管理员：admin / admin123</div>
              <div>PM：pm / pm123</div>
              <div>组长：gui-lead / gui123</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
