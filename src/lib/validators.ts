import { z } from 'zod';

export const memberSchema = z.object({
  fullName: z.string().min(1, 'Họ và tên không được để trống').max(100, 'Họ và tên tối đa 100 ký tự'),
  studentId: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().max(50, 'Mã số sinh viên tối đa 50 ký tự').nullable()
  ),
  contactInfo: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().max(100, 'Thông tin liên hệ tối đa 100 ký tự').nullable()
  ),
});

export const campaignSchema = z.object({
  name: z.string().min(1, 'Tên đợt thu không được để trống').max(150, 'Tên đợt thu tối đa 150 ký tự'),
  description: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().nullable()
  ),
});

export const campaignMemberSchema = z.object({
  campaignId: z.number().int().positive('ID đợt thu không hợp lệ'),
  memberId: z.number().int().positive('ID thành viên không hợp lệ'),
  expectedAmount: z.number().int().min(0, 'Số tiền cần đóng không được âm'),
  note: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().nullable()
  ),
});

export const bulkSetExpectedAmountsSchema = z.object({
  campaignId: z.number().int().positive('ID đợt thu không hợp lệ'),
  items: z.array(
    z.object({
      memberId: z.number().int().positive('ID thành viên không hợp lệ'),
      expectedAmount: z.number().int().min(0, 'Số tiền cần đóng không được âm'),
      note: z.preprocess(
        (val) => (val === '' ? null : val),
        z.string().nullable()
      ),
    })
  ).refine(
    (items) => {
      const ids = items.map((item) => item.memberId);
      return ids.length === new Set(ids).size;
    },
    { message: 'Mỗi thành viên chỉ được cấu hình một lần trong danh sách' }
  ),
});

export const transactionSchema = z.object({
  memberId: z.number().int().positive('ID thành viên không hợp lệ'),
  campaignId: z.number().int().positive('ID đợt thu không hợp lệ'),
  amountPaid: z.number().int().positive('Số tiền đóng phải lớn hơn 0'),
  paymentMethod: z.enum(['cash', 'transfer']),
  note: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().nullable()
  ),
});

export const expenseSchema = z.object({
  description: z.string().min(1, 'Nội dung chi không được để trống').max(200, 'Nội dung chi tối đa 200 ký tự'),
  amount: z.number().int().positive('Số tiền chi phải lớn hơn 0'),
  expenseDate: z.preprocess(
    (val) => (val ? new Date(val as string) : new Date()),
    z.date()
  ),
});
