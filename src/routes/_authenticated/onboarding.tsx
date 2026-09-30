import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSaveProfile, useSaveRule } from "@/lib/finance-queries";
import { isValidRule } from "@/lib/budget-engine";

export const Route = createFileRoute("/_authenticated/onboarding")({ head: () => ({ meta: [{ title: "Primera entrada — FinIA 50" }, { name: "description", content: "Configura tu perfil financiero inicial en FinIA 50." }, { property: "og:title", content: "Bienvenido a FinIA 50" }, { property: "og:description", content: "Prepara tu espacio financiero personal." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: Onboarding });

const interests = ["Finanzas personales", "Ahorro", "Inversión", "Trading", "Libertad financiera", "Educación financiera"];

function Onboarding() {
  const [step, setStep] = useState(1); const navigate = useNavigate(); const formRef = useRef<HTMLDivElement>(null);
  const saveProfile = useSaveProfile(); const saveRule = useSaveRule();
  const [d, setD] = useState({ full_name: "", birth_date: "", country: "MX", currency: "MXN", target_age: "50", expected_income: "", approx_expenses: "", savings: "", net_worth: "", needs: "50", wants: "30", future: "20" });
  const [picked, setPicked] = useState<string[]>(interests);
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [k]: e.target.value });
  const rule = { needs: Number(d.needs), wants: Number(d.wants), future: Number(d.future) };

  const finish = async () => {
    try {
      if (rule.needs !== 50 || rule.wants !== 30 || rule.future !== 20) await saveRule.mutateAsync(rule);
      await saveProfile.mutateAsync({ full_name: d.full_name.trim().slice(0, 100), birth_date: d.birth_date, country: d.country, currency: d.currency, target_age: Number(d.target_age), expected_income: Number(d.expected_income), approx_expenses: Number(d.approx_expenses), initial_net_worth: Number(d.net_worth), interests: picked, onboarding_completed: true });
      setStep(6);
    } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo guardar"); }
  };
  const next = (): void => {
    if (formRef.current) for (const input of formRef.current.querySelectorAll("input")) if (!input.reportValidity()) return;
    if (step === 4 && picked.length === 0) { toast.error("Selecciona al menos un interés."); return; }
    if (step === 5) { if (!isValidRule(rule)) { toast.error("La regla debe sumar 100%."); return; } void finish(); return; }
    if (step === 6) { void navigate({ to: "/dashboard" }); return; }
    setStep(step + 1);
  };
  const busy = saveProfile.isPending || saveRule.isPending;

  return <div className="mx-auto max-w-3xl py-8">
    <div className="mb-8 text-center"><p className="text-sm font-medium text-primary">Configuración inicial</p><h1 className="mt-2 text-3xl font-semibold">Bienvenido a FinIA 50</h1>
      <p className="mt-2 text-muted-foreground">{step <= 5 ? `Paso ${step} de 5 · Podrás editar estos datos después.` : "Listo"}</p><Progress value={Math.min(step, 5) * 20} className="mx-auto mt-5 max-w-md" /></div>
    <div ref={formRef} className="rounded-lg border border-border bg-card p-6 md:p-8">
      {step === 1 && <div><h2 className="text-xl font-semibold">Tú</h2><div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Nombre"><Input placeholder="Tu nombre" maxLength={100} required value={d.full_name} onChange={set("full_name")} /></Field>
        <Field label="Fecha de nacimiento"><Input type="date" required value={d.birth_date} max={new Date().toISOString().slice(0, 10)} onChange={set("birth_date")} /></Field>
        <Field label="País"><Select value={d.country} onValueChange={v => setD({ ...d, country: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MX">México</SelectItem><SelectItem value="US">Estados Unidos</SelectItem></SelectContent></Select></Field>
        <Field label="Moneda"><Select value={d.currency} onValueChange={v => setD({ ...d, currency: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MXN">MXN — Peso mexicano</SelectItem><SelectItem value="USD">USD — Dólar</SelectItem></SelectContent></Select></Field>
      </div></div>}
      {step === 2 && <div className="text-center"><h2 className="text-xl font-semibold">Tu objetivo</h2><p className="mt-2 text-muted-foreground">¿A qué edad quieres alcanzar independencia financiera?</p>
        <Input type="number" value={d.target_age} onChange={set("target_age")} min="18" max="100" required className="mx-auto mt-8 h-20 max-w-40 text-center font-display text-4xl font-semibold" /></div>}
      {step === 3 && <div><h2 className="text-xl font-semibold">Situación actual</h2><div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Ingreso mensual esperado (neto)"><Input type="number" min="0" required value={d.expected_income} onChange={set("expected_income")} /></Field>
        <Field label="Gasto mensual aproximado"><Input type="number" min="0" required value={d.approx_expenses} onChange={set("approx_expenses")} /></Field>
        <Field label="Ahorro actual"><Input type="number" min="0" required value={d.savings} onChange={set("savings")} /></Field>
        <Field label="Patrimonio aproximado"><Input type="number" required value={d.net_worth} onChange={set("net_worth")} /></Field>
      </div></div>}
      {step === 4 && <div><h2 className="text-xl font-semibold">Perfil de uso</h2><p className="mt-2 text-sm text-muted-foreground">Selecciona tus intereses. No modifica tus permisos.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">{interests.map(x => <label key={x} className="flex items-center gap-3 rounded-md border border-border bg-surface p-4"><Checkbox checked={picked.includes(x)} onCheckedChange={c => setPicked(p => c ? [...p, x] : p.filter(y => y !== x))} /><span>{x}</span></label>)}</div></div>}
      {step === 5 && <div><h2 className="text-xl font-semibold">Regla presupuestal</h2><p className="mt-2 text-sm text-muted-foreground">Necesidades ≤, Deseos ≤, Futuro financiero ≥. Debe sumar 100%.</p>
        <div className="mt-6 grid grid-cols-3 gap-4"><Field label="Necesidades"><Input type="number" min="0" max="100" required value={d.needs} onChange={set("needs")} /></Field><Field label="Deseos"><Input type="number" min="0" max="100" required value={d.wants} onChange={set("wants")} /></Field><Field label="Futuro"><Input type="number" min="0" max="100" required value={d.future} onChange={set("future")} /></Field></div>
        <p className="mt-3 text-sm">Suma: <b>{rule.needs + rule.wants + rule.future}%</b></p></div>}
      {step === 6 && <div className="py-10 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-success/15 text-success"><Check className="size-7" /></span><h2 className="mt-5 text-2xl font-semibold">Tu espacio FinIA está listo.</h2><p className="mx-auto mt-2 max-w-md text-muted-foreground">Crea tus cuentas y registra tus movimientos en Mis Finanzas.</p></div>}
      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1 || step === 6}><ChevronLeft />Anterior</Button>
        <Button onClick={next} disabled={busy}>{step === 6 ? "Ir a mi Dashboard" : step === 5 ? (busy ? "Guardando…" : "Guardar y terminar") : "Continuar"}<ChevronRight /></Button>
      </div>
    </div>
  </div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
