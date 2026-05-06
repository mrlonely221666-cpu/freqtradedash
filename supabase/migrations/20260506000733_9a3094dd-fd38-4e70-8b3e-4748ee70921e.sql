CREATE TABLE public.trade_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  trade_id BIGINT NOT NULL,
  pair TEXT NOT NULL,
  is_short BOOLEAN NOT NULL DEFAULT false,
  open_rate NUMERIC,
  close_rate NUMERIC,
  stake_amount NUMERIC,
  amount NUMERIC,
  profit_abs NUMERIC,
  profit_ratio NUMERIC,
  open_date TIMESTAMPTZ,
  close_date TIMESTAMPTZ,
  exit_reason TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, trade_id, open_date)
);

CREATE INDEX idx_trade_history_user_close ON public.trade_history(user_id, close_date DESC);

ALTER TABLE public.trade_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own trades select" ON public.trade_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own trades insert" ON public.trade_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own trades update" ON public.trade_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own trades delete" ON public.trade_history FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trade_history_set_updated_at
BEFORE UPDATE ON public.trade_history
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();