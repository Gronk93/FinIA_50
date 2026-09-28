import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, CircleCheck, CircleX, LoaderCircle, SearchX } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4"><div className="min-w-0"><h1 className="truncate text-2xl font-semibold text-foreground md:text-3xl">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>{action}</div>;
}

export function Panel({ children, className, title, action }: { children: ReactNode; className?: string; title?: string; action?: ReactNode }) {
  return <section className={cn("rounded-lg border border-border bg-card", className)}>{title && <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-5 py-4"><h2 className="truncate text-base font-semibold">{title}</h2>{action}</header>}<div className="p-5">{children}</div></section>;
}

const toneClasses = { success: "text-success", warning: "text-warning", info: "text-info", primary: "text-primary", destructive: "text-destructive" } as const;
export function KpiCard({ label, value, detail, tone = "primary", progress }: { label: string; value: string; detail: string; tone?: keyof typeof toneClasses; progress?: number }) {
  const positive = detail.startsWith("+");
  return <Panel><p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p><p className="mt-3 font-display text-2xl font-semibold">{value}</p><div className={cn("mt-2 flex items-center gap-1 text-xs", toneClasses[tone])}>{positive ? <ArrowUpRight className="size-3" /> : tone === "destructive" ? <ArrowDownRight className="size-3" /> : null}<span>{detail}</span></div>{progress !== undefined && <Progress value={progress} className="mt-3 h-1.5" />}</Panel>;
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "info" | "ai" | "neutral" }) {
  const styles = { success: "bg-success/10 text-success", warning: "bg-warning/10 text-warning", danger: "bg-destructive/10 text-destructive", info: "bg-info/10 text-info", ai: "bg-ai/10 text-ai", neutral: "bg-muted text-muted-foreground" };
  return <span className={cn("inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold uppercase", styles[tone])}>{children}</span>;
}

export function ViewState({ type }: { type: "loading" | "empty" | "error" | "success" }) {
  const state = { loading: [LoaderCircle, "Cargando información", "Estamos preparando tus datos."], empty: [SearchX, "Sin información todavía", "Agrega tu primer registro para comenzar."], error: [CircleX, "No pudimos cargar esta vista", "Intenta nuevamente en unos momentos."], success: [CircleCheck, "Cambios guardados", "Tu información se actualizó correctamente."] } as const;
  const [Icon, title, text] = state[type];
  return <div className="grid min-h-48 place-items-center text-center"><div><Icon className={cn("mx-auto size-7", type === "loading" && "animate-spin", type === "error" ? "text-destructive" : "text-primary")} /><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{text}</p></div></div>;
}

export function MiniBars({ values, tone = "primary" }: { values: number[]; tone?: "primary" | "success" | "warning" }) {
  const colors = { primary: "bg-primary", success: "bg-success", warning: "bg-warning" };
  return <div className="flex h-28 items-end gap-2">{values.map((v, i) => <div key={i} className="flex-1 rounded-t bg-muted"><div className={cn("w-full rounded-t opacity-80", colors[tone])} style={{ height: `${v}%` }} /></div>)}</div>;
}

export function FinancialTable({ headers, rows, onRowClick }: { headers: string[]; rows: string[][]; onRowClick?: (index: number) => void }) {
  return <><div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border text-xs uppercase text-muted-foreground">{headers.map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i} onClick={() => onRowClick?.(i)} onKeyDown={e => { if (onRowClick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onRowClick(i); } }} tabIndex={onRowClick ? 0 : undefined} className={cn("border-b border-border/70 last:border-0", onRowClick && "cursor-pointer hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary")}>{row.map((cell, j) => <td key={j} className={cn("px-4 py-4", j === row.length - 1 && "font-semibold")}>{cell}</td>)}</tr>)}</tbody></table></div><div className="grid gap-3 md:hidden">{rows.map((row, i) => <div key={i} onClick={() => onRowClick?.(i)} onKeyDown={e => { if (onRowClick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onRowClick(i); } }} tabIndex={onRowClick ? 0 : undefined} className={cn("rounded-md border border-border bg-surface p-4", onRowClick && "cursor-pointer focus-visible:outline-2 focus-visible:outline-primary")}>{row.map((cell, j) => <div key={j} className="grid grid-cols-2 gap-3 py-1.5 text-sm"><span className="text-muted-foreground">{headers[j]}</span><span className="text-right font-medium">{cell}</span></div>)}</div>)}</div></>;
}