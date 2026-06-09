'use server';

import { db, transactions, campaigns, members } from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { transactionSchema } from '@/lib/validators';

interface ActionResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function recordTransaction(input: {
  memberId: number;
  campaignId: number;
  amountPaid: number;
  paymentMethod: 'cash' | 'transfer';
  note?: string | null;
}): Promise<ActionResponse> {
  try {
    const validated = transactionSchema.parse(input);

    // Check campaign status
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, validated.campaignId)).limit(1);
    if (!campaign) {
      return { ok: false, error: 'Đợt thu không tồn tại' };
    }
    if (campaign.status === 'closed') {
      return { ok: false, error: 'Đợt thu đã đóng, không thể ghi nhận giao dịch mới' };
    }

    const [tx] = await db.insert(transactions).values({
      memberId: validated.memberId,
      campaignId: validated.campaignId,
      amountPaid: validated.amountPaid,
      paymentMethod: validated.paymentMethod,
      note: validated.note,
    }).returning();

    revalidatePath('/admin/collection');
    revalidatePath('/');

    return { ok: true, data: tx };
  } catch (error: any) {
    console.error('Record transaction error:', error);
    return { ok: false, error: error.message || 'Lỗi khi ghi nhận thu tiền' };
  }
}

export async function recordFullPayment(
  memberId: number,
  campaignId: number,
  paymentMethod: 'cash' | 'transfer' = 'cash'
): Promise<ActionResponse> {
  try {
    // Check campaign
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
    if (!campaign) {
      return { ok: false, error: 'Đợt thu không tồn tại' };
    }
    if (campaign.status === 'closed') {
      return { ok: false, error: 'Đợt thu đã đóng, không thể ghi nhận giao dịch mới' };
    }

    // Get total paid already
    const [paymentSum] = await db.select({
      total: sql<number>`COALESCE(SUM(${transactions.amountPaid}), 0)::int`
    })
    .from(transactions)
    .where(and(eq(transactions.memberId, memberId), eq(transactions.campaignId, campaignId)));

    const paidAlready = paymentSum?.total || 0;
    const remaining = campaign.targetAmount - paidAlready;

    if (remaining <= 0) {
      return { ok: false, error: 'Thành viên đã hoàn thành đợt thu này' };
    }

    const [tx] = await db.insert(transactions).values({
      memberId,
      campaignId,
      amountPaid: remaining,
      paymentMethod,
      note: 'Đóng đủ (ghi nhận nhanh)',
    }).returning();

    revalidatePath('/admin/collection');
    revalidatePath('/');

    return { ok: true, data: tx };
  } catch (error: any) {
    console.error('Record full payment error:', error);
    return { ok: false, error: error.message || 'Lỗi khi ghi nhận đóng đủ' };
  }
}

export async function deleteTransaction(id: number): Promise<ActionResponse> {
  try {
    // Get transaction info to check campaign status
    const [tx] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
    if (!tx) {
      return { ok: false, error: 'Giao dịch không tồn tại' };
    }

    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, tx.campaignId)).limit(1);
    if (campaign && campaign.status === 'closed') {
      return { ok: false, error: 'Không thể xoá giao dịch thuộc đợt thu đã đóng' };
    }

    await db.delete(transactions).where(eq(transactions.id, id));

    revalidatePath('/admin/collection');
    revalidatePath('/');

    return { ok: true };
  } catch (error: any) {
    console.error('Delete transaction error:', error);
    return { ok: false, error: error.message || 'Lỗi khi xoá giao dịch' };
  }
}
