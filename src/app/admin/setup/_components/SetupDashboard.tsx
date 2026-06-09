'use client';

import { useState } from 'react';
import { readString } from 'react-papaparse';
import Link from 'next/link';
import { createMember, updateMember, deleteMember, importMembers } from '@/app/actions/members';
import { createCampaign, closeCampaign, reopenCampaign } from '@/app/actions/campaigns';
import { Plus, Trash2, Edit2, Upload, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

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
    } catch (err: any) {
      setMemberMessage({ type: 'error', text: err.message || 'Lỗi khi xử lý form' });
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
    } catch (err: any) {
      setMemberMessage({ type: 'error', text: err.message || 'Có lỗi xảy ra' });
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
            const mappedRows = results.data.map((row: any) => ({
              fullName: row['Họ và tên'] || row['fullName'] || row['Ho va ten'] || '',
              studentId: row['MSSV'] || row['studentId'] || row['Ma so sinh vien'] || null,
              contactInfo: row['Liên hệ'] || row['contactInfo'] || row['Lien he'] || null,
            })).filter((r: any) => r.fullName.trim() !== '');

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
          } catch (err: any) {
            setMemberMessage({ type: 'error', text: err.message || 'Lỗi khi xử lý CSV' });
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
    } catch (err: any) {
      setCampaignMessage({ type: 'error', text: err.message || 'Lỗi khi xử lý form' });
    }
  };

  const handleCloseCampaign = async (id: number) => {
    if (!confirm('Bạn có chắc muốn đóng đợt thu này? Thành viên sẽ không thể quét mã QR đóng tiền cho đợt này nữa.')) return;

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
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Thành Viên Lớp ({membersList.length})</h2>
            <div className="flex gap-2">
              <label className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold cursor-pointer text-slate-300 hover:text-white transition">
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
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
            <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
              memberMessage.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {memberMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              <span>{memberMessage.text}</span>
            </div>
          )}

          {/* Manual Member Form */}
          <form onSubmit={handleMemberSubmit} className="bg-slate-900/30 border border-slate-800/80 p-4 rounded-xl space-y-4">
            <div className="font-semibold text-xs text-slate-400 uppercase tracking-wider">
              {editingMember ? 'Cập nhật thành viên' : 'Thêm thành viên thủ công'}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <input
                  type="text"
                  placeholder="Họ và tên"
                  value={memberForm.fullName}
                  onChange={(e) => setMemberForm(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 outline-none transition"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="MSSV (nếu có)"
                  value={memberForm.studentId}
                  onChange={(e) => setMemberForm(prev => ({ ...prev, studentId: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 outline-none transition"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Liên hệ (SĐT...)"
                  value={memberForm.contactInfo}
                  onChange={(e) => setMemberForm(prev => ({ ...prev, contactInfo: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 outline-none transition"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs">
              {editingMember && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="py-2 px-3 bg-slate-800 text-slate-300 hover:text-white rounded-lg transition"
                >
                  Huỷ
                </button>
              )}
              <button
                type="submit"
                className="flex items-center gap-1.5 py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                {editingMember ? 'Lưu' : 'Thêm'}
              </button>
            </div>
          </form>

          {/* Members List Table */}
          <div className="bg-slate-900/20 border border-slate-800/80 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/30 text-slate-400 uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Tên</th>
                  <th className="py-3 px-4">Mã CK</th>
                  <th className="py-3 px-4">MSSV</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {membersList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 px-4 text-center text-slate-600">Chưa có thành viên nào. Hãy nhập CSV hoặc thêm thủ công.</td>
                  </tr>
                ) : (
                  membersList.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-900/10 transition">
                      <td className="py-3 px-4 font-semibold text-white">{m.fullName}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{m.referenceCode}</td>
                      <td className="py-3 px-4 text-slate-500">{m.studentId || '-'}</td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => handleEditClick(m)}
                          className="p-1 rounded bg-slate-850 hover:bg-slate-850 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(m.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
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
          <div className="text-[10px] text-slate-500 leading-normal">
            * Mẫu file CSV hợp lệ có các cột tiêu đề: `Họ và tên`, `MSSV`, `Liên hệ`.
          </div>
        </div>

        {/* Campaigns Management */}
        <div className="space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-white">Đợt Thu Quỹ ({campaignsList.length})</h2>
          </div>

          {/* Campaign Success/Error Feedback */}
          {campaignMessage && (
            <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
              campaignMessage.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {campaignMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              <span>{campaignMessage.text}</span>
            </div>
          )}

          {/* Create Campaign Form */}
          <form onSubmit={handleCampaignSubmit} className="bg-slate-900/30 border border-slate-800/80 p-4 rounded-xl space-y-4">
            <div className="font-semibold text-xs text-slate-400 uppercase tracking-wider">Tạo đợt thu mới</div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Tên đợt thu (Ví dụ: Học kỳ 1)"
                value={campaignForm.name}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 outline-none transition"
              />
              <input
                type="text"
                placeholder="Mô tả đợt thu (Ví dụ: Chi quỹ cho các sự kiện học kỳ)"
                value={campaignForm.description}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 outline-none transition"
              />
            </div>

            <div className="flex justify-end text-xs">
              <button
                type="submit"
                className="flex items-center gap-1.5 py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Tạo đợt thu
              </button>
            </div>
          </form>

          {/* Campaigns List Table */}
          <div className="bg-slate-900/20 border border-slate-800/80 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/30 text-slate-400 uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Đợt thu</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {campaignsList.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-6 px-4 text-center text-slate-600">Chưa có đợt thu nào được tạo.</td>
                  </tr>
                ) : (
                  campaignsList.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-900/10 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{c.name}</div>
                        {c.description && <div className="text-[10px] text-slate-500 mt-0.5">{c.description}</div>}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Link
                          href={`/admin/campaigns/${c.id}`}
                          className="inline-flex items-center gap-1 py-1 px-2.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 transition text-[10px] font-bold"
                        >
                          Gán mức thu
                        </Link>
                        {c.status === 'open' ? (
                          <button
                            onClick={() => handleCloseCampaign(c.id)}
                            className="py-1 px-2.5 rounded bg-amber-500/15 border border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 transition text-[10px] font-bold"
                          >
                            Đang mở - Đóng lại
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReopenCampaign(c.id)}
                            className="py-1 px-2.5 rounded bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition text-[10px] font-bold"
                          >
                            Đã đóng - Mở lại
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
