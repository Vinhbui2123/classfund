import { getDashboardStats, getMembersPaymentStatus } from '@/lib/db/queries';
import { Wallet, ArrowUpRight, ArrowDownRight, CheckCircle2, AlertCircle } from 'lucide-react';
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
        <h1 className="text-2xl font-bold text-text-main tracking-tight">Bảng Điều Khiển Quản Trị</h1>
        <p className="text-xs text-text-muted mt-1">Tổng quan về tình hình tài chính của lớp</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Balance */}
        <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Số dư hiện tại</span>
            <Wallet className="w-5 h-5 text-brand" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-text-main tracking-tight tabular-nums">
              {stats.balance.toLocaleString('vi-VN')} ₫
            </span>
          </div>
        </div>

        {/* Income */}
        <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-status-success-text/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng thu quỹ</span>
            <ArrowUpRight className="w-5 h-5 text-status-success-text" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-text-main tracking-tight tabular-nums">
              {stats.totalIncome.toLocaleString('vi-VN')} ₫
            </span>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-status-error-text/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng chi tiêu</span>
            <ArrowDownRight className="w-5 h-5 text-status-error-text" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-text-main tracking-tight tabular-nums">
              {stats.totalExpense.toLocaleString('vi-VN')} ₫
            </span>
          </div>
        </div>

      </div>

      {/* Quick Indicators Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Payment Summary Indicator */}
        <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-bold text-text-main mb-4">Theo dõi đóng quỹ lớp</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-bg-page rounded-xl border border-border-subtle">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-status-success-bg text-status-success-text border border-status-success-text/10">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-text-main">Đã đóng đủ tất cả đợt</div>
                  <div className="text-[10px] text-text-muted mt-0.5">Không còn nợ bất kỳ đợt nào</div>
                </div>
              </div>
              <span className="text-base font-extrabold text-status-success-text tabular-nums">{fullyPaidCount} <span className="text-xs text-text-muted font-normal">thành viên</span></span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-bg-page rounded-xl border border-border-subtle">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-status-warning-bg text-status-warning-text border border-status-warning-text/10">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-text-main">Còn nợ đợt thu</div>
                  <div className="text-[10px] text-text-muted mt-0.5">Cần đóng hoặc đang trả góp</div>
                </div>
              </div>
              <span className="text-base font-extrabold text-status-warning-text tabular-nums">{owingCount} <span className="text-xs text-text-muted font-normal">thành viên</span></span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-main mb-1">Thao tác nhanh</h3>
            <p className="text-xs text-text-muted">Phím tắt chuyển hướng nhanh đến các trang làm việc</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Link
              href="/admin/setup"
              className="p-3 bg-bg-page hover:bg-bg-surface border border-border-subtle hover:border-brand/40 rounded-xl text-center text-xs font-semibold text-text-main transition shadow-sm"
            >
              Cài đặt & Nhập CSV
            </Link>
            <Link
              href="/admin/collection"
              className="p-3 bg-bg-page hover:bg-bg-surface border border-border-subtle hover:border-brand/40 rounded-xl text-center text-xs font-semibold text-text-main transition shadow-sm"
            >
              Ghi nhận thu tiền
            </Link>
            <Link
              href="/admin/expenses"
              className="p-3 bg-bg-page hover:bg-bg-surface border border-border-subtle hover:border-brand/40 rounded-xl text-center text-xs font-semibold text-text-main transition shadow-sm"
            >
              Ghi nhận khoản chi
            </Link>
            <Link
              href="/"
              className="p-3 bg-brand/10 hover:bg-brand hover:text-white border border-brand/20 hover:border-brand rounded-xl text-center text-xs font-bold text-brand transition shadow-sm"
            >
              Xem trang Công khai
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
