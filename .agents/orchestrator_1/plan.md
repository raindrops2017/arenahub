# Orchestration Plan: Mobile App Codebase Audit & Refactoring Blueprint

## Objectives
1. Perform a comprehensive client-side codebase audit of the Expo SDK 54 mobile application (`app/`, `components/`, `context/`, `services/`, `data/`, `types/`, `dashboard/`, root configs). Exclude `server/` and `nest-server/`.
2. Research modern industry best practices for Expo SDK 54, React Native 0.81+, React 19, and NativeWind v5 / Tailwind v4.
3. Compile a structured Gap Analysis Matrix across all 6 architectural dimensions:
   - Dim 1: Architecture & Modular Directory Structure
   - Dim 2: State Management, Data Fetching & Caching
   - Dim 3: Type Safety, Runtime Schema Validation & Error Resilience
   - Dim 4: UI/UX Consistency, NativeWind v5 styling & Animations
   - Dim 5: Performance, Memory & Resource Optimization
   - Dim 6: Expo SDK 54 Conventions & Deprecation Avoidance
4. Formulate an actionable phased refactoring roadmap (Phase 0 to Phase 3) with concrete before-and-after code patterns, risk mitigations, and migration checklists.
5. Verify and challenge findings for technical rigor, feasibility, and adherence to requirements.
6. Deliver the comprehensive final report to the user.

## Work Breakdown & Milestones

### Milestone 1: Exploration & Spec Mining (Parallel Survey)
- **Explorer 1** (`explorer_arch_state_1`): Audit Architecture, Routing, State Management, Data Services, Types & Error Handling.
- **Explorer 2** (`explorer_ui_perf_1`): Audit UI Components, Styling (NativeWind/Tailwind), Design Tokens, Animations, Performance, List virtualizations, and SDK 54 API usage.
- **Spec Miner** (`spec_miner_best_practices_1`): Mine Expo SDK 54 official documentation, React 19 standards, and NativeWind v5 patterns for target best practices.

### Milestone 2: Synthesis & Roadmap Formulation
- Synthesize findings into a detailed 6-dimension Gap Analysis Matrix.
- Draft Phased Refactoring Roadmap (Phase 0: Quick Wins, Phase 1: Core Architecture, Phase 2: State/Networking, Phase 3: UI/Performance) with before-and-after code examples, migration checklists, and risk mitigations.

### Milestone 3: Review & Verification
- Reviewer verification (`reviewer_1`) to validate architectural integrity, coverage, and actionable clarity.
- Challenger stress-testing (`challenger_1`) to evaluate migration risk, breaking change handling, and edge case coverage.

### Milestone 4: Final Synthesis & Delivery
- Compile the final comprehensive audit & refactoring report.
- Deliver summary and full artifacts to the user.
