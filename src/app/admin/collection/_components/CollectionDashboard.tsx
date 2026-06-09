'use client';

import { useState } from 'react';
import { MemberStatus } from '@/lib/db/queries';
import { recordTransaction, recordFullPayment } from '@/app/actions/transactions';
import { Check, Edit3, X, Coins, Plus, CheckCircle2, AlertCircle } from 'lucide-react';

interface Campaign {
  id: number;
  name: string;
  status: string;
}

interface CollectionDashboardProps {
  membersStatus: MemberStatus[];
  campaigns: Campaign[];
}

export default function CollectionDashboard({
  membersStatus,
  campaigns,
}: CollectionDashboardProps) {
  const [list, setList] = useState<MemberStatus[]>(membersStatus);
  
  // Custom transaction record state
  const [activeRecord, setActiveRecord] = useState<{
    member: MemberStatus;
    campaign: Campaign;
  } | null>(null);

  const [form, setForm] = useState({
    amountPaid: '',
    paymentMethod: 'cash' as 'cash' | 'transfer',
    note: '',
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Quick record full payment handler
  const handleRecordFull = async (memberId: number, campaignId: number) => {
    if (!confirm('Ghi nhận thành viên đã đóng ĐỦ số tiền còn lại (Hình thức: Tiền mặt)?')) return;

    try {
      const res = await recordFullPayment(memberId, campaignId, 'cash');
      if (res.ok) {
        // Success feedback
        alert('Ghi nhận đóng đủ thành công!');
        window.location.reload(); // Quick refresh to update queries and state
      } else {
        alert(res.error || 'Thao tác thất bại');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenRecordCustom = (member: MemberStatus, campaign: Campaign, remaining: number) => {
    setActiveRecord({ member, campaign });
    setForm({
      amountPaid: remaining.toString(),
      paymentMethod: 'cash',
      note: '',
    });
    setMessage(null);
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecord) return;

    const amount = parseInt(form.amountPaid, 10);
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: 'error', text: 'Số tiền đóng phải lớn hơn 0' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await recordTransaction({
        memberId: activeRecord.member.id,
        campaignId: activeRecord.campaign.id,
        amountPaid: amount,
        paymentMethod: form.paymentMethod,
        note: form.note || null,
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Ghi nhận đóng tiền thành công!' });
        setTimeout(() => {
          setActiveRecord(null);
          window.location.reload();
        }, 1000);
      } else {
        setMessage({ type: 'error', text: res.error || 'Ghi nhận đóng tiền thất bại' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi khi xử lý' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Quản Lý Thu Quỹ Lớp</h2>
          <p className="text-xs text-slate-400 mt-0.5">Theo dõi chi tiết công nợ và ghi nhận các khoản thu</p>
        </div>
      </div>

      {/* Grid Layout of Collection */}
      <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/30 text-slate-400 uppercase font-bold tracking-wider">
                <th className="py-4 px-6 min-w-[150px]">Thành viên</th>
                {campaigns.map((camp) => (
                  <th key={camp.id} className="py-4 px-6 min-w-[200px]">
                    <div className="font-semibold text-white">{camp.name}</div>
                    <div className="text-[10px] text-slate-500 font-medium normal-case mt-0.5">
                      Cá nhân hoá mức thu
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={campaigns.length + 1} className="py-12 px-6 text-center text-slate-500">
                    Chưa có thành viên nào. Vui lòng vào Cài đặt để thêm thành viên trước.
                  </td>
                </tr>
              ) : (
                list.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-900/10 transition">
                    {/* Member Column */}
                    <td className="py-4 px-6 border-r border-slate-800/20">
                      <div className="font-semibold text-white">{member.fullName}</div>
                      {member.studentId && (
                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">MSSV: {member.studentId}</div>
                      )}
                    </td>

                    {/* Campaigns Columns */}
                    {campaigns.map((camp) => {
                      const payment = member.payments.find(p => p.campaignId === camp.id);
                      const isEnrolled = payment?.isEnrolled ?? false;
                      const paid = payment?.paidAmount || 0;
                      const target = payment?.targetAmount || 0;
                      const isPaidFull = paid >= target;
                      const remaining = Math.max(0, target - paid);

                      return (
                        <td key={camp.id} className="py-4 px-6 border-r border-slate-800/20">
                          {!isEnrolled ? (
                            <div className="text-slate-600 font-semibold text-center select-none">—</div>
                          ) : isPaidFull ? (
                            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Đã đóng đủ</span>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {/* Payment Status indicator */}
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Đã đóng:</span>
                                <span className="font-bold text-white">
                                  {paid.toLocaleString('vi-VN')} <span className="text-[10px] text-slate-500">/ {target.toLocaleString('vi-VN')} ₫</span>
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="bg-cyan-500 h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${target > 0 ? Math.min(100, (paid / target) * 100) : 0}%` }}
                                />
                              </div>

                              {/* Actions */}
                              {camp.status === 'open' ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleRecordFull(member.id, camp.id)}
                                    className="flex-1 py-1 px-2 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 hover:border-emerald-400 font-semibold transition text-[10px] text-center"
                                  >
                                    Đóng đủ
                                  </button>
                                  <button
                                    onClick={() => handleOpenRecordCustom(member, camp, remaining)}
                                    className="py-1 px-2 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition text-[10px]"
                                    title="Ghi nhận số tiền tùy chỉnh"
                                  >
                                    Thu lẻ
                                  </button>
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-500 italic">Đợt thu đã đóng</div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Custom Payment Modal */}
      {activeRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm scale-95 overflow-hidden rounded-xl bg-slate-900 border border-slate-800 p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Ghi Nhận Đóng Quỹ</h3>
              <button
                onClick={() => setActiveRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCustomSubmit} className="space-y-4 py-4 text-xs">
              {/* Member Details */}
              <div className="space-y-1">
                <div className="text-slate-400">Thành viên:</div>
                <div className="font-bold text-white text-sm">{activeRecord.member.fullName}</div>
              </div>

              {/* Campaign Details */}
              <div className="space-y-1">
                <div className="text-slate-400">Đợt thu:</div>
                <div className="font-semibold text-white">{activeRecord.campaign.name}</div>
              </div>

              {/* Amount Paid input */}
              <div className="space-y-1">
                <label className="text-slate-400">Số tiền nộp (VNĐ):</label>
                <input
                  type="number"
                  placeholder="200000"
                  value={form.amountPaid}
                  onChange={(e) => setForm(prev => ({ ...prev, amountPaid: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-lg py-2 px-3 text-white placeholder-slate-600 outline-none transition"
                  required
                />
              </div>

              {/* Payment Method select */}
              <div className="space-y-1">
                <label className="text-slate-400">Hình thức thanh toán:</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm(prev => ({ ...prev, paymentMethod: e.target.value as 'cash' | 'transfer' }))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-white outline-none transition"
                >
                  <option value="cash">Tiền mặt</option>
                  <option value="transfer">Chuyển khoản</option>
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-slate-400">Ghi chú (nếu có):</label>
                <input
                  type="text"
                  placeholder="Nộp trước một nửa..."
                  value={form.note}
                  onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-lg py-2 px-3 text-white placeholder-slate-600 outline-none transition"
                />
              </div>

              {/* Feedback messages */}
              {message && (
                <div className={`p-2.5 rounded-lg border flex items-center gap-2 text-[11px] ${
                  message.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span>{message.text}</span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveRecord(null)}
                  className="py-2 px-3 bg-slate-800 text-slate-300 hover:text-white rounded-lg transition"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg font-bold transition disabled:opacity-55"
                >
                  {loading ? 'Đang ghi...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
