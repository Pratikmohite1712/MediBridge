# Design System Strategy: Soft Precision & The Editorial Clinic

## 1. Overview & Creative North Star
The vision for this design system is **"The Empathetic Architect."** 

In a world of cluttered, anxiety-inducing healthcare interfaces, we choose a path of "Soft Precision." We are moving away from the "generic blue app" look to create a high-end editorial experience that feels as authoritative as a medical journal and as calming as a modern wellness space. 

This design system breaks the standard "boxed-in" template by utilizing **intentional asymmetry** and **tonal depth**. We treat the screen as a canvas of layered light and paper, using whitespace not just as a gap, but as a functional tool to reduce cognitive load for patients and practitioners alike.

---

## 2. The Tonal Language (Colors)
Our palette is rooted in medical authority but executed with a premium, layered approach.

*   **Primary Identity:** Use `primary` (#003f87) for moments of absolute brand authority. For high-impact interactive elements, utilize a subtle linear gradient from `primary` to `primary_container` (#0056b3) to give buttons a "tactile soul" that flat colors lack.
*   **Healing Secondary:** Use `secondary` (#006e25) and its container variants to denote positive health outcomes, recovery, and "wellness" actions.
*   **Emergency & Alerts:** Use `tertiary` (#88001c) for critical alerts. The `tertiary_container` serves as a high-visibility background for urgent triage or allergy warnings.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section content. Boundaries must be defined solely through background color shifts.
*   Place a `surface_container_lowest` card on a `surface_container_low` background to create a boundary.
*   Use `surface_dim` for footer or navigation sidebars to ground the UI without hard lines.

### Glass & Gradient Implementation
Floating elements (like bottom navigation or emergency overlays) should utilize **Glassmorphism**. Use a semi-transparent `surface` color with a 20px backdrop blur. This allows the medical data behind it to "bleed through" softly, making the UI feel integrated and lightweight for low-bandwidth environments.

---

## 3. Typography: The Voice of Authority
We use a sophisticated pairing of **Manrope** and **Inter** to balance character with clinical legibility.

*   **The Editorial Anchor (Manrope):** All `display` and `headline` tokens utilize Manrope. Its geometric yet warm curves provide a premium, custom feel that separates this system from "out-of-the-box" frameworks.
*   **The Clinical Engine (Inter):** All `title`, `body`, and `label` tokens utilize Inter. Inter is chosen for its high X-height and exceptional readability in multi-language layouts (specifically handling the complexities of Hindi and Marathi scripts without losing clarity).

**Multi-Language Strategy:**
When rendering Hindi or Marathi, increase the `line-height` by an additional 15% across all `body` tokens to prevent the clipping of Matras (diacritics).

---

## 4. Elevation & Depth: The Layering Principle
Depth in this system is achieved through **Tonal Layering** rather than traditional drop shadows.

*   **The Stacking Rule:**
    *   **Level 0 (Base):** `surface` or `surface_container_low`.
    *   **Level 1 (Cards):** `surface_container_lowest`.
    *   **Level 2 (Active States):** `surface_bright`.
*   **Ambient Shadows:** If a "floating" effect is necessary (e.g., a critical prescription modal), use an ultra-diffused shadow: `Y: 16px, Blur: 32px, Color: on_surface @ 6% opacity`. The shadow should feel like a soft glow of ambient light, not a dark smudge.
*   **The "Ghost Border" Fallback:** For accessibility in high-glare environments, use a "Ghost Border"—the `outline_variant` token at **15% opacity**. Never use 100% opaque borders.

---

## 5. Components

### Buttons (High-Touch Targets)
*   **Primary:** Pill-shaped (`rounded-full`), using the `primary` to `primary_container` gradient. Minimum height of 56px to ensure accessibility for elderly users or those with motor impairments.
*   **Secondary:** `surface_container_high` background with `on_primary_fixed_variant` text. No border.
*   **Tertiary/Emergency:** `tertiary` fill only for immediate "Stop" or "Call Doctor" actions.

### Tonal Cards (The Core Unit)
*   Forbid the use of divider lines within cards.
*   Use `title-md` for headers and `body-md` for content.
*   Separate sections within a card using a 24px vertical padding jump (from the spacing scale) or a slight background shift to `surface_container_high`.

### Input Fields
*   **Stateful Design:** Avoid "box" inputs. Use a "soft-well" approach: `surface_container_highest` background with a `rounded-md` (0.75rem) corner. 
*   **Focus State:** Transition the background to `surface_lowest` and add a 2px `surface_tint` "Ghost Border" at 30% opacity.

### Language Switchers & Accessibility
*   Due to the multi-language requirement, chips must be dynamic in width.
*   Use `surface_container_high` for unselected languages and `primary_fixed` for the active language (English/Hindi/Marathi).

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical layouts (e.g., a large `display-md` headline left-aligned with a card offset to the right) to create a premium editorial feel.
*   **Do** prioritize `primary_fixed_dim` for icons to keep them visible but subordinate to text.
*   **Do** ensure all touch targets are at least 48x48px, even if the visual element is smaller.

### Don’t:
*   **Don’t** use black (#000000). Use `on_surface` (#191c1d) for all "black" text to maintain a soft, high-end look.
*   **Don’t** use standard "Material Blue." Stick to our custom `primary` (#003f87) to maintain brand distinction.
*   **Don’t** use dividers. Use the Spacing Scale (16px, 24px, 32px) to create "invisible" sections.

---

## 7. Signature Texture: The Medical Glimmer
To add a final layer of "High-End" polish, use a very large, low-opacity (5%) radial gradient of `secondary_container` in the top-right corner of main landing pages. It should feel like a soft "light leak" that suggests cleanliness, health, and a new day.