# F024 - WhatsApp Template

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-024 | Secretary/Bishopric | edit WhatsApp template | customize invitations |

## Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-043 | Bishopric/Secretary in Template WhatsApp | edits and saves | custom template used in next invitations |

## Technical Notes
- Editor with real-time preview
- Placeholders: {nome}, {data}, {posicao}, {duracao}, {colecao}, {titulo}, {link}
- Template saved per ward (wards.whatsapp_template)
- Accessible to Bishopric and Secretary
- Default template provided per language on ward creation
- Settings > WhatsApp Template card
