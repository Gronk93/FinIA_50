import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { BASE_RULE, computeMonth, periodRange, type Rule } from "./budget-engine";

export type Account = Tables<"financial_accounts">;
export type Category = Tables<"transaction_categories">;
export type Tx = Tables<"transactions">;
export type Budget = Tables<"monthly_budgets">;
export type Snapshot = Tables<"monthly_budget_snapshots">;
export type Profile = Tables<"profiles">;

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sesión no válida");
  return data.user.id;
}
function check<T>(r: { data: T; error: { message: string } | null }) {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

export const qk = {
  profile: ["profile"], accounts: ["accounts"], categories: ["categories"], rule: ["rule"], futureRule: ["futureRule"],
  txAll: ["tx", "all"], txMonth: (p: string) => ["tx", p], budget: (p: string) => ["budget", p],
  targets: (id: string) => ["targets", id], snapshots: ["snapshots"], closeLog: ["closeLog"], allocations: ["allocations"],
};

export const useProfile = () => useQuery({ queryKey: qk.profile, queryFn: async () => {
  const id = await uid();
  return check(await supabase.from("profiles").select("*").eq("user_id", id).maybeSingle());
} });

export const useAccounts = () => useQuery({ queryKey: qk.accounts, queryFn: async () =>
  check(await supabase.from("financial_accounts").select("*").order("created_at")) });

export const useCategories = () => useQuery({ queryKey: qk.categories, queryFn: async () =>
  check(await supabase.from("transaction_categories").select("*").eq("active", true).order("is_custom").order("name")) });

export const useRule = () => useQuery({ queryKey: qk.rule, queryFn: async () => {
  const r = check(await supabase.from("budget_rules").select("*").eq("is_default", true).order("effective_from", { ascending: false }).limit(1));
  return r?.[0] ?? null;
} });

export const useFutureRule = () => useQuery({ queryKey: qk.futureRule, queryFn: async () =>
  check(await supabase.from("future_allocation_rules").select("*").maybeSingle()) });

export const useAllTransactions = () => useQuery({ queryKey: qk.txAll, queryFn: async () =>
  check(await supabase.from("transactions").select("*").eq("status", "posted").order("tx_date", { ascending: false }).limit(5000)) });

export const useMonthTransactions = (period: string) => useQuery({ queryKey: qk.txMonth(period), queryFn: async () => {
  const { start, end } = periodRange(period);
  return check(await supabase.from("transactions").select("*").gte("tx_date", start).lt("tx_date", end).eq("status", "posted").order("tx_date", { ascending: false }).order("created_at", { ascending: false }));
} });

export const useSnapshots = () => useQuery({ queryKey: qk.snapshots, queryFn: async () =>
  check(await supabase.from("monthly_budget_snapshots").select("*").eq("is_current", true).order("period")) });

export const useCloseLog = () => useQuery({ queryKey: qk.closeLog, queryFn: async () =>
  check(await supabase.from("monthly_close_log").select("*").order("created_at", { ascending: false }).limit(50)) });

export const useAllocations = () => useQuery({ queryKey: qk.allocations, queryFn: async () =>
  check(await supabase.from("future_allocations").select("*").order("alloc_date", { ascending: false })) });

/** Obtiene (o crea si falta) el presupuesto del mes usando el ingreso esperado del perfil y la regla vigente. */
export const useBudget = (period: string) => useQuery({ queryKey: qk.budget(period), queryFn: async () => {
  const existing = check(await supabase.from("monthly_budgets").select("*").eq("period", period).maybeSingle());
  if (existing) return existing;
  const id = await uid();
  const [profile, rules] = await Promise.all([
    supabase.from("profiles").select("expected_income").eq("user_id", id).maybeSingle(),
    supabase.from("budget_rules").select("*").eq("is_default", true).order("effective_from", { ascending: false }).limit(1),
  ]);
  const rule = rules.data?.[0];
  const insert: TablesInsert<"monthly_budgets"> = {
    user_id: id, period, expected_income: Number(profile.data?.expected_income ?? 0), rule_id: rule?.id ?? null,
    needs_pct: rule?.needs_pct ?? 50, wants_pct: rule?.wants_pct ?? 30, future_pct: rule?.future_pct ?? 20,
  };
  const created = await supabase.from("monthly_budgets").upsert(insert, { onConflict: "user_id,period", ignoreDuplicates: true }).select("*").maybeSingle();
  if (created.data) return created.data;
  return check(await supabase.from("monthly_budgets").select("*").eq("period", period).single());
} });

export const useTargets = (budgetId?: string) => useQuery({ enabled: !!budgetId, queryKey: qk.targets(budgetId ?? ""), queryFn: async () =>
  check(await supabase.from("monthly_budget_targets").select("*").eq("budget_id", budgetId!)) });

export const budgetRule = (b?: Budget | null): Rule => b ? { needs: Number(b.needs_pct), wants: Number(b.wants_pct), future: Number(b.future_pct) } : BASE_RULE;

/** Resultado del motor para un mes. */
export function useMonth(period: string) {
  const budget = useBudget(period);
  const txs = useMonthTransactions(period);
  const rule = budgetRule(budget.data);
  const result = txs.data && budget.data ? computeMonth(txs.data as never, Number(budget.data.expected_income), rule) : null;
  return { budget, txs, rule, result, isLoading: budget.isLoading || txs.isLoading, error: budget.error || txs.error };
}

// ---- Mutaciones ----
function useInvalidate() {
  const qc = useQueryClient();
  return () => Promise.all(["tx", "budget", "targets", "accounts", "snapshots", "closeLog", "allocations", "profile", "rule", "futureRule", "categories"].map(k => qc.invalidateQueries({ queryKey: [k] })));
}

export function useSaveTransaction() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string | undefined; values: TablesInsert<"transactions"> }) => {
      if (id) return check(await supabase.from("transactions").update(values as TablesUpdate<"transactions">).eq("id", id).select().single());
      return check(await supabase.from("transactions").insert({ ...values, user_id: await uid() }).select().single());
    },
    onSuccess: inv,
  });
}
export function useDeleteTransaction() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: async (id: string) => { check(await supabase.from("transactions").delete().eq("id", id)); }, onSuccess: inv });
}
export function useSaveAccount() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string | undefined; values: TablesInsert<"financial_accounts"> }) => {
      if (id) return check(await supabase.from("financial_accounts").update(values).eq("id", id).select().single());
      return check(await supabase.from("financial_accounts").insert({ ...values, user_id: await uid() }).select().single());
    },
    onSuccess: inv,
  });
}
export function useSaveCategory() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: async (values: TablesInsert<"transaction_categories">) =>
    check(await supabase.from("transaction_categories").insert({ ...values, user_id: await uid(), is_custom: true }).select().single()), onSuccess: inv });
}
export function useUpdateBudget() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: async ({ id, values }: { id: string; values: TablesUpdate<"monthly_budgets"> }) =>
    check(await supabase.from("monthly_budgets").update(values).eq("id", id).select().single()), onSuccess: inv });
}
export function useSaveTarget() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: async (values: TablesInsert<"monthly_budget_targets">) =>
    check(await supabase.from("monthly_budget_targets").upsert({ ...values, user_id: await uid() }, { onConflict: "budget_id,category_id" }).select().single()), onSuccess: inv });
}
export function useDeleteTarget() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: async (id: string) => { check(await supabase.from("monthly_budget_targets").delete().eq("id", id)); }, onSuccess: inv });
}
export function useSaveRule() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: async (r: Rule & { name?: string }) => {
    const id = await uid();
    check(await supabase.from("budget_rules").update({ is_default: false }).eq("is_default", true));
    return check(await supabase.from("budget_rules").insert({ user_id: id, name: r.name ?? "Regla personalizada", needs_pct: r.needs, wants_pct: r.wants, future_pct: r.future, is_default: true }).select().single());
  }, onSuccess: inv });
}
export function useSaveFutureRule() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: async (v: Omit<TablesInsert<"future_allocation_rules">, "user_id">) =>
    check(await supabase.from("future_allocation_rules").upsert({ ...v, user_id: await uid() }, { onConflict: "user_id" }).select().single()), onSuccess: inv });
}
export function useSaveProfile() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: async (v: Omit<TablesUpdate<"profiles">, "user_id">) => {
    const id = await uid();
    return check(await supabase.from("profiles").upsert({ ...v, user_id: id }, { onConflict: "user_id" }).select().single());
  }, onSuccess: inv });
}
export function useCloseMonth() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: async ({ period, decision }: { period: string; decision?: string | undefined }) =>
    check(await supabase.rpc("close_month", { _period: period, ...(decision ? { _unassigned_decision: decision } : {}) })), onSuccess: inv });
}
export function useReopenMonth() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: async ({ period, reason }: { period: string; reason: string }) =>
    check(await supabase.rpc("reopen_month", { _period: period, _reason: reason })), onSuccess: inv });
}

export const ACCOUNT_TYPES: Record<string, string> = { cash: "Efectivo", bank: "Cuenta bancaria", savings: "Cuenta de ahorro", investment: "Inversión", credit_card: "Tarjeta de crédito", other: "Otra" };
export const FUTURE_DEST: Record<string, string> = { security: "Fondo Seguridad", growth: "Crecimiento", retirement: "Retiro", trading: "Trading", debt: "Pago extraordinario de deuda" };
export const TX_TYPES: Record<string, string> = { income: "Ingreso", expense: "Gasto", transfer: "Transferencia", future_allocation: "Aportación a futuro", adjustment: "Ajuste" };
export const CLASS_LABEL: Record<string, string> = { need: "Necesidad", want: "Deseo", future: "Futuro financiero", pending: "Pendiente de clasificar" };
