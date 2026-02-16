# PLAN_CR003 - Change Requests Batch 3: Spec Corrections (4 CRs: CR-31, CR-34, CR-36, CR-37)

## PLAN_SUMMARY

```yaml
type: plan_summary
total_steps: 5
parallel_tracks: 1
estimated_commits: 5
coverage:
  acceptance_criteria: 12/12
  edge_cases: 0/0
critical_path:
  - "STEP-01: Fix ASM-009 contradiction about Secretary designation (CR-31)"
  - "STEP-02: Update RF-22 and 7.13.4 for actor redesign (CR-34)"
  - "STEP-04: Update section 7.8 and 4.2 for Secretary user management (CR-37)"
main_risks:
  - "CR-34 edits two files (SPEC.final.md and PRODUCT_SPECIFICATION.md) -- must ensure both are consistent"
  - "Line numbers in SPEC.final.md may have shifted from previous CR batches -- verify exact locations before editing"
```

---

## PLAN

```yaml
type: plan
version: 1

goal: "Fix 4 specification inconsistencies/gaps in SPEC.final.md and PRODUCT_SPECIFICATION.md. CR-31 fixes a contradiction about Secretary permissions. CR-34 updates outdated actor management descriptions. CR-36 adds a missing debounce rule. CR-37 updates outdated Secretary user management permissions. All changes are documentation-only."

strategy:
  order: "Each CR is independent -- process sequentially by CR number for clarity. No code changes, no tests."
  commit_strategy: "1 commit per step, conventional commits (docs:)"
  test_strategy: "No automated tests required (documentation-only). Verification is manual review of document consistency."
```

---

## Steps

### STEP-01: CR-31 -- Fix ASM-009 Contradiction About Secretary Designation Permissions

```yaml
- id: STEP-01
  description: |
    Update ASM-009 in SPEC.final.md to resolve the contradiction with ASM-AGD-003
    and section 4.2. Currently ASM-009 says "Secretario NAO designa em nenhuma tela"
    but ASM-AGD-003 and section 4.2 both say the Secretary CAN designate via the
    Agenda tab.

    Change ASM-009 from:
      "Secretario NAO designa em nenhuma tela"
    To:
      "Secretario NAO designa pela aba Discursos nem Home, mas PODE designar pela aba Agenda (excecao documentada em ASM-AGD-003)"
  files:
    - "docs/SPEC.final.md"
  dependencies: []
  parallelizable_with: ["STEP-02", "STEP-03", "STEP-04"]
  done_when:
    - "ASM-009 text in SPEC.final.md is updated to include the Agenda tab exception"
    - "ASM-009 is consistent with ASM-AGD-003 (Secretary CAN designate via Agenda)"
    - "ASM-009 is consistent with section 4.2 row 'Designar discursante via Agenda' (Secretario: Yes)"
    - "No other assumptions or permission rows are changed"
  tests:
    - type: unit
      description: "Manual review: verify ASM-009, ASM-AGD-003, and section 4.2 are mutually consistent"
  covers:
    acceptance_criteria: ["AC-31.1", "AC-31.2", "AC-31.3"]
    edge_cases: []
  risks:
    - risk: "Line numbers may have shifted from previous edits"
      mitigation: "Search for 'ASM-009' string rather than relying on line numbers"
```

### STEP-02: CR-34 -- Update RF-22 and Section 7.13.4 for Actor Redesign (Two Files)

```yaml
- id: STEP-02
  description: |
    Update two spec documents to reflect the CR-26 actor redesign (no more checkboxes,
    role inferred from field context).

    File 1: docs/PRODUCT_SPECIFICATION.md (RF-22 section, ~lines 738-753)
    1. Change the add-actor criteria:
       From: "mini-formulario inline abre: nome + checkboxes de papeis (Presidir, Dirigir, Reconhecer, Musica)"
       To: "campo de nome aparece. Ao salvar, o papel e inferido automaticamente do campo de ator clicado (ex: campo 'Pianista' define can_music=true). Ator com papel 'Dirigir' automaticamente qualifica para 'Presidir'."
    2. Remove: "E papeis sao editaveis apos criacao"

    File 2: docs/SPEC.final.md (section 7.13.4, ~lines 942-954)
    1. Change the add-actor bullet:
       From: "Abre mini-formulario inline: nome + checkboxes de papeis (Presidir, Dirigir, Reconhecer, Musica)"
             "Ao salvar: ator criado, automaticamente selecionado no campo"
       To: "Campo de nome aparece. Papel inferido do campo de ator clicado (ex: 'Quem preside' -> can_preside=true, 'Pianista' -> can_music=true). Ao salvar: ator criado com papel inferido, automaticamente selecionado no campo."
    2. Add an edit bullet:
       "**Opcao de editar** ator: icone de edicao ao lado de cada ator na lista. Apenas o nome e editavel (papel e gerenciado pelo contexto dos campos onde o ator e usado)."
  files:
    - "docs/PRODUCT_SPECIFICATION.md"
    - "docs/SPEC.final.md"
  dependencies: []
  parallelizable_with: ["STEP-01", "STEP-03", "STEP-04"]
  done_when:
    - "PRODUCT_SPECIFICATION.md RF-22 does NOT mention 'checkboxes' for role selection"
    - "PRODUCT_SPECIFICATION.md RF-22 describes role inference from field context"
    - "PRODUCT_SPECIFICATION.md RF-22 does NOT say 'papeis sao editaveis apos criacao'"
    - "SPEC.final.md section 7.13.4 does NOT mention 'checkboxes' for role selection"
    - "SPEC.final.md section 7.13.4 describes role inference from field context"
    - "SPEC.final.md section 7.13.4 includes edit capability bullet (name-only editing)"
    - "Both files are consistent with each other on actor management behavior"
  tests:
    - type: unit
      description: "Manual review: grep for 'checkboxes' in both files -- should return zero results in actor-related sections"
    - type: unit
      description: "Manual review: verify PRODUCT_SPECIFICATION.md and SPEC.final.md describe the same actor creation flow"
  covers:
    acceptance_criteria: ["AC-34.1", "AC-34.2", "AC-34.3", "AC-34.4", "AC-34.5"]
    edge_cases: []
  risks:
    - risk: "Two files must be edited consistently"
      mitigation: "Edit both files in the same step and verify consistency before committing"
```

### STEP-03: CR-36 -- Add Debounce Spec for Auto-Save Text Fields

```yaml
- id: STEP-03
  description: |
    Add a new rule in SPEC.final.md under section 13 (Non-Functional Requirements)
    documenting the debounce behavior for auto-save text fields.

    Add a new subsection 13.6 after the existing 13.5 (Observabilidade):

    ### 13.6 Auto-Save em Campos de Texto

    Campos de texto com auto-save (agenda, membros, temas) devem seguir as regras:
    1. Debounce minimo de 500ms antes de disparar a gravacao automatica
    2. Estado do campo gerenciado localmente com useState (nao depender do valor do servidor durante digitacao)
    3. Cursor e selecao preservados apos auto-save
    4. Se o campo for esvaziado, o valor vazio deve ser salvo corretamente

    This formalizes the rule that was partially introduced by CR-27 (AC-27.4) for
    agenda text fields, extending it to all auto-save text fields across the app.
  files:
    - "docs/SPEC.final.md"
  dependencies: []
  parallelizable_with: ["STEP-01", "STEP-02", "STEP-04"]
  done_when:
    - "SPEC.final.md contains a section documenting debounce minimum of 500ms on auto-save text fields"
    - "The rule specifies local state management with useState during typing"
    - "The rule specifies cursor and selection preservation after auto-save"
    - "The rule specifies correct handling of empty values"
    - "The rule applies to all auto-save text fields (agenda, members, topics)"
  tests:
    - type: unit
      description: "Manual review: verify section exists and contains all 4 rules"
  covers:
    acceptance_criteria: ["AC-36.1", "AC-36.2", "AC-36.3"]
    edge_cases: []
  risks:
    - risk: "Section numbering may conflict if other subsections were added previously"
      mitigation: "Check the last existing subsection number before adding"
```

### STEP-04: CR-37 -- Update Section 7.8 and 4.2 for Secretary User Management Access

```yaml
- id: STEP-04
  description: |
    Update two locations in SPEC.final.md to reflect that the Secretary now has
    access to user management (granted by CR-23 implementation).

    Location 1: Section 7.8 (~line 701)
    Change:
      From: 'Card "Usuarios" visivel apenas para **Bispado** (permissao `settings:users`)'
            'Secretario e Observador NAO veem o card'
      To:   'Card "Usuarios" visivel para **Bispado** e **Secretario** (permissao `settings:users`)'
            'Observador NAO ve o card'

    Location 2: Section 4.2 permissions table (~line 89)
    Change the row:
      From: 'Gerenciar usuarios (CRUD) | Yes | No | No'
      To:   'Gerenciar usuarios (CRUD) | Yes | Yes | No'
  files:
    - "docs/SPEC.final.md"
  dependencies: []
  parallelizable_with: ["STEP-01", "STEP-02", "STEP-03"]
  done_when:
    - "Section 7.8 states both Bispado and Secretario can see the Users card"
    - "Section 4.2 permissions table shows Secretario has 'Yes' for 'Gerenciar usuarios (CRUD)'"
    - "The permission settings:users is listed as granted to both Bispado and Secretario"
    - "Observador remains without access (No) in both locations"
    - "No other permission rows are changed"
  tests:
    - type: unit
      description: "Manual review: verify section 7.8 and section 4.2 are consistent"
    - type: unit
      description: "Manual review: verify Observador still has 'No' for user management"
  covers:
    acceptance_criteria: ["AC-37.1", "AC-37.2", "AC-37.3", "AC-37.4"]
    edge_cases: []
  risks:
    - risk: "There may be other locations that reference Secretary's lack of user management access"
      mitigation: "Grep SPEC.final.md for 'Secretario' and 'usuarios' to find all references"
```

### STEP-05: Consistency Verification -- Cross-Check All Changes

```yaml
- id: STEP-05
  description: |
    Final verification step to ensure all 4 CR changes are internally consistent
    and do not introduce new contradictions.

    Verification checklist:
    1. CR-31: Search for all mentions of ASM-009, ASM-AGD-003, and Secretary
       designation permissions. Verify no contradictions.
    2. CR-34: Search for 'checkboxes' and 'mini-formulario' in both files.
       Verify no stale references remain.
    3. CR-36: Verify the new section 13.6 numbering is correct and the rule
       content matches the AC requirements.
    4. CR-37: Search for 'Gerenciar usuarios', 'settings:users', and Secretary
       permission references. Verify all are consistent.
    5. General: No contradictions introduced between the two documents.
  files:
    - "docs/SPEC.final.md"
    - "docs/PRODUCT_SPECIFICATION.md"
  dependencies: ["STEP-01", "STEP-02", "STEP-03", "STEP-04"]
  parallelizable_with: []
  done_when:
    - "No contradictions found between ASM-009, ASM-AGD-003, and section 4.2"
    - "No mentions of 'checkboxes' remain in actor-related sections of either file"
    - "No mentions of 'papeis sao editaveis' remain in RF-22"
    - "Auto-save debounce rule exists in section 13 with all 4 sub-rules"
    - "Secretary user management access is consistent across sections 4.2 and 7.8"
    - "Observador access is unchanged in all locations"
    - "No new contradictions introduced"
  tests:
    - type: integration
      description: "Full document consistency review (manual grep + reading)"
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "None -- verification-only step"
      mitigation: "N/A"
```

---

## Validation

```yaml
validation:
  - ac_id: AC-31.1
    how_to_verify: "Open SPEC.final.md, find ASM-009. Text mentions Agenda tab exception."
    covered_by_steps: ["STEP-01"]

  - ac_id: AC-31.2
    how_to_verify: "Compare ASM-009, ASM-AGD-003, and section 4.2 row 'Designar discursante via Agenda'. All three are consistent."
    covered_by_steps: ["STEP-01", "STEP-05"]

  - ac_id: AC-31.3
    how_to_verify: "Diff the commit. Only ASM-009 text changed; no other assumptions or permission rows modified."
    covered_by_steps: ["STEP-01"]

  - ac_id: AC-34.1
    how_to_verify: "Open PRODUCT_SPECIFICATION.md, find RF-22. No mention of 'checkboxes'."
    covered_by_steps: ["STEP-02"]

  - ac_id: AC-34.2
    how_to_verify: "In RF-22, the add-actor flow describes role inference from field context."
    covered_by_steps: ["STEP-02"]

  - ac_id: AC-34.3
    how_to_verify: "Open SPEC.final.md, find section 7.13.4. No mention of 'checkboxes'."
    covered_by_steps: ["STEP-02"]

  - ac_id: AC-34.4
    how_to_verify: "In section 7.13.4, the add-actor bullet describes role inference from field context."
    covered_by_steps: ["STEP-02"]

  - ac_id: AC-34.5
    how_to_verify: "Section 7.13.4 has a bullet for 'Opcao de editar' describing name-only editing."
    covered_by_steps: ["STEP-02"]

  - ac_id: AC-36.1
    how_to_verify: "Open SPEC.final.md, find auto-save debounce rule. Rule states 500ms minimum."
    covered_by_steps: ["STEP-03"]

  - ac_id: AC-36.2
    how_to_verify: "The debounce rule specifies local state management with useState."
    covered_by_steps: ["STEP-03"]

  - ac_id: AC-36.3
    how_to_verify: "The rule explicitly mentions agenda, members, and topics as applicable scopes."
    covered_by_steps: ["STEP-03"]

  - ac_id: AC-37.1
    how_to_verify: "Open SPEC.final.md section 7.8. Text says 'Bispado e Secretario' for Users card visibility."
    covered_by_steps: ["STEP-04"]

  - ac_id: AC-37.2
    how_to_verify: "Open SPEC.final.md section 4.2 table. Row 'Gerenciar usuarios (CRUD)' shows 'Yes' for Secretario."
    covered_by_steps: ["STEP-04"]

  - ac_id: AC-37.3
    how_to_verify: "Both section 7.8 and 4.2 indicate settings:users is granted to Bispado and Secretario."
    covered_by_steps: ["STEP-04", "STEP-05"]

  - ac_id: AC-37.4
    how_to_verify: "Section 7.8 says 'Observador NAO ve o card'. Section 4.2 shows 'No' for Observador."
    covered_by_steps: ["STEP-04"]
```

---

## Execution Order Diagram

```
Phase 1 (all independent, can run in parallel):
  STEP-01 (CR-31 ASM-009 fix) ────────────────┐
  STEP-02 (CR-34 actor redesign spec update) ──┤
  STEP-03 (CR-36 debounce rule addition) ──────┤
  STEP-04 (CR-37 Secretary users access) ──────┤
                                                |
Phase 2 (depends on all Phase 1):             |
  STEP-05 (consistency verification) <─────────┘
```

### Parallel Tracks

- **Track A:** STEP-01 (SPEC.final.md -- ASM-009 row only)
- **Track B:** STEP-02 (PRODUCT_SPECIFICATION.md RF-22 + SPEC.final.md section 7.13.4)
- **Track C:** STEP-03 (SPEC.final.md -- new section 13.6)
- **Track D:** STEP-04 (SPEC.final.md -- sections 7.8 and 4.2)

All 4 tracks edit non-overlapping sections of the files, so they can run in parallel.
STEP-05 is a final cross-check that must run after all edits are complete.

### File Conflict Map

Files modified by multiple steps (can still run in parallel due to non-overlapping sections):

| File | Steps | Sections Modified |
|------|-------|-------------------|
| `docs/SPEC.final.md` | STEP-01, STEP-02, STEP-03, STEP-04 | ASM-009 (~line 1509), section 7.13.4 (~line 942), section 13.6 (new), sections 4.2+7.8 (~lines 89, 701) |
| `docs/PRODUCT_SPECIFICATION.md` | STEP-02 | RF-22 (~lines 738-753) |

Note: Although all 4 steps touch SPEC.final.md, they modify completely different sections
(assumptions table, actor selector section, non-functional requirements, permissions/settings).
If editing sequentially within the same file, any order works since the sections are independent.
