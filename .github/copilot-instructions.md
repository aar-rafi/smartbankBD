# ChequeMate AI - Copilot Instructions

## Project Overview
ChequeMate AI is a React + TypeScript web app that extracts and validates banking cheque information using Google's Gemini vision AI. The app processes cheque images, parses structured data via JSON schema validation, and runs business logic checks.

**Tech Stack:** React 19, Vite, TypeScript, @google/genai SDK, Tailwind CSS

## Architecture & Data Flow

### Three-Stage Processing Pipeline
1. **Image Upload** → `ImageUploader.tsx` captures file via drag-drop or file input
2. **AI Analysis** → `geminiService.ts` sends base64 image to Gemini-3-pro-preview with structured schema
3. **Validation** → `validationService.ts` runs 6+ business rule checks on extracted data
4. **Results Display** → `AnalysisResults.tsx` + `ValidationChecklist.tsx` render findings

### State Management Pattern
- Single `AnalysisState` in `App.tsx` controls all UI flow: `idle` → `analyzing` → `validating` → `success`/`error`
- Errors are caught at `handleImageSelected()` and displayed to user via error state
- **Key Type:** `ChequeData` (see `types.ts`) has 12 fields, most are optional (`null` if undetected by AI)

### Service Boundaries

**`geminiService.ts`**
- Initializes GoogleGenAI client using `process.env.API_KEY` (set via Vite config from `.env.local`)
- Uses structured schema (`chequeSchema`) to constrain Gemini output to exact JSON shape
- Handles base64 image encoding and MICR character normalization (replaces `|`:`` with spaces)
- **Important:** Only `hasSignature` is required in schema; other fields can be null/empty strings for illegible text

**`validationService.ts`**
- Runs 8 checks: completeness, date validity, amount matching, signature, MICR format, account existence, cheque status, funds availability
- Calls real database functions from `dbQueries.ts` instead of mocks
- Returns `ValidationResult` with array of `ValidationRule` objects; each rule has status: `pass`|`fail`|`warning`
- Stores validation results in `cheque_validations` table asynchronously

## Critical Workflows

### Environment Setup
```
1. npm install
2. Create .env.local with: 
   - GEMINI_API_KEY=<your-key>
   - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD (PostgreSQL)
3. Set up PostgreSQL database: psql -U postgres -f database/schema.sql
4. npm run dev (runs Vite at http://localhost:3000)
```
The API key and database credentials are injected at build-time via Vite's `define` config, not runtime dotenv. See `.env.local.example` for required variables.

### Database Architecture
- **PostgreSQL 12+** stores accounts, cheque books, and validation history
- **`db.ts`** manages connection pooling using `pg` library
- **`dbQueries.ts`** contains query functions: `checkAccountExists()`, `checkChequeStatus()`, `checkSufficientFunds()`
- **`server.js`** (optional) provides Express backend for secure API calls from frontend
  - Run with `node server.js` on port 3001
  - Exposed endpoints: `/api/validate-cheque`, `/api/account-details`, `/api/health`

### Adding New Validation Rules
Edit `validateChequeData()` in `validationService.ts`:
- Push new `ValidationRule` objects to `rules[]` array
- Exactly follow existing patterns (id, label, status, optional message)
- Keep async mock APIs for realistic UX (validation shows "validating" state while running)

### Extending Extracted Fields
1. Add field to `ChequeData` interface in `types.ts`
2. Add property to `chequeSchema` in `geminiService.ts` with clear description
3. Update Gemini prompt text if field needs special handling
4. Update result display in `AnalysisResults.tsx` (ResultRow component)

## Key Patterns & Conventions

**Image Encoding Flow**
- Files are read as base64 data URLs, then stripped: `base64Data.split(',')[1]` extracts raw base64
- MIME type passed separately to Gemini; supports image/* types

**Schema-Driven AI Output**
- Gemini uses `responseMimeType: "application/json"` + `responseSchema` to force structured output
- Prevents freeform text responses; failures throw JSON parse errors (caught upstream)
- Schema descriptions are critical for Gemini accuracy

**Component Props Pattern**
- Components are simple presentational; all state lives in `App.tsx`
- Props include callback handlers (e.g., `onImageSelected`, `onReset`) for state mutations
- Loading states disable UI elements (ImageUploader sets `isLoading` prop based on status !== 'idle')

**Tailwind Utility-First**
- All styling uses Tailwind classes; no CSS files
- Color scheme: indigo (primary), slate (text), with success/warning/error variants (green/amber/red)
- Responsive breakpoints: `sm:`, `lg:` for mobile-first design

## Common Tasks

**Debugging AI Responses**
- Check Gemini prompt in `geminiService.ts` line ~36 for clarity
- Verify schema descriptions match expected text location on cheque
- Log `response.text` before JSON.parse to inspect raw output

**Improving Validation Accuracy**
- Current MICR check only validates character count; expand regex if needed
- Amount matching is placeholder-only (rules.push but no actual comparison logic)
- Account existence check requires connecting mock to real bank API

**Testing a New Cheque Image**
- Use `npm run dev`, upload image in browser
- Monitor Network tab for Gemini API request/response timing (~3-5s typical)
- Check console for parse errors or service exceptions

## Gotchas & Constraints

- **API Key Security:** Must be in `.env.local` (git-ignored); Vite requires explicit `define` entries
- **No null-coalescing:** Fields default to empty strings not null; component checks `value === null || value === ''`
- **Gemini Model:** Currently hardcoded to `"gemini-3-pro-preview"`; update if model name changes
- **Date Parsing:** Uses native `Date` object; fragile with non-ISO formats; consider date-fns for robustness
- **Mock Delays:** Async mock functions use `setTimeout`; remove in production when connecting to real APIs
