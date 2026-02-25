# Cursor Rules for Huzly

This document defines how Cursor should behave when generating,
modifying, or suggesting code for the Huzly mobile application.

Goal: maintain a scalable, production-ready React Native architecture.

---

## General Development Rules

- Use **TypeScript** for all code.
- Follow **React Native + Expo best practices**.
- Prefer maintainability over quick solutions.
- Keep implementations simple, readable, and scalable.
- Do not introduce new libraries unless explicitly requested.
- Always explain:
  - files modified
  - reason for change
  - potential impact.

### Code Quality
- Avoid large files (>300–400 lines).
- Prefer reusable components.
- Extract logic into hooks or services.
- Avoid duplicated logic.
- Use consistent naming conventions.

### UI & UX Standards
Every screen must include:
- loading states
- error handling
- empty states

Components must remain reusable and composable.

---

## Architecture Rules

Huzly follows a **feature-based scalable architecture**.

### Project Structure

src/
  features/
    auth/
    onboarding/
    shifts/
    profile/

  components/
  hooks/
  services/
  store/
  utils/
  types/
  config/

### Feature Ownership

Each feature contains:

feature/
 ├── screens/
 ├── components/
 ├── hooks/
 ├── services/
 ├── types.ts

Rules:
- Features must remain isolated.
- Avoid cross-feature dependencies.
- Shared logic belongs in shared folders.

---

## Component Rules

Components must:
- Be presentational when possible.
- Avoid direct API calls.
- Avoid business logic.
- Receive data via props or hooks.

---

## Hooks Rules

Hooks handle:
- business logic
- async operations
- state orchestration

Examples:
- useAuth
- useWorkerProfile
- useShifts

---

## Services Layer Rules

All API and Supabase interactions belong inside `services/`.

Rules:
- No API calls inside screens.
- No Supabase logic inside UI components.
- Services must be reusable.

---

## State Management Rules

- Prefer local state first.
- Use hooks for shared logic.
- Introduce global state only when necessary.
- Avoid premature optimization.

Supabase session is the single source of truth for authentication.

---

## Authentication Rules

- Authentication handled via Supabase.
- Session persisted using AsyncStorage.
- App startup must validate session before rendering protected routes.
- Protected routes must not render before auth validation completes.

---

## Git Workflow Rules

### Branching Strategy

Never implement features directly on `main`.

Before starting a feature:

Create a branch using:

feature/<feature-name>
fix/<issue-name>
refactor/<scope>
chore/<task>

Examples:
- feature/auth-login
- feature/worker-onboarding
- feature/shifts-discovery
- fix/session-refresh
- refactor/navigation

Cursor should:
- Suggest branch name before implementation.
- Confirm feature scope.
- Assume development occurs inside that branch.

---

## Feature Implementation Rules

Before implementing a feature, Cursor must:

1. Understand feature scope.
2. Identify affected modules.
3. Suggest minimal architecture changes.
4. Respect existing structure.

### Development Flow

Create branch  
→ Implement feature  
→ Add loading/error handling  
→ Keep logic modular  
→ Commit changes  
→ Prepare merge to main

Rules:
- Implement incrementally.
- Avoid large refactors unless requested.
- Extend architecture instead of rewriting it.
- Maintain backward compatibility.

---

## File Modification Rules

Cursor must:
- Modify only necessary files.
- Avoid unrelated refactors.
- Preserve developer-written logic.
- Clearly list modified files after changes.

---

## Performance Guidelines

- Avoid unnecessary re-renders.
- Memoize expensive computations when needed.
- Keep screens lightweight.
- Lazy load heavy modules when appropriate.

---

## Security Rules

- Never expose secrets.
- Always use environment variables.
- No hardcoded API keys.
- Supabase service role keys must never exist in client code.

---

## AI Collaboration Principles

Cursor acts as a **Senior React Native Engineer**.

Priorities:
- scalability
- maintainability
- predictable architecture
- clean separation of concerns

Avoid hacks or temporary solutions unless explicitly requested.