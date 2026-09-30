# PRD-02 — Finanzas reales + Motor 50/30/20

Convertir Mis Finanzas y el Dashboard en datos reales guardados por usuario, con presupuesto mensual 50/30/20, cierre de mes e histórico. Sin IA ni conexiones externas.

## Qué verá el usuario
- **Onboarding** que guarda perfil, ingreso esperado, patrimonio inicial y regla presupuestal; al entrar sin onboarding completo se redirige a él.
- **Mis Finanzas** con pestañas: Resumen, Presupuesto 50/30/20, Movimientos, Ingresos, Gastos, Cuentas, Patrimonio.
- **Cuentas manuales**: alta, edición, desactivación, saldo inicial y saldo calculado.
- **Movimientos**: ingreso, gasto, transferencia (excluida del 50/30/20), ajuste; filtros por mes, cuenta, categoría, clasificación y tipo; editar/eliminar solo con mes abierto.
- **Gasto** con categoría + clasificación (Necesidad / Deseo / Futuro / Pendiente); si es Futuro, destino (Seguridad, Crecimiento, Retiro, Trading, Deuda extraordinaria).
- **Aviso no bloqueante** antes de registrar un gasto que supere el objetivo ("Cancelar" / "Registrar de todas formas").
- **Presupuesto mensual**: ingreso esperado vs real (diferencia visible), plan/real/% /variación por bolsa, vista "Contra plan" y "Contra real" (avance del mes), estados En objetivo / Cerca del límite / Sobre objetivo (Futuro inverso), disponible sin asignar, alertas matemáticas, presupuestos por categoría opcionales.
- **Regla personalizable** (debe sumar 100%) y regla secundaria del Futuro, en Configuración.
- **Categorías** del sistema + personalizadas con clasificación sugerida.
- **Cierre de mes**: revisión de calidad (sin clasificar, sin cuenta, sin categoría, transferencias incompletas) que bloquea; snapshot congelado con ingreso real como denominador; reabrir con motivo; bitácora CLOSE/REOPEN/RECLOSE.
- **Evolución**: histórico 50/30/20 y ahorro mensual real (1/3/6/12 meses).
- **Dashboard**: KPIs reales (ingreso del mes, flujo, futuro, tasa de ahorro, Retiro 50) y tarjeta "Mi presupuesto". Estados vacíos claros cuando aún no hay datos.
- Colores: Necesidades azul, Deseos ámbar, Futuro verde, Pendiente gris, Sobre límite rojo, siempre con texto.

## Detalles técnicos
- Migración: `profiles`, `financial_accounts`, `transaction_categories` (sistema con user_id nulo + personalizadas), `income_sources`, `transactions` (type, budget_class, future_destination, from/to account, status), `budget_rules`, `future_allocation_rules`, `monthly_budgets` (period, expected_income, rule %, status), `monthly_budget_targets` (por categoría), `monthly_budget_snapshots`, `monthly_close_log`, `future_allocations`. RLS por `auth.uid()` en todo, GRANTs, trigger que impide modificar movimientos de un mes cerrado, trigger de perfil al registrarse, seed de categorías del sistema.
- Motor puro y determinístico en `src/lib/budget-engine.ts` con pruebas vitest para los 7 casos del PRD.
- Acceso a datos vía cliente autenticado del navegador + TanStack Query (`src/lib/finance-queries.ts`); cierre de mes en una función de servidor autenticada que valida calidad y escribe snapshot + bitácora.
- `finia-data.ts` deja de alimentar Dashboard y Mis Finanzas (se conserva solo para módulos aún demo: Trading, Academia, etc.).
- AGENTS.md: actualizar regla de datos (Cloud es fuente de verdad para finanzas).
