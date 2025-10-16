// Premium Design System for Prism - AI Website Builder
// This module handles injecting premium design constraints before sending prompts to Claude

const premiumDesignSystem = {
  typography: {
    headings: { 
      fontWeight: 700, 
      fontFamily: "Inter, system-ui, sans-serif",
      lineHeight: "1.2",
      letterSpacing: "-0.025em"
    },
    body: { 
      fontWeight: 500, 
      fontFamily: "Inter, system-ui, sans-serif",
      lineHeight: "1.6",
      fontSize: "16px"
    },
    secondary: { 
      fontWeight: 400, 
      color: "#64748b",
      fontFamily: "Inter, system-ui, sans-serif"
    }
  },
  icons: {
    libraries: ["Lucide", "Heroicons", "Phosphor", "Tabler"],
    forbidden: ["SystemUI", "default browser icons", "emoji icons"],
    size: "w-5 h-5 or w-6 h-6 standard sizes"
  },
  spacing: {
    system: "8px grid system - STRICT adherence",
    sections: "minimum 80px vertical spacing between major sections",
    components: "24px internal padding for components, 32px for hero sections",
    margins: "Use only: 16px, 24px, 32px, 48px, 64px, 80px, 96px, 128px",
    containerPadding: "px-6 md:px-8 lg:px-12 for responsive containers"
  },
  colors: {
    background: "Clean whites (#ffffff) or subtle grays (#fafafa, #f8fafc, #f1f5f9)",
    backgroundDark: "For dark sections: #0f172a, #1e293b, #334155",
    accents: "Single primary accent color - vibrant but tasteful (e.g., #3b82f6, #8b5cf6, #10b981)",
    forbidden: ["neon colors", "multiple bright accent colors", "pure black #000000 text"],
    text: {
      primary: "#0f172a or #1e293b - never pure black",
      secondary: "#64748b or #94a3b8", 
      muted: "#cbd5e1 or #e2e8f0"
    },
    gradients: {
      hero: "Use subtle gradients: linear-gradient(135deg, #667eea 0%, #764ba2 100%) or similar",
      cards: "Optional: subtle gradient overlays with opacity 0.05-0.1",
      backgrounds: "Mesh gradients acceptable for large areas with multiple soft color stops"
    }
  },
  layout: {
    maxWidth: "1280px or 1440px containers with mx-auto centering",
    grid: "CSS Grid preferred - use gap-6 or gap-8 for spacing",
    alignment: "Left-aligned text, centered page layouts, balanced asymmetry",
    whitespace: "GENEROUS whitespace - double what feels comfortable"
  },
  components: {
    buttons: {
      primary: "bg-blue-600 hover:bg-blue-700, shadow-md hover:shadow-lg, rounded-lg, px-6 py-3, font-semibold, transition-all duration-200",
      secondary: "bg-white border-2 border-gray-200 hover:border-gray-300, rounded-lg",
      hover: "Subtle scale on hover (hover:scale-105), smooth transitions 200-300ms",
      gradient: "Optional gradient buttons: bg-gradient-to-r from-blue-600 to-purple-600"
    },
    cards: {
      style: "bg-white border border-gray-200 hover:border-gray-300, rounded-xl, shadow-sm hover:shadow-md",
      padding: "p-6 md:p-8 for content areas",
      radius: "rounded-xl or rounded-2xl for modern feel",
      hover: "Smooth hover transitions with subtle lift (hover:-translate-y-1)"
    },
    forms: {
      style: "border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10",
      spacing: "space-y-4 between form elements",
      labels: "font-semibold text-gray-900 mb-2"
    },
    glassmorphism: {
      enabled: true,
      style: "backdrop-blur-xl bg-white/80 or bg-gray-900/80 for overlay effects",
      usage: "Hero sections, modal overlays, floating cards"
    }
  },
  premiumEffects: {
    noise: "Add subtle noise texture overlay for depth (opacity 0.03-0.05)",
    blur: "Use backdrop-filter: blur(12px) for glass effects",
    shadows: {
      sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
      lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
      xl: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
      colored: "Use colored shadows: 0 10px 40px -10px rgba(59, 130, 246, 0.3)"
    },
    animations: {
      fadeIn: "Fade in elements on load with opacity 0 -> 1",
      slideUp: "Slide up effect: transform: translateY(20px) -> translateY(0)",
      duration: "300-600ms for most transitions, slower for page loads",
      easing: "ease-out or cubic-bezier(0.4, 0, 0.2, 1)"
    },
    gradientText: {
      enabled: true,
      style: "background: linear-gradient(to right, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent;",
      usage: "Headings, CTAs, special emphasis"
    }
  },
  antiPatterns: [
    "Comic Sans, Times New Roman, or generic system fonts",
    "More than 2-3 accent colors in design",
    "Cramped spacing - less than 40px between sections",
    "Harsh drop shadows or excessive gradients everywhere",
    "Generic stock photography without treatment",
    "Inconsistent spacing systems",
    "Pure black text (#000000)",
    "Sharp corners everywhere (min border-radius: 8px)",
    "No hover states on interactive elements"
  ]
};

// Function to enhance user prompts with premium design constraints
export function enhancePromptWithPremiumDesign(userPrompt: string): string {
  console.log("🎨 [Prism] Premium Design System: Preparing enhanced prompt...");
  console.log("📋 [Prism] Loading design constraints:", Object.keys(premiumDesignSystem));
  
  const designInstructions = `
PREMIUM DESIGN SYSTEM - MANDATORY CONSTRAINTS:

YOU ARE CREATING A TOP-TIER, PREMIUM WEB INTERFACE THAT RIVALS THE BEST SAAS PRODUCTS.
THINK: Linear, Stripe, Vercel, Notion, Framer - WORLD-CLASS DESIGN QUALITY.

CRITICAL DESIGN REQUIREMENTS:

1. TYPOGRAPHY (Non-negotiable):
   - Font Family: Inter font ONLY (include Google Fonts CDN)
   - Headings: font-weight: 700, line-height: 1.2, letter-spacing: -0.025em
   - Body: font-weight: 500, font-size: 16px, line-height: 1.6
   - NEVER use system fonts or generic sans-serif
   - TEXT CONTRAST IS SACRED: Always ensure text has WCAG AA contrast (4.5:1 minimum)

2. COLORS & DESIGN THEME (CRITICAL - READ THIS CAREFULLY):
   **MANDATORY: ONE BACKGROUND COLOR FOR ENTIRE WEBSITE**
   
   STEP 1 - Choose ONE background color at the start:
   - Pick: #0a0a0b (recommended), #0f0f10, or #1a1a1c
   
   STEP 2 - Apply to body tag (REQUIRED):
   - Set body style attribute: background #0a0a0b, margin 0, padding 0
   - Example body tag with inline style for background
   
   STEP 3 - NEVER change background in any section:
   - Hero section: NO separate background (inherits body)
   - Features section: NO separate background (inherits body)
   - Pricing section: NO separate background (inherits body)
   - Footer: NO separate background (inherits body)
   - ALL sections: Use background transparent or no background property
   
   FORBIDDEN - THESE WILL CAUSE REJECTION:
   - NO section-specific backgrounds like background #1a1a2e
   - NO gradient backgrounds on hero that differ from body
   - NO white or colored section backgrounds
   - NO alternating backgrounds between sections
   
   CORRECT APPROACH:
   - Set body background once to chosen color
   - All sections inherit or use transparent
   - All content sits on same background
   
   EXAMPLES OF CORRECT IMPLEMENTATION:
   - Landing page: body #0a0a0b, all sections transparent
   - About page: SAME body #0a0a0b, all sections transparent
   - Contact page: SAME body #0a0a0b, all sections transparent
   
   CONSISTENCY CHECK:
   - If user scrolls from top to bottom: SAME background color
   - If user navigates between pages: SAME background color
   - No visual background changes anywhere on site
   
   **TEXT COLORS (Contrast Rules):**
   - On dark backgrounds: Use white (#ffffff), light gray (#e2e8f0, #f1f5f9)
   - Headings on dark: #ffffff or #f8fafc (bright white)
   - Body text on dark: #94a3b8, #cbd5e1 (medium gray)
   - FORBIDDEN: Blue/purple text on blue/purple backgrounds
   - FORBIDDEN: Low-contrast text that blends into background
   
   **ACCENT COLORS:**
   - Use vibrant accents that POP against dark backgrounds
   - Good: #3b82f6 (blue), #8b5cf6 (purple), #10b981 (green), #f59e0b (amber)
   - Use for: Buttons, links, icons, highlights
   - NEVER use accent color for large text areas on similar-colored backgrounds

3. SPACING (8px Grid System - STRICT):
   - Section spacing: minimum 80px between major sections
   - Component padding: 24px internal, 32px for hero sections
   - Use only: 16px, 24px, 32px, 48px, 64px, 80px, 96px, 128px
   - Containers: max-width 1280px with mx-auto
   - GENEROUS whitespace - double what feels comfortable

4. PREMIUM CARD DESIGN WITH DEPTH (CRITICAL):
   **Cards must have sophisticated visual depth with multiple layers:**
   
   BASE STRUCTURE:
   - Background: rgba(255,255,255,0.03) on dark backgrounds
   - Border radius: 24px (rounded-2xl)
   - Padding: 40px (generous internal spacing)
   - Border: 1px solid rgba(255,255,255,0.1)
   
   DEPTH LAYER 1 - Subtle Background Gradient:
   - Add diagonal gradient for depth: linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(139,92,246,0.02) 100%)
   - Creates subtle color shift top-left to bottom-right
   
   DEPTH LAYER 2 - Top-Left Glow (Like reference image):
   - Use ::before pseudo-element positioned at top-left corner
   - Gradient glow: radial-gradient(circle at top left, rgba(99,102,241,0.15) 0%, transparent 70%)
   - Size: 200px x 200px, border-radius matches card
   
   DEPTH LAYER 3 - Inset Highlight:
   - box-shadow: inset 0 1px 0 0 rgba(255,255,255,0.05)
   - Creates subtle inner highlight at top edge
   
   DEPTH LAYER 4 - Outer Shadow:
   - box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)
   - Hover: 0 12px 48px rgba(99,102,241,0.15) (colored shadow)
   
   ICON STYLING IN CARDS:
   - Don't use flat colored squares
   - Use gradient backgrounds: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
   - Icon containers: 56px x 56px, rounded-xl, padding 14px
   - Subtle glow: box-shadow: 0 4px 20px rgba(99,102,241,0.2)
   
   HOVER EFFECTS:
   - transform: translateY(-4px) - subtle lift
   - Increase gradient opacity 20%
   - Brighten border to rgba(255,255,255,0.15)
   - Transition: all 0.3s ease
   
   BUTTONS:
   - Gradient: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)
   - Rounded-lg (12px), padding: 14px 32px
   - Hover: scale(1.02), shadow increase
   
   GLASS MORPHISM:
   - backdrop-filter: blur(16px)
   - background: rgba(255,255,255,0.05)
   - border: 1px solid rgba(255,255,255,0.1)

5. PREMIUM VISUAL EFFECTS & ANIMATIONS:
   **TASTEFUL EFFECTS ONLY:**
   - Subtle noise texture: opacity 0.02-0.03 for depth (very subtle)
   - Hover animations: Scale (1.02-1.05), opacity changes, subtle lift (-2px to -4px)
   - Transition duration: 200-400ms with ease-out easing
   - Border radius: minimum 8px, prefer rounded-xl (12px) or rounded-2xl (16px)
   
   **STRICTLY FORBIDDEN (Tacky/Amateur):**
   ❌ NO floating geometric shapes (circles, squares, triangles)
   ❌ NO bouncing or rotating decorative elements
   ❌ NO excessive particle effects or confetti
   ❌ NO rainbow gradients or overly bright colors
   ❌ NO Comic Sans or playful fonts
   ❌ NO auto-playing animations that distract
   ❌ NO wobbling, shaking, or excessive motion
   
   **ACCEPTABLE ANIMATIONS:**
   ✅ Smooth fade-in on scroll (opacity 0 → 1, translateY 20px → 0)
   ✅ Button hover effects (subtle scale, color shift)
   ✅ Card hover lift with shadow (translateY -2px, shadow increase)
   ✅ Loading spinners (simple, minimal)
   ✅ Progress bars (smooth, linear)
   ✅ Smooth page transitions (fade, slide)

6. ICONS & VISUAL ELEMENTS:
   **ICON IMPLEMENTATION:**
   - Include: <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
   - Usage: <i data-lucide="icon-name"></i>
   - Initialize: Add <script>lucide.createIcons()</script> before closing body
   - Popular icons: "sparkles", "zap", "star", "check-circle", "arrow-right", "users", "trending-up", "shield-check"
   
   **PREMIUM ICON STYLING (Avoid Basic Look):**
   - Don't use flat, bright colored squares (#3b82f6 background with white icon)
   - Instead, use sophisticated approaches:
     * Gradient backgrounds: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
     * Subtle glassmorphism: backdrop-blur-lg bg-white/10 border border-white/20
     * Icon-only with colored stroke: stroke color matching theme, no background
     * Soft shadows: box-shadow: 0 4px 20px rgba(59, 130, 246, 0.15)
   - Icon containers: rounded-xl or rounded-2xl, padding p-3 or p-4
   - On dark backgrounds: Use semi-transparent white backgrounds (rgba(255,255,255,0.05))
   
   **EXAMPLE: Premium Icon Card Styling:**
   - Container: gradient background rgba(99,102,241,0.1) to rgba(139,92,246,0.1)
   - Border: 1px solid rgba(255,255,255,0.1)
   - Border-radius: 16px
   - Backdrop-filter: blur(10px)
   - Box-shadow: 0 4px 20px rgba(0,0,0,0.1)
   - Icon color: #6366f1 (vibrant purple/blue)

7. IMAGES:
   - NEVER use placeholder.com or via.placeholder.com
   - Unsplash: https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=600&fit=crop
   - Picsum: https://picsum.photos/1200/600?random=1
   - Use proper dimensions and add loading="lazy"

8. LAYOUT BEST PRACTICES:
   - Hero section: min-height: 600px with centered content
   - CSS Grid for complex layouts with gap-6 or gap-8
   - Responsive: Mobile-first with proper breakpoints (sm, md, lg, xl)
   - Flex containers: justify-between and items-center for balance

STRICTLY FORBIDDEN:
${premiumDesignSystem.antiPatterns.map(pattern => `- ${pattern}`).join('\n')}
- Basic, bland designs without personality
- No hover states or interactions
- Cramped layouts with insufficient spacing
- Using default browser styles

ORIGINAL USER REQUEST: ${userPrompt}

GENERATE A STUNNING, PREMIUM WEB INTERFACE WITH:
✨ Beautiful gradients and glass morphism effects
✨ Smooth animations and micro-interactions  
✨ Perfect spacing and typography
✨ Professional color scheme with subtle accents
✨ Modern, clean aesthetic that feels expensive

Make it feel like a \$10,000 custom design. Every pixel matters.`;

  console.log("✨ [Prism] Premium instructions prepared with icon implementation guide");
  return designInstructions;
}
