import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BASE_RULE, isValidRule, mxn } from "@/lib/budget-engine";
import { FUTURE_DEST, useFutureRule, useProfile, useRule, useSaveFutureRule, useSaveProfile, useSaveRule } from "@/lib/finance-queries";
import { supabase } from "@/integrations/supabase/client";
import { Panel, StatusBadge } from "./primitives";

const err = (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo guardar");
function Field({ label, children }: { label: string; children: ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }

export function ProfileSettings() {
  const profile = useProfile(); const save = useSaveProfile();
  const [email, setEmail] = useState("");
  const [f, setF] = useState({ full_name: "", birth_date: "", country: "MX", currency: "MXN", target_age: "50", expected_income: "0" });
  useEffect(() => { void supabase.auth.getUser().then(({ data }) => { setEmail(data.user?.email ?? ""); }); }, []);
  useEffect(() => { const p = profile.data; if (p) setF({ full_name: p.full_name ?? "", birth_date: p.birth_date ?? "", country: p.country ?? "MX", currency: p.currency, target_age: String(p.target_age), expected_income: String(p.expected_income) }); }, [profile.data]);
  if (profile.isLoading) return <Skeleton className="h-64" />;
  const submit = (e: React.FormEvent): void => { e.preventDefault();
    const age = Number(f.target_age); if (age < 18 || age > 100) { toast.error("La edad objetivo debe estar entre 18 y 100."); return; }
    save.mutate({ full_name: f.full_name.trim().slice(0, 100) || null, birth_date: f.birth_date || null, country: f.country, currency: f.currency, target_age: age, expected_income: Math.max(0, Number(f.expected_income) || 0) }, { onSuccess: () => toast.success("Perfil guardado"), onError: err }); };
  return <Panel title="Perfil"><form onSubmit={submit} className="grid max-w-2xl gap-4 sm:grid-cols-2">
    <Field label="Nombre"><Input maxLength={100} value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} /></Field>
    <Field label="Correo"><Input value={email} readOnly /></Field>
    <Field label="Fecha de nacimiento"><Input type="date" value={f.birth_date} onChange={e => setF({ ...f, birth_date: e.target.value })} /></Field>
    <Field label="País"><Select value={f.country} onValueChange={v => setF({ ...f, country: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MX">México</SelectItem><SelectItem value="US">Estados Unidos</SelectItem></SelectContent></Select></Field>
    <Field label="Moneda"><Select value={f.currency} onValueChange={v => setF({ ...f, currency: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MXN">MXN — Peso mexicano</SelectItem><SelectItem value="USD">USD — Dólar</SelectItem></SelectContent></Select></Field>
    <Field label="Edad objetivo"><Input type="number" min={18} max={100} value={f.target_age} onChange={e => setF({ ...f, target_age: e.target.value })} /></Field>
    <Field label="Ingreso mensual esperado"><Input type="number" min={0} value={f.expected_income} onChange={e => setF({ ...f, expected_income: e.target.value })} /></Field>
    <div className="flex items-end"><Button type="submit" disabled={save.isPending}>Guardar perfil</Button></div>
  </form><p className="mt-4 text-xs text-muted-foreground">El ingreso esperado se usa para crear el presupuesto de los meses nuevos.</p></Panel>;
}

export function BudgetRuleSettings() {
  const rule = useRule(); const saveRule = useSaveRule(); const fr = useFutureRule(); const saveFr = useSaveFutureRule();
  const [r, setR] = useState({ needs: "50", wants: "30", future: "20" });
  const [fut, setFut] = useState<Record<string, string>>({ security: "50", growth: "40", retirement: "0", trading: "10", debt: "0" });
  useEffect(() => { if (rule.data) setR({ needs: String(rule.data.needs_pct), wants: String(rule.data.wants_pct), future: String(rule.data.future_pct) }); }, [rule.data]);
  useEffect(() => { const d = fr.data; if (d) setFut({ security: String(d.security_pct), growth: String(d.growth_pct), retirement: String(d.retirement_pct), trading: String(d.trading_pct), debt: String(d.debt_pct) }); }, [fr.data]);
  if (rule.isLoading || fr.isLoading) return <Skeleton className="h-64" />;
  const parsed = { needs: Number(r.needs), wants: Number(r.wants), future: Number(r.future) };
  const sum = parsed.needs + parsed.wants + parsed.future; const valid = isValidRule(parsed);
  const futSum = Object.values(fut).reduce((s, v) => s + Number(v || 0), 0);
  return <div className="grid gap-4 lg:grid-cols-2">
    <Panel title="Regla presupuestal">
      <p className="text-sm text-muted-foreground">Necesidades y Deseos son techos (≤); Futuro es un piso (≥). Aplica a meses nuevos; los meses existentes conservan su regla.</p>
      <div className="mt-4 grid grid-cols-3 gap-3">{([["needs", "Necesidades ≤"], ["wants", "Deseos ≤"], ["future", "Futuro ≥"]] as const).map(([k, l]) => <Field key={k} label={l}><Input type="number" min={0} max={100} value={r[k]} onChange={e => setR({ ...r, [k]: e.target.value })} /></Field>)}</div>
      <div className="mt-3 flex items-center gap-2 text-sm">Suma: <b>{sum}%</b>{valid ? <StatusBadge tone="success">Válida</StatusBadge> : <StatusBadge tone="danger">Debe sumar 100%</StatusBadge>}</div>
      <p className="mt-2 text-xs text-muted-foreground">Ejemplo sobre {mxn(30000)}: {mxn(30000 * parsed.needs / 100)} / {mxn(30000 * parsed.wants / 100)} / {mxn(30000 * parsed.future / 100)}</p>
      <div className="mt-4 flex gap-2"><Button disabled={!valid || saveRule.isPending} onClick={() => saveRule.mutate(parsed, { onSuccess: () => toast.success("Regla guardada"), onError: err })}>Guardar regla</Button>
        <Button variant="ghost" onClick={() => setR({ needs: String(BASE_RULE.needs), wants: String(BASE_RULE.wants), future: String(BASE_RULE.future) })}>Restablecer 50/30/20</Button></div>
    </Panel>
    <Panel title="Regla secundaria del Futuro">
      <p className="text-sm text-muted-foreground">Cómo te gustaría repartir tu Futuro financiero. Sólo se guarda como referencia; FinIA no mueve dinero.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{Object.entries(FUTURE_DEST).map(([k, l]) => <Field key={k} label={`${l} %`}><Input type="number" min={0} max={100} value={fut[k]} onChange={e => setFut({ ...fut, [k]: e.target.value })} /></Field>)}</div>
      <div className="mt-3 flex items-center gap-2 text-sm">Suma: <b>{futSum}%</b>{futSum === 100 ? <StatusBadge tone="success">Válida</StatusBadge> : <StatusBadge tone="danger">Debe sumar 100%</StatusBadge>}</div>
      <Button className="mt-4" disabled={futSum !== 100 || saveFr.isPending} onClick={() => saveFr.mutate({ security_pct: Number(fut["security"]), growth_pct: Number(fut["growth"]), retirement_pct: Number(fut["retirement"]), trading_pct: Number(fut["trading"]), debt_pct: Number(fut["debt"]) }, { onSuccess: () => toast.success("Distribución guardada"), onError: err })}>Guardar distribución</Button>
    </Panel>
  </div>;
}
