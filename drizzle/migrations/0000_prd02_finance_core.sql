
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY,
  full_name text,
  birth_date date,
  country text DEFAULT 'MX',
  currency text NOT NULL DEFAULT 'MXN',
  target_age int NOT NULL DEFAULT 50 CHECK (target_age BETWEEN 18 AND 100),
  expected_income numeric(14,2) NOT NULL DEFAULT 0 CHECK (expected_income >= 0),
  approx_expenses numeric(14,2) NOT NULL DEFAULT 0 CHECK (approx_expenses >= 0),
  initial_net_worth numeric(14,2) NOT NULL DEFAULT 0,
  interests text[] NOT NULL DEFAULT '{}',
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.financial_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  account_type text NOT NULL CHECK (account_type IN ('cash','bank','savings','investment','credit_card','other')),
  institution text CHECK (char_length(institution) <= 80),
  currency text NOT NULL DEFAULT 'MXN',
  initial_balance numeric(14,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_accounts TO authenticated;
GRANT ALL ON public.financial_accounts TO service_role;
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own accounts" ON public.financial_accounts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.transaction_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  kind text NOT NULL CHECK (kind IN ('income','expense')),
  default_class text CHECK (default_class IN ('need','want','future')),
  active boolean NOT NULL DEFAULT true,
  is_custom boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_categories TO authenticated;
GRANT ALL ON public.transaction_categories TO service_role;
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read system and own categories" ON public.transaction_categories FOR SELECT TO authenticated USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "insert own categories" ON public.transaction_categories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND is_custom);
CREATE POLICY "update own categories" ON public.transaction_categories FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own categories" ON public.transaction_categories FOR DELETE TO authenticated USING (auth.uid() = user_id);

INSERT INTO public.transaction_categories (user_id, name, kind, default_class, is_custom) VALUES
 (NULL,'Nómina','income',NULL,false),(NULL,'Honorarios','income',NULL,false),(NULL,'Negocio','income',NULL,false),
 (NULL,'Bono','income',NULL,false),(NULL,'Comisión','income',NULL,false),(NULL,'Inversión','income',NULL,false),
 (NULL,'Venta','income',NULL,false),(NULL,'Ingreso extraordinario','income',NULL,false),(NULL,'Otro ingreso','income',NULL,false),
 (NULL,'Vivienda','expense','need',false),(NULL,'Alimentación','expense','need',false),(NULL,'Servicios','expense','need',false),
 (NULL,'Transporte','expense','need',false),(NULL,'Seguros','expense','need',false),(NULL,'Salud','expense','need',false),
 (NULL,'Educación','expense','need',false),(NULL,'Pago mínimo de deuda','expense','need',false),
 (NULL,'Restaurantes','expense','want',false),(NULL,'Streaming','expense','want',false),(NULL,'Entretenimiento','expense','want',false),
 (NULL,'Hobbies','expense','want',false),(NULL,'Viajes','expense','want',false),(NULL,'Compras','expense','want',false),
 (NULL,'Fondo de emergencia','expense','future',false),(NULL,'Ahorro','expense','future',false),(NULL,'Inversión','expense','future',false),
 (NULL,'Retiro','expense','future',false),(NULL,'Abono extraordinario a deuda','expense','future',false),(NULL,'Capital trading','expense','future',false),
 (NULL,'Otro gasto','expense',NULL,false);

CREATE TABLE public.income_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  category_id uuid REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
  expected_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (expected_amount >= 0),
  frequency text NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly','biweekly','monthly','irregular')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_sources TO authenticated;
GRANT ALL ON public.income_sources TO service_role;
ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own income sources" ON public.income_sources FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.budget_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL DEFAULT 'Regla base',
  needs_pct numeric(5,2) NOT NULL DEFAULT 50,
  wants_pct numeric(5,2) NOT NULL DEFAULT 30,
  future_pct numeric(5,2) NOT NULL DEFAULT 20,
  is_default boolean NOT NULL DEFAULT true,
  effective_from date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT budget_rules_sum CHECK (needs_pct + wants_pct + future_pct = 100 AND needs_pct >= 0 AND wants_pct >= 0 AND future_pct >= 0)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_rules TO authenticated;
GRANT ALL ON public.budget_rules TO service_role;
ALTER TABLE public.budget_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rules" ON public.budget_rules FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.future_allocation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() UNIQUE,
  security_pct numeric(5,2) NOT NULL DEFAULT 50,
  growth_pct numeric(5,2) NOT NULL DEFAULT 40,
  retirement_pct numeric(5,2) NOT NULL DEFAULT 0,
  trading_pct numeric(5,2) NOT NULL DEFAULT 10,
  debt_pct numeric(5,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT future_rules_sum CHECK (security_pct + growth_pct + retirement_pct + trading_pct + debt_pct = 100)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.future_allocation_rules TO authenticated;
GRANT ALL ON public.future_allocation_rules TO service_role;
ALTER TABLE public.future_allocation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own future rules" ON public.future_allocation_rules FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.monthly_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  period text NOT NULL CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  expected_income numeric(14,2) NOT NULL DEFAULT 0 CHECK (expected_income >= 0),
  rule_id uuid REFERENCES public.budget_rules(id) ON DELETE SET NULL,
  needs_pct numeric(5,2) NOT NULL DEFAULT 50,
  wants_pct numeric(5,2) NOT NULL DEFAULT 30,
  future_pct numeric(5,2) NOT NULL DEFAULT 20,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  UNIQUE (user_id, period),
  CONSTRAINT monthly_budget_sum CHECK (needs_pct + wants_pct + future_pct = 100)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_budgets TO authenticated;
GRANT ALL ON public.monthly_budgets TO service_role;
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own budgets" ON public.monthly_budgets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.monthly_budget_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  budget_id uuid NOT NULL REFERENCES public.monthly_budgets(id) ON DELETE CASCADE,
  budget_class text NOT NULL CHECK (budget_class IN ('need','want','future')),
  category_id uuid REFERENCES public.transaction_categories(id) ON DELETE CASCADE,
  percentage numeric(5,2),
  target_amount numeric(14,2) NOT NULL CHECK (target_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (budget_id, category_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_budget_targets TO authenticated;
GRANT ALL ON public.monthly_budget_targets TO service_role;
ALTER TABLE public.monthly_budget_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own targets" ON public.monthly_budget_targets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  tx_date date NOT NULL DEFAULT current_date,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  concept text NOT NULL CHECK (char_length(concept) BETWEEN 1 AND 120),
  tx_type text NOT NULL CHECK (tx_type IN ('income','expense','transfer','future_allocation','adjustment')),
  from_account_id uuid REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  to_account_id uuid REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
  budget_class text CHECK (budget_class IN ('need','want','future','pending')),
  future_destination text CHECK (future_destination IN ('security','growth','retirement','trading','debt')),
  adjustment_direction text CHECK (adjustment_direction IN ('in','out')),
  is_recurring boolean NOT NULL DEFAULT false,
  merchant text CHECK (char_length(merchant) <= 80),
  notes text CHECK (char_length(notes) <= 500),
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','void')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transactions_user_date ON public.transactions(user_id, tx_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own transactions" ON public.transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER transactions_updated BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.future_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE UNIQUE,
  destination text NOT NULL CHECK (destination IN ('security','growth','retirement','trading','debt')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  alloc_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.future_allocations TO authenticated;
GRANT ALL ON public.future_allocations TO service_role;
ALTER TABLE public.future_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own allocations read" ON public.future_allocations FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.monthly_budget_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  budget_id uuid NOT NULL REFERENCES public.monthly_budgets(id) ON DELETE CASCADE,
  period text NOT NULL,
  expected_income numeric(14,2) NOT NULL,
  actual_income numeric(14,2) NOT NULL,
  needs_amount numeric(14,2) NOT NULL,
  wants_amount numeric(14,2) NOT NULL,
  future_amount numeric(14,2) NOT NULL,
  unassigned_amount numeric(14,2) NOT NULL,
  needs_pct numeric(7,2) NOT NULL,
  wants_pct numeric(7,2) NOT NULL,
  future_pct numeric(7,2) NOT NULL,
  savings_rate numeric(7,2) NOT NULL,
  rule_needs_pct numeric(5,2) NOT NULL,
  rule_wants_pct numeric(5,2) NOT NULL,
  rule_future_pct numeric(5,2) NOT NULL,
  compliance jsonb NOT NULL DEFAULT '{}',
  accounts jsonb NOT NULL DEFAULT '[]',
  net_worth numeric(14,2) NOT NULL DEFAULT 0,
  unassigned_decision text,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.monthly_budget_snapshots TO authenticated;
GRANT ALL ON public.monthly_budget_snapshots TO service_role;
ALTER TABLE public.monthly_budget_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own snapshots read" ON public.monthly_budget_snapshots FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.monthly_close_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  budget_id uuid NOT NULL REFERENCES public.monthly_budgets(id) ON DELETE CASCADE,
  period text NOT NULL,
  action text NOT NULL CHECK (action IN ('CLOSE','REOPEN','RECLOSE')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.monthly_close_log TO authenticated;
GRANT ALL ON public.monthly_close_log TO service_role;
ALTER TABLE public.monthly_close_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own close log read" ON public.monthly_close_log FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Block changes to transactions in closed months
CREATE OR REPLACE FUNCTION public.guard_closed_month() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES (CASE WHEN TG_OP <> 'INSERT' THEN OLD.user_id END, CASE WHEN TG_OP <> 'INSERT' THEN OLD.tx_date END),
                                 (CASE WHEN TG_OP <> 'DELETE' THEN NEW.user_id END, CASE WHEN TG_OP <> 'DELETE' THEN NEW.tx_date END)) v(uid, d) WHERE uid IS NOT NULL LOOP
    IF EXISTS (SELECT 1 FROM monthly_budgets WHERE user_id = r.uid AND period = to_char(r.d,'YYYY-MM') AND status = 'closed') THEN
      RAISE EXCEPTION 'El mes % está cerrado. Reábrelo para hacer cambios.', to_char(r.d,'YYYY-MM');
    END IF;
  END LOOP;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER transactions_guard_closed BEFORE INSERT OR UPDATE OR DELETE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.guard_closed_month();

-- Keep future_allocations in sync with transactions
CREATE OR REPLACE FUNCTION public.sync_future_allocation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM future_allocations WHERE transaction_id = NEW.id;
  IF NEW.status = 'posted' AND NEW.future_destination IS NOT NULL AND (NEW.tx_type = 'future_allocation' OR (NEW.tx_type = 'expense' AND NEW.budget_class = 'future')) THEN
    INSERT INTO future_allocations(user_id, transaction_id, destination, amount, alloc_date) VALUES (NEW.user_id, NEW.id, NEW.future_destination, NEW.amount, NEW.tx_date);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER transactions_sync_future AFTER INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.sync_future_allocation();

-- Profile + defaults on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles(user_id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name') ON CONFLICT DO NOTHING;
  INSERT INTO budget_rules(user_id) VALUES (NEW.id);
  INSERT INTO future_allocation_rules(user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Month close (runs as caller; RLS applies)
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

  SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'type',a.account_type,'balance',
    a.initial_balance
    + coalesce((SELECT sum(t.amount) FROM transactions t WHERE t.to_account_id=a.id AND t.status='posted' AND t.tx_date < end_d),0)
    - coalesce((SELECT sum(t.amount) FROM transactions t WHERE t.from_account_id=a.id AND t.status='posted' AND t.tx_date < end_d),0))),'[]')
    INTO accs FROM financial_accounts a WHERE a.user_id = uid;
  SELECT coalesce(sum(CASE WHEN (e->>'type')='credit_card' THEN -abs((e->>'balance')::numeric) ELSE (e->>'balance')::numeric END),0) INTO nw FROM jsonb_array_elements(accs) e;

  UPDATE monthly_budget_snapshots SET is_current = false WHERE budget_id = b.id;
  -- snapshots are insert-only for users via this function
  INSERT INTO monthly_budget_snapshots(user_id,budget_id,period,expected_income,actual_income,needs_amount,wants_amount,future_amount,unassigned_amount,
    needs_pct,wants_pct,future_pct,savings_rate,rule_needs_pct,rule_wants_pct,rule_future_pct,compliance,accounts,net_worth,unassigned_decision)
  VALUES (uid,b.id,_period,b.expected_income,inc,nd,wt,fu,unas,np,wp,fp,fp,b.needs_pct,b.wants_pct,b.future_pct,
    jsonb_build_object('needs', np <= b.needs_pct, 'wants', wp <= b.wants_pct, 'future', fp >= b.future_pct), accs, nw, _unassigned_decision);

  SELECT EXISTS(SELECT 1 FROM monthly_close_log WHERE budget_id = b.id AND action='CLOSE') INTO had_close;
  INSERT INTO monthly_close_log(user_id,budget_id,period,action,reason) VALUES (uid,b.id,_period, CASE WHEN had_close THEN 'RECLOSE' ELSE 'CLOSE' END, _unassigned_decision);
  UPDATE monthly_budgets SET status='closed', closed_at=now() WHERE id=b.id;
  RETURN jsonb_build_object('income',inc,'needs',nd,'wants',wt,'future',fu,'unassigned',unas);
END $$;

CREATE OR REPLACE FUNCTION public.reopen_month(_period text, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); b monthly_budgets;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF _reason IS NULL OR char_length(trim(_reason)) < 5 THEN RAISE EXCEPTION 'Indica un motivo de al menos 5 caracteres.'; END IF;
  SELECT * INTO b FROM monthly_budgets WHERE user_id = uid AND period = _period;
  IF b.id IS NULL OR b.status <> 'closed' THEN RAISE EXCEPTION 'El mes no está cerrado'; END IF;
  UPDATE monthly_budgets SET status='open', closed_at=NULL WHERE id=b.id;
  INSERT INTO monthly_close_log(user_id,budget_id,period,action,reason) VALUES (uid,b.id,_period,'REOPEN',left(_reason,500));
END $$;

-- Functions insert into snapshot/log as invoker: allow inserts/updates only for own rows
GRANT INSERT, UPDATE ON public.monthly_budget_snapshots TO authenticated;
GRANT INSERT ON public.monthly_close_log TO authenticated;
CREATE POLICY "own snapshots write" ON public.monthly_budget_snapshots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own snapshots flag" ON public.monthly_budget_snapshots FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own close log write" ON public.monthly_close_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
GRANT EXECUTE ON FUNCTION public.close_month(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_month(text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
