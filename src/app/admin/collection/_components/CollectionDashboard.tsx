'use client';

import { useState } from 'react';
import { MemberStatus } from '@/lib/db/queries';
import { recordTransaction, recordFullPayment } from '@/app/actions/transactions';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi xử lý';
      setMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="border-b border-border-subtle pb-3">
        <h2 className="text-lg font-bold text-text-main">Quản Lý Thu Quỹ Lớp</h2>
        <p className="text-xs text-text-muted mt-0.5">Theo dõi chi tiết công nợ và ghi nhận các khoản thu</p>
      </div>

      {/* Grid Layout of Collection */}
      <div className="bg-bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-page/50 text-text-muted uppercase font-bold tracking-wider">
                <th className="py-4 px-6 min-w-[160px] sticky left-0 bg-bg-surface z-10">Thành viên</th>
                {campaigns.map((camp) => (
                  <th key={camp.id} className="py-4 px-6 min-w-[220px]">
                    <div className="font-semibold text-text-main">{camp.name}</div>
                    <div className="text-[10px] text-text-muted font-medium normal-case mt-0.5">
                      Cá nhân hoá mức thu
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50">
              {membersStatus.length === 0 ? (
                <tr>
                  <td colSpan={campaigns.length + 1} className="py-12 px-6 text-center text-text-muted">
                    Chưa có thành viên nào. Vui lòng vào Cài đặt để thêm thành viên trước.
                  </td>
                </tr>
              ) : (
                membersStatus.map((member) => (
                  <tr key={member.id} className="hover:bg-bg-page/20 transition">
                    {/* Member Column */}
                    <td className="py-4 px-6 border-r border-border-subtle/30 sticky left-0 bg-bg-surface z-10">
                      <div className="font-semibold text-text-main">{member.fullName}</div>
                      {member.studentId && (
                        <div className="text-[10px] text-text-muted mt-0.5 font-mono">MSSV: {member.studentId}</div>
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
                        <td key={camp.id} className="py-4 px-6 border-r border-border-subtle/30">
                          {!isEnrolled ? (
                            <div className="text-text-muted font-semibold text-center select-none">—</div>
                          ) : isPaidFull ? (
                            <div className="flex items-center gap-1.5 text-status-success-text font-bold">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Đã đóng đủ</span>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {/* Payment Status indicator */}
                              <div className="flex items-center justify-between">
                                <span className="text-text-muted">Đã đóng:</span>
                                <span className="font-bold text-text-main">
                                  {paid.toLocaleString('vi-VN')} <span className="text-[10px] text-text-muted font-normal">/ {target.toLocaleString('vi-VN')} ₫</span>
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div className="w-full bg-bg-page rounded-full h-1.5 overflow-hidden border border-border-subtle/30">
                                <div 
                                  className="bg-brand h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${target > 0 ? Math.min(100, (paid / target) * 100) : 0}%` }}
                                />
                              </div>

                              {/* Actions */}
                              {camp.status === 'open' ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleRecordFull(member.id, camp.id)}
                                    className="flex-1 py-1 px-2.5 rounded-lg bg-status-success-bg border border-status-success-text/10 text-status-success-text hover:bg-status-success-text hover:text-white font-bold transition text-[10px] text-center cursor-pointer h-7"
                                  >
                                    Đóng đủ
                                  </button>
                                  <button
                                    onClick={() => handleOpenRecordCustom(member, camp, remaining)}
                                    className="py-1 px-2.5 rounded-lg bg-bg-page border border-border-subtle text-text-muted hover:text-text-main hover:border-brand transition text-[10px] cursor-pointer h-7"
                                    title="Ghi nhận số tiền tùy chỉnh"
                                  >
                                    Thu lẻ
                                  </button>
                                </div>
                              ) : (
                                <div className="text-[10px] text-text-muted italic">Đợt thu đã đóng</div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm scale-95 overflow-hidden rounded-2xl bg-bg-surface border border-border-subtle p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <h3 className="text-sm font-bold text-text-main">Ghi Nhận Đóng Quỹ</h3>
              <button
                onClick={() => setActiveRecord(null)}
                className="p-1 rounded-full text-text-muted hover:text-text-main hover:bg-bg-page transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCustomSubmit} className="space-y-4 py-3 text-xs">
              {/* Member Details */}
              <div className="space-y-0.5">
                <div className="text-text-muted text-[10px] font-bold uppercase tracking-wider">Thành viên</div>
                <div className="font-bold text-text-main text-sm">{activeRecord.member.fullName}</div>
              </div>

              {/* Campaign Details */}
              <div className="space-y-0.5">
                <div className="text-text-muted text-[10px] font-bold uppercase tracking-wider">Đợt thu</div>
                <div className="font-semibold text-text-main">{activeRecord.campaign.name}</div>
              </div>

              {/* Amount Paid input */}
              <div className="space-y-1">
                <label className="text-text-muted text-[10px] font-bold uppercase tracking-wider">Số tiền nộp (VNĐ)</label>
                <input
                  type="number"
                  placeholder="200000"
                  value={form.amountPaid}
                  onChange={(e) => setForm(prev => ({ ...prev, amountPaid: e.target.value }))}
                  className="w-full bg-bg-page border border-border-subtle hover:border-brand/40 focus:border-brand rounded-xl py-2 px-3 text-text-main placeholder-text-muted outline-none transition focus:ring-2 focus:ring-brand/10 h-10 font-semibold text-right"
                  required
                />
              </div>

              {/* Payment Method select */}
              <div className="space-y-1">
                <label className="text-text-muted text-[10px] font-bold uppercase tracking-wider">Hình thức thanh toán</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm(prev => ({ ...prev, paymentMethod: e.target.value as 'cash' | 'transfer' }))}
                  className="w-full bg-bg-page border border-border-subtle focus:border-brand rounded-xl py-2 px-3 text-text-main outline-none transition focus:ring-2 focus:ring-brand/10 h-10 font-medium"
                >
                  <option value="cash">Tiền mặt</option>
                  <option value="transfer">Chuyển khoản</option>
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-text-muted text-[10px] font-bold uppercase tracking-wider">Ghi chú (nếu có)</label>
                <input
                  type="text"
                  placeholder="Nộp trước một nửa..."
                  value={form.note}
                  onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full bg-bg-page border border-border-subtle hover:border-brand/40 focus:border-brand rounded-xl py-2 px-3 text-text-main placeholder-text-muted outline-none transition focus:ring-2 focus:ring-brand/10 h-10"
                />
              </div>

              {/* Feedback messages */}
              {message && (
                <div className={`p-3 rounded-xl border flex items-center gap-2 text-[11px] ${
                  message.type === 'success' 
                    ? 'bg-status-success-bg border-status-success-text/10 text-status-success-text' 
                    : 'bg-status-error-bg border-status-error-text/10 text-status-error-text'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span className="font-semibold">{message.text}</span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-2 h-10">
                <button
                  type="button"
                  onClick={() => setActiveRecord(null)}
                  className="py-2.5 px-4 bg-bg-page border border-border-subtle text-text-muted hover:text-text-main rounded-xl transition cursor-pointer font-bold"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2.5 px-5 bg-brand hover:bg-brand-hover text-white rounded-xl font-bold transition disabled:opacity-55 cursor-pointer"
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
