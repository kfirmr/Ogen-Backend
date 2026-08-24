---
applyTo: "**"
description: "Ogen product philosophy and business logic: the Michal persona, the Done-For-You automation model, autonomous AI worker blueprints, and the gamification and streak mechanics that every technical and UI decision must align with."
---

# Ogen (עוגן) — Business Logic & Product Philosophy

This document outlines the core business rules, target audience psychology, and product mechanics
for Ogen — "The Financial Advisor in your Pocket". All technical and UI decisions must align with
these principles.

## 1. The Target Persona: Michal

- **Demographics:** Michal is a 34-year-old mother of two, working full-time, with a joint household
  income of ~14,000 NIS.
- **Pain Points:** She is exhausted, dealing with a constant overdraft (minus), and has zero free
  time or energy to learn financial concepts. Financial management feels like a scary, boring chore
  that forces her to sacrifice her family's current lifestyle.
- **Behavior:** She prefers consuming quick content on TikTok and Facebook over reading
  spreadsheets.

## 2. The Core Philosophy: "Done For You" (DFY)

Do not build tools that require Michal to do "homework". The system must operate on a **1-to-Many
automated model**, where the AI acts as her personal account manager.

- **Zero Theory:** We do not teach her how to calculate interest rates; the system calculates it and
  presents only the bottom line (e.g., "You have an expensive loan, let's recycle it").
- **Automated Execution:** Instead of telling her to save, the system actively performs the action
  on her behalf with minimal clicks.

## 3. Autonomous AI & Worker Mechanics (The Features)

When developing backend logic or workers, adhere to these operational blueprints:

- **Smart Budgeting:** The system scans 3 months of bank data and auto-generates a working budget
  within 30 seconds. The user only needs to click "Approve".
- **Daily Expense Tracking:** An AI agent runs every morning, auto-categorizes new credit card
  transactions, and sends a frictionless lock-screen notification summarizing the status.
- **Cheaper Alternatives:** The system ingests the user's bills, actively hunts for cheaper
  alternatives, and performs the transition for them.
- **Passive Income Automation:** A worker monitors the account, detects when the monthly salary is
  deposited, automatically invests the predefined amount, and reports the success.

## 4. Gamification & Retention (The "Streak")

To keep Michal engaged without feeling burdened:

- **Instant Gratification:** Every time the system saves money or makes an investment, it must
  instantly visualize the future growth or current savings to provide a "quick win".
- **Streak Trackers:** Implement streak tracking (e.g., "3 weeks on budget!", "5 months
  investing!") to create a psychological shield against breaking the habit.
