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
    const unmatchedLines: string[] = [];

    // Create a mutable copy of membersList to update
    const updatedList = [...membersList];

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

      const removeErrors: string[] = [];
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi hệ thống';
      setSaveMessage({ type: 'error', text: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-subtle pb-5">
        <div className="space-y-1">
          <Link href="/admin/setup" className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-main transition font-semibold cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" />
            Quay lại cài đặt đợt thu
          </Link>
          <h1 className="text-xl font-bold text-text-main flex items-center gap-2 tracking-tight">
            Cấu hình mức thu: {campaign.name}
            <span className={`text-[10px] font-bold py-0.5 px-2.5 rounded-full ${
              campaign.status === 'open' 
                ? 'bg-status-success-bg text-status-success-text border border-status-success-text/10' 
                : 'bg-bg-page border border-border-subtle text-text-muted'
            }`}>
              {campaign.status === 'open' ? 'Đang mở' : 'Đã đóng'}
            </span>
          </h1>
          {campaign.description && (
            <p className="text-xs text-text-muted">{campaign.description}</p>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 py-2 px-5 bg-brand hover:bg-brand-hover text-white disabled:bg-bg-page disabled:text-text-muted border border-transparent disabled:border-border-subtle font-bold rounded-xl text-xs transition shadow-sm cursor-pointer h-10"
        >
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Lưu thay đổi
        </button>
      </div>

      {/* Save Messages */}
      {saveMessage && (
        <div className={`p-4 rounded-xl border flex items-start gap-2.5 text-xs whitespace-pre-line ${
          saveMessage.type === 'success' 
            ? 'bg-status-success-bg border-status-success-text/10 text-status-success-text' 
            : 'bg-status-error-bg border-status-error-text/10 text-status-error-text'
        }`}>
          {saveMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          <span className="font-semibold">{saveMessage.text}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Flat rate applier */}
        <div className="bg-bg-surface border border-border-subtle p-5 rounded-2xl space-y-4 flex flex-col justify-between shadow-sm">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-text-main flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Áp dụng mức thu chung
            </h3>
            <p className="text-[10px] text-text-muted">
              Gán nhanh cùng một mức thu cho tất cả các thành viên lớp.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ví dụ: 100.000"
              value={flatAmount}
              onChange={(e) => setFlatAmount(e.target.value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.'))}
              className="flex-1 bg-bg-page border border-border-subtle focus:border-brand rounded-xl py-2 px-3 text-xs text-text-main placeholder-text-muted outline-none transition focus:ring-2 focus:ring-brand/10 h-10 font-medium"
            />
            <button
              onClick={handleApplyFlatAmount}
              className="py-2 px-4 bg-bg-page border border-border-subtle hover:border-brand hover:text-brand text-text-main rounded-xl text-xs font-bold transition cursor-pointer h-10"
            >
              Áp dụng
            </button>
          </div>
        </div>

        {/* Excel Copy-Paste Tool Trigger */}
        <div className="bg-bg-surface border border-border-subtle p-5 rounded-2xl space-y-4 flex flex-col justify-between shadow-sm">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-text-main flex items-center gap-1.5 uppercase tracking-wider">
              <Clipboard className="w-3.5 h-3.5 text-brand" />
              Sao chép - Dán từ Excel
            </h3>
            <p className="text-[10px] text-text-muted">
              Dán cột dữ liệu từ file Excel (Tên/MSSV + Số tiền + Ghi chú) để tự động điền nhanh.
            </p>
          </div>
          <button
            onClick={() => setShowExcelModal(true)}
            className="w-full py-2 px-4 bg-bg-page border border-border-subtle hover:border-brand hover:text-brand text-text-main rounded-xl text-xs font-bold transition cursor-pointer h-10"
          >
            Mở công cụ nhập Excel
          </button>
        </div>
      </div>

      {/* Main Members Configuration List Table */}
      <div className="bg-bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-page/50 text-text-muted uppercase font-bold tracking-wider">
                <th className="py-3.5 px-4 w-16 text-center">Tham gia</th>
                <th className="py-3.5 px-4">Thành viên</th>
                <th className="py-3.5 px-4">Số tiền cần đóng (VND)</th>
                <th className="py-3.5 px-4">Đã đóng</th>
                <th className="py-3.5 px-4">Còn thiếu</th>
                <th className="py-3.5 px-4">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50">
              {membersList.map((m) => {
                const remaining = Math.max(0, m.expectedAmount - m.paidAmount);
                return (
                  <tr key={m.memberId} className={`transition ${
                    m.isEnrolled ? 'bg-brand/[0.01]' : 'opacity-60 bg-bg-page/20'
                  }`}>
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={m.isEnrolled}
                        onChange={(e) => handleEnrollToggle(m.memberId, e.target.checked)}
                        className="w-4 h-4 rounded border-border-subtle text-brand bg-bg-page focus:ring-brand focus:ring-2 cursor-pointer outline-none"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-text-main">{m.fullName}</div>
                      <div className="text-[10px] text-text-muted flex items-center gap-1.5 mt-0.5">
                        <span>MSSV: {m.studentId || '-'}</span>
                        <span className="text-text-muted/40">•</span>
                        <span>Mã: {m.referenceCode}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <input
                        type="text"
                        disabled={!m.isEnrolled}
                        value={m.isEnrolled ? m.expectedAmount.toLocaleString('vi-VN') : ''}
                        placeholder="0"
                        onChange={(e) => handleAmountChange(m.memberId, e.target.value)}
                        className="w-32 bg-bg-page border border-border-subtle focus:border-brand disabled:opacity-40 disabled:border-transparent rounded-xl py-1.5 px-3 text-xs text-text-main placeholder-text-muted outline-none transition text-right font-bold h-9 focus:ring-2 focus:ring-brand/10 tabular-nums"
                      />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-text-muted tabular-nums">
                      {formatVND(m.paidAmount)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-text-main tabular-nums">
                      {formatVND(remaining)}
                    </td>
                    <td className="py-3.5 px-4">
                      <input
                        type="text"
                        disabled={!m.isEnrolled}
                        value={m.note || ''}
                        placeholder="Ghi chú đóng..."
                        onChange={(e) => handleNoteChange(m.memberId, e.target.value)}
                        className="w-full max-w-xs bg-bg-page border border-border-subtle focus:border-brand disabled:opacity-40 disabled:border-transparent rounded-xl py-1.5 px-3 text-xs text-text-main placeholder-text-muted outline-none transition h-9 focus:ring-2 focus:ring-brand/10"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Excel Copy-Paste Tool Dialog Modal */}
      {showExcelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
              <h2 className="text-sm font-bold text-text-main uppercase tracking-wider flex items-center gap-1.5">
                <Clipboard className="w-4 h-4 text-brand" />
                Công cụ dán dữ liệu Excel
              </h2>
              <button
                onClick={() => {
                  setShowExcelModal(false);
                  setExcelError(null);
                  setExcelSuccess(null);
                }}
                className="p-1 rounded-full text-text-muted hover:text-text-main hover:bg-bg-page transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              <div className="bg-bg-page p-3.5 rounded-xl border border-border-subtle space-y-1.5 text-[11px] text-text-muted leading-relaxed">
                <p className="font-bold text-text-main">Hướng dẫn sử dụng:</p>
                <p>1. Copy 2 hoặc 3 cột từ bảng Excel của bạn. Ví dụ:</p>
                <pre className="bg-bg-surface p-2 rounded-lg border border-border-subtle/50 font-mono text-[10px] text-text-main mt-1 select-all">
                  Nguyễn Văn A	100000	Giảm giá 5%<br />
                  2221050001	150000	Không ghi chú<br />
                  TRANTHIB	50000
                </pre>
                <p className="mt-1">2. Dán toàn bộ vào ô văn bản phía dưới rồi ấn <strong className="text-brand">&quot;Xử lý và Nhập&quot;</strong>.</p>
                <p>3. Hệ thống sẽ tự khớp theo <strong className="text-text-main">Họ tên, MSSV hoặc Mã CK</strong> của thành viên lớp.</p>
              </div>

              {excelSuccess && (
                <div className="p-3 bg-status-success-bg border border-status-success-text/10 text-status-success-text rounded-xl flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span className="font-semibold">{excelSuccess}</span>
                </div>
              )}

              {excelError && (
                <div className="p-3 bg-status-error-bg border border-status-error-text/10 text-status-error-text rounded-xl flex items-start gap-2 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold">{excelError}</span>
                </div>
              )}

              <textarea
                value={excelText}
                onChange={(e) => setExcelText(e.target.value)}
                placeholder="Dán dữ liệu Excel tại đây..."
                rows={8}
                className="w-full bg-bg-page border border-border-subtle focus:border-brand rounded-xl p-3 text-xs text-text-main placeholder-text-muted outline-none transition font-mono resize-none focus:ring-2 focus:ring-brand/10"
              />
            </div>

            <div className="p-4 border-t border-border-subtle bg-bg-page/20 flex justify-end gap-2 text-xs h-18 items-center">
              <button
                onClick={() => {
                  setShowExcelModal(false);
                  setExcelError(null);
                  setExcelSuccess(null);
                }}
                className="py-2.5 px-4 bg-bg-page border border-border-subtle text-text-muted hover:text-text-main rounded-xl transition font-bold cursor-pointer h-10"
              >
                Đóng
              </button>
              <button
                onClick={handleImportExcel}
                className="py-2.5 px-5 bg-brand hover:bg-brand-hover text-white font-bold rounded-xl transition cursor-pointer h-10"
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
