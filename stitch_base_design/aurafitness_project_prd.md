# Project PRD: AuraFitness

## 1. Project Overview
AuraFitness is a personalized web application designed to help users manage their fitness and nutrition habits. The platform centralizes workout tracking, meal-prep recipe discovery, and shopping organization within a cohesive, minimalist interface.

## 2. Design Vision
*   **Aesthetic:** "Aura" – Inspired by a clean, light interface with a focus on "bleached orange" accents (#d97757).
*   **Typography:** Inter (Sans-serif) for high legibility.
*   **Mood:** Focused, professional, and performance-oriented, yet warm and accessible.

## 3. Core Features (V1)

### 3.1 Training & Workout Log
*   **Exercise Tracking:** Log sets, weight (kg), and repetitions for each exercise.
*   **History & Progress:** Per-day notes, goals, and achievement tracking to build a long-term training history.
*   **External Integration:** Direct links to exercise guides on `fitundaktiv.de` for reference.
*   **Logic:** Support for multiple training days and exercise-specific goals.

### 3.2 Healthy Recipes
*   **Categorization:** 16 initial recipes grouped by meal type:
    *   Breakfast
    *   Lunch
    *   Dinner
    *   Snacks & Shakes
*   **Details:** Estimated preparation times and macro-focused labels (e.g., High Protein, Vegan, Keto).

### 3.3 Weekly Shopping List
*   **Organization:** Grouped by department (Produce, Protein, Pantry).
*   **Interactivity:** Checklist functionality with "Clear All" and "Print" capabilities.
*   **Planning:** Based on a one-week meal cycle.

## 4. Technical Specifications
*   **Frontend:** React + Vite + TypeScript.
*   **Backend:** Python FastAPI.
*   **Database:** SQLite via SQLAlchemy for persistent workout history and user data.
*   **Architecture:** Decoupled frontend/backend to allow for future scalability.

## 5. Roadmap (Future Iterations)
*   **Personalization:** User profiles (height, weight, gender) driving diet goals (Bulk/Cut/Custom).
*   **Smart Recipes:** Auto-generated recipe suggestions based on local supermarket prices and promotions.
*   **Security:** OIDC authentication for multi-user support.

---
*Created by Stitch Design Assistant | Project: AuraFitness*