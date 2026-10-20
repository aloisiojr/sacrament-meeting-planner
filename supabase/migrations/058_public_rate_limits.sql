-- Migration 058: rate-limit das Edge Functions públicas (CONF-12, spec specs/cutover-gate.md).
--
-- Aditiva e sem efeito sobre clientes em campo: tabela nova + função nova; nenhum
-- comportamento muda até as funções (send-reset-email, register-first-user,
-- create-invitation) passarem a chamar `check_rate_limit` — o que acontece no deploy
-- das funções, não nesta migration. Limite (decidido nas funções): 20 hits/hora por
-- (função, IP, e-mail) — generoso para não quebrar o fluxo legítimo; acima, 429.
--
-- A tabela guarda um contador por (função, IP, e-mail) com janela fixa. Linhas velhas
-- não são podadas automaticamente: o volume é limitado pelos pares distintos que de
-- fato chamam as funções públicas; uma poda manual ocasional
-- (DELETE FROM public_rate_limits WHERE window_started_at < now() - INTERVAL '7 days')
-- é suficiente e fica registrada aqui de propósito, sem cron novo.

CREATE TABLE public_rate_limits (
  function_name TEXT NOT NULL,
  ip TEXT NOT NULL,
  email TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hit_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (function_name, ip, email)
);

ALTER TABLE public_rate_limits ENABLE ROW LEVEL SECURITY;

-- Sem policy alguma, de propósito (mesmo padrão fechado da 048): com RLS ativa e
-- nenhuma policy, nenhum cliente (anon/authenticated) lê ou escreve; só o
-- service_role das Edge Functions acessa, via a função abaixo.

-- Registra um hit e devolve TRUE se ainda está dentro do limite, FALSE se estourou.
-- Janela fixa: janela vencida recomeça do zero neste hit. Atômica via INSERT ...
-- ON CONFLICT — dois hits concorrentes do mesmo (função, IP, e-mail) contam 2.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_function text,
  p_ip text,
  p_email text,
  p_max_hits int,
  p_window_seconds int
)
RETURNS boolean AS $$
DECLARE
  v_count int;
BEGIN
  INSERT INTO public_rate_limits (function_name, ip, email, window_started_at, hit_count)
  VALUES (p_function, p_ip, p_email, now(), 1)
  ON CONFLICT (function_name, ip, email) DO UPDATE SET
    hit_count = CASE
      WHEN public_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        THEN 1
      ELSE public_rate_limits.hit_count + 1
    END,
    window_started_at = CASE
      WHEN public_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        THEN now()
      ELSE public_rate_limits.window_started_at
    END
  RETURNING hit_count INTO v_count;
  RETURN v_count <= p_max_hits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Só o service_role (Edge Functions) executa: revoga o EXECUTE default de PUBLIC,
-- mesmo padrão das funções de poda de 045/048.
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, text, int, int) FROM public;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, text, int, int) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, text, int, int) TO service_role;
