# AI Components Scope & Exclusions (SIKAD v4.0)

This document records the official project policy regarding AI features for **SIKAD v4.0** and the **Aether Platform**.

---

## 1. SIKAD AI Generator (EXCLUDED)

The **SIKAD AI Prompt & Question Generator** (features designed to auto-generate school lesson plans/RPP and exam questions) is **officially excluded** from the `00 Final Kurikulum` project scope. 

For reference, the following external files/folders contain the AI Generator code in other directories and **must not be imported or added to this project**:

*   **Frontend UI Script:** `D:\KURIKULUM\Data Kurikulum\Asesmen\soal-ai.js` (generates prompt configurations)
*   **Frontend Dependency:** `@google/genai` library (referenced in `D:\KURIKULUM\Aplikasi kurikulum\package.json`)
*   **Backend Edge Function:** `D:\KURIKULUM\Data Kurikulum\supabase\functions\generate-soal-ai` (handles OpenAI/Gemini API calls)

> [!IMPORTANT]
> Do **not** import, merge, or copy any of the above external AI generator files/features into `00 Final Kurikulum` during frontend integration or deployment.

---

## 2. Aether Platform Core Engines (REQUIRED - DO NOT DELETE)

The files in this project's `src/core/` folder containing the words "Agent", "Prompt", or "Semantic" are **core local development engines** for the Aether orchestration tool. They are **not** educational AI generators for SIKAD and **must not be deleted**:

| Core File | Purpose in Aether Platform (Development Env) | Status |
| :--- | :--- | :--- |
| **src/core/AgentManager.js** | Manages coding assistant agents (Claude, Cline, Antigravity) | **Required** |
| **src/core/PromptEngine.js** | Assembles coding/refactoring guidelines for development | **Required** |
| **src/core/SemanticIndexer.js** | Performs local codebase search indexing (KNN queries) | **Required** |
| **src/core/QualityEngine.js** | Executes linter and tests for auto-remediation | **Required** |
| **src/core/MonitoringEngine.js** | Tracks developer agent token consumption and costs | **Required** |
