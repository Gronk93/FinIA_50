
CREATE OR REPLACE FUNCTION public.close_month(_period text, _unassigned_decision text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid(); b monthly_budgets; start_d date; end_d date;
  inc numeric; nd numeric; wt numeric; fu numeric; pend int; bad int; unas numeric;
  np numeric; wp numeric; fp numeric; accs jsonb; nw numeric; had_close boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT * INTO b FROM monthly_budgets WHERE user_id = uid AND period = _period;
  IF b.id IS NULL THEN RAISE EXCEPTION 'No existe presupuesto para %', _period; END IF;
  IF b.status = 'closed' THEN RAISE EXCEPTION 'El mes ya está cerrado'; END IF;
  start_d := to_date(_period || '-01','YYYY-MM-DD'); end_d := (start_d + interval '1 month')::date;

  SELECT count(*) INTO pend FROM transactions WHERE user_id = uid AND status='posted' AND tx_date >= start_d AND tx_date < end_d
    AND tx_type = 'expense' AND (budget_class IS NULL OR budget_class = 'pending');
  IF pend > 0 THEN RAISE EXCEPTION 'Tienes movimientos pendientes de clasificar.'; END IF;
  SELECT count(*) INTO bad FROM transactions WHERE user_id = uid AND status='posted' AND tx_date >= start_d AND tx_date < end_d AND (
    (tx_type = 'income' AND to_account_id IS NULL) OR (tx_type = 'expense' AND (category_id IS NULL OR from_account_id IS NULL)) OR
    (tx_type = 'transfer' AND (from_account_id IS NULL OR to_account_id IS NULL OR from_account_id = to_account_id)) OR
    (tx_type = 'future_allocation' AND future_destination IS NULL));
  IF bad > 0 THEN RAISE EXCEPTION 'Hay % movimientos con datos incompletos (cuenta, categoría o transferencia).', bad; END IF;

  SELECT coalesce(sum(amount) FILTER (WHERE tx_type='income'),0),
         coalesce(sum(amount) FILTER (WHERE tx_type='expense' AND budget_class='need'),0),
         coalesce(sum(amount) FILTER (WHERE tx_type='expense' AND budget_class='want'),0),
         coalesce(sum(amount) FILTER (WHERE (tx_type='expense' AND budget_class='future') OR tx_type='future_allocation'),0)
    INTO inc, nd, wt, fu FROM transactions WHERE user_id = uid AND status='posted' AND tx_date >= start_d AND tx_date < end_d;
  unas := inc - nd - wt - fu;
  np := CASE WHEN inc > 0 THEN round(nd*100/inc,2) ELSE 0 END;
  wp := CASE WHEN inc > 0 THEN round(wt*100/inc,2) ELSE 0 END;
  fp := CASE WHEN inc > 0 THEN round(fu*100/inc,2) ELSE 0 END;

  SELECT coalesce(jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'type',x.account_type,
      'balance', CASE WHEN x.account_type='credit_card' THEN x.initial_balance + x.outs - x.ins ELSE x.initial_balance + x.ins - x.outs END)),'[]')
    INTO accs FROM (
      SELECT a.id, a.name, a.account_type, a.initial_balance,
        coalesce((SELECT sum(t.amount) FROM transactions t WHERE t.to_account_id=a.id AND t.status='posted' AND t.tx_date < end_d),0) ins,
        coalesce((SELECT sum(t.amount) FROM transactions t WHERE t.from_account_id=a.id AND t.status='posted' AND t.tx_date < end_d),0) outs
      FROM financial_accounts a WHERE a.user_id = uid) x;
  SELECT coalesce(sum(CASE WHEN (e->>'type')='credit_card' THEN -((e->>'balance')::numeric) ELSE (e->>'balance')::numeric END),0) INTO nw FROM jsonb_array_elements(accs) e;

  UPDATE monthly_budget_snapshots SET is_current = false WHERE budget_id = b.id;
  INSERT INTO monthly_budget_snapshots(user_id,budget_id,period,expected_income,actual_income,needs_amount,wants_amount,future_amount,unassigned_amount,
    needs_pct,wants_pct,future_pct,savings_rate,rule_needs_pct,rule_wants_pct,rule_future_pct,compliance,accounts,net_worth,unassigned_decision)
  VALUES (uid,b.id,_period,b.expected_income,inc,nd,wt,fu,unas,np,wp,fp,fp,b.needs_pct,b.wants_pct,b.future_pct,
    jsonb_build_object('needs', np <= b.needs_pct, 'wants', wp <= b.wants_pct, 'future', fp >= b.future_pct), accs, nw, _unassigned_decision);

  SELECT EXISTS(SELECT 1 FROM monthly_close_log WHERE budget_id = b.id AND action='CLOSE') INTO had_close;
  INSERT INTO monthly_close_log(user_id,budget_id,period,action,reason) VALUES (uid,b.id,_period, CASE WHEN had_close THEN 'RECLOSE' ELSE 'CLOSE' END, _unassigned_decision);
  UPDATE monthly_budgets SET status='closed', closed_at=now() WHERE id=b.id;
  RETURN jsonb_build_object('income',inc,'needs',nd,'wants',wt,'future',fu,'unassigned',unas);
END $$;

-- Prevent editing budget/targets of a closed month (except the status transition itself)
CREATE OR REPLACE FUNCTION public.guard_closed_budget() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status = 'closed' AND NEW.status = 'closed' THEN
    RAISE EXCEPTION 'El mes % está cerrado. Reábrelo para hacer cambios.', OLD.period;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER monthly_budgets_guard BEFORE UPDATE ON public.monthly_budgets FOR EACH ROW EXECUTE FUNCTION public.guard_closed_budget();
