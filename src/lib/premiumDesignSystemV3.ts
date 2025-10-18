// Premium Design System v3.0 - Flexible Guidelines for Variety
// Philosophy: GUIDE for premium quality, not a rigid template
// Each generation should feel unique while maintaining professional standards

/**
 * COLOR PALETTE SYSTEM - Multiple Options for Variety
 * Claude will randomly select ONE palette per generation
 * This ensures variety between generations while maintaining consistency within each site
 */

const COLOR_PALETTES = {
  // Dark Themes (50% probability)
  darkModern: {
    background: "#0a0a0b",
    text: "#ffffff",
    textSecondary: "#94a3b8",
    accent: ["#667eea", "#764ba2"], // Purple gradient
    cardBg: "rgba(255,255,255,0.03)",
    border: "rgba(255,255,255,0.08)"
  },
  
  darkElegant: {
    background: "#0f0f10",
    text: "#f8fafc",
    textSecondary: "#cbd5e1",
    accent: ["#6366f1", "#8b5cf6"], // Indigo-purple
    cardBg: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.1)"
  },
  
  darkBold: {
    background: "#1a1a1c",
    text: "#ffffff",
    textSecondary: "#a1a1aa",
    accent: ["#3b82f6", "#8b5cf6"], // Blue-purple
    cardBg: "rgba(59,130,246,0.05)",
    border: "rgba(59,130,246,0.15)"
  },
  
  darkWarm: {
    background: "#1c1917",
    text: "#fafaf9",
    textSecondary: "#a8a29e",
    accent: ["#f59e0b", "#ef4444"], // Orange-red
    cardBg: "rgba(245,158,11,0.04)",
    border: "rgba(245,158,11,0.1)"
  },
  
  darkCool: {
    background: "#0c1222",
    text: "#f1f5f9",
    textSecondary: "#94a3b8",
    accent: ["#14b8a6", "#3b82f6"], // Teal-blue
    cardBg: "rgba(20,184,166,0.04)",
    border: "rgba(20,184,166,0.12)"
  },
  
  // Light Themes (50% probability)
  lightClean: {
    background: "#ffffff",
    text: "#0f172a",
    textSecondary: "#64748b",
    accent: ["#6366f1", "#a855f7"], // Vibrant purple
    cardBg: "rgba(99,102,241,0.04)",
    border: "rgba(99,102,241,0.1)"
  },
  
  lightSoft: {
    background: "#f8fafc",
    text: "#1e293b",
    textSecondary: "#475569",
    accent: ["#8b5cf6", "#ec4899"], // Purple-pink
    cardBg: "rgba(255,255,255,0.8)",
    border: "rgba(139,92,246,0.15)"
  },
  
  lightWarm: {
    background: "#fef3c7",
    text: "#78350f",
    textSecondary: "#92400e",
    accent: ["#f59e0b", "#ef4444"], // Warm gradient
    cardBg: "rgba(255,255,255,0.7)",
    border: "rgba(245,158,11,0.2)"
  },
  
  lightFresh: {
    background: "#f0fdf4",
    text: "#14532d",
    textSecondary: "#166534",
    accent: ["#10b981", "#14b8a6"], // Green-teal
    cardBg: "rgba(255,255,255,0.8)",
    border: "rgba(16,185,129,0.2)"
  },
  
  lightModern: {
    background: "#fafaf9",
    text: "#18181b",
    textSecondary: "#52525b",
    accent: ["#3b82f6", "#6366f1"], // Blue-indigo
    cardBg: "rgba(255,255,255,0.9)",
    border: "rgba(59,130,246,0.15)"
  }
};

/**
 * GRADIENT LIBRARY - Various Options
 * Claude will use gradients from the selected palette + these alternatives
 */

const GRADIENT_VARIATIONS = {
  text: [
    "linear-gradient(135deg, {COLOR1} 0%, {COLOR2} 100%)",
    "linear-gradient(90deg, {COLOR1} 0%, {COLOR2} 100%)",
    "linear-gradient(120deg, {COLOR1} 0%, {COLOR2} 100%)"
  ],
  
  buttons: [
    "linear-gradient(135deg, {COLOR1} 0%, {COLOR2} 100%)",
    "linear-gradient(90deg, {COLOR1} 10%, {COLOR2} 90%)",
    "linear-gradient(120deg, {COLOR1} 0%, {COLOR2} 100%)"
  ],
  
  cards: [
    "linear-gradient(135deg, {COLOR1_ALPHA} 0%, {COLOR2_ALPHA} 100%)",
    "linear-gradient(180deg, {COLOR1_ALPHA} 0%, transparent 100%)",
    "radial-gradient(circle at top left, {COLOR1_ALPHA} 0%, transparent 70%)"
  ]
};

/**
 * CARD STYLING GUIDELINES - Premium Quality Standards
 * These are EXAMPLES and PRINCIPLES, not strict requirements
 */

export const CARD_GUIDELINES = `
**Premium Card Principles**:

1. **Border Radius**: Use generous rounding (16-32px) for modern feel
   - Standard: 20-24px
   - Extra premium: 28-32px
   - Minimal style: 12-16px

2. **Multi-Layer Depth** (choose 2-3):
   - Subtle background tint (barely visible)
   - 1px border with low opacity
   - Soft shadow (box-shadow with blur)
   - Corner glow effect (radial gradient in ::before)
   - Inner glow along edges

3. **Padding & Spacing**:
   - Desktop: 32-48px internal padding
   - Mobile: 24-32px internal padding
   - Generous whitespace between elements

4. **Hover Effects** (pick 1-2):
   - Subtle lift (translateY(-4px))
   - Border color brightening
   - Shadow enhancement
   - Scale (1.02)
   - Background opacity change

5. **Background Variations**:
   - Semi-transparent with backdrop blur
   - Solid with subtle gradient overlay
   - Glass morphism effect
   - Minimal border-only style

**Example Implementations** (vary these):
\`\`\`css
/* Style A - Modern Glass */
background: rgba(255,255,255,0.05);
backdrop-filter: blur(10px);
border: 1px solid rgba(255,255,255,0.1);
border-radius: 24px;
box-shadow: 0 8px 32px rgba(0,0,0,0.1);

/* Style B - Elevated */
background: white;
border-radius: 20px;
box-shadow: 0 4px 24px rgba(0,0,0,0.08);
border: 1px solid rgba(0,0,0,0.05);

/* Style C - Minimal */
background: transparent;
border: 2px solid rgba(100,100,100,0.2);
border-radius: 16px;
\`\`\`
`;

/**
 * BUTTON STYLING GUIDELINES - Premium Quality Standards
 */

export const BUTTON_GUIDELINES = `
**Premium Button Principles**:

1. **Base Styling**:
   - Padding: 12-16px vertical, 24-40px horizontal
   - Border radius: 8-12px (or match site's rounding)
   - Font weight: 600 (semibold)
   - Letter spacing: slight (0.025em)

2. **Visual Treatment** (pick one per site):
   - Gradient fill with solid border
   - Solid color with subtle inner shadow
   - Outlined with gradient border
   - Glassmorphism with backdrop blur

3. **Hover States**:
   - Brightness increase (110-115%)
   - Subtle lift (translateY(-2px))
   - Shadow enhancement
   - Hue shift in gradient
   - Scale (1.02-1.05)

4. **Color Variations**:
   - Primary: Bold, saturated accent color
   - Secondary: Muted or outlined version
   - Ghost: Transparent with border

**Example Variations**:
\`\`\`css
/* Gradient Bold */
background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
color: white;
border: none;
box-shadow: 0 4px 16px rgba(59,130,246,0.3);

/* Minimal Outline */
background: transparent;
border: 2px solid currentColor;
color: #3b82f6;

/* Soft Fill */
background: rgba(99,102,241,0.1);
color: #6366f1;
border: 1px solid rgba(99,102,241,0.2);
\`\`\`
`;

/**
 * GRADIENT USAGE GUIDELINES
 */

export const GRADIENT_GUIDELINES = `
**Premium Gradient Principles**:

1. **Text Gradients**:
   - ALWAYS use exactly 2 colors
   - Choose colors with good contrast
   - Apply to headlines/key text only
   - Avoid overuse (1-2 elements per section)

2. **Gradient Directions**:
   - 135deg: Diagonal (most common)
   - 90deg: Horizontal
   - 180deg: Vertical
   - Vary between sections

3. **Color Selection**:
   - Use palette's accent colors
   - Or choose analogous colors
   - Ensure readability
   - Test against background

4. **Background Gradients**:
   - Very subtle for cards (opacity < 0.05)
   - Can be bolder for hero sections
   - Use radial for spotlights
   - Linear for backgrounds

**Examples**:
- Purple modern: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
- Blue vibrant: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)
- Warm energy: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)
- Fresh cool: linear-gradient(135deg, #10b981 0%, #14b8a6 100%)
`;

/**
 * BACKGROUND CONSISTENCY RULE
 */

export const BACKGROUND_RULE = `
**CRITICAL - Background Consistency**:

✅ **DO**:
- Choose ONE background color at the start
- Use that SAME background for ALL sections
- Maintain consistency throughout the ENTIRE website
- Vary backgrounds BETWEEN different websites (not within one)

❌ **DON'T**:
- Change background between sections
- Use different colors for hero vs features vs footer
- Create alternating background patterns

**Implementation**:
\`\`\`html
<body style="background: #0a0a0b; margin: 0; padding: 0;">
  <section><!-- inherits body background --></section>
  <section><!-- inherits body background --></section>
  <section><!-- inherits body background --></section>
</body>
\`\`\`

**Variety Strategy**:
- Website A: Dark background (#0a0a0b) + purple accents
- Website B: Light background (#ffffff) + blue accents  
- Website C: Warm light (#fef3c7) + orange accents
`;

/**
 * RANDOMIZATION HELPER
 * Returns a random palette for variation between generations
 */

export function getRandomPalette() {
  const palettes = Object.entries(COLOR_PALETTES);
  const randomIndex = Math.floor(Math.random() * palettes.length);
  const [name, palette] = palettes[randomIndex];
  return { name, ...palette };
}

/**
 * Enhanced Prompt Function - Injects Flexible Guidelines
 */

export function enhancePromptWithPremiumDesignV3(userPrompt: string): string {
  // Select a random color palette for this generation
  const palette = getRandomPalette();
  
  const enhancedPrompt = `${userPrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 PRISM V3 PREMIUM DESIGN SYSTEM - FLEXIBLE GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ IMPORTANT: These are GUIDELINES for achieving premium quality, not strict rules.
Use creativity and variation while maintaining professional standards.

━━━ SELECTED COLOR PALETTE ━━━
For this generation, use the "${palette.name}" theme:
- Background: ${palette.background}
- Text: ${palette.text}
- Text Secondary: ${palette.textSecondary}
- Accent Gradient: ${palette.accent[0]} → ${palette.accent[1]}
- Card Background: ${palette.cardBg}
- Card Border: ${palette.border}

**Background Consistency**: Use ${palette.background} for ENTIRE website (all sections).

━━━ PREMIUM CARD GUIDELINES ━━━
${CARD_GUIDELINES}

━━━ PREMIUM BUTTON GUIDELINES ━━━
${BUTTON_GUIDELINES}

━━━ GRADIENT USAGE GUIDELINES ━━━
${GRADIENT_GUIDELINES}

━━━ CRITICAL RULES ━━━
${BACKGROUND_RULE}

━━━ DESIGN PHILOSOPHY ━━━

1. **Variety with Quality**:
   - Interpret guidelines creatively
   - Don't copy-paste same structure
   - Vary layouts, spacing, and compositions
   - Maintain premium feel throughout

2. **Typography Excellence**:
   - Font: Inter or system-ui
   - Headings: 700 weight, tight line-height
   - Body: 500 weight, comfortable reading
   - Hierarchy through size, weight, color

3. **Spacing & Rhythm**:
   - Generous whitespace (breathing room)
   - Consistent spacing scale (8px base)
   - Desktop: larger padding/margins
   - Mobile: adjusted but still spacious

4. **Professional Polish**:
   - Smooth animations (0.3s ease)
   - Thoughtful hover states
   - Consistent border radius
   - Subtle shadows for depth

5. **Modern Aesthetics**:
   - Clean, uncluttered layouts
   - Strategic use of gradients
   - High-quality placeholder images
   - Professional iconography

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Remember: Use these as inspiration and quality standards, not as a rigid template.
Every website should feel unique while maintaining professional excellence.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  return enhancedPrompt;
}

// Export for use in App.tsx
export default enhancePromptWithPremiumDesignV3;
