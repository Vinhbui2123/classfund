'use client';

import { useState, useMemo } from 'react';
import { MemberStatus, MemberCampaignPayment } from '@/lib/db/queries';
import QRModal from './QRModal';
import { Search, Wallet, CheckCircle2, AlertCircle, QrCode, LogIn } from 'lucide-react';
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
  initialCampaigns: { id: number; name: string; targetAmount: number; status: string }[];
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

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return initialMembers.filter((m) => {
      const matchName = m.normalizedName.includes(cleanSearch);
      const matchId = m.studentId?.toLowerCase().includes(cleanSearch) || false;
      const matchRef = m.referenceCode.toLowerCase().includes(cleanSearch);
      return matchName || matchId || matchRef;
    });
  }, [initialMembers, cleanSearch]);

  const handleOpenQr = (member: MemberStatus) => {
    setSelectedMember(member);
    setIsQrOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30">
      
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(8,145,178,0.08),transparent_50%)] pointer-events-none" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Container */}
      <div className="max-w-6xl mx-auto px-4 py-8 relative">
        
        {/* Navbar */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-8 border-b border-slate-800/80 mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <span className="font-extrabold text-white text-lg font-mono">CF</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                ClassFund - Quỹ Lớp
              </h1>
              <p className="text-xs text-slate-400">Xem công nợ và đóng tiền trực tuyến</p>
            </div>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-2 py-2 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 text-sm text-slate-200 hover:text-white transition shadow-sm font-semibold"
          >
            <LogIn className="w-4 h-4 text-cyan-400" />
            Cán sự lớp đăng nhập
          </Link>
        </header>

        {/* Hero Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Total balance card */}
          <div className="md:col-span-2 relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md p-6 flex flex-col justify-between shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400 font-medium">Tổng Số Dư Quỹ Lớp</span>
              <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-800/20 text-cyan-400">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {balance.toLocaleString('vi-VN')} <span className="text-xl sm:text-2xl font-semibold text-cyan-400">₫</span>
              </h2>
              <p className="text-xs text-slate-400 mt-2">Được cập nhật tự động ngay khi giao dịch được xác thực</p>
            </div>
          </div>

          {/* Quick Bank Info */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md p-6 flex flex-col justify-between shadow-xl">
            <h3 className="text-sm text-slate-400 font-medium">Tài Khoản Thụ Hưởng</h3>
            <div className="mt-4 space-y-1.5">
              <div className="text-xs text-slate-500 font-mono">{BANK_NAMES[bankBin] || 'Ngân hàng'}</div>
              <div className="text-lg font-bold text-white font-mono">{bankAccountNumber}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wide font-medium">{bankAccountName}</div>
            </div>
            <div className="text-[10px] text-cyan-400/80 font-medium mt-4">
              * Vui lòng nhấn "Quét QR" dưới tên của bạn để sinh mã đúng nội dung.
            </div>
          </div>
        </div>

        {/* Search & Selector Panel */}
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-4 sm:p-6 mb-8 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            
            {/* Search Input */}
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, mssv, mã tham chiếu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:ring-2 focus:ring-cyan-500/10"
              />
            </div>

            {/* Campaign Select tabs */}
            {initialCampaigns.length > 0 && (
              <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                {initialCampaigns.map((camp) => (
                  <button
                    key={camp.id}
                    onClick={() => setSelectedCampaignId(camp.id)}
                    className={`py-2 px-4 rounded-xl text-xs font-semibold border transition ${
                      selectedCampaignId === camp.id
                        ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
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
        <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          {initialCampaigns.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">Không Có Đợt Thu Nào Hoạt Động</h3>
              <p className="text-sm text-slate-400 max-w-sm">Hiện tại Ban cán sự lớp chưa mở đợt thu quỹ nào.</p>
            </div>
          ) : !selectedCampaign ? (
            <div className="p-12 text-center">Chọn một đợt thu để hiển thị thông tin</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/30 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Thành viên</th>
                    <th className="py-4 px-6 hidden sm:table-cell">Mã tham chiếu</th>
                    <th className="py-4 px-6">Mức thu</th>
                    <th className="py-4 px-6">Đã đóng</th>
                    <th className="py-4 px-6">Trạng thái</th>
                    <th className="py-4 px-6 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-sm">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 px-6 text-center text-slate-500">
                        Không tìm thấy thành viên nào khớp với tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member) => {
                      const payment = member.payments.find(p => p.campaignId === selectedCampaign.id);
                      const paid = payment?.paidAmount || 0;
                      const target = selectedCampaign.targetAmount;
                      const isPaidFull = paid >= target;
                      const remaining = Math.max(0, target - paid);

                      return (
                        <tr
                          key={member.id}
                          className="hover:bg-slate-900/20 transition group"
                        >
                          {/* Member details */}
                          <td className="py-4 px-6">
                            <div className="font-semibold text-white group-hover:text-cyan-400 transition">
                              {member.fullName}
                            </div>
                            {member.studentId && (
                              <div className="text-xs text-slate-500 mt-0.5 font-mono">
                                MSSV: {member.studentId}
                              </div>
                            )}
                          </td>

                          {/* Reference code */}
                          <td className="py-4 px-6 hidden sm:table-cell font-mono text-xs text-slate-400">
                            {member.referenceCode}
                          </td>

                          {/* Target amount */}
                          <td className="py-4 px-6 text-slate-300 font-medium">
                            {target.toLocaleString('vi-VN')} ₫
                          </td>

                          {/* Paid amount */}
                          <td className="py-4 px-6 font-semibold text-white">
                            {paid.toLocaleString('vi-VN')} ₫
                          </td>

                          {/* Status */}
                          <td className="py-4 px-6">
                            {isPaidFull ? (
                              <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Đóng đủ
                              </span>
                            ) : paid > 0 ? (
                              <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                Trả góp
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                Chưa đóng
                              </span>
                            )}
                          </td>

                          {/* Action button */}
                          <td className="py-4 px-6 text-right">
                            {isPaidFull ? (
                              <span className="text-xs text-slate-500 pr-3 select-none">Đã hoàn thành</span>
                            ) : (
                              <button
                                onClick={() => handleOpenQr(member)}
                                className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/40 hover:bg-cyan-500 hover:text-slate-950 hover:border-cyan-400 text-xs font-semibold transition"
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
          )}
        </div>
      </div>

      {/* QR payment modal */}
      <QRModal
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
                targetAmount: selectedCampaign.targetAmount,
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
