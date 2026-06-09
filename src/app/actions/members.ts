'use server';

import { db, members, transactions } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { normalizeVietnamese, normalizeReferenceCode } from '@/lib/normalize';
import { memberSchema } from '@/lib/validators';

interface ActionResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function createMember(input: {
  fullName: string;
  studentId?: string | null;
  contactInfo?: string | null;
}): Promise<ActionResponse> {
  try {
    const validated = memberSchema.parse(input);
    const normalized = normalizeVietnamese(validated.fullName);

    // Generate unique reference code
    const existing = await db.select({ code: members.referenceCode }).from(members);
    const existingCodes = new Set(existing.map(m => m.code));

    let baseCode = normalizeReferenceCode(validated.fullName);
    if (!baseCode) baseCode = 'MEMBER';
    let referenceCode = baseCode;
    let counter = 1;

    while (existingCodes.has(referenceCode)) {
      counter++;
      referenceCode = `${baseCode}${counter}`;
    }

    const [newMember] = await db.insert(members).values({
      fullName: validated.fullName,
      normalizedName: normalized,
      studentId: validated.studentId,
      contactInfo: validated.contactInfo,
      referenceCode,
    }).returning();

    revalidatePath('/admin/setup');
    revalidatePath('/admin/collection');
    revalidatePath('/');

    return { ok: true, data: newMember };
  } catch (error: any) {
    console.error('Create member error:', error);
    return { ok: false, error: error.message || 'Lỗi khi tạo thành viên' };
  }
}

export async function importMembers(rows: Array<{
  fullName: string;
  studentId?: string | null;
  contactInfo?: string | null;
}>): Promise<ActionResponse<{ count: number }>> {
  try {
    if (!Array.isArray(rows) || rows.length === 0) {
      return { ok: false, error: 'Danh sách nhập trống' };
    }

    // Get all existing reference codes and studentIds to check duplicates
    const existingList = await db.select({ 
      referenceCode: members.referenceCode,
      studentId: members.studentId 
    }).from(members);
    
    const existingCodes = new Set(existingList.map(m => m.referenceCode));
    const existingStudentIds = new Set(existingList.map(m => m.studentId).filter(Boolean) as string[]);

    const recordsToInsert = [];
    
    for (const row of rows) {
      const validated = memberSchema.parse(row);
      
      // If studentId already exists in db, skip or throw error
      if (validated.studentId && existingStudentIds.has(validated.studentId)) {
        continue; // Skip duplicates by studentId
      }

      const normalized = normalizeVietnamese(validated.fullName);
      
      // Generate unique reference code
      let baseCode = normalizeReferenceCode(validated.fullName);
      if (!baseCode) baseCode = 'MEMBER';
      let referenceCode = baseCode;
      let counter = 1;

      while (existingCodes.has(referenceCode)) {
        counter++;
        referenceCode = `${baseCode}${counter}`;
      }

      existingCodes.add(referenceCode);
      if (validated.studentId) {
        existingStudentIds.add(validated.studentId);
      }

      recordsToInsert.push({
        fullName: validated.fullName,
        normalizedName: normalized,
        studentId: validated.studentId,
        contactInfo: validated.contactInfo,
        referenceCode,
      });
    }

    if (recordsToInsert.length === 0) {
      return { ok: true, data: { count: 0 }, error: 'Không có thành viên mới nào được thêm (trùng MSSV)' };
    }

    await db.insert(members).values(recordsToInsert);

    revalidatePath('/admin/setup');
    revalidatePath('/admin/collection');
    revalidatePath('/');

    return { ok: true, data: { count: recordsToInsert.length } };
  } catch (error: any) {
    console.error('Import members error:', error);
    return { ok: false, error: error.message || 'Lỗi khi nhập danh sách thành viên' };
  }
}

export async function updateMember(id: number, input: {
  fullName: string;
  studentId?: string | null;
  contactInfo?: string | null;
}): Promise<ActionResponse> {
  try {
    const validated = memberSchema.parse(input);
    const normalized = normalizeVietnamese(validated.fullName);

    // Check if member exists
    const [existingMember] = await db.select().from(members).where(eq(members.id, id)).limit(1);
    if (!existingMember) {
      return { ok: false, error: 'Thành viên không tồn tại' };
    }

    // Update member details
    await db.update(members)
      .set({
        fullName: validated.fullName,
        normalizedName: normalized,
        studentId: validated.studentId,
        contactInfo: validated.contactInfo,
      })
      .where(eq(members.id, id));

    revalidatePath('/admin/setup');
    revalidatePath('/admin/collection');
    revalidatePath('/');

    return { ok: true };
  } catch (error: any) {
    console.error('Update member error:', error);
    return { ok: false, error: error.message || 'Lỗi khi cập nhật thành viên' };
  }
}

export async function deleteMember(id: number): Promise<ActionResponse> {
  try {
    // Check if member has transactions
    const [hasTx] = await db.select({ id: transactions.id }).from(transactions).where(eq(transactions.memberId, id)).limit(1);
    if (hasTx) {
      return { ok: false, error: 'Thành viên đã có lịch sử đóng quỹ, không thể xoá!' };
    }

    await db.delete(members).where(eq(members.id, id));

    revalidatePath('/admin/setup');
    revalidatePath('/admin/collection');
    revalidatePath('/');

    return { ok: true };
  } catch (error: any) {
    console.error('Delete member error:', error);
    return { ok: false, error: error.message || 'Lỗi khi xoá thành viên' };
  }
}
