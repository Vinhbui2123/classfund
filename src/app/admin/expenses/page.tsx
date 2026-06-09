import { db, expenses } from '@/lib/db';
import ExpensesDashboard from './_components/ExpensesDashboard';
import { desc } from 'drizzle-orm';

export const revalidate = 0; // Fresh list on load

export default async function ExpensesPage() {
  const allExpenses = await db.select().from(expenses).orderBy(desc(expenses.expenseDate));

  return (
    <ExpensesDashboard initialExpenses={allExpenses} />
  );
}
