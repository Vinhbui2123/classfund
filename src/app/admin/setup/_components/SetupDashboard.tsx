'use client';

import { useState } from 'react';
import { readString } from 'react-papaparse';
import Link from 'next/link';
import { createMember, updateMember, deleteMember, importMembers } from '@/app/actions/members';
import { createCampaign, closeCampaign, reopenCampaign } from '@/app/actions/campaigns';
import { Plus, Trash2, Edit2, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Member {
  id: number;
  fullName: string;
  referenceCode: string;
  studentId: string | null;
  contactInfo: string | null;
}

interface Campaign {
  id: number;
  name: string;
  description: string | null;
  status: string;
}

interface SetupDashboardProps {
  initialMembers: Member[];
  initialCampaigns: Campaign[];
}

export default function SetupDashboard({
  initialMembers,
  initialCampaigns,
}: SetupDashboardProps) {
  // State for lists
  const [membersList, setMembersList] = useState<Member[]>(initialMembers);
  const [campaignsList, setCampaignsList] = useState<Campaign[]>(initialCampaigns);

  // Form states - Member
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberForm, setMemberForm] = useState({
    fullName: '',
    studentId: '',
    contactInfo: '',
  });

  // Form states - Campaign
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
  });

  // UI States
  const [memberMessage, setMemberMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [campaignMessage, setCampaignMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);

  // Member CRUD Handlers
  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberMessage(null);

    if (!memberForm.fullName) {
      setMemberMessage({ type: 'error', text: 'Họ và tên không được để trống' });
      return;
    }

    try {
      if (editingMember) {
        const res = await updateMember(editingMember.id, {
          fullName: memberForm.fullName,
          studentId: memberForm.studentId || null,
          contactInfo: memberForm.contactInfo || null,
        });

        if (res.ok) {
          setMemberMessage({ type: 'success', text: 'Cập nhật thành viên thành công!' });
          // Update client-side list
          setMembersList(prev =>
            prev.map(m =>
              m.id === editingMember.id
                ? { ...m, fullName: memberForm.fullName, studentId: memberForm.studentId || null, contactInfo: memberForm.contactInfo || null }
                : m
            )
          );
          setEditingMember(null);
          setMemberForm({ fullName: '', studentId: '', contactInfo: '' });
        } else {
          setMemberMessage({ type: 'error', text: res.error || 'Cập nhật thất bại' });
        }
      } else {
        const res = await createMember({
          fullName: memberForm.fullName,
          studentId: memberForm.studentId || null,
          contactInfo: memberForm.contactInfo || null,
        });

        if (res.ok) {
          setMemberMessage({ type: 'success', text: 'Thêm thành viên thành công!' });
          setMembersList(prev => [...prev, res.data]);
          setMemberForm({ fullName: '', studentId: '', contactInfo: '' });
        } else {
          setMemberMessage({ type: 'error', text: res.error || 'Thêm thành viên thất bại' });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi xử lý form';
      setMemberMessage({ type: 'error', text: msg });
    }
  };

  const handleEditClick = (m: Member) => {
    setEditingMember(m);
    setMemberForm({
      fullName: m.fullName,
      studentId: m.studentId || '',
      contactInfo: m.contactInfo || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingMember(null);
    setMemberForm({ fullName: '', studentId: '', contactInfo: '' });
  };

  const handleDeleteMember = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xoá thành viên này? Giao dịch liên quan (nếu có) sẽ chặn xoá.')) return;
    setMemberMessage(null);

    try {
      const res = await deleteMember(id);
      if (res.ok) {
        setMemberMessage({ type: 'success', text: 'Xoá thành viên thành công!' });
        setMembersList(prev => prev.filter(m => m.id !== id));
      } else {
        setMemberMessage({ type: 'error', text: res.error || 'Xoá thành viên thất bại' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setMemberMessage({ type: 'error', text: msg });
    }
  };

  // CSV Import Handler
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvLoading(true);
    setMemberMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvText = event.target?.result as string;
      
      readString(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const mappedRows = (results.data as Record<string, string>[]).map((row) => ({
              fullName: row['Họ và tên'] || row['fullName'] || row['Ho va ten'] || '',
              studentId: row['MSSV'] || row['studentId'] || row['Ma so sinh vien'] || null,
              contactInfo: row['Liên hệ'] || row['contactInfo'] || row['Lien he'] || null,
            })).filter((r) => r.fullName.trim() !== '');

            if (mappedRows.length === 0) {
              setMemberMessage({ type: 'error', text: 'File CSV không hợp lệ hoặc rỗng' });
              setCsvLoading(false);
              return;
            }

            const res = await importMembers(mappedRows);
            if (res.ok) {
              setMemberMessage({
                type: 'success',
                text: `Import thành công ${res.data?.count ?? 0} thành viên mới!`,
              });
              // Reload page or refresh local component states
              window.location.reload();
            } else {
              setMemberMessage({ type: 'error', text: res.error || 'Lỗi khi import CSV' });
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Lỗi khi xử lý CSV';
            setMemberMessage({ type: 'error', text: msg });
          } finally {
            setCsvLoading(false);
          }
        },
      });
    };
    reader.readAsText(file);
  };

  // Campaign Form Handlers
  const handleCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCampaignMessage(null);

    if (!campaignForm.name) {
      setCampaignMessage({ type: 'error', text: 'Vui lòng nhập tên đợt thu' });
      return;
    }

    try {
      const res = await createCampaign({
        name: campaignForm.name,
        description: campaignForm.description || null,
      });

      if (res.ok) {
        setCampaignMessage({ type: 'success', text: 'Tạo đợt thu mới thành công!' });
        setCampaignsList(prev => [res.data, ...prev]);
        setCampaignForm({ name: '', description: '' });
      } else {
        setCampaignMessage({ type: 'error', text: res.error || 'Tạo đợt thu thất bại' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi xử lý form';
      setCampaignMessage({ type: 'error', text: msg });
    }
  };

  const handleCloseCampaign = async (id: number) => {
    if (!confirm('Bạn có chắc muốn đóng đợt thu này? Giao dịch liên quan sẽ không thể quét mã QR đóng tiền nữa.')) return;

    try {
      const res = await closeCampaign(id);
      if (res.ok) {
        setCampaignsList(prev =>
          prev.map(c => (c.id === id ? { ...c, status: 'closed' } : c))
        );
      } else {
        alert(res.error || 'Đóng đợt thu thất bại');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReopenCampaign = async (id: number) => {
    if (!confirm('Mở lại đợt thu này?')) return;

    try {
      const res = await reopenCampaign(id);
      if (res.ok) {
        setCampaignsList(prev =>
          prev.map(c => (c.id === id ? { ...c, status: 'open' } : c))
        );
      } else {
        alert(res.error || 'Mở lại đợt thu thất bại');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-10">
      
      {/* 2-Column setup: Members (Left), Campaigns (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Members Management */}
        <div className="space-y-6">
          <div className="border-b border-border-subtle pb-3 flex items-center justify-between gap-4 h-11">
            <h2 className="text-lg font-bold text-text-main">Thành Viên Lớp ({membersList.length})</h2>
            <div className="flex gap-2">
              <label className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-bg-surface border border-border-subtle hover:border-brand/40 text-xs font-semibold cursor-pointer text-text-main hover:text-brand transition shadow-sm h-10">
                <Upload className="w-3.5 h-3.5 text-brand" />
                {csvLoading ? 'Đang đọc...' : 'Nhập CSV'}
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                  disabled={csvLoading}
                />
              </label>
            </div>
          </div>

          {/* Member Success/Error Feedback */}
          {memberMessage && (
            <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
              memberMessage.type === 'success' 
                ? 'bg-status-success-bg border-status-success-text/10 text-status-success-text' 
                : 'bg-status-error-bg border-status-error-text/10 text-status-error-text'
            }`}>
              {memberMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              <span className="font-semibold">{memberMessage.text}</span>
            </div>
          )}

          {/* Manual Member Form */}
          <form onSubmit={handleMemberSubmit} className="bg-bg-surface border border-border-subtle p-5 rounded-2xl space-y-4 shadow-sm">
            <div className="font-bold text-xs text-text-muted uppercase tracking-wider">
              {editingMember ? 'Cập nhật thành viên' : 'Thêm thành viên thủ công'}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Họ và tên</label>
                <input
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={memberForm.fullName}
                  onChange={(e) => setMemberForm(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full bg-bg-page border border-border-subtle focus:border-brand rounded-xl py-2 px-3 text-xs text-text-main placeholder-text-muted outline-none transition focus:ring-2 focus:ring-brand/10 h-10"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">MSSV</label>
                <input
                  type="text"
                  placeholder="2221050001"
                  value={memberForm.studentId}
                  onChange={(e) => setMemberForm(prev => ({ ...prev, studentId: e.target.value }))}
                  className="w-full bg-bg-page border border-border-subtle focus:border-brand rounded-xl py-2 px-3 text-xs text-text-main placeholder-text-muted outline-none transition focus:ring-2 focus:ring-brand/10 h-10"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Liên hệ</label>
                <input
                  type="text"
                  placeholder="SĐT..."
                  value={memberForm.contactInfo}
                  onChange={(e) => setMemberForm(prev => ({ ...prev, contactInfo: e.target.value }))}
                  className="w-full bg-bg-page border border-border-subtle focus:border-brand rounded-xl py-2 px-3 text-xs text-text-main placeholder-text-muted outline-none transition focus:ring-2 focus:ring-brand/10 h-10"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-1">
              {editingMember && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="py-2.5 px-4 bg-bg-page border border-border-subtle text-text-muted hover:text-text-main rounded-xl transition cursor-pointer font-bold h-10"
                >
                  Huỷ
                </button>
              )}
              <button
                type="submit"
                className="flex items-center gap-1.5 py-2.5 px-4 bg-brand hover:bg-brand-hover text-white rounded-xl font-bold transition cursor-pointer h-10"
              >
                <Plus className="w-3.5 h-3.5" />
                {editingMember ? 'Lưu' : 'Thêm'}
              </button>
            </div>
          </form>

          {/* Members List Table */}
          <div className="bg-bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-sm max-h-[400px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-page/50 text-text-muted uppercase font-bold tracking-wider">
                  <th className="py-3.5 px-4">Tên</th>
                  <th className="py-3.5 px-4">Mã CK</th>
                  <th className="py-3.5 px-4">MSSV</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50">
                {membersList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 px-4 text-center text-text-muted">Chưa có thành viên nào. Hãy nhập CSV hoặc thêm thủ công.</td>
                  </tr>
                ) : (
                  membersList.map((m) => (
                    <tr key={m.id} className="hover:bg-bg-page/30 transition">
                      <td className="py-3 px-4 font-semibold text-text-main">{m.fullName}</td>
                      <td className="py-3 px-4 font-mono text-text-muted">{m.referenceCode}</td>
                      <td className="py-3 px-4 text-text-muted">{m.studentId || '-'}</td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleEditClick(m)}
                          className="p-1.5 rounded-xl hover:bg-bg-page text-text-muted hover:text-brand transition cursor-pointer inline-flex items-center"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(m.id)}
                          className="p-1.5 rounded-xl hover:bg-status-error-bg text-text-muted hover:text-status-error-text transition cursor-pointer inline-flex items-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="text-[10px] text-text-muted leading-normal px-1">
            * Mẫu file CSV hợp lệ có các cột tiêu đề: `Họ và tên`, `MSSV`, `Liên hệ`.
          </div>
        </div>

        {/* Campaigns Management */}
        <div className="space-y-6">
          <div className="border-b border-border-subtle pb-3 flex items-center justify-between gap-4 h-11">
            <h2 className="text-lg font-bold text-text-main">Đợt Thu Quỹ ({campaignsList.length})</h2>
          </div>

          {/* Campaign Success/Error Feedback */}
          {campaignMessage && (
            <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
              campaignMessage.type === 'success' 
                ? 'bg-status-success-bg border-status-success-text/10 text-status-success-text' 
                : 'bg-status-error-bg border-status-error-text/10 text-status-error-text'
            }`}>
              {campaignMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              <span className="font-semibold">{campaignMessage.text}</span>
            </div>
          )}

          {/* Create Campaign Form */}
          <form onSubmit={handleCampaignSubmit} className="bg-bg-surface border border-border-subtle p-5 rounded-2xl space-y-4 shadow-sm">
            <div className="font-bold text-xs text-text-muted uppercase tracking-wider">Tạo đợt thu mới</div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Tên đợt thu</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Học kỳ 1"
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-bg-page border border-border-subtle focus:border-brand rounded-xl py-2 px-3 text-xs text-text-main placeholder-text-muted outline-none transition focus:ring-2 focus:ring-brand/10 h-10"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Mô tả đợt thu</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chi quỹ cho các sự kiện học kỳ"
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-bg-page border border-border-subtle focus:border-brand rounded-xl py-2 px-3 text-xs text-text-main placeholder-text-muted outline-none transition focus:ring-2 focus:ring-brand/10 h-10"
                />
              </div>
            </div>

            <div className="flex justify-end text-xs pt-1">
              <button
                type="submit"
                className="flex items-center gap-1.5 py-2.5 px-4 bg-brand hover:bg-brand-hover text-white rounded-xl font-bold transition cursor-pointer h-10"
              >
                <Plus className="w-3.5 h-3.5" />
                Tạo đợt thu
              </button>
            </div>
          </form>

          {/* Campaigns List Table */}
          <div className="bg-bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-sm max-h-[400px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-page/50 text-text-muted uppercase font-bold tracking-wider">
                  <th className="py-3.5 px-4">Đợt thu</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50">
                {campaignsList.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-12 px-4 text-center text-text-muted">Chưa có đợt thu nào được tạo.</td>
                  </tr>
                ) : (
                  campaignsList.map((c) => (
                    <tr key={c.id} className="hover:bg-bg-page/30 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-text-main">{c.name}</div>
                        {c.description && <div className="text-[10px] text-text-muted mt-0.5">{c.description}</div>}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <Link
                          href={`/admin/campaigns/${c.id}`}
                          className="inline-flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-brand/10 border border-brand/20 text-brand hover:bg-brand hover:text-white transition text-[10px] font-bold shadow-sm"
                        >
                          Mức thu
                        </Link>
                        {c.status === 'open' ? (
                          <button
                            onClick={() => handleCloseCampaign(c.id)}
                            className="py-1.5 px-2.5 rounded-xl bg-status-warning-bg border border-status-warning-text/10 text-status-warning-text hover:bg-status-warning-text hover:text-white transition text-[10px] font-bold cursor-pointer"
                          >
                            Đóng đợt
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReopenCampaign(c.id)}
                            className="py-1.5 px-2.5 rounded-xl bg-bg-page border border-border-subtle text-text-muted hover:border-brand/40 hover:text-brand transition text-[10px] font-bold cursor-pointer"
                          >
                            Mở lại
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

    </div>
  );
}
