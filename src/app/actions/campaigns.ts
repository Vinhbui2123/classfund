'use server';

import { db, campaigns } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { campaignSchema } from '@/lib/validators';

interface ActionResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function createCampaign(input: {
  name: string;
  description?: string | null;
  targetAmount: number;
}): Promise<ActionResponse> {
  try {
    const validated = campaignSchema.parse(input);

    const [newCampaign] = await db.insert(campaigns).values({
      name: validated.name,
      description: validated.description,
      targetAmount: validated.targetAmount,
      status: 'open',
    }).returning();

    revalidatePath('/admin/setup');
    revalidatePath('/admin/collection');
    revalidatePath('/');

    return { ok: true, data: newCampaign };
  } catch (error: any) {
    console.error('Create campaign error:', error);
    return { ok: false, error: error.message || 'Lỗi khi tạo đợt thu' };
  }
}

export async function closeCampaign(id: number): Promise<ActionResponse> {
  try {
    await db.update(campaigns)
      .set({
        status: 'closed',
        closedAt: new Date(),
      })
      .where(eq(campaigns.id, id));

    revalidatePath('/admin/setup');
    revalidatePath('/admin/collection');
    revalidatePath('/');

    return { ok: true };
  } catch (error: any) {
    console.error('Close campaign error:', error);
    return { ok: false, error: error.message || 'Lỗi khi đóng đợt thu' };
  }
}

export async function reopenCampaign(id: number): Promise<ActionResponse> {
  try {
    await db.update(campaigns)
      .set({
        status: 'open',
        closedAt: null,
      })
      .where(eq(campaigns.id, id));

    revalidatePath('/admin/setup');
    revalidatePath('/admin/collection');
    revalidatePath('/');

    return { ok: true };
  } catch (error: any) {
    console.error('Reopen campaign error:', error);
    return { ok: false, error: error.message || 'Lỗi khi mở lại đợt thu' };
  }
}
