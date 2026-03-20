import { FormEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import {
  getBangkokMonthKey,
  getBangkokMonthRange,
  getBangkokToday,
  getRemainingDaysInBangkokMonth,
} from './lib/time'
import type { Expense, Journal, MonthlySetting, Task } from './lib/types'

type LoadingState = {
  savingInbox: boolean
  savingSettings: boolean
  loading: boolean
}

const moodOptions = [1, 2, 3, 4, 5]
const taskScale = [1, 2, 3]

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseAmountFromInput(value: string): number | null {
  const match = value.match(/\d[\d,]*(?:\.\d+)?/)
  if (!match) return null

  const normalized = match[0].replace(/,/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function scoreTask(task: Task): number {
  return (task.importance ?? 0) * 2 + (task.urgency ?? 0)
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 2,
  }).format(value)
}

function App() {
  const monthKey = getBangkokMonthKey()
  const bangkokToday = getBangkokToday()
  const [captureText, setCaptureText] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [journals, setJournals] = useState<Journal[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [monthlySetting, setMonthlySetting] = useState<MonthlySetting>({
    month_key: monthKey,
    income: 0,
    fixed_cost: 0,
    savings_target: 0,
  })
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [loadingState, setLoadingState] = useState<LoadingState>({
    savingInbox: false,
    savingSettings: false,
    loading: true,
  })

  async function loadAll() {
    setLoadingState((current) => ({ ...current, loading: true }))

    const { start, end } = getBangkokMonthRange()
    const [tasksResult, journalsResult, expensesResult, settingsResult] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: true }),
      supabase.from('journals').select('*').order('created_at', { ascending: false }),
      supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', start)
        .lte('expense_date', end)
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('monthly_settings').select('*').eq('month_key', monthKey).maybeSingle(),
    ])

    const firstError =
      tasksResult.error ?? journalsResult.error ?? expensesResult.error ?? settingsResult.error

    if (firstError) {
      setStatusMessage(firstError.message)
      setLoadingState((current) => ({ ...current, loading: false }))
      return
    }

    setTasks(tasksResult.data ?? [])
    setJournals(journalsResult.data ?? [])
    setExpenses(expensesResult.data ?? [])
    setMonthlySetting(
      settingsResult.data ?? {
        month_key: monthKey,
        income: 0,
        fixed_cost: 0,
        savings_target: 0,
      },
    )
    setStatusMessage(null)
    setLoadingState((current) => ({ ...current, loading: false }))
  }

  useEffect(() => {
    void loadAll()
  }, [monthKey])

  async function saveTaskCapture() {
    if (!captureText.trim()) return
    setLoadingState((current) => ({ ...current, savingInbox: true }))

    const { error } = await supabase.from('tasks').insert({
      title: captureText.trim(),
      is_processed: false,
      importance: null,
      urgency: null,
      done: false,
    })

    if (error) {
      setStatusMessage(error.message)
    } else {
      setCaptureText('')
      setStatusMessage('Saved to tasks.')
      await loadAll()
    }

    setLoadingState((current) => ({ ...current, savingInbox: false }))
  }

  async function saveJournalCapture() {
    if (!captureText.trim()) return
    setLoadingState((current) => ({ ...current, savingInbox: true }))

    const { error } = await supabase.from('journals').insert({
      content: captureText.trim(),
      tags: [],
      mood_score: null,
    })

    if (error) {
      setStatusMessage(error.message)
    } else {
      setCaptureText('')
      setStatusMessage('Saved to journals.')
      await loadAll()
    }

    setLoadingState((current) => ({ ...current, savingInbox: false }))
  }

  async function saveExpenseCapture() {
    if (!captureText.trim()) return
    setLoadingState((current) => ({ ...current, savingInbox: true }))

    const { error } = await supabase.from('expenses').insert({
      amount: parseAmountFromInput(captureText),
      category: null,
      expense_date: bangkokToday,
    })

    if (error) {
      setStatusMessage(error.message)
    } else {
      setCaptureText('')
      setStatusMessage('Saved to expenses.')
      await loadAll()
    }

    setLoadingState((current) => ({ ...current, savingInbox: false }))
  }

  async function updateTask(id: number, patch: Partial<Task>) {
    const { error } = await supabase.from('tasks').update(patch).eq('id', id)
    if (error) {
      setStatusMessage(error.message)
      return
    }
    await loadAll()
  }

  async function updateJournal(id: number, patch: Partial<Journal>) {
    const { error } = await supabase.from('journals').update(patch).eq('id', id)
    if (error) {
      setStatusMessage(error.message)
      return
    }
    await loadAll()
  }

  async function updateExpense(id: number, patch: Partial<Expense>) {
    const { error } = await supabase.from('expenses').update(patch).eq('id', id)
    if (error) {
      setStatusMessage(error.message)
      return
    }
    await loadAll()
  }

  async function saveMonthlySettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoadingState((current) => ({ ...current, savingSettings: true }))

    const payload = {
      month_key: monthKey,
      income: toNumber(monthlySetting.income),
      fixed_cost: toNumber(monthlySetting.fixed_cost),
      savings_target: toNumber(monthlySetting.savings_target),
    }

    const { error } = await supabase.from('monthly_settings').upsert(payload)

    if (error) {
      setStatusMessage(error.message)
    } else {
      setStatusMessage('Monthly settings saved.')
      await loadAll()
    }

    setLoadingState((current) => ({ ...current, savingSettings: false }))
  }

  const variableExpenseTotal = useMemo(
    () => expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0),
    [expenses],
  )

  const safeSpendingAmount = useMemo(() => {
    const remainingDays = getRemainingDaysInBangkokMonth()
    const budgetLeft =
      toNumber(monthlySetting.income) -
      toNumber(monthlySetting.fixed_cost) -
      toNumber(monthlySetting.savings_target) -
      variableExpenseTotal

    return budgetLeft / remainingDays
  }, [monthlySetting, variableExpenseTotal])

  const unprocessedTasks = useMemo(
    () => tasks.filter((task) => !task.is_processed && !task.done),
    [tasks],
  )

  const unprocessedJournals = useMemo(
    () => journals.filter((journal) => !journal.tags?.length || journal.mood_score === null),
    [journals],
  )

  const topTasks = useMemo(
    () =>
      [...tasks]
        .filter((task) => !task.done && task.is_processed)
        .sort((left, right) => {
          const scoreDelta = scoreTask(right) - scoreTask(left)
          if (scoreDelta !== 0) return scoreDelta
          return left.created_at.localeCompare(right.created_at)
        })
        .slice(0, 3),
    [tasks],
  )

  const filteredJournals = useMemo(() => {
    const filterValue = tagFilter.trim().toLowerCase()
    if (!filterValue) return journals

    return journals.filter((journal) =>
      (journal.tags ?? []).some((tag) => tag.toLowerCase().includes(filterValue)),
    )
  }, [journals, tagFilter])

  return (
    <main className="min-h-screen bg-transparent text-stone-100">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-4 pb-10 pt-4">
        <section className="sticky top-0 z-10 rounded-3xl border border-orange-400/20 bg-stone-950/90 p-4 shadow-2xl shadow-black/30 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.24em] text-orange-300">ShigeOS v1.0</p>
          <h1 className="mt-2 text-2xl font-semibold text-stone-50">Frictionless Inbox</h1>
          <div className="mt-4 space-y-3">
            <input
              value={captureText}
              onChange={(event) => setCaptureText(event.target.value)}
              placeholder="Capture once. Sort later."
              className="w-full rounded-2xl border border-stone-700 bg-stone-900 px-4 py-4 text-base outline-none ring-0 placeholder:text-stone-500 focus:border-orange-300"
            />
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => void saveTaskCapture()}
                disabled={loadingState.savingInbox}
                className="rounded-2xl bg-orange-400 px-3 py-4 font-medium text-stone-950 disabled:opacity-60"
              >
                Task
              </button>
              <button
                onClick={() => void saveJournalCapture()}
                disabled={loadingState.savingInbox}
                className="rounded-2xl bg-amber-100 px-3 py-4 font-medium text-stone-950 disabled:opacity-60"
              >
                Journal
              </button>
              <button
                onClick={() => void saveExpenseCapture()}
                disabled={loadingState.savingInbox}
                className="rounded-2xl bg-stone-200 px-3 py-4 font-medium text-stone-950 disabled:opacity-60"
              >
                Expense
              </button>
            </div>
            {statusMessage ? <p className="text-sm text-orange-200">{statusMessage}</p> : null}
          </div>
        </section>

        <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Dashboard</p>
              <h2 className="mt-1 text-xl font-semibold text-stone-50">Daily Ops</h2>
            </div>
            {loadingState.loading ? <span className="text-sm text-stone-400">Loading...</span> : null}
          </div>
          <div className="mt-4 rounded-2xl bg-stone-950 p-4">
            <p className="text-sm text-stone-400">Safe Spending Amount</p>
            <p
              className={`mt-2 text-3xl font-semibold ${
                safeSpendingAmount < 0 ? 'text-red-400' : 'text-emerald-300'
              }`}
            >
              {formatMoney(safeSpendingAmount)}
            </p>
            {safeSpendingAmount < 0 ? (
              <p className="mt-2 text-sm text-red-300">
                Current month spending has exceeded the target runway.
              </p>
            ) : null}
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-300">
                Unprocessed Inbox
              </h3>
              <div className="mt-3 space-y-3">
                {unprocessedTasks.map((task) => (
                  <div key={task.id} className="rounded-2xl border border-stone-800 bg-stone-950 p-3">
                    <p className="text-sm text-stone-100">{task.title}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <label className="text-xs text-stone-400">
                        Importance
                        <select
                          value={task.importance ?? ''}
                          onChange={(event) =>
                            void updateTask(task.id, {
                              importance: event.target.value ? Number(event.target.value) : null,
                            })
                          }
                          className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
                        >
                          <option value="">-</option>
                          {taskScale.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-stone-400">
                        Urgency
                        <select
                          value={task.urgency ?? ''}
                          onChange={(event) =>
                            void updateTask(task.id, {
                              urgency: event.target.value ? Number(event.target.value) : null,
                            })
                          }
                          className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
                        >
                          <option value="">-</option>
                          {taskScale.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() =>
                          void updateTask(task.id, {
                            is_processed: true,
                            importance: task.importance,
                            urgency: task.urgency,
                          })
                        }
                        className="rounded-xl bg-orange-300 px-3 py-3 text-sm font-medium text-stone-950"
                      >
                        Process
                      </button>
                      <button
                        onClick={() => void updateTask(task.id, { done: true })}
                        className="rounded-xl bg-stone-200 px-3 py-3 text-sm font-medium text-stone-950"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ))}

                {unprocessedJournals.map((journal) => (
                  <div
                    key={journal.id}
                    className="rounded-2xl border border-stone-800 bg-stone-950 p-3"
                  >
                    <p className="text-sm text-stone-100">{journal.content}</p>
                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <label className="text-xs text-stone-400">
                        Tags
                        <input
                          value={(journal.tags ?? []).join(', ')}
                          onChange={(event) =>
                            void updateJournal(journal.id, { tags: parseTags(event.target.value) })
                          }
                          placeholder="work, health"
                          className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="text-xs text-stone-400">
                        Mood
                        <select
                          value={journal.mood_score ?? ''}
                          onChange={(event) =>
                            void updateJournal(journal.id, {
                              mood_score: event.target.value ? Number(event.target.value) : null,
                            })
                          }
                          className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
                        >
                          <option value="">Unset</option>
                          {moodOptions.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <p className="mt-2 text-xs text-stone-500">
                      Add missing tags or mood here to clear it from the inbox.
                    </p>
                  </div>
                ))}

                {!unprocessedTasks.length && !unprocessedJournals.length ? (
                  <p className="rounded-2xl border border-stone-800 bg-stone-950 p-3 text-sm text-stone-400">
                    Inbox is processed.
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-300">
                Top 3 Tasks
              </h3>
              <div className="mt-3 space-y-3">
                {topTasks.map((task) => (
                  <div key={task.id} className="rounded-2xl border border-stone-800 bg-stone-950 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-stone-100">{task.title}</p>
                      <span className="rounded-full bg-orange-400/20 px-3 py-1 text-xs text-orange-200">
                        {scoreTask(task)}
                      </span>
                    </div>
                    <button
                      onClick={() => void updateTask(task.id, { done: true })}
                      className="mt-3 w-full rounded-xl bg-emerald-300 px-3 py-3 text-sm font-medium text-stone-950"
                    >
                      Mark Done
                    </button>
                  </div>
                ))}
                {!topTasks.length ? (
                  <p className="rounded-2xl border border-stone-800 bg-stone-950 p-3 text-sm text-stone-400">
                    No processed tasks yet.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Money</p>
          <h2 className="mt-1 text-xl font-semibold text-stone-50">Monthly Settings</h2>
          <form onSubmit={saveMonthlySettings} className="mt-4 space-y-3">
            <label className="block text-sm text-stone-300">
              Income
              <input
                type="number"
                inputMode="decimal"
                value={monthlySetting.income}
                onChange={(event) =>
                  setMonthlySetting((current) => ({ ...current, income: event.target.value }))
                }
                className="mt-1 w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3"
              />
            </label>
            <label className="block text-sm text-stone-300">
              Fixed Cost
              <input
                type="number"
                inputMode="decimal"
                value={monthlySetting.fixed_cost}
                onChange={(event) =>
                  setMonthlySetting((current) => ({
                    ...current,
                    fixed_cost: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3"
              />
            </label>
            <label className="block text-sm text-stone-300">
              Savings Target
              <input
                type="number"
                inputMode="decimal"
                value={monthlySetting.savings_target}
                onChange={(event) =>
                  setMonthlySetting((current) => ({
                    ...current,
                    savings_target: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3"
              />
            </label>
            <button
              type="submit"
              disabled={loadingState.savingSettings}
              className="w-full rounded-2xl bg-orange-400 px-4 py-4 font-medium text-stone-950 disabled:opacity-60"
            >
              Save {monthKey}
            </button>
          </form>

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-300">
              Expenses This Month
            </h3>
            <div className="mt-3 space-y-3">
              {expenses.map((expense) => (
                <div key={expense.id} className="rounded-2xl border border-stone-800 bg-stone-950 p-3">
                  <div className="grid grid-cols-1 gap-3">
                    <label className="text-xs text-stone-400">
                      Amount
                      <input
                        type="number"
                        inputMode="decimal"
                        value={expense.amount ?? ''}
                        onChange={(event) =>
                          void updateExpense(expense.id, {
                            amount: event.target.value ? Number(event.target.value) : null,
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-xs text-stone-400">
                      Category
                      <input
                        value={expense.category ?? ''}
                        onChange={(event) =>
                          void updateExpense(expense.id, {
                            category: event.target.value.trim() || null,
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-xs text-stone-400">
                      Expense Date
                      <input
                        type="date"
                        value={expense.expense_date}
                        onChange={(event) =>
                          void updateExpense(expense.id, { expense_date: event.target.value })
                        }
                        className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                </div>
              ))}
              {!expenses.length ? (
                <p className="rounded-2xl border border-stone-800 bg-stone-950 p-3 text-sm text-stone-400">
                  No expenses in the current Bangkok month yet.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Context DB</p>
              <h2 className="mt-1 text-xl font-semibold text-stone-50">Journals</h2>
            </div>
            <input
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
              placeholder="Filter by tag"
              className="w-36 rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-4 space-y-3">
            {filteredJournals.map((journal) => (
              <div key={journal.id} className="rounded-2xl border border-stone-800 bg-stone-950 p-3">
                <p className="text-sm text-stone-100">{journal.content}</p>
                <label className="mt-3 block text-xs text-stone-400">
                  Tags (comma separated)
                  <input
                    value={(journal.tags ?? []).join(', ')}
                    onChange={(event) =>
                      void updateJournal(journal.id, { tags: parseTags(event.target.value) })
                    }
                    className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
                  />
                </label>
                <label className="mt-3 block text-xs text-stone-400">
                  Mood Score
                  <select
                    value={journal.mood_score ?? ''}
                    onChange={(event) =>
                      void updateJournal(journal.id, {
                        mood_score: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
                  >
                    <option value="">Unset</option>
                    {moodOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
            {!filteredJournals.length ? (
              <p className="rounded-2xl border border-stone-800 bg-stone-950 p-3 text-sm text-stone-400">
                No journals match this tag filter.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  )
}

export default App
