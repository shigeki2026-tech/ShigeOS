export type Task = {
  id: number
  title: string
  is_processed: boolean
  importance: number | null
  urgency: number | null
  done: boolean
  created_at: string
}

export type Journal = {
  id: number
  content: string
  tags: string[] | null
  mood_score: number | null
  created_at: string
}

export type Expense = {
  id: number
  amount: string | number | null
  category: string | null
  expense_date: string
  created_at: string
}

export type MonthlySetting = {
  month_key: string
  income: string | number
  fixed_cost: string | number
  savings_target: string | number
}
