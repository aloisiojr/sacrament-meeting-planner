# Change Requests Batch 3 - Spec Corrections (SPEC_CR3_F025)

Feature: F025 - Spec Corrections Batch
Type: Documentation-only (no code changes)

---

## SPEC_SUMMARY

```yaml
type: spec_summary
goal: "Fix 4 specification inconsistencies/gaps (CR-31, CR-34, CR-36, CR-37) in SPEC.final.md and PRODUCT_SPECIFICATION.md"
in_scope:
  - "CR-31: Fix ASM-009 contradiction about Secretary designation permissions"
  - "CR-34: Update RF-22 and SPEC 7.13.4 to reflect CR-26 actor redesign (no more checkboxes)"
  - "CR-36: Add debounce spec for auto-save text fields in agenda"
  - "CR-37: Update SPEC 7.8 and 4.2 to reflect CR-23 Secretary user management access"
out_of_scope:
  - "Any code changes"
  - "Any database or migration changes"
  - "Changes to files outside docs/"
main_risks:
  - "None (documentation-only changes)"
ac_count: 12
edge_case_count: 0
has_open_questions: false
has_unconfirmed_assumptions: false
```

---

## CR-31: Fix ASM-009 Contradiction About Secretary Designation Permissions

- **Type:** BUG CRITICO (Spec contradiction)
- **Description:** The assumption ASM-009 in SPEC.final.md states "Secretario NAO designa em NENHUMA tela" (Secretary does NOT designate on ANY screen). However, ASM-AGD-003 and section 4.2 (row "Designar discursante via Agenda") both state that the Secretary CAN designate speakers via the Agenda tab. This is a direct contradiction. ASM-009 must be corrected to acknowledge the Agenda tab exception.
- **Current State (SPEC.final.md):**
  - **ASM-009 (line ~1509):** `Secretario NAO designa em nenhuma tela`
  - **ASM-AGD-003 (line ~1541):** `Na aba Agenda, AMBOS (Bispado e Secretario) podem designar discursantes. Esta e uma excecao a regra geral onde so Bispado designa`
  - **Section 4.2 (line ~99):** `Designar discursante via Agenda | Bispado: Yes | Secretario: Yes | Observador: No`
- **Required Change:**
  - Update ASM-009 from: `Secretario NAO designa em nenhuma tela`
  - To: `Secretario NAO designa pela aba Discursos nem Home, mas PODE designar pela aba Agenda (excecao documentada em ASM-AGD-003)`
- **Acceptance Criteria:**
  - AC-31.1: ASM-009 text in SPEC.final.md is updated to reflect the Agenda tab exception. Priority: must.
  - AC-31.2: ASM-009, ASM-AGD-003, and section 4.2 are all consistent with each other after the update. Priority: must.
  - AC-31.3: No other assumptions or permission rows are changed. Priority: must.
- **Files Impacted:**
  - `docs/SPEC.final.md` (ASM-009 row in assumptions table, approximately line 1509)

---

## CR-34: Update RF-22 and SPEC 7.13.4 to Reflect CR-26 Actor Redesign

- **Type:** SPEC DESATUALIZADA (Outdated spec)
- **Description:** After CR-26 (implemented in SPEC_CR2/F024), the actor management was redesigned. The add-actor flow no longer shows checkboxes for role selection. Instead, the user only enters the actor's name, and the role is inferred from the field that was clicked (e.g., clicking from the "pianist" field sets `can_music=true`). However, two spec locations still describe the old checkbox-based flow:
  1. **PRODUCT_SPECIFICATION.md RF-22** (line ~749): Says `mini-formulario inline abre: nome + checkboxes de papeis (Presidir, Dirigir, Reconhecer, Musica)`
  2. **SPEC.final.md section 7.13.4** (line ~949): Says `Abre mini-formulario inline: nome + checkboxes de papeis (Presidir, Dirigir, Reconhecer, Musica)`
- **Required Changes:**
  1. In PRODUCT_SPECIFICATION.md RF-22, update the add-actor criteria:
     - From: `mini-formulario inline abre: nome + checkboxes de papeis (Presidir, Dirigir, Reconhecer, Musica)`
     - To: `campo de nome aparece. Ao salvar, o papel e inferido automaticamente do campo de ator clicado (ex: campo "Pianista" define can_music=true). Ator com papel "Dirigir" automaticamente qualifica para "Presidir".`
  2. In PRODUCT_SPECIFICATION.md RF-22, remove: `E papeis sao editaveis apos criacao`
  3. In SPEC.final.md section 7.13.4, update the add-actor bullet:
     - From: `Abre mini-formulario inline: nome + checkboxes de papeis (Presidir, Dirigir, Reconhecer, Musica)` and `Ao salvar: ator criado, automaticamente selecionado no campo`
     - To: `Campo de nome aparece. Papel inferido do campo de ator clicado (ex: "Quem preside" → can_preside=true, "Pianista" → can_music=true). Ao salvar: ator criado com papel inferido, automaticamente selecionado no campo.`
  4. In SPEC.final.md section 7.13.4, add an edit bullet:
     - `**Opcao de editar** ator: icone de edicao ao lado de cada ator na lista. Apenas o nome e editavel (papel e gerenciado pelo contexto dos campos onde o ator e usado).`
- **Acceptance Criteria:**
  - AC-34.1: PRODUCT_SPECIFICATION.md RF-22 no longer mentions checkboxes for role selection. Priority: must.
  - AC-34.2: PRODUCT_SPECIFICATION.md RF-22 describes role inference from field context. Priority: must.
  - AC-34.3: SPEC.final.md section 7.13.4 no longer mentions checkboxes for role selection. Priority: must.
  - AC-34.4: SPEC.final.md section 7.13.4 describes role inference from field context. Priority: must.
  - AC-34.5: SPEC.final.md section 7.13.4 includes edit capability (name-only editing). Priority: must.
- **Files Impacted:**
  - `docs/PRODUCT_SPECIFICATION.md` (RF-22 section, approximately lines 738-753)
  - `docs/SPEC.final.md` (section 7.13.4, approximately lines 942-954)

---

## CR-36: Add Debounce Spec for Auto-Save Text Fields in Agenda

- **Type:** SPEC FALTANDO (Missing spec)
- **Description:** There is no specification defining debounce behavior for auto-save in agenda text fields. This was partially addressed in CR-27 (AC-27.4 requires 500ms debounce), but no formal spec rule exists in SPEC.final.md. A rule must be added to ensure consistent implementation across all auto-save text fields.
- **Current State:**
  - SPEC.final.md section 7.4.2 mentions auto-save for member editing but no debounce rule.
  - SPEC.final.md section 7.6.2 mentions auto-save for topic editing but no debounce rule.
  - SPEC.final.md mentions debounce of 200-300ms for search fields (section 7.8, section 13.2), but nothing for auto-save.
  - CR-27 (SPEC_CR2) added AC-27.4 requiring 500ms debounce for agenda text fields.
- **Required Change:**
  - Add a new rule in SPEC.final.md (in an appropriate location, such as a new subsection under section 13 "Requisitos Nao-Funcionais" or as a new general UX rule under section 7):
    ```
    ### Regra de Auto-Save em Campos de Texto

    Campos de texto com auto-save (agenda, membros, temas) devem seguir as regras:
    1. Debounce minimo de 500ms antes de disparar a gravacao automatica
    2. Estado do campo gerenciado localmente com useState (nao depender do valor do servidor durante digitacao)
    3. Cursor e selecao preservados apos auto-save
    4. Se o campo for esvaziado, o valor vazio deve ser salvo corretamente
    ```
- **Acceptance Criteria:**
  - AC-36.1: SPEC.final.md contains a documented rule for debounce minimum of 500ms on auto-save text fields. Priority: must.
  - AC-36.2: The rule specifies local state management with useState during typing. Priority: must.
  - AC-36.3: The rule applies to all auto-save text fields (agenda, members, topics). Priority: must.
- **Files Impacted:**
  - `docs/SPEC.final.md` (new subsection or rule addition)

---

## CR-37: Update SPEC 7.8 and 4.2 to Reflect Secretary User Management Access

- **Type:** SPEC DESATUALIZADA (Outdated spec)
- **Description:** After CR-23 (implemented in SPEC_CR2/F024), the Secretary role was granted the `settings:users` permission to access the Users management screen. However, two locations in SPEC.final.md still describe the old behavior:
  1. **Section 7.8** (line ~701): Says `Card "Usuarios" visivel apenas para Bispado (permissao settings:users)` and the next line says `Secretario e Observador NAO veem o card`.
  2. **Section 4.2** (line ~89): The permissions table row `Gerenciar usuarios (CRUD)` shows `Bispado: Yes | Secretario: No | Observador: No`.
- **Required Changes:**
  1. In section 7.8, update:
     - From: `Card "Usuarios" visivel apenas para **Bispado** (permissao settings:users)` / `Secretario e Observador NAO veem o card`
     - To: `Card "Usuarios" visivel para **Bispado** e **Secretario** (permissao settings:users)` / `Observador NAO ve o card`
  2. In section 4.2, update the permissions table row:
     - From: `Gerenciar usuarios (CRUD) | Yes | No | No`
     - To: `Gerenciar usuarios (CRUD) | Yes | Yes | No`
- **Acceptance Criteria:**
  - AC-37.1: SPEC.final.md section 7.8 states that both Bispado and Secretario can see the Users card. Priority: must.
  - AC-37.2: SPEC.final.md section 4.2 permissions table shows Secretario has "Yes" for "Gerenciar usuarios (CRUD)". Priority: must.
  - AC-37.3: The permission `settings:users` is listed as granted to both Bispado and Secretario roles. Priority: must.
  - AC-37.4: Observador remains without access to the Users card. Priority: must.
- **Files Impacted:**
  - `docs/SPEC.final.md` (section 7.8 lines ~701-703, section 4.2 permissions table line ~89)

---

## Assumptions

```yaml
assumptions:
  - id: A-CR31-1
    description: "ASM-AGD-003 and section 4.2 are the correct/intended behavior (Secretary CAN designate via Agenda)"
    confirmed: true
    default_if_not_confirmed: "N/A"

  - id: A-CR34-1
    description: "CR-26 has been fully implemented and the checkbox-based actor creation no longer exists in the codebase"
    confirmed: true
    default_if_not_confirmed: "N/A"

  - id: A-CR36-1
    description: "CR-27 debounce of 500ms is the correct minimum for all auto-save text fields, not just agenda"
    confirmed: true
    default_if_not_confirmed: "Apply 500ms minimum across all auto-save text fields"

  - id: A-CR37-1
    description: "CR-23 has been fully implemented and Secretary already has settings:users permission in the codebase"
    confirmed: true
    default_if_not_confirmed: "N/A"
```

---

## Open Questions

```yaml
open_questions: []
```

No open questions. All 4 CRs have clear, unambiguous corrections with well-defined before/after states.

---

## Implementation Notes

This feature is **documentation-only**. The implementation consists of editing the following files:

| File | CRs |
|------|-----|
| `docs/SPEC.final.md` | CR-31, CR-34, CR-36, CR-37 |
| `docs/PRODUCT_SPECIFICATION.md` | CR-34 |

No code files, migrations, tests, or i18n changes are required.

---

## Definition of Done

- [ ] ASM-009 in SPEC.final.md corrected to acknowledge Agenda tab exception (CR-31)
- [ ] RF-22 in PRODUCT_SPECIFICATION.md updated to remove checkboxes, describe role inference (CR-34)
- [ ] Section 7.13.4 in SPEC.final.md updated to remove checkboxes, describe role inference and edit capability (CR-34)
- [ ] Auto-save debounce rule (500ms min) added to SPEC.final.md (CR-36)
- [ ] Section 7.8 in SPEC.final.md updated for Secretary user management access (CR-37)
- [ ] Section 4.2 permissions table in SPEC.final.md updated for Secretary user management (CR-37)
- [ ] All changes are internally consistent (no new contradictions introduced)
