import { getDashboardStats } from '@/lib/db/queries';
import Link from 'next/link';
import { Wallet } from 'lucide-react';
import AdminNav from './_components/AdminNav';

export const revalidate = 0; // Fresh balance on tab change

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const stats = await getDashboardStats();

  return (
    <div className="min-h-screen bg-bg-page text-text-main flex flex-col font-sans pb-12">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.03),transparent_50%)] pointer-events-none" />
      
      {/* Header bar */}
      <header className="sticky top-0 z-40 bg-bg-surface/85 backdrop-blur-md border-b border-border-subtle shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href="/" className="h-8 w-8 rounded-lg bg-gradient-to-tr from-brand to-emerald-500 flex items-center justify-center shadow-md">
              <span className="font-extrabold text-white text-sm font-mono">CF</span>
            </Link>
            <span className="font-bold text-text-main text-sm hidden sm:inline-block">ClassFund Admin</span>
          </div>

          {/* Quick Balance */}
          <div className="flex items-center gap-2 bg-bg-page py-1.5 px-3 rounded-xl border border-border-subtle">
            <Wallet className="w-4 h-4 text-brand" />
            <div className="text-xs">
              <span className="text-text-muted mr-1">Số dư:</span>
              <span className="font-extrabold text-text-main tabular-nums">{stats.balance.toLocaleString('vi-VN')} ₫</span>
            </div>
          </div>

          {/* Navigation Links (responsive Client Component) */}
          <AdminNav />

        </div>
      </header>

      {/* Main page content container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 relative">
        {children}
      </main>
    </div>
  );
}
