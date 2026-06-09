'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Sparkles, Clipboard, AlertCircle, CheckCircle2, RefreshCw, X } from 'lucide-react';
import { bulkSetExpectedAmounts, removeMemberFromCampaign } from '@/app/actions/campaignMembers';

interface Campaign {
  id: number;
  name: string;
  description: string | null;
  status: string;
}

interface CampaignMemberDetail {
  memberId: number;
  fullName: string;
  studentId: string | null;
  referenceCode: string;
  expectedAmount: number;
  paidAmount: number;
  remaining: number;
  status: 'unpaid' | 'partial' | 'full' | 'overpaid';
  isEnrolled: boolean;
  note: string | null;
}

interface CampaignMembersDashboardProps {
  campaign: Campaign;
  initialMembers: CampaignMemberDetail[];
}

export default function CampaignMembersDashboard({
  campaign,
  initialMembers,
}: CampaignMembersDashboardProps) {
  const router = useRouter();
  
  // State for member configurations
  const [membersList, setMembersList] = useState<CampaignMemberDetail[]>(initialMembers);
  
  // Flat rate applier state
  const [flatAmount, setFlatAmount] = useState<string>('');
  
  // Excel Copy-Paste Tool state
  const [showExcelModal, setShowExcelModal] = useState<boolean>(false);
  const [excelText, setExcelText] = useState<string>('');
  const [excelError, setExcelError] = useState<string | null>(null);
  const [excelSuccess, setExcelSuccess] = useState<string | null>(null);

  // General messages
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Helper: Format currency
  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Helper: Normalizing text for fuzzy match
  const normalizeText = (text: string) => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .toLowerCase()
      .replace(/\s+/g, '');
  };

  // Handle single member check/uncheck (enroll/disenroll)
  const handleEnrollToggle = (memberId: number, checked: boolean) => {
    setMembersList(prev =>
      prev.map(m => {
        if (m.memberId === memberId) {
          // If they already paid, they cannot be unenrolled
          if (!checked && m.paidAmount > 0) {
            alert('Thành viên này đã có lịch sử đóng tiền, không thể huỷ tham gia đợt thu!');
            return m;
          }
          return {
            ...m,
            isEnrolled: checked,
            expectedAmount: checked ? (m.expectedAmount || 50000) : 0, // default to 50k if checking and it was 0
          };
        }
        return m;
      })
    );
  };

  // Handle single member expected amount change
  const handleAmountChange = (memberId: number, val: string) => {
    const parsed = parseInt(val.replace(/\D/g, ''), 10) || 0;
    setMembersList(prev =>
      prev.map(m => {
        if (m.memberId === memberId) {
          return {
            ...m,
            expectedAmount: parsed,
            isEnrolled: parsed > 0 ? true : m.isEnrolled, // auto-enroll if amount > 0
          };
        }
        return m;
      })
    );
  };

  // Handle single member note change
  const handleNoteChange = (memberId: number, note: string) => {
    setMembersList(prev =>
      prev.map(m => (m.memberId === memberId ? { ...m, note } : m))
    );
  };

  // Flat rate applier
  const handleApplyFlatAmount = () => {
    const amount = parseInt(flatAmount.replace(/\D/g, ''), 10);
    if (isNaN(amount) || amount < 0) {
      alert('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    setMembersList(prev =>
      prev.map(m => {
        // Only apply to checked members, or auto-check and apply to everyone
        return {
          ...m,
          isEnrolled: true,
          expectedAmount: amount,
        };
      })
    );
    setFlatAmount('');
  };

  // Excel Copy-Paste Parser
  const handleImportExcel = () => {
    setExcelError(null);
    setExcelSuccess(null);

    if (!excelText.trim()) {
      setExcelError('Nội dung dán trống');
      return;
    }

    const lines = excelText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let matchedCount = 0;
    let unmatchedLines: string[] = [];

    // Create a mutable copy of membersList to update
    let updatedList = [...membersList];

    for (const line of lines) {
      const parts = line.split('\t').map(p => p.trim());
      if (parts.length < 2) {
        unmatchedLines.push(line);
        continue;
      }

      const identifier = parts[0];
      const amountStr = parts[1];
      const noteStr = parts[2] || null;

      const parsedAmount = parseInt(amountStr.replace(/\D/g, ''), 10);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        unmatchedLines.push(`${line} (Số tiền không hợp lệ)`);
        continue;
      }

      // Try matching by MSSV (studentId), referenceCode, or fuzzy Name
      const normalizedIdentifier = normalizeText(identifier);
      let matchIdx = -1;

      // 1. Match by studentId (exact)
      matchIdx = updatedList.findIndex(m => m.studentId && m.studentId === identifier);

      // 2. Match by referenceCode (exact, case-insensitive)
      if (matchIdx === -1) {
        matchIdx = updatedList.findIndex(m => m.referenceCode.toLowerCase() === identifier.toLowerCase());
      }

      // 3. Match by fuzzy name
      if (matchIdx === -1) {
        matchIdx = updatedList.findIndex(m => normalizeText(m.fullName) === normalizedIdentifier);
      }

      // 4. Fallback match: Name starts with or contains identifier
      if (matchIdx === -1) {
        matchIdx = updatedList.findIndex(m => normalizeText(m.fullName).includes(normalizedIdentifier));
      }

      if (matchIdx !== -1) {
        updatedList[matchIdx] = {
          ...updatedList[matchIdx],
          isEnrolled: true,
          expectedAmount: parsedAmount,
          note: noteStr || updatedList[matchIdx].note,
        };
        matchedCount++;
      } else {
        unmatchedLines.push(line);
      }
    }

    setMembersList(updatedList);

    if (unmatchedLines.length > 0) {
      setExcelError(`Không khớp được ${unmatchedLines.length} dòng:\n${unmatchedLines.join('\n')}`);
    }
    setExcelSuccess(`Đã cập nhật mức thu cho ${matchedCount} thành viên khớp thành công!`);
    setExcelText('');
  };

  // Submit bulk configuration to database
  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      const enrolledItems = membersList
        .filter(m => m.isEnrolled)
        .map(m => ({
          memberId: m.memberId,
          expectedAmount: m.expectedAmount,
          note: m.note,
        }));

      // 1. Bulk set all enrolled configurations
      const bulkRes = await bulkSetExpectedAmounts({
        campaignId: campaign.id,
        items: enrolledItems,
      });

      if (!bulkRes.ok) {
        setSaveMessage({ type: 'error', text: bulkRes.error || 'Lỗi khi lưu cấu hình đợt thu' });
        setSaving(false);
        return;
      }

      // 2. For members that were enrolled originally but are now unchecked (isEnrolled=false), remove them
      const toRemove = initialMembers.filter(
        m => m.isEnrolled && !membersList.find(x => x.memberId === m.memberId)?.isEnrolled
      );

      let removeErrors = [];
      for (const rm of toRemove) {
        const delRes = await removeMemberFromCampaign({
          campaignId: campaign.id,
          memberId: rm.memberId,
        });
        if (!delRes.ok) {
          removeErrors.push(`${rm.fullName}: ${delRes.error}`);
        }
      }

      if (removeErrors.length > 0) {
        setSaveMessage({
          type: 'error',
          text: `Đã cấu hình các thành viên tham gia, nhưng không thể xoá một số thành viên: \n${removeErrors.join('\n')}`,
        });
      } else {
        setSaveMessage({ type: 'success', text: 'Đã lưu cấu hình mức thu thành công!' });
        router.refresh();
      }
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Lỗi hệ thống' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <Link href="/admin/setup" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-3.5 h-3.5" />
            Quay lại cài đặt đợt thu
          </Link>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            Cấu hình mức thu: {campaign.name}
            <span className={`text-[10px] font-bold py-0.5 px-2 rounded-full ${
              campaign.status === 'open' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {campaign.status === 'open' ? 'Đang mở' : 'Đã đóng'}
            </span>
          </h1>
          {campaign.description && (
            <p className="text-xs text-slate-500">{campaign.description}</p>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 py-2 px-5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold rounded-lg text-xs transition shadow-lg shadow-cyan-500/10 cursor-pointer"
        >
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Lưu thay đổi
        </button>
      </div>

      {/* Save Messages */}
      {saveMessage && (
        <div className={`p-4 rounded-xl border flex items-start gap-2.5 text-xs whitespace-pre-line ${
          saveMessage.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          {saveMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          <span>{saveMessage.text}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Flat rate applier */}
        <div className="bg-slate-900/30 border border-slate-800/80 p-4 rounded-xl space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Áp dụng mức thu chung
            </h3>
            <p className="text-[10px] text-slate-500">
              Gán nhanh cùng một mức thu cho tất cả các thành viên lớp.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ví dụ: 100.000"
              value={flatAmount}
              onChange={(e) => setFlatAmount(e.target.value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.'))}
              className="flex-1 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 outline-none transition"
            />
            <button
              onClick={handleApplyFlatAmount}
              className="py-2 px-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Áp dụng
            </button>
          </div>
        </div>

        {/* Excel Copy-Paste Tool Trigger */}
        <div className="bg-slate-900/30 border border-slate-800/80 p-4 rounded-xl space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Clipboard className="w-3.5 h-3.5 text-cyan-400" />
              Sao chép - Dán từ Excel
            </h3>
            <p className="text-[10px] text-slate-500">
              Dán cột dữ liệu từ file Excel (Tên/MSSV + Số tiền + Ghi chú) để tự động điền nhanh.
            </p>
          </div>
          <button
            onClick={() => setShowExcelModal(true)}
            className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Mở công cụ nhập Excel
          </button>
        </div>
      </div>

      {/* Main Members Configuration List Table */}
      <div className="bg-slate-900/20 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-900/30 text-slate-400 uppercase font-bold tracking-wider">
              <th className="py-3 px-4 w-12 text-center">Tham gia</th>
              <th className="py-3 px-4">Thành viên</th>
              <th className="py-3 px-4">Số tiền cần đóng (VND)</th>
              <th className="py-3 px-4">Đã đóng</th>
              <th className="py-3 px-4">Còn thiếu</th>
              <th className="py-3 px-4">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {membersList.map((m) => {
              const remaining = Math.max(0, m.expectedAmount - m.paidAmount);
              return (
                <tr key={m.memberId} className={`transition ${
                  m.isEnrolled ? 'bg-cyan-500/[0.01]' : 'opacity-50 bg-slate-950/20'
                }`}>
                  <td className="py-3 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={m.isEnrolled}
                      onChange={(e) => handleEnrollToggle(m.memberId, e.target.checked)}
                      className="w-4 h-4 rounded border-slate-800 text-cyan-500 bg-slate-950 focus:ring-cyan-500"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{m.fullName}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span>MSSV: {m.studentId || '-'}</span>
                      <span className="text-slate-700">•</span>
                      <span>Mã: {m.referenceCode}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      disabled={!m.isEnrolled}
                      value={m.isEnrolled ? m.expectedAmount.toLocaleString('vi-VN') : ''}
                      placeholder="0"
                      onChange={(e) => handleAmountChange(m.memberId, e.target.value)}
                      className="w-36 bg-slate-950 border border-slate-800 disabled:opacity-40 disabled:border-transparent focus:border-cyan-500 rounded-lg py-1.5 px-3 text-xs text-white placeholder-slate-700 outline-none transition text-right font-semibold"
                    />
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-400">
                    {formatVND(m.paidAmount)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-300">
                    {formatVND(remaining)}
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      disabled={!m.isEnrolled}
                      value={m.note || ''}
                      placeholder="Ghi chú đóng..."
                      onChange={(e) => handleNoteChange(m.memberId, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 disabled:opacity-40 disabled:border-transparent focus:border-cyan-500 rounded-lg py-1.5 px-3 text-xs text-white placeholder-slate-700 outline-none transition"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Excel Copy-Paste Tool Dialog Modal */}
      {showExcelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            
            <div className="p-4 border-b border-slate-850 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clipboard className="w-4 h-4 text-cyan-400" />
                Công cụ dán dữ liệu Excel
              </h2>
              <button
                onClick={() => {
                  setShowExcelModal(false);
                  setExcelError(null);
                  setExcelSuccess(null);
                }}
                className="p-1 rounded bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 space-y-1.5 text-[11px] text-slate-400 leading-relaxed">
                <p className="font-bold text-slate-200">Hướng dẫn sử dụng:</p>
                <p>1. Copy 2 hoặc 3 cột từ bảng Excel của bạn. Ví dụ:</p>
                <pre className="bg-slate-900 p-2 rounded font-mono text-[10px] text-slate-300 mt-1 select-all">
                  Nguyễn Văn A	100000	Giảm giá 5%<br />
                  2221050001	150000	Không ghi chú<br />
                  TRANTHIB	50000
                </pre>
                <p className="mt-1">2. Dán toàn bộ vào ô văn bản phía dưới rồi ấn <strong className="text-cyan-400">"Xử lý và Nhập"</strong>.</p>
                <p>3. Hệ thống sẽ tự khớp theo <strong className="text-slate-200">Họ tên, MSSV hoặc Mã CK</strong> của thành viên lớp.</p>
              </div>

              {excelSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{excelSuccess}</span>
                </div>
              )}

              {excelError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-start gap-2 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{excelError}</span>
                </div>
              )}

              <textarea
                value={excelText}
                onChange={(e) => setExcelText(e.target.value)}
                placeholder="Dán dữ liệu Excel tại đây..."
                rows={8}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-xl p-3 text-xs text-white placeholder-slate-700 outline-none transition font-mono resize-none"
              />
            </div>

            <div className="p-4 border-t border-slate-850 bg-slate-950/20 flex justify-end gap-2 text-xs">
              <button
                onClick={() => {
                  setShowExcelModal(false);
                  setExcelError(null);
                  setExcelSuccess(null);
                }}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-lg transition"
              >
                Đóng
              </button>
              <button
                onClick={handleImportExcel}
                className="py-2 px-5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition"
              >
                Xử lý và Nhập
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
