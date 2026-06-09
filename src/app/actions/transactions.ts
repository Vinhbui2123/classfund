'use server';

import { db, transactions, campaigns, members, campaignMembers } from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { transactionSchema } from '@/lib/validators';
import { isAdminAuthenticated } from '@/lib/auth';

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
    if (!(await isAdminAuthenticated())) {
      return { ok: false, error: 'Yêu cầu quyền admin' };
    }

    const validated = transactionSchema.parse(input);

    // Check campaign status
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, validated.campaignId)).limit(1);
    if (!campaign) {
      return { ok: false, error: 'Đợt thu không tồn tại' };
    }
    if (campaign.status === 'closed') {
      return { ok: false, error: 'Đợt thu đã đóng, không thể ghi nhận giao dịch mới' };
    }

    // Check member campaign enrollment
    const [enrollment] = await db.select()
      .from(campaignMembers)
      .where(and(
        eq(campaignMembers.campaignId, validated.campaignId),
        eq(campaignMembers.memberId, validated.memberId)
      ))
      .limit(1);

    if (!enrollment) {
      return { ok: false, error: 'Thành viên này không nằm trong đợt thu' };
    }

    const [tx] = await db.insert(transactions).values({
      memberId: validated.memberId,
      campaignId: validated.campaignId,
      amountPaid: validated.amountPaid,
      paymentMethod: validated.paymentMethod,
      note: validated.note,
    }).returning();

    revalidatePath('/admin/collection');
    revalidatePath(`/admin/campaigns/${validated.campaignId}`);
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
    if (!(await isAdminAuthenticated())) {
      return { ok: false, error: 'Yêu cầu quyền admin' };
    }

    // Check campaign
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
    if (!campaign) {
      return { ok: false, error: 'Đợt thu không tồn tại' };
    }
    if (campaign.status === 'closed') {
      return { ok: false, error: 'Đợt thu đã đóng, không thể ghi nhận giao dịch mới' };
    }

    // Check member campaign enrollment
    const [enrollment] = await db.select()
      .from(campaignMembers)
      .where(and(
        eq(campaignMembers.campaignId, campaignId),
        eq(campaignMembers.memberId, memberId)
      ))
      .limit(1);

    if (!enrollment) {
      return { ok: false, error: 'Thành viên này không nằm trong đợt thu' };
    }

    // Get total paid already
    const [paymentSum] = await db.select({
      total: sql<number>`COALESCE(SUM(${transactions.amountPaid}), 0)::int`
    })
    .from(transactions)
    .where(and(eq(transactions.memberId, memberId), eq(transactions.campaignId, campaignId)));

    const paidAlready = paymentSum?.total || 0;
    const remaining = enrollment.expectedAmount - paidAlready;

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
    revalidatePath(`/admin/campaigns/${campaignId}`);
    revalidatePath('/');

    return { ok: true, data: tx };
  } catch (error: any) {
    console.error('Record full payment error:', error);
    return { ok: false, error: error.message || 'Lỗi khi ghi nhận đóng đủ' };
  }
}

export async function deleteTransaction(id: number): Promise<ActionResponse> {
  try {
    if (!(await isAdminAuthenticated())) {
      return { ok: false, error: 'Yêu cầu quyền admin' };
    }

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
    revalidatePath(`/admin/campaigns/${tx.campaignId}`);
    revalidatePath('/');

    return { ok: true };
  } catch (error: any) {
    console.error('Delete transaction error:', error);
    return { ok: false, error: error.message || 'Lỗi khi xoá giao dịch' };
  }
}

