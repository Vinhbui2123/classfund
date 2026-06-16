'use client';

import { useState, useMemo } from 'react';
import { MemberStatus } from '@/lib/db/queries';
import QRModal from './QRModal';
import StatusBadge from './StatusBadge';
import { Search, Wallet, AlertCircle, QrCode, LogIn } from 'lucide-react';
import Link from 'next/link';

const BANK_NAMES: Record<string, string> = {
  '970415': 'VietinBank',
  '970436': 'Vietcombank',
  '970418': 'BIDV',
  '970422': 'MB Bank',
  '970407': 'Techcombank',
  '970432': 'VPBank',
  '970416': 'ACB',
  '970423': 'TPBank',
  '970403': 'Sacombank',
  '970454': 'Bản Việt',
  '970439': 'ZaloPay',
};

interface PublicDashboardProps {
  initialMembers: MemberStatus[];
  initialCampaigns: { id: number; name: string; status: string }[];
  balance: number;
  bankBin: string;
  bankAccountNumber: string;
  bankAccountName: string;
}

export default function PublicDashboard({
  initialMembers,
  initialCampaigns,
  balance,
  bankBin,
  bankAccountNumber,
  bankAccountName,
}: PublicDashboardProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(
    initialCampaigns.length > 0 ? initialCampaigns[0].id : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [selectedMember, setSelectedMember] = useState<MemberStatus | null>(null);
  const [isQrOpen, setIsQrOpen] = useState(false);

  // Normalize search helper
  const cleanSearch = useMemo(() => {
    return searchQuery
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  }, [searchQuery]);

  // Selected Campaign Info
  const selectedCampaign = useMemo(() => {
    return initialCampaigns.find((c) => c.id === selectedCampaignId) || null;
  }, [initialCampaigns, selectedCampaignId]);

  // Filtered members list: show only members enrolled in the selected campaign
  const filteredMembers = useMemo(() => {
    return initialMembers.filter((m) => {
      const payment = m.payments.find(p => p.campaignId === selectedCampaignId);
      if (!payment || !payment.isEnrolled) return false;

      const matchName = m.normalizedName.includes(cleanSearch);
      const matchId = m.studentId?.toLowerCase().includes(cleanSearch) || false;
      const matchRef = m.referenceCode.toLowerCase().includes(cleanSearch);
      return matchName || matchId || matchRef;
    });
  }, [initialMembers, cleanSearch, selectedCampaignId]);

  const handleOpenQr = (member: MemberStatus) => {
    setSelectedMember(member);
    setIsQrOpen(true);
  };

  return (
    <div className="min-h-screen bg-bg-page text-text-main font-sans selection:bg-brand/30 pb-12">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.05),transparent_50%)] pointer-events-none" />
      
      {/* Container */}
      <div className="max-w-6xl mx-auto px-4 py-8 relative">
        
        {/* Navbar */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-border-subtle mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand to-emerald-500 flex items-center justify-center shadow-md shadow-brand/10">
              <span className="font-extrabold text-white text-lg font-mono">CF</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-text-main">
                ClassFund - Quỹ Lớp
              </h1>
              <p className="text-xs text-text-muted">Xem công nợ và đóng tiền trực tuyến</p>
            </div>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-2 py-2 px-4 rounded-xl bg-bg-surface border border-border-subtle hover:border-brand/40 hover:bg-bg-page text-sm text-text-main font-semibold transition shadow-sm"
          >
            <LogIn className="w-4 h-4 text-brand" />
            Cán sự lớp đăng nhập
          </Link>
        </header>

        {/* Hero Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Total balance card */}
          <div className="md:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 flex flex-col justify-between shadow-sm text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold opacity-90">Số dư quỹ hiện tại</span>
              <div className="p-2 rounded-xl bg-white/10 border border-white/20">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums">
                {balance.toLocaleString('vi-VN')} ₫
              </h2>
              <p className="text-xs opacity-75 mt-2">Được cập nhật tự động ngay khi giao dịch được xác thực</p>
            </div>
          </div>

          {/* Quick Bank Info */}
          <div className="rounded-2xl border border-border-subtle bg-bg-surface p-6 flex flex-col justify-between shadow-sm">
            <h3 className="text-sm text-text-muted font-semibold">Tài Khoản Thụ Hưởng</h3>
            <div className="mt-3 space-y-1">
              <div className="text-xs text-text-muted font-mono">{BANK_NAMES[bankBin] || 'Ngân hàng'}</div>
              <div className="text-lg font-bold text-text-main font-mono">{bankAccountNumber}</div>
              <div className="text-xs text-text-muted uppercase tracking-wide font-medium">{bankAccountName}</div>
            </div>
            <div className="text-[10px] text-brand font-semibold mt-4">
              * Vui lòng nhấn &quot;Quét QR&quot; dưới tên của bạn để sinh mã đúng nội dung.
            </div>
          </div>
        </div>

        {/* Search & Selector Panel */}
        <div className="bg-bg-surface border border-border-subtle rounded-2xl p-4 sm:p-5 mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            
            {/* Search Input */}
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, mssv, mã tham chiếu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-bg-page border border-border-subtle focus:border-brand rounded-xl py-2 pl-10 pr-4 text-sm text-text-main placeholder-text-muted outline-none transition focus:ring-2 focus:ring-brand/10 h-10"
              />
            </div>

            {/* Campaign Select tabs */}
            {initialCampaigns.length > 0 && (
              <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                {initialCampaigns.map((camp) => (
                  <button
                    key={camp.id}
                    onClick={() => setSelectedCampaignId(camp.id)}
                    className={`py-2 px-4 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      selectedCampaignId === camp.id
                        ? 'bg-brand border-brand text-white shadow-sm hover:bg-brand-hover'
                        : 'bg-bg-page border-border-subtle text-text-muted hover:border-brand/40 hover:text-text-main'
                    }`}
                  >
                    {camp.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Member Status Table */}
        <div className="bg-bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
          {initialCampaigns.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
              <h3 className="text-lg font-bold text-text-main mb-1">Không Có Đợt Thu Nào Hoạt Động</h3>
              <p className="text-sm text-text-muted max-w-sm">Hiện tại Ban cán sự lớp chưa mở đợt thu quỹ nào.</p>
            </div>
          ) : !selectedCampaign ? (
            <div className="p-12 text-center text-text-muted">Chọn một đợt thu để hiển thị thông tin</div>
          ) : (
            <>
              {/* Desktop view */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-subtle bg-bg-page/50 text-xs font-bold text-text-muted uppercase tracking-wider">
                      <th className="py-4 px-6">Thành viên</th>
                      <th className="py-4 px-6">Mã tham chiếu</th>
                      <th className="py-4 px-6 text-right">Mức thu</th>
                      <th className="py-4 px-6 text-right">Đã đóng</th>
                      <th className="py-4 px-6">Trạng thái</th>
                      <th className="py-4 px-6 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/50 text-sm">
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 px-6 text-center text-text-muted">
                          Không tìm thấy thành viên nào khớp với tìm kiếm hoặc tham gia đợt này.
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((member) => {
                        const payment = member.payments.find(p => p.campaignId === selectedCampaign.id);
                        const paid = payment?.paidAmount || 0;
                        const target = payment?.targetAmount || 0;
                        const isPaidFull = paid >= target;
                        const status = isPaidFull ? 'full' : paid > 0 ? 'partial' : 'unpaid';

                        return (
                          <tr
                            key={member.id}
                            className="hover:bg-bg-page/40 transition group"
                          >
                            {/* Member details */}
                            <td className="py-4 px-6">
                              <div className="font-semibold text-text-main group-hover:text-brand transition">
                                {member.fullName}
                              </div>
                              {member.studentId && (
                                <div className="text-xs text-text-muted mt-0.5 font-mono">
                                  MSSV: {member.studentId}
                                </div>
                              )}
                            </td>

                            {/* Reference code */}
                            <td className="py-4 px-6 font-mono text-xs text-text-muted">
                              {member.referenceCode}
                            </td>

                            {/* Target amount */}
                            <td className="py-4 px-6 text-right text-text-muted font-medium tabular-nums">
                              {target.toLocaleString('vi-VN')} ₫
                            </td>

                            {/* Paid amount */}
                            <td className="py-4 px-6 text-right font-semibold text-text-main tabular-nums">
                              {paid.toLocaleString('vi-VN')} ₫
                            </td>

                            {/* Status */}
                            <td className="py-4 px-6">
                              <StatusBadge status={status} />
                            </td>

                            {/* Action button */}
                            <td className="py-4 px-6 text-right">
                              {isPaidFull ? (
                                <span className="text-xs text-text-muted pr-3 select-none">Đã hoàn thành</span>
                              ) : (
                                <button
                                  onClick={() => handleOpenQr(member)}
                                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-brand/10 text-brand border border-brand/20 hover:bg-brand hover:text-white hover:border-brand text-xs font-bold transition cursor-pointer"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  Quét QR
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile view */}
              <div className="block sm:hidden divide-y divide-border-subtle/50">
                {filteredMembers.length === 0 ? (
                  <div className="py-12 px-6 text-center text-text-muted text-sm">
                    Không tìm thấy thành viên nào khớp với tìm kiếm hoặc tham gia đợt này.
                  </div>
                ) : (
                  filteredMembers.map((member) => {
                    const payment = member.payments.find(p => p.campaignId === selectedCampaign.id);
                    const paid = payment?.paidAmount || 0;
                    const target = payment?.targetAmount || 0;
                    const isPaidFull = paid >= target;
                    const status = isPaidFull ? 'full' : paid > 0 ? 'partial' : 'unpaid';

                    return (
                      <div key={member.id} className="p-4 space-y-3 hover:bg-bg-page/20 transition">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-text-main">{member.fullName}</div>
                            {member.studentId && (
                              <div className="text-[11px] text-text-muted font-mono mt-0.5">MSSV: {member.studentId}</div>
                            )}
                            <div className="text-[10px] text-text-muted font-mono mt-0.5">Mã CK: {member.referenceCode}</div>
                          </div>
                          <StatusBadge status={status} />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs py-1 px-3 bg-bg-page rounded-xl border border-border-subtle/40">
                          <div>
                            <span className="text-text-muted block text-[10px]">Mức thu</span>
                            <span className="font-semibold text-text-main tabular-nums">{target.toLocaleString('vi-VN')} ₫</span>
                          </div>
                          <div>
                            <span className="text-text-muted block text-[10px]">Đã đóng</span>
                            <span className="font-bold text-text-main tabular-nums">{paid.toLocaleString('vi-VN')} ₫</span>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          {isPaidFull ? (
                            <span className="text-xs text-text-muted py-1.5 select-none font-medium">Đã hoàn thành</span>
                          ) : (
                            <button
                              onClick={() => handleOpenQr(member)}
                              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-brand text-white text-xs font-bold transition cursor-pointer hover:bg-brand-hover shadow-sm"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              Quét QR đóng tiền
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* QR payment modal */}
      <QRModal
        key={selectedMember ? `${selectedMember.id}-${selectedCampaign?.id}` : 'empty'}
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        member={
          selectedMember
            ? {
                id: selectedMember.id,
                fullName: selectedMember.fullName,
                referenceCode: selectedMember.referenceCode,
                studentId: selectedMember.studentId,
              }
            : null
        }
        campaign={
          selectedMember && selectedCampaign
            ? {
                id: selectedCampaign.id,
                name: selectedCampaign.name,
                targetAmount: selectedMember.payments.find(p => p.campaignId === selectedCampaign.id)?.targetAmount || 0,
                paidAmount: selectedMember.payments.find(p => p.campaignId === selectedCampaign.id)?.paidAmount || 0,
              }
            : null
        }
        bankBin={bankBin}
        bankAccountNumber={bankAccountNumber}
        bankAccountName={bankAccountName}
      />
    </div>
  );
}
