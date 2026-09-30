import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowRight, ChevronLeft, ChevronRight, Lock, LockOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  GROUP_LABEL, STATUS_LABEL, accountBalance, alerts, currentPeriod, mxn, periodLabel, periodRange, previewExpense, qualityIssues, shiftPeriod, statusTone,
  type Group, type MonthResult, type Rule,
} from "@/lib/budget-engine";
import {
  ACCOUNT_TYPES, CLASS_LABEL, FUTURE_DEST, TX_TYPES, useAccounts, useAllTransactions, useAllocations, useCategories, useCloseLog, useCloseMonth, useDeleteTarget,
  useDeleteTransaction, useMonth, useProfile, useReopenMonth, useSaveAccount, useSaveCategory, useSaveTarget, useSaveTransaction, useSnapshots, useTargets,
  useUpdateBudget, type Account, type Tx,
} from "@/lib/finance-queries";
import { KpiCard, PageHeader, Panel, StatusBadge } from "./primitives";

const GROUP_COLOR: Record<Group | "pending", string> = { need: "var(--info)", want: "var(--warning)", future: "var(--success)", pending: "var(--muted-foreground)" };
const GROUP_TEXT: Record<Group, string> = { need: "text-info", want: "text-warning", future: "text-success" };
const err = (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo completar la operación");

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>;
}
function LoadingBlock() { return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}</div>; }
function ErrorBlock({ error }: { error: unknown }) { return <Panel><div className="flex items-center gap-3 text-sm text-destructive"><AlertTriangle className="size-5" />{error instanceof Error ? error.message : "No pudimos cargar tu información."}</div></Panel>; }
function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="grid min-h-40 place-items-center text-center"><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{text}</p>{action && <div className="mt-4">{action}</div>}</div></div>;
}

function MonthPicker({ period, setPeriod, status }: { period: string; setPeriod: (p: string) => void; status?: string | undefined }) {
  return <div className="flex items-center gap-2">
    <Button variant="outline" size="icon" aria-label="Mes anterior" onClick={() => setPeriod(shiftPeriod(period, -1))}><ChevronLeft /></Button>
    <span className="min-w-36 text-center text-sm font-semibold">{periodLabel(period)}</span>
    <Button variant="outline" size="icon" aria-label="Mes siguiente" onClick={() => setPeriod(shiftPeriod(period, 1))} disabled={period >= currentPeriod()}><ChevronRight /></Button>
    {status && <StatusBadge tone={status === "closed" ? "neutral" : "info"}>{status === "closed" ? <><Lock className="size-3" />Cerrado</> : <><LockOpen className="size-3" />Abierto</>}</StatusBadge>}
  </div>;
}

// ================= Formulario de movimiento =================
type TxKind = "income" | "expense" | "transfer" | "future_allocation" | "adjustment";
export function TransactionDialog({ open, onOpenChange, kind: initialKind, editing, month, rule }: {
  open: boolean; onOpenChange: (o: boolean) => void; kind: TxKind; editing?: Tx | null | undefined; month?: MonthResult | null | undefined; rule: Rule;
}) {
  const accounts = useAccounts(); const categories = useCategories(); const save = useSaveTransaction();
  const [kind, setKind] = useState<TxKind>((editing?.tx_type as TxKind) ?? initialKind);
  const [f, setF] = useState(() => ({
    tx_date: editing?.tx_date ?? new Date().toISOString().slice(0, 10), concept: editing?.concept ?? "", amount: editing ? String(editing.amount) : "",
    category_id: editing?.category_id ?? "", budget_class: editing?.budget_class ?? "pending", future_destination: editing?.future_destination ?? "",
    from_account_id: editing?.from_account_id ?? "", to_account_id: editing?.to_account_id ?? "", is_recurring: editing?.is_recurring ?? false,
    merchant: editing?.merchant ?? "", notes: editing?.notes ?? "", adjustment_direction: editing?.adjustment_direction ?? "in",
  }));
  const [confirm, setConfirm] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string | boolean) => setF(p => ({ ...p, [k]: v }));
  const activeAccounts = (accounts.data ?? []).filter(a => a.active || a.id === f.from_account_id || a.id === f.to_account_id);
  const cats = (categories.data ?? []).filter(c => c.kind === (kind === "income" ? "income" : "expense"));
  const needsFrom = kind === "expense" || kind === "transfer" || kind === "future_allocation" || (kind === "adjustment" && f.adjustment_direction === "out");
  const needsTo = kind === "income" || kind === "transfer" || (kind === "adjustment" && f.adjustment_direction === "in");
  const isFuture = kind === "future_allocation" || (kind === "expense" && f.budget_class === "future");

  const persist = async () => {
    const amount = Number(f.amount);
    try {
      await save.mutateAsync({ id: editing?.id, values: {
        tx_type: kind, tx_date: f.tx_date, concept: f.concept.trim(), amount,
        category_id: kind === "income" || kind === "expense" ? f.category_id || null : null,
        budget_class: kind === "expense" ? (f.budget_class as Tx["budget_class"]) : kind === "future_allocation" ? "future" : null,
        future_destination: isFuture ? (f.future_destination as Tx["future_destination"]) || null : null,
        from_account_id: needsFrom ? f.from_account_id || null : null, to_account_id: needsTo ? f.to_account_id || null : null,
        adjustment_direction: kind === "adjustment" ? (f.adjustment_direction as "in" | "out") : null,
        is_recurring: f.is_recurring, merchant: f.merchant.trim() || null, notes: f.notes.trim() || null,
      } });
      toast.success(editing ? "Movimiento actualizado" : "Movimiento registrado");
      onOpenChange(false);
    } catch (e) { err(e); }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(f.amount);
    if (!f.concept.trim() || !(amount > 0)) return toast.error("Indica concepto y un monto mayor a cero.");
    if (needsFrom && !f.from_account_id) return toast.error("Selecciona la cuenta de origen.");
    if (needsTo && !f.to_account_id) return toast.error("Selecciona la cuenta de destino.");
    if (kind === "transfer" && f.from_account_id === f.to_account_id) return toast.error("Las cuentas de la transferencia deben ser distintas.");
    if ((kind === "income" || kind === "expense") && !f.category_id) return toast.error("Selecciona una categoría.");
    if (isFuture && !f.future_destination) return toast.error("Selecciona el destino del Futuro financiero.");
    if (!editing && kind === "expense" && month && (f.budget_class === "need" || f.budget_class === "want")) {
      const p = previewExpense(month, rule, f.budget_class as Group, amount);
      if (p.exceeds) return setConfirm(`Actualmente: ${GROUP_LABEL[f.budget_class as Group]} = ${p.before.toFixed(1)}%. Con este gasto: ${p.after.toFixed(1)}%. Este movimiento llevaría ${GROUP_LABEL[f.budget_class as Group]} por encima de tu objetivo mensual (${p.limit}%).`);
    }
    void persist();
  };

  const accountSelect = (key: "from_account_id" | "to_account_id", label: string) => <Field label={label}>
    <Select value={f[key]} onValueChange={v => set(key, v)}><SelectTrigger><SelectValue placeholder="Selecciona cuenta" /></SelectTrigger>
      <SelectContent>{activeAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select>
    {activeAccounts.length === 0 && <p className="text-xs text-warning">Primero crea una cuenta en la pestaña Cuentas.</p>}
  </Field>;

  return <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Editar movimiento" : `Nuevo ${TX_TYPES[kind]!.toLowerCase()}`}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          {!editing && <Field label="Tipo"><Select value={kind} onValueChange={v => setKind(v as TxKind)}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(TX_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></Field>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha"><Input type="date" required value={f.tx_date} onChange={e => set("tx_date", e.target.value)} /></Field>
            <Field label={kind === "income" ? "Monto neto" : "Monto"}><Input type="number" inputMode="decimal" min="0.01" step="0.01" required value={f.amount} onChange={e => set("amount", e.target.value)} /></Field>
          </div>
          <Field label="Concepto"><Input required maxLength={120} value={f.concept} onChange={e => set("concept", e.target.value)} placeholder={kind === "income" ? "Nómina" : kind === "transfer" ? "BBVA → Nu" : "Supermercado"} /></Field>
          {(kind === "income" || kind === "expense") && <Field label="Categoría"><Select value={f.category_id} onValueChange={v => { set("category_id", v); const c = cats.find(x => x.id === v); if (kind === "expense" && c?.default_class && f.budget_class === "pending") set("budget_class", c.default_class); }}>
            <SelectTrigger><SelectValue placeholder="Selecciona categoría" /></SelectTrigger>
            <SelectContent>{cats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.is_custom ? " · personalizada" : ""}</SelectItem>)}</SelectContent></Select></Field>}
          {kind === "expense" && <Field label="Clasificación 50/30/20" hint="Pago mínimo de deuda = Necesidad. Abono extraordinario = Futuro."><Select value={f.budget_class} onValueChange={v => set("budget_class", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CLASS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></Field>}
          {isFuture && <Field label="Destino del Futuro"><Select value={f.future_destination} onValueChange={v => set("future_destination", v)}>
            <SelectTrigger><SelectValue placeholder="Selecciona destino" /></SelectTrigger><SelectContent>{Object.entries(FUTURE_DEST).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></Field>}
          {kind === "adjustment" && <Field label="Dirección"><Select value={f.adjustment_direction} onValueChange={v => set("adjustment_direction", v)}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="in">Aumenta saldo</SelectItem><SelectItem value="out">Disminuye saldo</SelectItem></SelectContent></Select></Field>}
          <div className="grid gap-4 sm:grid-cols-2">
            {needsFrom && accountSelect("from_account_id", kind === "transfer" ? "Cuenta origen" : "Cuenta")}
            {needsTo && accountSelect("to_account_id", kind === "transfer" ? "Cuenta destino" : "Cuenta de destino")}
          </div>
          {kind === "transfer" && <p className="text-xs text-muted-foreground">Las transferencias no cuentan como gasto ni como ahorro en el 50/30/20.</p>}
          {kind === "expense" && <Field label="Comercio / proveedor (opcional)"><Input maxLength={80} value={f.merchant} onChange={e => set("merchant", e.target.value)} /></Field>}
          <Field label="Notas"><Textarea maxLength={500} value={f.notes} onChange={e => set("notes", e.target.value)} /></Field>
          <label className="flex items-center justify-between rounded-md border border-border p-3 text-sm">Recurrente<Switch checked={f.is_recurring} onCheckedChange={v => set("is_recurring", v)} /></label>
          <DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? "Guardando…" : "Guardar"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <AlertDialog open={!!confirm} onOpenChange={o => !o && setConfirm(null)}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Revisa antes de registrar</AlertDialogTitle><AlertDialogDescription>{confirm}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { setConfirm(null); void persist(); }}>Registrar de todas formas</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </>;
}

// ================= Bloques del motor =================
function GroupRow({ g, basis }: { g: MonthResult["groups"][number]; basis: "plan" | "real" }) {
  const p = basis === "real" ? g.realPct : g.planPct;
  const status = g.status;
  const objective = g.group === "future" ? `≥${g.target}%` : `≤${g.target}%`;
  return <div className="rounded-md border border-border bg-surface p-4">
    <div className="flex items-center justify-between gap-2"><p className={cn("text-xs font-semibold uppercase", GROUP_TEXT[g.group])}>{GROUP_LABEL[g.group]}</p><StatusBadge tone={statusTone(status)}>{STATUS_LABEL[status]}</StatusBadge></div>
    <p className="mt-2 font-display text-3xl font-semibold">{p.toFixed(1)}%</p>
    <p className="text-sm text-muted-foreground">{mxn(g.real)} / {mxn(g.plan)} · Objetivo {objective}</p>
    <Progress value={Math.min(100, g.usedOfPlan)} className="mt-3 h-1.5" />
  </div>;
}

export function BudgetCard({ month, period }: { month: MonthResult; period: string }) {
  return <Panel title={`Presupuesto · ${periodLabel(period)}`} action={<Button asChild size="sm" variant="ghost"><Link to="/finanzas">Ver detalle<ArrowRight /></Link></Button>}>
    <p className="text-xs uppercase text-muted-foreground">Ingreso real</p><p className="font-display text-2xl font-semibold">{mxn(month.income)}</p>
    <div className="mt-4 grid gap-3 md:grid-cols-3">{month.groups.map(g => <GroupRow key={g.group} g={g} basis="real" />)}</div>
    {month.income === 0 && <p className="mt-3 text-xs text-muted-foreground">Aún no registras ingresos este mes; los porcentajes se muestran contra el ingreso esperado.</p>}
  </Panel>;
}

function Distribution({ month }: { month: MonthResult }) {
  const data = [
    { name: "Necesidades", value: month.need, fill: GROUP_COLOR.need }, { name: "Deseos", value: month.want, fill: GROUP_COLOR.want },
    { name: "Futuro", value: month.future, fill: GROUP_COLOR.future }, { name: "Sin clasificar", value: month.pending, fill: GROUP_COLOR.pending },
    { name: "Sin asignar", value: Math.max(0, month.unassigned), fill: "var(--border)" },
  ].filter(d => d.value > 0);
  if (!data.length) return <Empty title="Sin movimientos" text="La distribución aparecerá con tus datos reales." />;
  return <div className="h-56"><ResponsiveContainer><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} strokeWidth={0}>{data.map((d, i) => <Cell key={i} fill={d.fill} />)}</Pie><Tooltip formatter={(v: number) => mxn(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer></div>;
}

// ================= Pantalla Mis Finanzas =================
export function FinancesScreen() {
  const [period, setPeriod] = useState(currentPeriod());
  const m = useMonth(period);
  const [dialog, setDialog] = useState<{ kind: TxKind; editing?: Tx | null | undefined } | null>(null);
  const closed = m.budget.data?.status === "closed";
  const open = (kind: TxKind, editing?: Tx | null) => closed ? toast.error("El mes está cerrado. Reábrelo para hacer cambios.") : setDialog({ kind, editing });

  return <>
    <PageHeader title="Mis Finanzas" description="Plan, registro y revisión mensual con el método 50/30/20." action={<Button onClick={() => open("expense")} disabled={closed}><Plus />Movimiento</Button>} />
    <MonthPicker period={period} setPeriod={setPeriod} status={m.budget.data?.status} />
    {m.error ? <ErrorBlock error={m.error} /> : m.isLoading || !m.result ? <LoadingBlock /> :
      <Tabs defaultValue="resumen">
        <TabsList className="max-w-full justify-start overflow-x-auto">{[["resumen", "Resumen"], ["presupuesto", "Presupuesto 50/30/20"], ["movimientos", "Movimientos"], ["ingresos", "Ingresos"], ["gastos", "Gastos"], ["cuentas", "Cuentas"], ["patrimonio", "Patrimonio"]].map(([v, l]) => <TabsTrigger key={v} value={v!}>{l}</TabsTrigger>)}</TabsList>
        <TabsContent value="resumen" className="mt-4 space-y-4"><SummaryTab month={m.result} rule={m.rule} period={period} /></TabsContent>
        <TabsContent value="presupuesto" className="mt-4 space-y-4"><BudgetTab period={period} m={m} /></TabsContent>
        <TabsContent value="movimientos" className="mt-4"><MovementsTab txs={m.txs.data ?? []} closed={closed} onEdit={t => open(t.tx_type as TxKind, t)} onNew={() => open("expense")} /></TabsContent>
        <TabsContent value="ingresos" className="mt-4"><MovementsTab txs={(m.txs.data ?? []).filter(t => t.tx_type === "income")} closed={closed} onEdit={t => open("income", t)} onNew={() => open("income")} newLabel="Nuevo ingreso" fixedType /></TabsContent>
        <TabsContent value="gastos" className="mt-4"><MovementsTab txs={(m.txs.data ?? []).filter(t => t.tx_type === "expense")} closed={closed} onEdit={t => open("expense", t)} onNew={() => open("expense")} newLabel="Nuevo gasto" fixedType /></TabsContent>
        <TabsContent value="cuentas" className="mt-4"><AccountsTab /></TabsContent>
        <TabsContent value="patrimonio" className="mt-4"><NetWorthTab /></TabsContent>
      </Tabs>}
    {dialog && <TransactionDialog key={dialog.editing?.id ?? dialog.kind} open onOpenChange={o => !o && setDialog(null)} kind={dialog.kind} editing={dialog.editing} month={m.result} rule={m.rule} />}
  </>;
}

function SummaryTab({ month, rule, period }: { month: MonthResult; rule: Rule; period: string }) {
  const a = alerts(month, rule);
  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard label="Ingreso neto del mes" value={mxn(month.income)} detail={`Esperado ${mxn(month.expectedIncome)} (${month.incomeDiff >= 0 ? "+" : ""}${mxn(month.incomeDiff)})`} tone={month.incomeDiff >= 0 ? "success" : "warning"} />
      <KpiCard label="Gasto total" value={mxn(month.outflow - month.future)} detail="Necesidades + deseos + sin clasificar" tone="warning" />
      <KpiCard label="Flujo disponible" value={mxn(month.flow)} detail="Ingresos − egresos reales" tone={month.flow >= 0 ? "info" : "destructive"} />
      <KpiCard label="Futuro financiero" value={mxn(month.future)} detail={`Plan ${mxn(month.plan.future)}`} tone="success" />
      <KpiCard label="Tasa de ahorro" value={`${month.savingsRate.toFixed(1)}%`} detail={`Meta ≥${rule.future}%`} tone={month.savingsRate >= rule.future ? "success" : "warning"} />
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Distribución del ingreso"><Distribution month={month} /></Panel>
      <Panel title="Alertas del mes">{a.length ? <ul className="space-y-3 text-sm">{a.map(x => <li key={x.text} className="flex gap-2"><StatusBadge tone={x.tone === "danger" ? "danger" : x.tone}>{x.tone === "success" ? "Logro" : x.tone === "info" ? "Aviso" : "Alerta"}</StatusBadge><span>{x.text}</span></li>)}</ul> : <Empty title="Sin alertas" text="Todo en orden por ahora." />}
        <div className="mt-5 rounded-md border border-border bg-surface p-3 text-sm"><p className="text-xs uppercase text-muted-foreground">Disponible sin asignar · {periodLabel(period)}</p><p className="mt-1 font-display text-xl font-semibold">{mxn(month.unassigned)}</p><p className="text-xs text-muted-foreground">No se cuenta como ahorro hasta que decidas su destino.</p></div>
      </Panel>
    </div>
  </>;
}

function BudgetTab({ period, m }: { period: string; m: ReturnType<typeof useMonth> }) {
  const month = m.result!; const budget = m.budget.data!; const closed = budget.status === "closed";
  const [basis, setBasis] = useState<"plan" | "real">("real");
  const [expected, setExpected] = useState(String(budget.expected_income));
  const update = useUpdateBudget();
  const isCurrent = period === currentPeriod();
  return <>
    <Panel title="Resumen del mes" action={<CloseMonthControls period={period} m={m} />}>
      <div className="grid gap-4 md:grid-cols-4">
        <div><Label>Ingreso esperado</Label><div className="mt-2 flex gap-2"><Input type="number" min="0" value={expected} disabled={closed} onChange={e => setExpected(e.target.value)} />
          <Button variant="outline" disabled={closed || update.isPending || Number(expected) === Number(budget.expected_income)} onClick={() => update.mutate({ id: budget.id, values: { expected_income: Math.max(0, Number(expected) || 0) } }, { onSuccess: () => toast.success("Ingreso esperado actualizado"), onError: err })}>Guardar</Button></div></div>
        <div><p className="text-xs uppercase text-muted-foreground">Ingreso real</p><p className="mt-2 font-display text-2xl font-semibold">{mxn(month.income)}</p></div>
        <div><p className="text-xs uppercase text-muted-foreground">Diferencia</p><p className={cn("mt-2 font-display text-2xl font-semibold", month.incomeDiff >= 0 ? "text-success" : "text-warning")}>{month.incomeDiff >= 0 ? "+" : ""}{mxn(month.incomeDiff)}</p></div>
        <div><p className="text-xs uppercase text-muted-foreground">Regla del mes</p><p className="mt-2 font-display text-2xl font-semibold">{m.rule.needs}/{m.rule.wants}/{m.rule.future}</p><Link to="/configuracion" className="text-xs text-primary underline-offset-4 hover:underline">Personalizar regla</Link></div>
      </div>
    </Panel>
    <Panel title="50/30/20 plan vs real" action={<div className="flex gap-1 rounded-md bg-muted p-1 text-xs">{(["real", "plan"] as const).map(b => <button key={b} onClick={() => setBasis(b)} className={cn("rounded px-2 py-1", basis === b && "bg-card font-semibold")}>{b === "real" ? "Contra real" : "Contra plan"}</button>)}</div>}>
      {isCurrent && !closed && <p className="mb-3 text-xs text-muted-foreground">Avance del mes: resultados preliminares, no definitivos hasta el cierre.</p>}
      <div className="grid gap-3 md:grid-cols-3">{month.groups.map(g => <GroupRow key={g.group} g={g} basis={basis} />)}</div>
      <div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground"><th className="py-2">Grupo</th><th>Plan</th><th>Real</th><th>% {basis === "real" ? "real" : "plan"}</th><th>Variación</th></tr></thead>
        <tbody>{month.groups.map(g => <tr key={g.group} className="border-b border-border/60"><td className={cn("py-3 font-medium", GROUP_TEXT[g.group])}>{GROUP_LABEL[g.group]}</td><td>{mxn(g.plan)}</td><td>{mxn(g.real)}</td><td>{(basis === "real" ? g.realPct : g.planPct).toFixed(1)}%</td><td>{g.variance >= 0 ? "+" : ""}{mxn(g.variance)}</td></tr>)}
          <tr><td className="py-3 text-muted-foreground">Pendiente de clasificar</td><td>—</td><td>{mxn(month.pending)}</td><td colSpan={2} /></tr></tbody></table></div>
    </Panel>
    <div className="grid gap-4 lg:grid-cols-2">
      <CategoryBudgets budgetId={budget.id} closed={closed} txs={m.txs.data ?? []} />
      <FutureBreakdown period={period} />
    </div>
    <HistoryPanel current={{ period, month }} />
  </>;
}

function CategoryBudgets({ budgetId, closed, txs }: { budgetId: string; closed: boolean; txs: Tx[] }) {
  const targets = useTargets(budgetId); const categories = useCategories(); const saveT = useSaveTarget(); const del = useDeleteTarget(); const saveC = useSaveCategory();
  const [cat, setCat] = useState(""); const [amt, setAmt] = useState(""); const [newCat, setNewCat] = useState(""); const [newClass, setNewClass] = useState("need");
  const expenseCats = (categories.data ?? []).filter(c => c.kind === "expense");
  const spent = (id: string) => txs.filter(t => t.tx_type === "expense" && t.category_id === id).reduce((s, t) => s + Number(t.amount), 0);
  return <Panel title="Presupuesto por categoría (opcional)">
    {(targets.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">El motor 50/30/20 funciona sin límites por categoría.</p> :
      <div className="space-y-3">{targets.data!.map(t => { const c = expenseCats.find(x => x.id === t.category_id); const s = spent(t.category_id ?? ""); const p = t.target_amount > 0 ? (s / Number(t.target_amount)) * 100 : 0; return <div key={t.id}>
        <div className="flex items-center justify-between text-sm"><span>{c?.name ?? "Categoría"} <span className="text-xs text-muted-foreground">· {CLASS_LABEL[t.budget_class]}</span></span><span className="flex items-center gap-2">{mxn(s)} / {mxn(Number(t.target_amount))}{!closed && <Button size="icon" variant="ghost" aria-label="Quitar límite" onClick={() => del.mutate(t.id, { onError: err })}><Trash2 className="size-4" /></Button>}</span></div>
        <Progress value={Math.min(100, p)} className={cn("h-1.5", p > 100 && "[&>div]:bg-destructive")} />{p > 100 && <p className="text-xs text-destructive">Sobre límite</p>}</div>; })}</div>}
    {!closed && <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_120px_auto]">
      <Select value={cat} onValueChange={setCat}><SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger><SelectContent>{expenseCats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
      <Input type="number" min="0" placeholder="Monto" value={amt} onChange={e => setAmt(e.target.value)} />
      <Button variant="outline" disabled={!cat || !(Number(amt) > 0)} onClick={() => { const c = expenseCats.find(x => x.id === cat); saveT.mutate({ budget_id: budgetId, category_id: cat, budget_class: (c?.default_class ?? "need") as "need", target_amount: Number(amt), user_id: "" }, { onSuccess: () => { setCat(""); setAmt(""); }, onError: err }); }}>Agregar</Button>
    </div>}
    <div className="mt-5 border-t border-border pt-4"><p className="text-xs font-semibold uppercase text-muted-foreground">Nueva categoría personalizada</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_150px_auto]"><Input maxLength={60} placeholder="Ej. Mascotas" value={newCat} onChange={e => setNewCat(e.target.value)} />
        <Select value={newClass} onValueChange={setNewClass}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="need">Sugerida: Necesidad</SelectItem><SelectItem value="want">Sugerida: Deseo</SelectItem><SelectItem value="future">Sugerida: Futuro</SelectItem></SelectContent></Select>
        <Button variant="outline" disabled={!newCat.trim()} onClick={() => saveC.mutate({ name: newCat.trim(), kind: "expense", default_class: newClass }, { onSuccess: () => { setNewCat(""); toast.success("Categoría creada"); }, onError: err })}>Crear</Button></div></div>
  </Panel>;
}

function FutureBreakdown({ period }: { period: string }) {
  const alloc = useAllocations(); const { start, end } = periodRange(period);
  const rows = Object.keys(FUTURE_DEST).map(k => ({ k, v: (alloc.data ?? []).filter(a => a.destination === k && a.alloc_date >= start && a.alloc_date < end).reduce((s, a) => s + Number(a.amount), 0) }));
  const total = rows.reduce((s, r) => s + r.v, 0);
  return <Panel title="Futuro financiero por destino">{total === 0 ? <Empty title="Sin aportaciones" text="Clasifica gastos como Futuro y elige su destino." /> :
    <div className="space-y-3">{rows.map(r => <div key={r.k}><div className="flex justify-between text-sm"><span>{FUTURE_DEST[r.k]}</span><b>{mxn(r.v)}</b></div><Progress value={(r.v / total) * 100} className="h-1.5" /></div>)}</div>}</Panel>;
}

function CloseMonthControls({ period, m }: { period: string; m: ReturnType<typeof useMonth> }) {
  const close = useCloseMonth(); const reopen = useReopenMonth();
  const [openClose, setOpenClose] = useState(false); const [openReopen, setOpenReopen] = useState(false);
  const [decision, setDecision] = useState("Futuro financiero"); const [reason, setReason] = useState("");
  const closed = m.budget.data?.status === "closed";
  const issues = qualityIssues((m.txs.data ?? []) as never, period);
  const unassigned = m.result?.unassigned ?? 0;
  if (period > currentPeriod()) return null;
  return <>
    {closed ? <Button size="sm" variant="outline" onClick={() => setOpenReopen(true)}><LockOpen />Reabrir mes</Button> : <Button size="sm" onClick={() => setOpenClose(true)}><Lock />Cerrar mes</Button>}
    <Dialog open={openClose} onOpenChange={setOpenClose}><DialogContent><DialogHeader><DialogTitle>Cerrar {periodLabel(period)}</DialogTitle></DialogHeader>
      {issues.length ? <div className="space-y-2"><p className="flex items-center gap-2 text-sm font-semibold text-destructive"><AlertTriangle className="size-4" />Cierre bloqueado</p><ul className="list-disc space-y-1 pl-5 text-sm">{issues.map(i => <li key={i}>{i}</li>)}</ul></div> :
        <div className="space-y-4 text-sm"><p>Se guardará una fotografía de ingreso, 50/30/20, cuentas, ahorro, cumplimiento y patrimonio. El denominador final será el ingreso real ({mxn(m.result?.income ?? 0)}).</p>
          {unassigned > 0 && <Field label={`Tienes ${mxn(unassigned)} disponibles sin asignar. ¿Qué destino tendrán?`}><Select value={decision} onValueChange={setDecision}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Futuro financiero", "Reservar para siguiente mes", "Corrección", "Otro destino"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Field>}
          <p className="text-xs text-muted-foreground">FinIA no moverá dinero automáticamente; sólo registra tu decisión.</p></div>}
      <DialogFooter><Button variant="ghost" onClick={() => setOpenClose(false)}>Cancelar</Button><Button disabled={!!issues.length || close.isPending} onClick={() => close.mutate({ period, decision: unassigned > 0 ? decision : undefined }, { onSuccess: () => { toast.success("Mes cerrado"); setOpenClose(false); }, onError: err })}>Confirmar cierre</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={openReopen} onOpenChange={setOpenReopen}><DialogContent><DialogHeader><DialogTitle>Reabrir {periodLabel(period)}</DialogTitle></DialogHeader>
      <Field label="Motivo de la modificación" hint="Queda registrado con fecha en la bitácora de cierres."><Textarea maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></Field>
      <DialogFooter><Button variant="ghost" onClick={() => setOpenReopen(false)}>Cancelar</Button><Button disabled={reason.trim().length < 5 || reopen.isPending} onClick={() => reopen.mutate({ period, reason: reason.trim() }, { onSuccess: () => { toast.success("Mes reabierto"); setOpenReopen(false); setReason(""); }, onError: err })}>Reabrir</Button></DialogFooter>
    </DialogContent></Dialog>
  </>;
}

export function HistoryPanel({ current }: { current?: { period: string; month: MonthResult } }) {
  const snaps = useSnapshots(); const log = useCloseLog(); const [range, setRange] = useState("6");
  const data = useMemo(() => {
    const rows = (snaps.data ?? []).map(s => ({ period: s.period, Necesidades: Number(s.needs_pct), Deseos: Number(s.wants_pct), Futuro: Number(s.future_pct), ahorro: Number(s.future_amount), closed: true }));
    if (current && !rows.some(r => r.period === current.period) && current.month.income > 0) {
      const g = current.month.groups; rows.push({ period: current.period, Necesidades: g[0]!.realPct, Deseos: g[1]!.realPct, Futuro: g[2]!.realPct, ahorro: current.month.future, closed: false });
    }
    return rows.sort((a, b) => a.period.localeCompare(b.period)).slice(-Number(range));
  }, [snaps.data, current, range]);
  const avg = data.filter(d => d.closed).length ? data.filter(d => d.closed).reduce((s, d) => s + d.ahorro, 0) / data.filter(d => d.closed).length : 0;
  return <Panel title="Evolución 50/30/20" action={<Select value={range} onValueChange={setRange}><SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Mes actual</SelectItem><SelectItem value="3">3 meses</SelectItem><SelectItem value="6">6 meses</SelectItem><SelectItem value="12">12 meses</SelectItem></SelectContent></Select>}>
    {snaps.isLoading ? <Skeleton className="h-56" /> : data.length === 0 ? <Empty title="Sin histórico todavía" text="Cierra tu primer mes para comenzar a ver tendencias." /> : <>
      <div className="h-56"><ResponsiveContainer><BarChart data={data.map(d => ({ ...d, label: periodLabel(d.period, true) + (d.closed ? "" : " *") }))}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} /><YAxis stroke="var(--muted-foreground)" fontSize={11} unit="%" /><Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="Necesidades" fill={GROUP_COLOR.need} /><Bar dataKey="Deseos" fill={GROUP_COLOR.want} /><Bar dataKey="Futuro" fill={GROUP_COLOR.future} /></BarChart></ResponsiveContainer></div>
      <p className="mt-2 text-xs text-muted-foreground">* Mes abierto (avance). Ahorro mensual real promedio de meses cerrados: <b className="text-foreground">{mxn(avg)}</b></p>
    </>}
    {(log.data ?? []).length > 0 && <div className="mt-4 border-t border-border pt-3"><p className="text-xs font-semibold uppercase text-muted-foreground">Bitácora de cierres</p><ul className="mt-2 space-y-1 text-xs">{log.data!.slice(0, 6).map(l => <li key={l.id}><b>{l.action}</b> · {periodLabel(l.period)} · {new Date(l.created_at).toLocaleString("es-MX")}{l.reason ? ` · ${l.reason}` : ""}</li>)}</ul></div>}
  </Panel>;
}

function MovementsTab({ txs, closed, onEdit, onNew, newLabel = "Nuevo movimiento", fixedType }: { txs: Tx[]; closed: boolean; onEdit: (t: Tx) => void; onNew: () => void; newLabel?: string; fixedType?: boolean }) {
  const accounts = useAccounts(); const categories = useCategories(); const del = useDeleteTransaction();
  const [fType, setFType] = useState("all"); const [fAcc, setFAcc] = useState("all"); const [fCat, setFCat] = useState("all"); const [fClass, setFClass] = useState("all");
  const [toDelete, setToDelete] = useState<Tx | null>(null);
  const accName = (id?: string | null) => accounts.data?.find(a => a.id === id)?.name ?? "—";
  const catName = (id?: string | null) => categories.data?.find(c => c.id === id)?.name ?? "—";
  const rows = txs.filter(t => (fType === "all" || t.tx_type === fType) && (fAcc === "all" || t.from_account_id === fAcc || t.to_account_id === fAcc) && (fCat === "all" || t.category_id === fCat) && (fClass === "all" || (t.budget_class ?? "none") === fClass));
  const sel = (v: string, s: (v: string) => void, ph: string, items: [string, string][]) => <Select value={v} onValueChange={s}><SelectTrigger className="h-9"><SelectValue placeholder={ph} /></SelectTrigger><SelectContent><SelectItem value="all">{ph}: todos</SelectItem>{items.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select>;
  const sign = (t: Tx) => t.tx_type === "income" || (t.tx_type === "adjustment" && t.adjustment_direction === "in") ? "+" : t.tx_type === "transfer" ? "⇄ " : "−";
  return <Panel title="Movimientos" action={<Button size="sm" onClick={onNew} disabled={closed}><Plus />{newLabel}</Button>}>
    <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {!fixedType && sel(fType, setFType, "Tipo", Object.entries(TX_TYPES))}
      {sel(fAcc, setFAcc, "Cuenta", (accounts.data ?? []).map(a => [a.id, a.name]))}
      {sel(fCat, setFCat, "Categoría", (categories.data ?? []).map(c => [c.id, c.name]))}
      {sel(fClass, setFClass, "Clasificación", Object.entries(CLASS_LABEL))}
    </div>
    {rows.length === 0 ? <Empty title="Sin movimientos" text="Registra tu primer movimiento del mes." action={!closed && <Button size="sm" onClick={onNew}><Plus />{newLabel}</Button>} /> :
      <div className="divide-y divide-border">{rows.map(t => <div key={t.id} className="grid grid-cols-[1fr_auto] items-center gap-3 py-3">
        <div className="min-w-0"><p className="truncate font-medium">{t.concept}{t.is_recurring && <span className="ml-2 text-xs text-muted-foreground">· recurrente</span>}</p>
          <p className="truncate text-xs text-muted-foreground">{t.tx_date} · {TX_TYPES[t.tx_type]} · {t.tx_type === "transfer" ? `${accName(t.from_account_id)} → ${accName(t.to_account_id)}` : accName(t.from_account_id ?? t.to_account_id)}{t.category_id ? ` · ${catName(t.category_id)}` : ""}{t.future_destination ? ` · ${FUTURE_DEST[t.future_destination]}` : ""}</p>
          {t.budget_class && <div className="mt-1"><StatusBadge tone={t.budget_class === "need" ? "info" : t.budget_class === "want" ? "warning" : t.budget_class === "future" ? "success" : "neutral"}>{CLASS_LABEL[t.budget_class]}</StatusBadge></div>}</div>
        <div className="flex items-center gap-1"><span className={cn("mr-2 font-display font-semibold", t.tx_type === "income" && "text-success")}>{sign(t)}{mxn(Number(t.amount))}</span>
          {!closed && <><Button size="icon" variant="ghost" aria-label="Editar" onClick={() => onEdit(t)}><Pencil className="size-4" /></Button><Button size="icon" variant="ghost" aria-label="Eliminar" onClick={() => setToDelete(t)}><Trash2 className="size-4" /></Button></>}</div>
      </div>)}</div>}
    <AlertDialog open={!!toDelete} onOpenChange={o => !o && setToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle><AlertDialogDescription>{toDelete?.concept} · {mxn(Number(toDelete?.amount ?? 0))}. Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => toast.success("Movimiento eliminado"), onError: err })}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </Panel>;
}

function AccountsTab() {
  const accounts = useAccounts(); const txs = useAllTransactions(); const save = useSaveAccount();
  const [editing, setEditing] = useState<Account | "new" | null>(null);
  const [f, setF] = useState({ name: "", account_type: "bank", institution: "", initial_balance: "0" });
  const start = (a: Account | "new") => { setEditing(a); setF(a === "new" ? { name: "", account_type: "bank", institution: "", initial_balance: "0" } : { name: a.name, account_type: a.account_type, institution: a.institution ?? "", initial_balance: String(a.initial_balance) }); };
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!f.name.trim()) return;
    save.mutate({ id: editing !== "new" ? editing?.id : undefined, values: { name: f.name.trim(), account_type: f.account_type, institution: f.institution.trim() || null, initial_balance: Number(f.initial_balance) || 0, currency: "MXN" } }, { onSuccess: () => { toast.success("Cuenta guardada"); setEditing(null); }, onError: err }); };
  if (accounts.isLoading) return <Skeleton className="h-48" />;
  if (accounts.error) return <ErrorBlock error={accounts.error} />;
  return <Panel title="Cuentas financieras" action={<Button size="sm" onClick={() => start("new")}><Plus />Nueva cuenta</Button>}>
    <p className="mb-4 text-xs text-muted-foreground">Cuentas manuales. No se conectan bancos ni se guardan contraseñas, PIN o CVV.</p>
    {(accounts.data ?? []).length === 0 ? <Empty title="Sin cuentas" text="Crea tu primera cuenta, por ejemplo “BBVA Nómina”." action={<Button size="sm" onClick={() => start("new")}><Plus />Nueva cuenta</Button>} /> :
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{accounts.data!.map(a => <div key={a.id} className={cn("rounded-md border border-border bg-surface p-4", !a.active && "opacity-60")}>
        <div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{a.name}</p><p className="text-xs text-muted-foreground">{ACCOUNT_TYPES[a.account_type]}{a.institution ? ` · ${a.institution}` : ""} · {a.currency}</p></div><StatusBadge tone={a.active ? "success" : "neutral"}>{a.active ? "Activa" : "Inactiva"}</StatusBadge></div>
        <p className="mt-3 text-xs uppercase text-muted-foreground">{a.account_type === "credit_card" ? "Deuda actual" : "Saldo calculado"}</p>
        <p className={cn("font-display text-xl font-semibold", a.account_type === "credit_card" && "text-destructive")}>{mxn(accountBalance(a, txs.data ?? []))}</p>
        <p className="text-xs text-muted-foreground">Saldo inicial {mxn(Number(a.initial_balance))}</p>
        <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => start(a)}>Editar</Button><Button size="sm" variant="ghost" onClick={() => save.mutate({ id: a.id, values: { name: a.name, account_type: a.account_type, active: !a.active } }, { onError: err })}>{a.active ? "Desactivar" : "Activar"}</Button></div>
      </div>)}</div>}
    <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}><DialogContent><DialogHeader><DialogTitle>{editing === "new" ? "Nueva cuenta" : "Editar cuenta"}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Nombre"><Input required maxLength={80} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="BBVA Nómina" /></Field>
        <Field label="Tipo"><Select value={f.account_type} onValueChange={v => setF({ ...f, account_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ACCOUNT_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Institución (opcional)"><Input maxLength={80} value={f.institution} onChange={e => setF({ ...f, institution: e.target.value })} /></Field>
        <Field label={f.account_type === "credit_card" ? "Deuda inicial" : "Saldo inicial"}><Input type="number" step="0.01" value={f.initial_balance} onChange={e => setF({ ...f, initial_balance: e.target.value })} /></Field>
        <DialogFooter><Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit" disabled={save.isPending}>Guardar</Button></DialogFooter>
      </form></DialogContent></Dialog>
  </Panel>;
}

function NetWorthTab() {
  const accounts = useAccounts(); const txs = useAllTransactions(); const profile = useProfile();
  if (accounts.isLoading || txs.isLoading) return <Skeleton className="h-48" />;
  const list = (accounts.data ?? []).map(a => ({ a, b: accountBalance(a, txs.data ?? []) }));
  const assets = list.filter(x => x.a.account_type !== "credit_card"); const liabilities = list.filter(x => x.a.account_type === "credit_card");
  const ta = assets.reduce((s, x) => s + x.b, 0); const tl = liabilities.reduce((s, x) => s + x.b, 0);
  const block = (title: string, rows: typeof list, total: number) => <Panel title={title}>{rows.length === 0 ? <p className="text-sm text-muted-foreground">Sin registros.</p> : <div className="space-y-2">{rows.map(x => <div key={x.a.id} className="flex justify-between text-sm"><span>{x.a.name}</span><b>{mxn(x.b)}</b></div>)}</div>}<div className="mt-4 flex justify-between border-t border-border pt-3 font-semibold"><span>Total</span><span>{mxn(total)}</span></div></Panel>;
  return <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2">{block("Activos", assets, ta)}{block("Pasivos", liabilities, tl)}</div>
    <Panel className="border-primary/40 bg-primary/5"><p className="text-xs font-semibold uppercase text-primary">Patrimonio neto</p><p className="mt-2 font-display text-4xl font-semibold">{mxn(ta - tl)}</p><p className="mt-1 text-xs text-muted-foreground">Calculado desde tus cuentas. Patrimonio declarado en onboarding: {mxn(Number(profile.data?.initial_net_worth ?? 0))}</p></Panel>
  </div>;
}

// ================= Dashboard =================
export function DashboardScreen() {
  const period = currentPeriod(); const m = useMonth(period); const profile = useProfile(); const snaps = useSnapshots();
  const recent = (snaps.data ?? []).slice(-6); const avgSaving = recent.length ? recent.reduce((s, x) => s + Number(x.future_amount), 0) / recent.length : 0;
  const age = profile.data?.birth_date ? Math.floor((Date.now() - new Date(profile.data.birth_date).getTime()) / 3.15576e10) : null;
  const target = profile.data?.target_age ?? 50;
  return <>
    <PageHeader title="Inicio" description={`Hola${profile.data?.full_name ? `, ${profile.data.full_name.split(" ")[0]}` : ""}. Tu situación financiera de ${periodLabel(period).toLowerCase()}.`} />
    {m.error ? <ErrorBlock error={m.error} /> : m.isLoading || !m.result ? <LoadingBlock /> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Ingreso del mes" value={mxn(m.result.income)} detail={`Esperado ${mxn(m.result.expectedIncome)}`} tone="info" />
        <KpiCard label="Flujo disponible" value={mxn(m.result.flow)} detail="Ingresos − egresos" tone={m.result.flow >= 0 ? "success" : "destructive"} />
        <KpiCard label="Futuro financiero" value={mxn(m.result.future)} detail={`Tasa de ahorro ${m.result.savingsRate.toFixed(1)}%`} tone="success" />
        <KpiCard label="Meta Retiro 50" value={`${target} años`} detail={age !== null ? `Faltan ${Math.max(0, target - age)} años` : "Completa tu fecha de nacimiento"} tone="warning" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_.6fr]">
        <BudgetCard month={m.result} period={period} />
        <Panel className="border-primary/40 bg-primary/5"><p className="text-xs font-semibold uppercase text-primary">Retiro {target}</p>
          <p className="mt-4 text-sm text-muted-foreground">Ahorro mensual real promedio</p><p className="font-display text-3xl font-semibold">{mxn(avgSaving)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{recent.length ? `Basado en ${recent.length} mes(es) cerrado(s).` : "Cierra tu primer mes para calcular un promedio real."}</p>
          <Button asChild className="mt-6 w-full"><Link to="/retiro-50">Ver simulador<ArrowRight /></Link></Button></Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2"><Panel title="Distribución del mes"><Distribution month={m.result} /></Panel>
        <Panel title="Alertas">{(() => { const a = alerts(m.result!, m.rule); return a.length ? <ul className="space-y-3 text-sm">{a.map(x => <li key={x.text}>• {x.text}</li>)}</ul> : <Empty title="Sin alertas" text="Registra movimientos para ver avisos del mes." action={<Button asChild size="sm"><Link to="/finanzas">Ir a Mis Finanzas</Link></Button>} />; })()}</Panel></div>
      <HistoryPanel current={{ period, month: m.result }} />
    </>}
  </>;
}
