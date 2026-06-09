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
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi khi xử lý' });
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
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi khi xoá' });
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
        <div className="border-b border-slate-800 pb-3">
          <h2 className="text-lg font-bold text-white">
            {editingExpense ? 'Sửa Khoản Chi' : 'Ghi Nhận Chi Tiêu'}
          </h2>
        </div>

        {/* Feedback Message */}
        {message && (
          <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
            message.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-slate-900/30 border border-slate-800/80 p-5 rounded-xl space-y-4 text-xs">
          
          {/* Description */}
          <div className="space-y-1">
            <label className="text-slate-400 font-semibold uppercase tracking-wider">Nội dung chi:</label>
            <input
              type="text"
              placeholder="Mua nước ngọt liên hoan..."
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-lg py-2.5 px-3 text-white placeholder-slate-650 outline-none transition"
              required
            />
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <label className="text-slate-400 font-semibold uppercase tracking-wider">Số tiền chi (VNĐ):</label>
            <input
              type="number"
              placeholder="250000"
              value={form.amount}
              onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-lg py-2.5 px-3 text-white placeholder-slate-650 outline-none transition"
              required
            />
          </div>

          {/* Date */}
          <div className="space-y-1">
            <label className="text-slate-400 font-semibold uppercase tracking-wider">Ngày chi:</label>
            <div className="relative">
              <input
                type="date"
                value={form.expenseDate}
                onChange={(e) => setForm(prev => ({ ...prev, expenseDate: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-lg py-2.5 px-3 text-white outline-none transition"
                required
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            {editingExpense && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="py-2.5 px-3.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg transition font-semibold"
              >
                Huỷ
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg font-bold transition disabled:opacity-55"
            >
              <Plus className="w-3.5 h-3.5" />
              {editingExpense ? 'Cập nhật' : 'Ghi nhận'}
            </button>
          </div>

        </form>
      </div>

      {/* Expenses History List (Right columns) */}
      <div className="lg:col-span-2 space-y-6">
        <div className="border-b border-slate-800 pb-3">
          <h2 className="text-lg font-bold text-white">Lịch Sử Chi Quỹ</h2>
        </div>

        {/* Expenses List Table */}
        <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/30 text-slate-400 uppercase font-bold tracking-wider">
                  <th className="py-4 px-6">Ngày chi</th>
                  <th className="py-4 px-6">Nội dung</th>
                  <th className="py-4 px-6">Số tiền</th>
                  <th className="py-4 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 px-6 text-center text-slate-500">
                      Chưa ghi nhận khoản chi tiêu nào từ quỹ.
                    </td>
                  </tr>
                ) : (
                  list.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/10 transition">
                      <td className="py-4 px-6 text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-cyan-500/70" />
                        <span>{formatDate(item.expenseDate)}</span>
                      </td>
                      <td className="py-4 px-6 font-semibold text-white max-w-[200px] truncate" title={item.description}>
                        {item.description}
                      </td>
                      <td className="py-4 px-6 font-bold text-rose-400">
                        -{item.amount.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="py-4 px-6 text-right space-x-1">
                        <button
                          onClick={() => handleEditClick(item)}
                          className="p-1.5 rounded bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition"
                          title="Sửa khoản chi"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(item.id)}
                          className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
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
