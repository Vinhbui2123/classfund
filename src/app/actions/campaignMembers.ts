'use server';

import { db, campaignMembers, campaigns, members, transactions } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { campaignMemberSchema, bulkSetExpectedAmountsSchema } from '@/lib/validators';
import { isAdminAuthenticated } from '@/lib/auth';

interface ActionResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function setExpectedAmount(input: {
  campaignId: number;
  memberId: number;
  expectedAmount: number;
  note?: string | null;
}): Promise<ActionResponse> {
  try {
    if (!(await isAdminAuthenticated())) {
      return { ok: false, error: 'Yêu cầu quyền admin' };
    }

    const validated = campaignMemberSchema.parse(input);

    // Check campaign
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, validated.campaignId)).limit(1);
    if (!campaign) {
      return { ok: false, error: 'Đợt thu không tồn tại' };
    }
    if (campaign.status === 'closed') {
      return { ok: false, error: 'Đợt thu đã đóng, không thể thay đổi thông tin' };
    }

    // Check member
    const [member] = await db.select().from(members).where(eq(members.id, validated.memberId)).limit(1);
    if (!member) {
      return { ok: false, error: 'Thành viên không tồn tại' };
    }

    // Upsert
    const [existing] = await db.select()
      .from(campaignMembers)
      .where(and(
        eq(campaignMembers.campaignId, validated.campaignId),
        eq(campaignMembers.memberId, validated.memberId)
      ))
      .limit(1);

    if (existing) {
      await db.update(campaignMembers)
        .set({
          expectedAmount: validated.expectedAmount,
          note: validated.note,
        })
        .where(eq(campaignMembers.id, existing.id));
    } else {
      await db.insert(campaignMembers).values({
        campaignId: validated.campaignId,
        memberId: validated.memberId,
        expectedAmount: validated.expectedAmount,
        note: validated.note,
      });
    }

    revalidatePath(`/admin/campaigns/${validated.campaignId}`);
    revalidatePath('/admin/collection');
    revalidatePath('/');

    return { ok: true };
  } catch (error: any) {
    console.error('Set expected amount error:', error);
    return { ok: false, error: error.message || 'Lỗi khi gán mức thu' };
  }
}

export async function bulkSetExpectedAmounts(input: {
  campaignId: number;
  items: Array<{
    memberId: number;
    expectedAmount: number;
    note?: string | null;
  }>;
}): Promise<ActionResponse> {
  try {
    if (!(await isAdminAuthenticated())) {
      return { ok: false, error: 'Yêu cầu quyền admin' };
    }

    const validated = bulkSetExpectedAmountsSchema.parse(input);

    // Check campaign
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, validated.campaignId)).limit(1);
    if (!campaign) {
      return { ok: false, error: 'Đợt thu không tồn tại' };
    }
    if (campaign.status === 'closed') {
      return { ok: false, error: 'Đợt thu đã đóng, không thể thay đổi thông tin' };
    }

    // Run sequentially on db (neon-http does not support transactions)
    for (const item of validated.items) {
      const [existing] = await db.select()
        .from(campaignMembers)
        .where(and(
          eq(campaignMembers.campaignId, validated.campaignId),
          eq(campaignMembers.memberId, item.memberId)
        ))
        .limit(1);

      if (existing) {
        await db.update(campaignMembers)
          .set({
            expectedAmount: item.expectedAmount,
            note: item.note,
          })
          .where(eq(campaignMembers.id, existing.id));
      } else {
        await db.insert(campaignMembers).values({
          campaignId: validated.campaignId,
          memberId: item.memberId,
          expectedAmount: item.expectedAmount,
          note: item.note,
        });
      }
    }

    revalidatePath(`/admin/campaigns/${validated.campaignId}`);
    revalidatePath('/admin/collection');
    revalidatePath('/');

    return { ok: true };
  } catch (error: any) {
    console.error('Bulk set expected amounts error:', error);
    return { ok: false, error: error.message || 'Lỗi khi gán hàng loạt mức thu' };
  }
}

export async function applyFlatAmountToAll(input: {
  campaignId: number;
  amount: number;
  memberIds?: number[];
}): Promise<ActionResponse> {
  try {
    if (!(await isAdminAuthenticated())) {
      return { ok: false, error: 'Yêu cầu quyền admin' };
    }

    // Check campaign
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, input.campaignId)).limit(1);
    if (!campaign) {
      return { ok: false, error: 'Đợt thu không tồn tại' };
    }
    if (campaign.status === 'closed') {
      return { ok: false, error: 'Đợt thu đã đóng, không thể thay đổi thông tin' };
    }

    // Determine target member IDs
    let targetIds = input.memberIds;
    if (!targetIds || targetIds.length === 0) {
      const allMembers = await db.select({ id: members.id }).from(members);
      targetIds = allMembers.map((m) => m.id);
    }

    // Build the bulk set payload
    const items = targetIds.map((memberId) => ({
      memberId,
      expectedAmount: input.amount,
      note: null,
    }));

    return bulkSetExpectedAmounts({
      campaignId: input.campaignId,
      items,
    });
  } catch (error: any) {
    console.error('Apply flat amount to all error:', error);
    return { ok: false, error: error.message || 'Lỗi khi áp dụng mức thu chung' };
  }
}

export async function removeMemberFromCampaign(input: {
  campaignId: number;
  memberId: number;
}): Promise<ActionResponse> {
  try {
    if (!(await isAdminAuthenticated())) {
      return { ok: false, error: 'Yêu cầu quyền admin' };
    }

    // Check if campaign is closed
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, input.campaignId)).limit(1);
    if (!campaign) {
      return { ok: false, error: 'Đợt thu không tồn tại' };
    }
    if (campaign.status === 'closed') {
      return { ok: false, error: 'Đợt thu đã đóng, không thể thay đổi thông tin' };
    }

    // Check transactions
    const [hasTx] = await db.select({ id: transactions.id })
      .from(transactions)
      .where(and(
        eq(transactions.campaignId, input.campaignId),
        eq(transactions.memberId, input.memberId)
      ))
      .limit(1);

    if (hasTx) {
      return { ok: false, error: 'Thành viên đã có giao dịch đóng tiền cho đợt này, không thể xoá khỏi đợt thu!' };
    }

    await db.delete(campaignMembers)
      .where(and(
        eq(campaignMembers.campaignId, input.campaignId),
        eq(campaignMembers.memberId, input.memberId)
      ));

    revalidatePath(`/admin/campaigns/${input.campaignId}`);
    revalidatePath('/admin/collection');
    revalidatePath('/');

    return { ok: true };
  } catch (error: any) {
    console.error('Remove member from campaign error:', error);
    return { ok: false, error: error.message || 'Lỗi khi xoá thành viên khỏi đợt thu' };
  }
}
