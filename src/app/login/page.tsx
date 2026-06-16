'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        setError(data.error || 'Mật khẩu không chính xác');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Đã xảy ra lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center p-4 relative overflow-hidden select-none">
      
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-brand/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-bg-surface border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-sm relative z-10">
        
        {/* Title */}
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center shadow-sm mb-4">
            <Lock className="w-6 h-6 text-brand" />
          </div>
          <h1 className="text-2xl font-bold text-text-main tracking-tight">Đăng Nhập Quản Trị</h1>
          <p className="text-xs text-text-muted mt-1.5">Nhập mật khẩu cán sự để quản lý quỹ lớp</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-main uppercase tracking-wider block">Mật khẩu</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-page border border-border-subtle focus:border-brand rounded-xl py-2 pl-4 pr-11 text-sm text-text-main placeholder-text-muted outline-none transition focus:ring-2 focus:ring-brand/10 h-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-status-error-bg border border-status-error-text/10 text-xs text-status-error-text animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-sm transition shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer h-10 flex items-center justify-center"
          >
            {loading ? 'Đang xác thực...' : 'Xác nhận'}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-xs text-text-muted hover:text-text-main transition underline underline-offset-4 font-semibold"
          >
            Quay lại Cổng Công Khai
          </Link>
        </div>
      </div>
    </div>
  );
}
