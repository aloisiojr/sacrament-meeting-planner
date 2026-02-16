# PLAN_CR3_F028 - Navigation & UI Conventions (CR-33, CR-40)

## PLAN_SUMMARY

```yaml
type: plan_summary
total_steps: 4
parallel_tracks: 2
estimated_commits: 4
coverage:
  acceptance_criteria: 9/9
  edge_cases: 2/2
critical_path:
  - "STEP-01: Add back button to Members screen (CR-33 code change)"
  - "STEP-02: Add global back-button convention rule to SPEC.final.md (CR-33 spec)"
main_risks:
  - "CR-33: Adding back button to Members screen changes header layout -- '+' add button must remain accessible"
  - "CR-40: Documentation-only change, low risk"
```

---

## PLAN

```yaml
type: plan
version: 1

goal: "Add back button to Members screen and establish global back-button convention (CR-33). Resolve add-member button position inconsistency in documentation (CR-40)."

strategy:
  order: "CR-33 code change first (STEP-01), then CR-33 spec update (STEP-02). CR-40 is independent (STEP-03). Final verification last."
  commit_strategy: "1 commit per step: feat: for code, docs: for spec changes"
  test_strategy: "Manual verification of back button on Members screen. No automated tests (UI change + doc changes)."
```

---

## Steps

### STEP-01: CR-33 -- Add Back Button to Members Screen

```yaml
- id: STEP-01
  description: |
    Add a back button to the Members screen header, following the same pattern
    used in WhatsApp, History, and Topics screens.

    Changes to src/app/(tabs)/settings/members.tsx:
    1. Add import: import { useRouter } from 'expo-router';
    2. Add in component: const router = useRouter();
    3. Restructure the header View from:
         <View style={styles.header}>
           <Text style={[styles.title, ...]}>Members</Text>
           {canWrite && <Pressable ...>+</Pressable>}
         </View>
       To:
         <View style={styles.header}>
           <Pressable onPress={() => router.back()} accessibilityRole="button">
             <Text style={[styles.backButton, { color: colors.primary }]}>
               {t('common.back')}
             </Text>
           </Pressable>
           <Text style={[styles.title, { color: colors.text }]}>
             {t('members.title')}
           </Text>
           {canWrite ? (
             <Pressable style={[styles.addButton, ...]} onPress={handleAdd}>
               <Text ...>+</Text>
             </Pressable>
           ) : (
             <View style={styles.headerSpacer} />
           )}
         </View>
    4. Add styles:
         backButton: { fontSize: 16, fontWeight: '600' }
         headerSpacer: { width: 36 }  // matches addButton width for centering

    The header uses a 3-element layout: back button (left), title (center), add button or spacer (right).
    This matches the pattern used in the About screen and other settings sub-screens.
  files:
    - "src/app/(tabs)/settings/members.tsx"
  dependencies: []
  parallelizable_with: ["STEP-03"]
  done_when:
    - "Members screen has a back button in the top-left of the header"
    - "Back button uses t('common.back') for the label"
    - "Tapping back button calls router.back() and returns to Settings index"
    - "'+' add button remains visible and functional for users with member:write permission"
    - "Header layout is 3-element: back (left), title (center), add/spacer (right)"
    - "Back button style matches WhatsApp/History/Topics pattern"
  tests:
    - type: manual
      description: "Navigate to Members -> back button visible -> tap -> returns to Settings"
    - type: manual
      description: "Members screen '+' add button still works after header restructure"
  covers:
    acceptance_criteria: ["AC-33.3", "AC-33.4", "AC-33.5"]
    edge_cases: []
  risks:
    - risk: "Header restructure may break existing layout or accessibility"
      mitigation: "Follow the exact same pattern as About screen header (3-element row)"
```

### STEP-02: CR-33 -- Add Global Back-Button Convention Rule to SPEC.final.md

```yaml
- id: STEP-02
  description: |
    Add a new rule to SPEC.final.md in section 13 (Requisitos Nao-Funcionais)
    documenting the global back-button convention for Stack-navigated screens.

    Add new subsection (after existing last subsection in section 13):

    ### 13.X Regra de Navegacao: Botao Voltar em Telas Stack

    Toda tela acessada via navegacao Stack (sub-telas de Configuracoes e outras
    telas empilhadas) DEVE ter um botao de voltar no header, seguindo o padrao:
    - Posicao: topo-esquerdo do header
    - Componente: Pressable com texto usando a chave i18n `common.back`
    - Acao: `router.back()` (expo-router)
    - Estilo: fontSize 16, fontWeight '600', cor `colors.primary`
    - Excecao: telas de tab principal (Home, Agenda, Discursos, Configuracoes) NAO
      tem botao voltar
    - Excecao: Presentation Mode usa botao de fechar proprio (especificado em 7.14.5)

    Note: Check the last existing subsection number in section 13 before adding
    to ensure correct numbering (e.g., if last is 13.6, this becomes 13.7 or later).
  files:
    - "docs/SPEC.final.md"
  dependencies: ["STEP-01"]
  parallelizable_with: ["STEP-03"]
  done_when:
    - "SPEC.final.md contains a global rule for back buttons on Stack screens"
    - "Rule specifies position, component, action, style, and exceptions"
    - "Rule is in section 13 (Non-Functional Requirements)"
    - "Section numbering is correct"
  tests:
    - type: unit
      description: "Manual review: verify rule content matches spec"
  covers:
    acceptance_criteria: ["AC-33.1", "AC-33.2"]
    edge_cases: ["EC-33.1", "EC-33.2"]
  risks:
    - risk: "Section numbering may conflict with F025 additions (section 13.6 for auto-save)"
      mitigation: "Check the actual last subsection after F025 edits before numbering"
```

### STEP-03: CR-40 -- Update Add-Member Button Position in Both Spec Documents

```yaml
- id: STEP-03
  description: |
    Resolve the inconsistency between the two spec documents about the
    add-member "+" button position. Align both documents with the actual
    implementation (header row, right of title).

    Change 1: docs/SPEC.final.md section 7.4.1 (~line 623)
    From: 'Botao FAB (+) no canto inferior direito para adicionar'
    To:   'Botao "+" no header, a direita do titulo, para adicionar novo membro'

    Change 2: docs/PRODUCT_SPECIFICATION.md RF-01 (~line 103)
    From: 'E ve botao "+" (a direita do campo de search)'
    To:   'E ve botao "+" no header (a direita do titulo da tela)'

    No code changes needed -- the implementation already uses the header-row pattern.
  files:
    - "docs/SPEC.final.md"
    - "docs/PRODUCT_SPECIFICATION.md"
  dependencies: []
  parallelizable_with: ["STEP-01", "STEP-02"]
  done_when:
    - "SPEC.final.md section 7.4.1 says '+' button is in header, right of title (no FAB)"
    - "PRODUCT_SPECIFICATION.md RF-01 says '+' button is in header, right of title (not search)"
    - "Both documents are consistent with each other and with the code"
    - "No code changes made (code is already correct)"
  tests:
    - type: unit
      description: "Manual review: grep for 'FAB' in SPEC.final.md section 7.4 -- no results"
  covers:
    acceptance_criteria: ["AC-40.1", "AC-40.2", "AC-40.3", "AC-40.4"]
    edge_cases: []
  risks:
    - risk: "Line numbers may have shifted from previous edits"
      mitigation: "Search for 'FAB' and 'canto inferior direito' strings"
```

### STEP-04: Final Verification

```yaml
- id: STEP-04
  description: |
    Final verification:
    1. TypeScript compiles without errors: npx tsc --noEmit
    2. Members screen has back button (code review)
    3. Global back-button rule exists in SPEC.final.md section 13
    4. SPEC.final.md section 7.4.1 no longer mentions FAB
    5. PRODUCT_SPECIFICATION.md RF-01 no longer says '+' is next to search
    6. All other settings sub-screens still have their existing back buttons
    7. Settings index (tab screen) does NOT have a back button
  files:
    - "src/app/(tabs)/settings/members.tsx"
    - "docs/SPEC.final.md"
    - "docs/PRODUCT_SPECIFICATION.md"
  dependencies: ["STEP-01", "STEP-02", "STEP-03"]
  parallelizable_with: []
  done_when:
    - "TypeScript compiles without errors"
    - "Members screen has back button"
    - "No FAB references in member-related spec sections"
    - "Global back-button rule documented"
  tests:
    - type: integration
      description: "Full verification of code and docs"
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
  - ac_id: AC-33.1
    how_to_verify: "Open SPEC.final.md section 13. Global back-button rule exists."
    covered_by_steps: ["STEP-02"]

  - ac_id: AC-33.2
    how_to_verify: "Rule specifies: position (top-left), i18n key (common.back), style, action (router.back())."
    covered_by_steps: ["STEP-02"]

  - ac_id: AC-33.3
    how_to_verify: "Navigate to Members screen. Back button visible in top-left."
    covered_by_steps: ["STEP-01"]

  - ac_id: AC-33.4
    how_to_verify: "Members back button matches pattern: fontSize 16, fontWeight 600, colors.primary."
    covered_by_steps: ["STEP-01"]

  - ac_id: AC-33.5
    how_to_verify: "Navigate to each settings sub-screen. All have back buttons."
    covered_by_steps: ["STEP-01", "STEP-04"]

  - ac_id: AC-40.1
    how_to_verify: "Open SPEC.final.md section 7.4.1. Says '+' button in header, right of title."
    covered_by_steps: ["STEP-03"]

  - ac_id: AC-40.2
    how_to_verify: "Open PRODUCT_SPECIFICATION.md RF-01. Says '+' button in header, right of title."
    covered_by_steps: ["STEP-03"]

  - ac_id: AC-40.3
    how_to_verify: "Both documents describe the same button position. Code matches."
    covered_by_steps: ["STEP-03", "STEP-04"]

  - ac_id: AC-40.4
    how_to_verify: "No code changes needed -- code already implements header-row pattern."
    covered_by_steps: ["STEP-03"]
```

---

## Execution Order Diagram

```
Phase 1 (independent, can run in parallel):
  STEP-01 (Members back button - code) ──┐
  STEP-03 (button position docs fix) ────┤
                                          │
Phase 2 (depends on STEP-01):            │
  STEP-02 (global rule in spec) ─────────┤
                                          │
Phase 3 (depends on all):                │
  STEP-04 (verification) <───────────────┘
```

### File Conflict Map

| File | Steps | Sections Modified |
|------|-------|-------------------|
| `src/app/(tabs)/settings/members.tsx` | STEP-01 | Header (add back button, restructure layout) |
| `docs/SPEC.final.md` | STEP-02, STEP-03 | Section 13 (new rule), section 7.4.1 (FAB -> header) |
| `docs/PRODUCT_SPECIFICATION.md` | STEP-03 | RF-01 (button position clarification) |

Note: STEP-02 and STEP-03 both touch SPEC.final.md but in non-overlapping sections
(section 13 vs section 7.4.1). If editing sequentially, any order works.
