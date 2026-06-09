import { getDashboardStats, getMembersPaymentStatus } from '@/lib/db/queries';
import { Wallet, ArrowUpRight, ArrowDownRight, Users, CheckCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0; // Fresh stats on render

export default async function AdminPage() {
  const stats = await getDashboardStats();
  const { membersStatus } = await getMembersPaymentStatus();

  // Calculate quick indicators
  const fullyPaidCount = membersStatus.filter(m => m.isFullyPaid).length;
  const owingCount = membersStatus.length - fullyPaidCount;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Welcome Title */}
      <div>
        <h1 className="text-2xl font-bold text-white">Bảng Điều Khiển Quản Trị</h1>
        <p className="text-xs text-slate-400 mt-1">Tổng quan về tình hình tài chính của lớp</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Balance */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Số dư hiện tại</span>
            <Wallet className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {stats.balance.toLocaleString('vi-VN')} ₫
            </span>
          </div>
        </div>

        {/* Income */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng thu quỹ</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {stats.totalIncome.toLocaleString('vi-VN')} ₫
            </span>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng chi tiêu</span>
            <ArrowDownRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {stats.totalExpense.toLocaleString('vi-VN')} ₫
            </span>
          </div>
        </div>

      </div>

      {/* Quick Indicators Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Payment Summary Indicator */}
        <div className="bg-slate-900/20 border border-slate-800 rounded-2xl p-6 shadow-md">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Theo dõi đóng quỹ lớp</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Đã đóng đủ tất cả đợt</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Không còn nợ bất kỳ đợt nào</div>
                </div>
              </div>
              <span className="text-lg font-bold text-emerald-400">{fullyPaidCount} <span className="text-xs text-slate-500">thành viên</span></span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Còn nợ đợt thu</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Cần đóng hoặc đang trả góp</div>
                </div>
              </div>
              <span className="text-lg font-bold text-amber-400">{owingCount} <span className="text-xs text-slate-500">thành viên</span></span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-slate-900/20 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Thao tác nhanh</h3>
            <p className="text-xs text-slate-500">Phím tắt chuyển hướng nhanh đến các trang làm việc</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Link
              href="/admin/setup"
              className="p-3 bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl text-center text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              Cài đặt & Nhập CSV
            </Link>
            <Link
              href="/admin/collection"
              className="p-3 bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl text-center text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              Ghi nhận thu tiền
            </Link>
            <Link
              href="/admin/expenses"
              className="p-3 bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl text-center text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              Ghi nhận khoản chi
            </Link>
            <Link
              href="/"
              className="p-3 bg-cyan-950/20 hover:bg-cyan-950/40 border border-cyan-800/20 hover:border-cyan-800/40 rounded-xl text-center text-xs font-semibold text-cyan-400 transition"
            >
              Xem trang Công khai
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
