'use client';

import { useState } from 'react';
import { createExpense, updateExpense, deleteExpense } from '@/app/actions/expenses';
import { Plus, Trash2, Edit2, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';

interface Expense {
  id: number;
  description: string;
  amount: number;
  expenseDate: Date;
  createdAt: Date;
}

interface ExpensesDashboardProps {
  initialExpenses: Expense[];
}

export default function ExpensesDashboard({
  initialExpenses,
}: ExpensesDashboardProps) {
  const [list, setList] = useState<Expense[]>(initialExpenses);

  // Form states
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const amount = parseInt(form.amount, 10);
    if (!form.description || isNaN(amount) || amount <= 0) {
      setMessage({ type: 'error', text: 'Vui lòng nhập thông tin chi tiêu hợp lệ' });
      return;
    }

    setLoading(true);

    try {
      if (editingExpense) {
        const res = await updateExpense(editingExpense.id, {
          description: form.description,
          amount,
          expenseDate: new Date(form.expenseDate).toISOString(),
        });

        if (res.ok) {
          setMessage({ type: 'success', text: 'Cập nhật khoản chi thành công!' });
          // Update client-side list
          setList(prev =>
            prev.map(item =>
              item.id === editingExpense.id
                ? { ...item, description: form.description, amount, expenseDate: new Date(form.expenseDate) }
                : item
            )
          );
          setEditingExpense(null);
          setForm({
            description: '',
            amount: '',
            expenseDate: new Date().toISOString().split('T')[0],
          });
        } else {
          setMessage({ type: 'error', text: res.error || 'Cập nhật khoản chi thất bại' });
        }
      } else {
        const res = await createExpense({
          description: form.description,
          amount,
          expenseDate: new Date(form.expenseDate).toISOString(),
        });

        if (res.ok) {
          setMessage({ type: 'success', text: 'Ghi nhận khoản chi thành công!' });
          // Add to client-side list
          setList(prev => [res.data, ...prev]);
          setForm({
            description: '',
            amount: '',
            expenseDate: new Date().toISOString().split('T')[0],
          });
        } else {
          setMessage({ type: 'error', text: res.error || 'Ghi nhận khoản chi thất bại' });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi xử lý';
      setMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item: Expense) => {
    setEditingExpense(item);
    
    // Convert Date object/string to YYYY-MM-DD
    const dateObj = new Date(item.expenseDate);
    const dateStr = dateObj.toISOString().split('T')[0];

    setForm({
      description: item.description,
      amount: item.amount.toString(),
      expenseDate: dateStr,
    });
    setMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingExpense(null);
    setForm({
      description: '',
      amount: '',
      expenseDate: new Date().toISOString().split('T')[0],
    });
    setMessage(null);
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xoá khoản chi này?')) return;
    setMessage(null);

    try {
      const res = await deleteExpense(id);
      if (res.ok) {
        setMessage({ type: 'success', text: 'Xoá khoản chi thành công!' });
        setList(prev => prev.filter(item => item.id !== id));
      } else {
        setMessage({ type: 'error', text: res.error || 'Xoá khoản chi thất bại' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi xoá';
      setMessage({ type: 'error', text: msg });
    }
  };

  // Helper to format date
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Add / Edit Form (Left column) */}
      <div className="lg:col-span-1 space-y-6">
        <div className="border-b border-border-subtle pb-3 h-11 flex items-center">
          <h2 className="text-lg font-bold text-text-main">
            {editingExpense ? 'Sửa Khoản Chi' : 'Ghi Nhận Chi Tiêu'}
          </h2>
        </div>

        {/* Feedback Message */}
        {message && (
          <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
            message.type === 'success' 
              ? 'bg-status-success-bg border-status-success-text/10 text-status-success-text' 
              : 'bg-status-error-bg border-status-error-text/10 text-status-error-text'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span className="font-semibold">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-bg-surface border border-border-subtle p-5 rounded-2xl space-y-4 text-xs shadow-sm">
          
          {/* Description */}
          <div className="space-y-1">
            <label className="text-text-muted text-[10px] font-bold uppercase tracking-wider block">Nội dung chi</label>
            <input
              type="text"
              placeholder="Mua nước ngọt liên hoan..."
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-bg-page border border-border-subtle hover:border-brand/40 focus:border-brand rounded-xl py-2 px-3 text-text-main placeholder-text-muted outline-none transition focus:ring-2 focus:ring-brand/10 h-10 font-medium"
              required
            />
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <label className="text-text-muted text-[10px] font-bold uppercase tracking-wider block">Số tiền chi (VNĐ)</label>
            <input
              type="number"
              placeholder="250000"
              value={form.amount}
              onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
              className="w-full bg-bg-page border border-border-subtle hover:border-brand/40 focus:border-brand rounded-xl py-2 px-3 text-text-main placeholder-text-muted outline-none transition focus:ring-2 focus:ring-brand/10 h-10 font-semibold text-right"
              required
            />
          </div>

          {/* Date */}
          <div className="space-y-1">
            <label className="text-text-muted text-[10px] font-bold uppercase tracking-wider block">Ngày chi</label>
            <input
              type="date"
              value={form.expenseDate}
              onChange={(e) => setForm(prev => ({ ...prev, expenseDate: e.target.value }))}
              className="w-full bg-bg-page border border-border-subtle hover:border-brand/40 focus:border-brand rounded-xl py-2 px-3 text-text-main outline-none transition focus:ring-2 focus:ring-brand/10 h-10 font-medium"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 h-10">
            {editingExpense && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="py-2.5 px-4 bg-bg-page border border-border-subtle text-text-muted hover:text-text-main rounded-xl transition font-bold cursor-pointer"
              >
                Huỷ
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 py-2.5 px-4 bg-brand hover:bg-brand-hover text-white rounded-xl font-bold transition disabled:opacity-55 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {editingExpense ? 'Cập nhật' : 'Ghi nhận'}
            </button>
          </div>

        </form>
      </div>

      {/* Expenses History List (Right columns) */}
      <div className="lg:col-span-2 space-y-6">
        <div className="border-b border-border-subtle pb-3 h-11 flex items-center">
          <h2 className="text-lg font-bold text-text-main">Lịch Sử Chi Quỹ</h2>
        </div>

        {/* Expenses List Table */}
        <div className="bg-bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-page/50 text-text-muted uppercase font-bold tracking-wider">
                  <th className="py-3.5 px-6">Ngày chi</th>
                  <th className="py-3.5 px-6">Nội dung</th>
                  <th className="py-3.5 px-6 text-right">Số tiền</th>
                  <th className="py-3.5 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50">
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 px-6 text-center text-text-muted">
                      Chưa ghi nhận khoản chi tiêu nào từ quỹ.
                    </td>
                  </tr>
                ) : (
                  list.map((item) => (
                    <tr key={item.id} className="hover:bg-bg-page/20 transition">
                      <td className="py-4 px-6 text-text-muted">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-brand" />
                          <span>{formatDate(item.expenseDate)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-semibold text-text-main max-w-[200px] truncate" title={item.description}>
                        {item.description}
                      </td>
                      <td className="py-4 px-6 font-bold text-status-error-text text-right tabular-nums">
                        -{item.amount.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="py-4 px-6 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleEditClick(item)}
                          className="p-1.5 rounded-xl hover:bg-bg-page text-text-muted hover:text-brand transition cursor-pointer inline-flex items-center"
                          title="Sửa khoản chi"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(item.id)}
                          className="p-1.5 rounded-xl hover:bg-status-error-bg text-text-muted hover:text-status-error-text transition cursor-pointer inline-flex items-center"
                          title="Xoá khoản chi"
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
        </div>

      </div>

    </div>
  );
}
