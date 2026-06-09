import { pgTable, serial, varchar, text, integer, timestamp, index } from 'drizzle-orm/pg-core';

export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  fullName: varchar('full_name', { length: 100 }).notNull(),
  normalizedName: varchar('normalized_name', { length: 100 }).notNull(),
  studentId: varchar('student_id', { length: 50 }).unique(),
  contactInfo: varchar('contact_info', { length: 100 }),
  referenceCode: varchar('reference_code', { length: 20 }).unique().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('normalized_name_idx').on(table.normalizedName),
  index('reference_code_idx').on(table.referenceCode),
]);

export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  targetAmount: integer('target_amount').notNull(), // standard integer supports up to 2.1 billion VND
  status: varchar('status', { length: 10 }).default('open').notNull(), // 'open' or 'closed'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  memberId: integer('member_id').references(() => members.id, { onDelete: 'restrict' }).notNull(),
  campaignId: integer('campaign_id').references(() => campaigns.id, { onDelete: 'restrict' }).notNull(),
  amountPaid: integer('amount_paid').notNull(),
  paymentMethod: varchar('payment_method', { length: 20 }).default('transfer').notNull(), // 'cash' or 'transfer'
  note: text('note'),
  paymentDate: timestamp('payment_date', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('member_campaign_idx').on(table.memberId, table.campaignId),
]);

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  description: varchar('description', { length: 200 }).notNull(),
  amount: integer('amount').notNull(),
  expenseDate: timestamp('expense_date', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
