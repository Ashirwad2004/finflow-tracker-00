# AI Coding Rules

## Before coding

* Read `brain.md` first.
* Inspect the relevant source files before making changes.
* Search for existing implementations before creating new ones.
* Do not guess about code, database schema, APIs, or dependencies.
* Change only what is necessary for the task.

## Architecture

* Follow existing project patterns.
* Reuse existing components, hooks, services, and utilities when possible.
* Do not introduce new libraries or architectural patterns without a reason.
* Keep TypeScript strongly typed; avoid `any`.

## Security

* Never expose secrets or Supabase service-role keys to the frontend.
* Never disable RLS as a shortcut.
* Never trust frontend authorization.
* Verify authentication, ownership, and permissions server-side/database-side.
* Validate all external/user/AI input.

## Financial data

* Treat money, GST, invoices, inventory, payments, and balances as critical.
* Never trust client-provided totals, prices, tax, discounts, or stock.
* Preserve existing calculation and rounding behavior unless the task explicitly changes it.
* Verify financial changes carefully.

## Bug fixing

* Find the root cause before changing code.
* Prefer the smallest safe fix.
* Do not hide errors with hacks or unnecessary fallbacks.
* Check for regressions after the fix.

## New features

* Inspect similar existing features first.
* Consider authentication, authorization, validation, errors, loading/empty states, and responsive behavior.
* For database changes, inspect migrations and existing RLS policies first.

## Verification

* Run relevant tests, type checks, lint, and build when available.
* Test both the normal path and important failure cases.
* Never claim something was tested if it wasn't.

## After coding

* Review the diff.
* Remove debugging code and unused imports.
* Do not modify unrelated files.
* Report:

  1. What changed
  2. Root cause (for bugs)
  3. Files changed
  4. Verification performed
  5. Remaining risks/assumptions

## Core principle

**Inspect first. Change minimally. Preserve security and financial correctness. Verify before declaring success.**
