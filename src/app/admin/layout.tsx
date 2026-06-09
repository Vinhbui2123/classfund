import { getDashboardStats } from '@/lib/db/queries';
import Link from 'next/link';
import { Home, Settings, Coins, CreditCard, LogOut, Wallet } from 'lucide-react';
import AdminNav from './_components/AdminNav';

export const revalidate = 0; // Fresh balance on tab change

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const stats = await getDashboardStats();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.05),transparent_50%)] pointer-events-none" />
      
      {/* Header bar */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <span className="font-extrabold text-white text-sm font-mono">CF</span>
            </Link>
            <span className="font-bold text-white text-sm hidden sm:inline-block">ClassFund Admin</span>
          </div>

          {/* Quick Balance */}
          <div className="flex items-center gap-3 bg-slate-950/60 py-1.5 px-3 rounded-xl border border-slate-800/80">
            <Wallet className="w-4 h-4 text-cyan-400" />
            <div className="text-xs">
              <span className="text-slate-400 mr-1.5">Số dư:</span>
              <span className="font-extrabold text-white">{stats.balance.toLocaleString('vi-VN')} ₫</span>
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
