'use server';

import { db, expenses } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { expenseSchema } from '@/lib/validators';

interface ActionResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function createExpense(input: {
  description: string;
  amount: number;
  expenseDate: string; // Parseable date string
}): Promise<ActionResponse> {
  try {
    const validated = expenseSchema.parse(input);

    const [newExpense] = await db.insert(expenses).values({
      description: validated.description,
      amount: validated.amount,
      expenseDate: validated.expenseDate,
    }).returning();

    revalidatePath('/admin/expenses');
    revalidatePath('/');

    return { ok: true, data: newExpense };
  } catch (error: any) {
    console.error('Create expense error:', error);
    return { ok: false, error: error.message || 'Lỗi khi ghi nhận chi tiêu' };
  }
}

export async function updateExpense(
  id: number,
  input: {
    description: string;
    amount: number;
    expenseDate: string;
  }
): Promise<ActionResponse> {
  try {
    const validated = expenseSchema.parse(input);

    await db.update(expenses)
      .set({
        description: validated.description,
        amount: validated.amount,
        expenseDate: validated.expenseDate,
      })
      .where(eq(expenses.id, id));

    revalidatePath('/admin/expenses');
    revalidatePath('/');

    return { ok: true };
  } catch (error: any) {
    console.error('Update expense error:', error);
    return { ok: false, error: error.message || 'Lỗi khi cập nhật khoản chi' };
  }
}

export async function deleteExpense(id: number): Promise<ActionResponse> {
  try {
    await db.delete(expenses).where(eq(expenses.id, id));

    revalidatePath('/admin/expenses');
    revalidatePath('/');

    return { ok: true };
  } catch (error: any) {
    console.error('Delete expense error:', error);
    return { ok: false, error: error.message || 'Lỗi khi xoá khoản chi' };
  }
}
