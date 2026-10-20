# Débitos restantes — lista única (wave 7, 2026-10-20)

Tudo que as waves 1–7 **estacionaram de propósito**, num lugar só. Item operacional
(credencial/aparelho) vive no `PROGRESS.md` (Now); aqui ficam os débitos de código e
documento. Ao resolver um item, risque-o aqui e cite o commit.

## Código

| Item | Origem | Motivo do estacionamento | Dono |
|---|---|---|---|
| Substituir o mapa manual `Database` pelos tipos gerados do staging (`npx supabase gen types typescript --project-id nfraidzguordqmbpqkcf`) | DEC-03 / ARQ-01 | Exige acesso ao staging; o mapa manual + a concordância executável (ARQ-07) cobrem o intervalo | Quem tiver a credencial |
| Cobertura unitária de `exportAgendaPdf.ts` | ARQ-10 | Sem costura barata sem refactor (gera PDF no dispositivo); exercitado indiretamente pelas suítes da agenda | Próxima wave de testes |
| Extração incremental dos god components — 1º passo: `HymnSelectorModal` para fora do AgendaForm; depois editor de designações e a lista de telefones do PdfImportReview | ARQ-12 | Decisão: nenhum refactor estrutural antes do cutover | Pós-lançamento |
| Migrar `notificationUtils.ts` para i18next (hoje tem caminho próprio de localização) | Wave 5 (BEL) | Follow-up registrado na spec da wave 5; fora do escopo de beleza | Próxima wave de i18n |
| `f021-topic-library-overhaul.test.ts` afirma texto-fonte (`function normalizeForSearch`) e mantém código morto vivo em `useTopics.ts` | PROGRESS (open issue pré-auditoria) | Viola a regra "testes comportamentais"; reescrever o teste e apagar o morto juntos | Próxima wave de testes |
| Insert/Update do cliente tipado são `Partial<Row>` (permissivo com colunas obrigatórias sem default) | ARQ-01 | Limitação interina documentada no código; some quando os tipos gerados entrarem (DEC-03) | DEC-03 |

## Documento

| Item | Origem | Motivo | Dono |
|---|---|---|---|
| Deletar as branches remotas `feature/pdf-member-import`, `v1.x`, `v2.0` (todas contidas na main) | CLN-23 | Sem credencial de push neste ambiente | Dono, no GitHub |
| Deletar as refs locais da UX-2.0 no Mac (`git branch -D UX-2.0`; `git tag -d archive/UX-2.0-2026-06-07`) | CLN-23 / decisão 19-10 | Só existem no Mac do dono | Dono |
| Guia público de import de membros (`import-members.html`) | CLN-02 | Spec aposentada sem construir; reabrir como spec nova se voltar a ser desejado | Dono decide |
