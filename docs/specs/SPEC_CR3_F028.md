# Change Requests Batch 3 - Navigation & UI Conventions (SPEC_CR3_F028)

Feature: F028 - Navigation & UI Conventions
Type: Documentation corrections + minor code convention enforcement

---

## SPEC_SUMMARY

```yaml
type: spec_summary
goal: "Establish global back-button convention and resolve add-member button position inconsistency (CR-33, CR-40)"
in_scope:
  - "CR-33: Define global back-button convention for all Stack-navigated screens"
  - "CR-40: Resolve add-member button position inconsistency between PRODUCT_SPECIFICATION and SPEC.final.md"
out_of_scope:
  - "Changes to screens that already have back buttons (WhatsApp, History, Topics)"
  - "Changes to tab navigation behavior"
  - "Back button for Presentation Mode (already specified separately in SPEC 7.14.5)"
main_risks:
  - "CR-33 requires adding back button to Members screen (only Stack screen currently missing one)"
  - "CR-40 requires aligning two spec documents; code already implements header-row style (not FAB)"
ac_count: 9
edge_case_count: 2
has_open_questions: false
has_unconfirmed_assumptions: false
```

---

## CR-33: Define Global Back-Button Convention for Stack Screens

- **Type:** SPEC FALTANDO (Missing spec)
- **Description:** There is no global convention for back buttons on Stack-navigated screens. The PRODUCT_SPECIFICATION only defines a back button for the Members screen (RF-01: "ve botao de voltar (a esquerda do campo de search)"). This gap caused 3 separate bugs:
  - CR-17: WhatsApp template screen had no back button (fixed)
  - CR-19: History screen had no back button (fixed)
  - CR-20: Topics screen had no back button (fixed)

  After those fixes, WhatsApp (`whatsapp.tsx`), History (`history.tsx`), and Topics (`topics.tsx`) all have back buttons following the same pattern: text-based Pressable using `router.back()` with `t('common.back')` label, positioned at top-left of the header.

  However, the Members screen (`members.tsx`) still has NO back button and NO router import, despite RF-01 specifying one. Additionally, no global rule exists to prevent this from recurring.

- **Current State:**
  - **PRODUCT_SPECIFICATION.md RF-01:** Mentions `botao de voltar (a esquerda do campo de search)` for Members screen only.
  - **SPEC.final.md:** No global back-button rule. Only mentions back button for Presentation Mode (section 7.14.5).
  - **Code:** Members screen (`src/app/(tabs)/settings/members.tsx`) has no back button. WhatsApp, History, and Topics screens have back buttons (all using the same pattern).

- **Required Changes:**
  1. **Add global rule to SPEC.final.md** (in section 13 "Requisitos Nao-Funcionais" or a new UX conventions subsection):
     ```
     ### Regra de Navegacao: Botao Voltar em Telas Stack

     Toda tela acessada via navegacao Stack (sub-telas de Configuracoes e outras telas empilhadas) DEVE ter um botao de voltar no header, seguindo o padrao:
     - Posicao: topo-esquerdo do header
     - Componente: Pressable com texto usando a chave i18n `common.back`
     - Acao: `router.back()` (expo-router)
     - Estilo: fontSize 16, fontWeight '600', cor `colors.primary`
     - Excecao: telas de tab principal (Home, Agenda, Discursos, Configuracoes) NAO tem botao voltar
     ```
  2. **Add back button to Members screen** (`src/app/(tabs)/settings/members.tsx`):
     - Import `useRouter` from `expo-router`
     - Add back button Pressable in the header, to the left of the title
     - Follow the same pattern as WhatsApp/History/Topics screens

- **Acceptance Criteria:**
  - AC-33.1: SPEC.final.md contains a global rule stating that all Stack-navigated screens must have a back button in the header. Priority: must.
  - AC-33.2: The rule specifies the exact pattern (position, i18n key, style, action). Priority: must.
  - AC-33.3: Members screen has a back button in the header that navigates back to Settings index when tapped. Priority: must.
  - AC-33.4: The back button on Members screen uses the same pattern as WhatsApp/History/Topics screens (`router.back()`, `t('common.back')`, top-left). Priority: must.
  - AC-33.5: All other Settings sub-screens (WhatsApp, History, Topics, Users, About) continue to have their existing back buttons. Priority: must.
- **Edge Cases:**
  - EC-33.1: The Settings index screen itself is the root of the Stack and does NOT have a back button (it is a tab screen).
  - EC-33.2: Presentation Mode has its own close/back button pattern (specified in SPEC 7.14.5) and is exempt from this convention.
- **Files Impacted:**
  - `docs/SPEC.final.md` (add global back-button rule)
  - `src/app/(tabs)/settings/members.tsx` (add back button to header)

---

## CR-40: Resolve Add-Member Button Position Inconsistency

- **Type:** INCONSISTENCIA (Spec inconsistency)
- **Description:** The add-member "+" button has different specified positions in the two spec documents:
  1. **PRODUCT_SPECIFICATION.md RF-01 (line ~103):** Says `botao "+" (a direita do campo de search)` -- button is in the header area, to the right of search.
  2. **SPEC.final.md section 7.4.1 (line ~623):** Says `Botao FAB (+) no canto inferior direito para adicionar` -- a Floating Action Button at the bottom-right corner.

  These are two completely different UI patterns (header button vs. FAB).

- **Current Implementation (code analysis):**
  The actual code in `src/app/(tabs)/settings/members.tsx` (lines 466-477) places the "+" button in the **header row**, to the right of the screen **title** (not search). The layout is:
  ```
  Header: [Title "Membros"] .............. [+ button]
  Search: [Search input field                      ]
  ```
  The button is a small circular button (36x36px, borderRadius 18) with `backgroundColor: colors.primary`, positioned via `flexDirection: 'row'` and `justifyContent: 'space-between'` in the header. It is NOT a FAB.

- **Resolution:** The header-row position is the correct one to keep because:
  1. It matches the implemented code
  2. It is consistent with the pattern used in other screens (e.g., Topics screen after CR-21 moved the "+" to the section header)
  3. FABs are not used anywhere else in the app
  4. PRODUCT_SPECIFICATION.md (the primary product spec) specifies header position

- **Required Changes:**
  1. **Update SPEC.final.md section 7.4.1** (line ~623):
     - From: `Botao FAB (+) no canto inferior direito para adicionar`
     - To: `Botao "+" no header, a direita do titulo, para adicionar novo membro`
  2. **Update PRODUCT_SPECIFICATION.md RF-01** to clarify position relative to title (minor clarification):
     - From: `E ve botao "+" (a direita do campo de search)`
     - To: `E ve botao "+" no header (a direita do titulo da tela)`
     - Rationale: The "+" is not next to search; it's next to the title. Search is on a separate row below.

- **Acceptance Criteria:**
  - AC-40.1: SPEC.final.md section 7.4.1 no longer says FAB; it says the "+" button is in the header, to the right of the title. Priority: must.
  - AC-40.2: PRODUCT_SPECIFICATION.md RF-01 clarifies the "+" button is to the right of the title (not search). Priority: must.
  - AC-40.3: Both documents are consistent with each other and with the implemented code. Priority: must.
  - AC-40.4: No code changes needed for this CR (code already matches the corrected spec). Priority: must.
- **Files Impacted:**
  - `docs/SPEC.final.md` (section 7.4.1, line ~623)
  - `docs/PRODUCT_SPECIFICATION.md` (RF-01, line ~103)

---

## Assumptions

```yaml
assumptions:
  - id: A-CR33-1
    description: "The back-button pattern from WhatsApp/History/Topics screens (text-based, router.back(), common.back i18n key) is the canonical pattern to follow"
    confirmed: true
    default_if_not_confirmed: "N/A — verified from code in whatsapp.tsx, history.tsx"

  - id: A-CR33-2
    description: "Members screen is the only Settings sub-screen currently missing a back button"
    confirmed: true
    default_if_not_confirmed: "Audit all Settings sub-screens and add back buttons where missing"

  - id: A-CR40-1
    description: "The header-row position (not FAB) is the intended design, matching the implementation"
    confirmed: true
    default_if_not_confirmed: "Keep header-row position as implemented"

  - id: A-CR40-2
    description: "No code changes are needed for CR-40 since the code already implements the correct pattern"
    confirmed: true
    default_if_not_confirmed: "N/A"
```

---

## Open Questions

```yaml
open_questions: []
```

No open questions. Both CRs have clear resolutions based on code analysis and existing patterns.

---

## Implementation Notes

| CR | Type | Files (docs) | Files (code) |
|----|------|-------------|--------------|
| CR-33 | Spec + Code | `docs/SPEC.final.md` | `src/app/(tabs)/settings/members.tsx` |
| CR-40 | Spec only | `docs/SPEC.final.md`, `docs/PRODUCT_SPECIFICATION.md` | None |

### CR-33 Code Change Detail

In `src/app/(tabs)/settings/members.tsx`:
1. Add import: `import { useRouter } from 'expo-router';`
2. Add `const router = useRouter();` in the component
3. Add back button Pressable before the title in the header View:
   ```tsx
   <Pressable onPress={() => router.back()} accessibilityRole="button">
     <Text style={[styles.backButton, { color: colors.primary }]}>
       {t('common.back')}
     </Text>
   </Pressable>
   ```
4. Add `backButton` style: `{ fontSize: 16, fontWeight: '600' }`
5. Restructure header: back button (left), title (center or left-of-center), "+" button (right)

---

## Definition of Done

- [ ] Global back-button rule added to SPEC.final.md (CR-33)
- [ ] Members screen has a working back button (CR-33)
- [ ] Back button on Members screen follows the same pattern as WhatsApp/History/Topics (CR-33)
- [ ] SPEC.final.md section 7.4.1 updated from FAB to header button (CR-40)
- [ ] PRODUCT_SPECIFICATION.md RF-01 clarified: "+" is to the right of title, not search (CR-40)
- [ ] Both spec documents are consistent with each other and with code (CR-40)
- [ ] No regressions in existing back buttons on other screens
