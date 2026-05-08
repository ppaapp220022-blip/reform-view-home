---
name: reform-design
description: Use this skill to generate well-branded interfaces and assets for RE:FORM — a Korean sports-uniform resale marketplace with a community board — either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping. Pairs varsity sports energy with a calm transaction-platform feel; navy + red on cool neutrals; Pretendard for Korean, IAMAPLAYER for EN/numerals.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

Key entry points:
- `README.md` — brand context, content fundamentals, visual foundations, iconography
- `colors_and_type.css` — drop-in token CSS (no Tailwind required)
- `reference/index.css` and `reference/tailwind.config.ts` — original token sources for production
- `assets/` — logos and product icon (use the PNG until SVGs are restored)
- `fonts/` — Pretendard 400–800 + IAMAPLAYER (Latin/numerals only)
- `ui_kits/web/` — mobile-first marketplace recreation

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
