# F010 - WhatsApp Integration

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-020 | Secretary | manage invitations via WhatsApp | efficient invitations |

## Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-038 | Not-Invited item | Secretary clicks action | opens WhatsApp (wa.me) with pre-filled message; status changes to Invited |
| AC-039 | Invited item | Secretary clicks action | 3 options: Go to WhatsApp conversation, Mark as Confirmed, Mark as Gave Up |

## Behavior Details

### Status "Assigned/Not-Invited":
- Clicking action opens WhatsApp (wa.me) with pre-filled message
- After sending, status automatically changes to "Assigned/Invited"

### Status "Assigned/Invited":
- Clicking action opens selector with 3 options:
  1. Go to WhatsApp conversation (opens wa.me with same pre-filled invite message)
  2. Mark as Confirmed (status -> Assigned/Confirmed, removed from list after 3 seconds)
  3. Mark as Gave Up (status -> Gave Up, removed from list after 3 seconds)

## Default WhatsApp Template (pt-BR)
```
Ola, tudo bom! O Bispado gostaria de te convidar para fazer o {posicao} discurso no domingo dia {data}! Voce falara sobre um tema da {colecao} com o titulo {titulo} {link se houver}. Podemos confirmar o seu discurso?
```

## Technical Notes
- WhatsApp links: wa.me/{phone}?text={encoded_message}
- Template is editable per ward (see F024)
- Placeholders: {nome}, {data}, {posicao}, {duracao}, {colecao}, {titulo}, {link}
- Only Secretary sees the invitation management section
- Bishopric and Observer do NOT see this section
