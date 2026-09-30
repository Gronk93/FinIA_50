import { describe, expect, it } from "vitest";
import { BASE_RULE, computeMonth, accountBalance, qualityIssues, type EngineTx } from "./budget-engine";

const inc = (a: number): EngineTx => ({ tx_type: "income", amount: a });
const exp = (a: number, c: EngineTx["budget_class"]): EngineTx => ({ tx_type: "expense", amount: a, budget_class: c });

describe("motor 50/30/20", () => {
  it("Caso 1 — exacto", () => {
    const m = computeMonth([inc(30000), exp(15000, "need"), exp(9000, "want"), exp(6000, "future")], 30000, BASE_RULE);
    expect(m.groups.map(g => g.realPct)).toEqual([50, 30, 20]);
    expect(m.plan).toEqual({ need: 15000, want: 9000, future: 6000 });
    expect(m.groups[2]!.status).toBe("goal_met");
  });
  it("Caso 2 — mejor que objetivo es favorable", () => {
    const m = computeMonth([inc(100), exp(40, "need"), exp(20, "want"), exp(40, "future")], 100, BASE_RULE);
    expect(m.groups.map(g => g.status)).toEqual(["on_target", "on_target", "above_goal"]);
  });
  it("Caso 3 — deseos excedidos, futuro debajo", () => {
    const m = computeMonth([inc(100), exp(48, "need"), exp(37, "want"), exp(15, "future")], 100, BASE_RULE);
    expect(m.groups[1]!.status).toBe("over");
    expect(m.groups[2]!.status).toBe("below_goal");
  });
  it("Caso 4 — transferencia no es gasto", () => {
    const m = computeMonth([inc(30000), { tx_type: "transfer", amount: 10000 }], 30000, BASE_RULE);
    expect(m.outflow).toBe(0);
    expect(m.flow).toBe(30000);
  });
  it("Caso 5 — deuda: mínimo necesidad, extraordinario futuro", () => {
    const m = computeMonth([inc(30000), exp(1500, "need"), exp(2000, "future")], 30000, BASE_RULE);
    expect(m.need).toBe(1500);
    expect(m.future).toBe(2000);
  });
  it("Caso 6 — ingreso variable usa el real como denominador", () => {
    const m = computeMonth([inc(35000), exp(17500, "need")], 30000, BASE_RULE);
    expect(m.groups[0]!.realPct).toBe(50);
    expect(m.incomeDiff).toBe(5000);
  });
  it("Caso 7 — pendientes bloquean cierre", () => {
    const issues = qualityIssues([{ tx_type: "expense", amount: 100, budget_class: "pending", tx_date: "2026-10-05", category_id: "c", from_account_id: "a" }], "2026-10");
    expect(issues[0]).toMatch(/pendientes de clasificar/);
  });
  it("sin asignar no cuenta como ahorro", () => {
    const m = computeMonth([inc(30000), exp(14000, "need"), exp(7000, "want"), exp(6000, "future")], 30000, BASE_RULE);
    expect(m.unassigned).toBe(3000);
    expect(m.savingsRate).toBe(20);
  });
  it("saldo de tarjeta de crédito es deuda", () => {
    const card = { id: "c", account_type: "credit_card", initial_balance: 1000 };
    expect(accountBalance(card, [{ from_account_id: "c", amount: 500 }, { to_account_id: "c", amount: 300 }])).toBe(1200);
  });
});
