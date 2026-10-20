# Sacrament Meeting Planner — Planejador de Reunião Sacramental

App (Expo / React Native + Supabase) para o bispado planejar a reunião sacramental:
agenda de domingos, discursos e orações, hinos, designações/apoios, membros,
convites por WhatsApp e modo apresentação. Publicado na App Store brasileira como
**Planejador Reunião Sacramental** (1.1.0); a **2.0.0** está completa em código e
aguarda o cutover (abaixo).

## Começando

```bash
npm ci
cp .env.example .env   # preencher com as chaves do ambiente (staging por padrão)
npx expo start
```

Build de aparelho: **SMP Dev** via TestFlight (profile `development-testflight`) —
ver `PROGRESS.md` (Now) e o roteiro de QA em `docs/qa/ROTEIRO_TESTES_v2.md`.

## Testes e gates

```bash
npm run test:run        # jest-expo, projetos ios + android (a suíte inteira)
npm run test:coverage   # idem, com piso de cobertura (jest.config.js — não baixar)
npx tsc --noEmit        # tipos
npm run lint            # expo lint — baseline: 0 erros / 5 warnings
```

Testes são **comportamentais** (renderizam telas e exercitam fluxos); afirmar sobre
texto-fonte é proibido pela convenção do projeto — onde uma regra vive em dois
lugares, o teste prova que os dois concordam (ver `CLAUDE.md`).

## Estrutura

- `src/app/` — rotas (expo-router): abas, auth, configurações, apresentação
- `src/hooks/`, `src/lib/` — dados (React Query + cliente Supabase tipado) e regras puras
- `src/components/` — UI
- `src/types/database.ts` — tipos do banco + o mapa `Database` do cliente tipado
- `supabase/migrations/` — 001–060 (**049–060 ainda não aplicadas a nenhum banco**)
- `supabase/functions/` — Edge Functions (notificações, convites, registro)
- `specs/` — spec (e plano) por mudança; waves de remediação têm registro próprio
- `docs/decisions/` — ADRs · `docs/CUTOVER_RUNBOOK.md` — o ensaio e o cutover

## Documentos vivos

- **`PROGRESS.md`** — estado atual (seção *Now*) e histórico
- **`CLAUDE.md`** — convenções, glossário e a **ordem não negociável do cutover**
- **`docs/DEBITOS-RESTANTES.md`** — débitos conhecidos, com dono e motivo

## Ambientes

- Staging: Supabase `nfraidzguordqmbpqkcf` · Produção: `poizgglzdjqwrhsnhkke`
- **Nunca** buildar o profile `production` do EAS antes do cutover, e nenhuma
  migration que quebra a 1.x entra antes de `app_config.min_supported_version`
  subir para 2.0.0 (ordem completa no `CLAUDE.md` e no ADR-001).
