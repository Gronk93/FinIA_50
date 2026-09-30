// Motor presupuestal 50/30/20 — puro y determinístico (sin IA, sin red).

export type BudgetClass = "need" | "want" | "future" | "pending";
export type TxType = "income" | "expense" | "transfer" | "future_allocation" | "adjustment";
export type Group = "need" | "want" | "future";

export interface EngineTx {
  tx_type: TxType;
  amount: number;
  budget_class?: BudgetClass | string | null | undefined;
  status?: string | null | undefined;
}

export interface Rule { needs: number; wants: number; future: number }
export const BASE_RULE: Rule = { needs: 50, wants: 30, future: 20 };

export type GroupStatus = "on_target" | "near_limit" | "over" | "above_goal" | "goal_met" | "below_goal";

export const STATUS_LABEL: Record<GroupStatus, string> = {
  on_target: "En objetivo",
  near_limit: "Cerca del límite",
  over: "Sobre objetivo",
  above_goal: "Sobre meta",
  goal_met: "Meta cumplida",
  below_goal: "Debajo de meta",
};

export const GROUP_LABEL: Record<Group, string> = { need: "Necesidades", want: "Deseos", future: "Futuro financiero" };

const round2 = (n: number) => Math.round(n * 100) / 100;
export const pct = (part: number, total: number) => (total > 0 ? round2((part / total) * 100) : 0);

export function isValidRule(r: Rule) {
  return [r.needs, r.wants, r.future].every(v => Number.isFinite(v) && v >= 0) && round2(r.needs + r.wants + r.future) === 100;
}

/** Necesidades/Deseos: techo (≤). Futuro: piso (≥). Margen de 3 puntos para "cerca". */
export function groupStatus(group: Group, percentage: number, rule: Rule): GroupStatus {
  if (group === "future") {
    if (percentage >= rule.future + 2) return "above_goal";
    if (percentage >= rule.future) return "goal_met";
    return "below_goal";
  }
  const limit = group === "need" ? rule.needs : rule.wants;
  if (percentage > limit) return "over";
  if (percentage > limit - 3) return "near_limit";
  return "on_target";
}

export const statusTone = (s: GroupStatus) =>
  s === "over" || s === "below_goal" ? "danger" : s === "near_limit" ? "warning" : "success";

export function sumMonth(txs: EngineTx[]) {
  let income = 0, need = 0, want = 0, future = 0, pending = 0, transfers = 0;
  for (const t of txs) {
    if (t.status && t.status !== "posted") continue;
    const a = Number(t.amount) || 0;
    if (t.tx_type === "income") income += a;
    else if (t.tx_type === "transfer") transfers += a; // excluidas del 50/30/20
    else if (t.tx_type === "future_allocation") future += a;
    else if (t.tx_type === "expense") {
      if (t.budget_class === "need") need += a;
      else if (t.budget_class === "want") want += a;
      else if (t.budget_class === "future") future += a;
      else pending += a;
    }
  }
  return { income: round2(income), need: round2(need), want: round2(want), future: round2(future), pending: round2(pending), transfers: round2(transfers) };
}

export function computeMonth(txs: EngineTx[], expectedIncome: number, rule: Rule) {
  const s = sumMonth(txs);
  const outflow = round2(s.need + s.want + s.future + s.pending);
  const plan = {
    need: round2((expectedIncome * rule.needs) / 100),
    want: round2((expectedIncome * rule.wants) / 100),
    future: round2((expectedIncome * rule.future) / 100),
  };
  const groups = (["need", "want", "future"] as Group[]).map(g => {
    const real = s[g];
    const realPct = pct(real, s.income); // contra ingreso recibido
    const planPct = pct(real, expectedIncome); // contra ingreso esperado
    return {
      group: g,
      target: g === "need" ? rule.needs : g === "want" ? rule.wants : rule.future,
      plan: plan[g],
      real,
      realPct,
      planPct,
      variance: round2(real - plan[g]),
      usedOfPlan: pct(real, plan[g]),
      status: groupStatus(g, s.income > 0 ? realPct : planPct, rule),
    };
  });
  return {
    ...s,
    expectedIncome,
    incomeDiff: round2(s.income - expectedIncome),
    outflow,
    flow: round2(s.income - outflow),
    unassigned: round2(s.income - s.need - s.want - s.future - s.pending),
    savingsRate: pct(s.future, s.income),
    plan,
    groups,
  };
}

export type MonthResult = ReturnType<typeof computeMonth>;

export function alerts(m: MonthResult, rule: Rule): { tone: "warning" | "danger" | "success" | "info"; text: string }[] {
  const out: { tone: "warning" | "danger" | "success" | "info"; text: string }[] = [];
  const want = m.groups[1]!, need = m.groups[0]!, fut = m.groups[2]!;
  if (want.plan > 0 && want.usedOfPlan >= 80) out.push({ tone: want.usedOfPlan > 100 ? "danger" : "warning", text: `Has utilizado ${Math.round(want.usedOfPlan)}% del presupuesto mensual de Deseos.` });
  if (m.income > 0 && need.realPct > rule.needs) out.push({ tone: "danger", text: `Tus Necesidades representan actualmente ${need.realPct.toFixed(1)}% del ingreso del mes.` });
  if (m.income > 0 && fut.realPct >= rule.future) out.push({ tone: "success", text: `Has alcanzado tu objetivo mínimo de ${rule.future}% para Futuro financiero.` });
  if (m.pending > 0) out.push({ tone: "info", text: `Tienes ${mxn(m.pending)} sin clasificar.` });
  return out;
}

/** Simula el efecto de un nuevo gasto sobre el porcentaje de su bolsa (contra plan si aún no hay ingreso). */
export function previewExpense(m: MonthResult, rule: Rule, group: Group, amount: number) {
  const base = m.income > 0 ? m.income : m.expectedIncome;
  const before = pct(m[group], base);
  const after = pct(m[group] + amount, base);
  const limit = group === "need" ? rule.needs : group === "want" ? rule.wants : Infinity;
  return { before, after, exceeds: group !== "future" && base > 0 && after > limit && before <= limit + 1000, limit };
}

export const mxn = (v: number, currency = "MXN") =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 }).format(v || 0);

// ---- Periodos ----
export const currentPeriod = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export function periodRange(period: string) {
  const [y, m] = period.split("-").map(Number) as [number, number];
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { start: `${period}-01`, end: `${next}-01` };
}
export function shiftPeriod(period: string, delta: number) {
  const [y, m] = period.split("-").map(Number) as [number, number];
  const d = new Date(y, m - 1 + delta, 1);
  return currentPeriod(d);
}
export function periodLabel(period: string, short = false) {
  const [y, m] = period.split("-").map(Number) as [number, number];
  const s = new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: short ? "short" : "long", year: short ? undefined : "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---- Calidad de datos antes del cierre ----
export interface QualityTx extends EngineTx {
  tx_date: string;
  category_id?: string | null;
  from_account_id?: string | null;
  to_account_id?: string | null;
  future_destination?: string | null;
}
export function qualityIssues(txs: QualityTx[], period: string) {
  const { start, end } = periodRange(period);
  const issues: string[] = [];
  const posted = txs.filter(t => !t.status || t.status === "posted");
  const n = (f: (t: QualityTx) => boolean) => posted.filter(f).length;
  const pending = n(t => t.tx_type === "expense" && (!t.budget_class || t.budget_class === "pending"));
  if (pending) issues.push(`Tienes movimientos pendientes de clasificar (${pending}).`);
  const inc = n(t => t.tx_type === "income" && !t.to_account_id);
  if (inc) issues.push(`${inc} ingreso(s) sin cuenta de destino.`);
  const cat = n(t => t.tx_type === "expense" && !t.category_id);
  if (cat) issues.push(`${cat} gasto(s) sin categoría.`);
  const acc = n(t => t.tx_type === "expense" && !t.from_account_id);
  if (acc) issues.push(`${acc} gasto(s) sin cuenta.`);
  const tr = n(t => t.tx_type === "transfer" && (!t.from_account_id || !t.to_account_id || t.from_account_id === t.to_account_id));
  if (tr) issues.push(`${tr} transferencia(s) incompleta(s).`);
  const dates = n(t => t.tx_date < start || t.tx_date >= end);
  if (dates) issues.push(`${dates} movimiento(s) con fecha fuera del mes.`);
  return issues;
}

// ---- Saldos ----
export interface AccountLike { id: string; account_type: string; initial_balance: number }
export interface FlowTx { from_account_id?: string | null; to_account_id?: string | null; amount: number; status?: string | null; tx_type?: string; adjustment_direction?: string | null }
/** Para tarjetas de crédito el saldo representa deuda: cargos la aumentan, pagos la reducen. */
export function accountBalance(a: AccountLike, txs: FlowTx[]) {
  let inflow = 0, outflow = 0;
  for (const t of txs) {
    if (t.status && t.status !== "posted") continue;
    if (t.to_account_id === a.id) inflow += Number(t.amount);
    if (t.from_account_id === a.id) outflow += Number(t.amount);
  }
  const base = Number(a.initial_balance);
  return round2(a.account_type === "credit_card" ? base + outflow - inflow : base + inflow - outflow);
}
