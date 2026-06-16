'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Settings, Coins, CreditCard, LogOut } from 'lucide-react';

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth', {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navItems = [
    { label: 'Tổng quan', href: '/admin', icon: Home },
    { label: 'Thành viên & Đợt thu', href: '/admin/setup', icon: Settings },
    { label: 'Thu quỹ', href: '/admin/collection', icon: Coins },
    { label: 'Chi tiêu', href: '/admin/expenses', icon: CreditCard },
  ];

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* Navigation tabs */}
      <nav className="flex items-center gap-1 sm:gap-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                isActive
                  ? 'bg-brand/10 border-brand/20 text-brand'
                  : 'bg-transparent border-transparent text-text-muted hover:text-text-main hover:bg-bg-page'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout button */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-bold text-text-muted hover:text-status-error-text hover:bg-status-error-bg border border-transparent hover:border-status-error-text/10 transition cursor-pointer"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Đăng xuất</span>
      </button>
    </div>
  );
}
