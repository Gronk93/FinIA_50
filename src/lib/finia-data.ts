export const money = (value: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value);

export const dashboardKpis = [
  { label: "Patrimonio", value: "$325,000", detail: "+2.4% este mes", tone: "success" },
  { label: "Flujo disponible", value: "$8,500", detail: "por mes", tone: "info" },
  { label: "Capital invertido", value: "$72,500", detail: "22.3% del patrimonio", tone: "primary" },
  { label: "Meta Retiro 50", value: "31%", detail: "En progreso", tone: "warning", progress: 31 },
] as const;

export const transactions = [
  { date: "24 Sep 2026", concept: "Nómina", category: "Ingreso", type: "Recurrente", amount: "+$30,000" },
  { date: "22 Sep 2026", concept: "Renta", category: "Vivienda", type: "Fijo", amount: "-$9,500" },
  { date: "18 Sep 2026", concept: "Supermercado", category: "Alimentos", type: "Variable", amount: "-$3,240" },
  { date: "15 Sep 2026", concept: "Aportación ETF", category: "Inversión", type: "Ahorro", amount: "-$4,000" },
];

export const holdings = [
  { asset: "S&P 500 ETF", ticker: "VOO", qty: "14", price: "$5,020", value: "$70,280", result: "+8.4%" },
  { asset: "Microsoft", ticker: "MSFT", qty: "3", price: "$7,180", value: "$21,540", result: "+4.1%" },
  { asset: "Fibra Uno", ticker: "FUNO11", qty: "120", price: "$24.50", value: "$2,940", result: "-1.2%" },
];

export const trades = [
  { date: "24 Sep", asset: "NASDAQ", setup: "Ruptura + retest", direction: "LONG", rr: "3.0", result: "+2.4R", status: "Cerrada" },
  { date: "22 Sep", asset: "EURUSD", setup: "Reversión", direction: "SHORT", rr: "2.2", result: "-1.0R", status: "Cerrada" },
  { date: "20 Sep", asset: "NVDA", setup: "Continuación", direction: "LONG", rr: "2.8", result: "—", status: "Abierta" },
];

export const courses = [
  { category: "Finanzas personales", title: "Controla tu flujo mensual", level: "Inicial", progress: 72, duration: "1 h 20 min" },
  { category: "Ahorro", title: "Construye tu fondo de seguridad", level: "Inicial", progress: 55, duration: "55 min" },
  { category: "Inversión", title: "Portafolios con propósito", level: "Intermedio", progress: 20, duration: "2 h 10 min" },
  { category: "Trading", title: "Pensar en probabilidades", level: "Intermedio", progress: 35, duration: "1 h 45 min" },
  { category: "Psicología", title: "Decisiones bajo presión", level: "Intermedio", progress: 0, duration: "1 h" },
  { category: "Libertad financiera", title: "Diseña tu número de libertad", level: "Avanzado", progress: 10, duration: "2 h 30 min" },
];