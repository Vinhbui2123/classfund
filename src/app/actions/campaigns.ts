'use server';

import { db, campaigns } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { campaignSchema } from '@/lib/validators';
import { isAdminAuthenticated } from '@/lib/auth';

interface ActionResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function createCampaign(input: {
  name: string;
  description?: string | null;
}): Promise<ActionResponse> {
  try {
    if (!(await isAdminAuthenticated())) {
      return { ok: false, error: 'Yêu cầu quyền admin' };
    }

    const validated = campaignSchema.parse(input);

    const [newCampaign] = await db.insert(campaigns).values({
      name: validated.name,
      description: validated.description,
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
    if (!(await isAdminAuthenticated())) {
      return { ok: false, error: 'Yêu cầu quyền admin' };
    }

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
    if (!(await isAdminAuthenticated())) {
      return { ok: false, error: 'Yêu cầu quyền admin' };
    }

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

