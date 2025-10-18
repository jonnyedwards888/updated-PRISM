// Premium Design System for Prism v2.0 - AI Website Builder
// Enhanced with subtle premium patterns and flexible editing support

const premiumDesignSystemV2 = {
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

  gradients: {
    text: {
      philosophy: "LESS IS MORE - Premium sites use 2-color gradients max",
      rule: "Use EXACTLY 2 colors for text gradients - never 3+ colors",
      examples: {
        bluePurple: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        blueIndigo: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
        purplePink: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
        grayOrange: "linear-gradient(90deg, #ffffff 0%, #ff6b35 100%)", // Like "Escape Brainrot"
        tealBlue: "linear-gradient(135deg, #14b8a6 0%, #3b82f6 100%)",
        greenEmerald: "linear-gradient(135deg, #10b981 0%, #059669 100%)"
      },
      implementation: `
        background: linear-gradient(135deg, COLOR1 0%, COLOR2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      `,
      forbidden: [
        "3+ color gradients (too busy, unprofessional)",
        "Rainbow gradients",
        "Harsh color transitions (use analogous colors)",
        "Gradients with low contrast against background"
      ]
    },
    buttons: {
      style: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
      hover: "Brighten by 10-15% or shift hue slightly",
      alternatives: [
        "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)", // Warm
        "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)", // Fresh
        "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)"  // Purple
      ]
    },
    cards: {
      subtle: "linear-gradient(135deg, rgba(99,102,241,0.03) 0%, rgba(139,92,246,0.01) 100%)",
      philosophy: "Barely visible - adds depth without screaming",
      opacity: "Keep gradient opacity under 0.05 for backgrounds"
    }
  },

  cards: {
    philosophy: "Multi-layer depth creates premium feel - like physical materials",
    
    baseStructure: {
      background: "rgba(255,255,255,0.03)", // Barely visible on dark
      borderRadius: "24px", // rounded-2xl
      padding: "40px", // Generous internal space
      border: "1px solid rgba(255,255,255,0.08)", // Subtle outline
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
    },

    depthLayers: {
      layer1_subtleGradient: {
        description: "Diagonal gradient overlay for color depth",
        style: "linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(139,92,246,0.02) 100%)",
        usage: "Applied as background over base color",
        editableIn: "Edit panel as 'Gradient Overlay'"
      },

      layer2_topLeftGlow: {
        description: "Radial glow at top-left corner (signature premium effect)",
        implementation: `
          .card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 200px;
            height: 200px;
            background: radial-gradient(circle at top left, rgba(99,102,241,0.12) 0%, transparent 70%);
            border-radius: 24px 0 0 0;
            pointer-events: none;
          }
        `,
        editableIn: "Edit panel as 'Corner Glow' with color/opacity/size controls",
        colorOptions: ["rgba(99,102,241,0.12)", "rgba(139,92,246,0.12)", "rgba(59,130,246,0.12)"]
      },

      layer3_insetHighlight: {
        description: "Subtle top inner edge highlight (like physical card reflection)",
        style: "box-shadow: inset 0 1px 0 0 rgba(255,255,255,0.04)",
        editableIn: "Edit panel as 'Inner Highlight'",
        purpose: "Creates dimensional edge like light hitting top of card"
      },

      layer4_outerShadow: {
        description: "Soft elevation shadow",
        default: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
        hover: "0 16px 48px rgba(99,102,241,0.15), 0 4px 12px rgba(0,0,0,0.1)",
        editableIn: "Edit panel as 'Shadow Depth' with presets (subtle/medium/strong)",
        purpose: "Lifts card off background, hover adds colored glow"
      },

      layer5_borderGlow: {
        description: "Optional: Subtle glow outside border on hover",
        style: "box-shadow: 0 0 0 1px rgba(99,102,241,0.1), [outer shadows]",
        editableIn: "Edit panel as 'Border Glow'",
        usage: "Creates halo effect, premium feel"
      }
    },

    hoverEffects: {
      transform: "translateY(-4px)", // Subtle lift
      gradientIntensity: "+20% opacity on gradient overlay",
      border: "rgba(255,255,255,0.12) - slightly brighter",
      shadow: "Colored shadow matching theme",
      timing: "0.3s cubic-bezier(0.4, 0, 0.2, 1)"
    },

    editablityRequirements: {
      mustBeEditable: [
        "background (base color + opacity)",
        "borderRadius (8px, 12px, 16px, 24px presets)",
        "padding (24px, 32px, 40px presets)",
        "border (color, opacity, width)",
        "gradient overlay (color, opacity, angle)",
        "corner glow (color, opacity, size, position)",
        "inset highlight (opacity, blur)",
        "shadow depth (preset or custom)",
        "hover lift amount (2px, 4px, 8px)"
      ],
      editPanelStructure: {
        cardSettings: {
          background: { type: "color-picker", supportsOpacity: true },
          borderRadius: { type: "slider", range: "0-32px", presets: [8,12,16,24] },
          padding: { type: "slider", range: "16-64px", presets: [24,32,40] }
        },
        depthEffects: {
          gradientOverlay: { 
            enabled: { type: "toggle" },
            color1: { type: "color-picker" },
            color2: { type: "color-picker" },
            opacity: { type: "slider", range: "0-0.1" },
            angle: { type: "slider", range: "0-360" }
          },
          cornerGlow: {
            enabled: { type: "toggle" },
            position: { type: "dropdown", options: ["top-left", "top-right", "bottom-left", "bottom-right"] },
            color: { type: "color-picker", supportsOpacity: true },
            size: { type: "slider", range: "100-300px" }
          },
          insetHighlight: {
            enabled: { type: "toggle" },
            opacity: { type: "slider", range: "0-0.1" }
          },
          shadow: {
            preset: { type: "dropdown", options: ["none", "subtle", "medium", "strong", "custom"] },
            custom: { type: "shadow-editor" }
          }
        },
        hoverEffects: {
          lift: { type: "slider", range: "0-8px", presets: [0,2,4,8] },
          shadowIntensity: { type: "slider", range: "0-1" }
        }
      }
    }
  },

  icons: {
    philosophy: "Icons should feel cohesive with theme, not disconnected colored blocks",
    
    premiumApproach: {
      style1_circularGlow: {
        description: "Circular icon with subtle glow (like image 5 - 'Features' section)",
        structure: `
          .icon-container {
            width: 64px;
            height: 64px;
            border-radius: 50%; // Perfect circle
            background: rgba(139,92,246,0.1); // Very subtle theme color
            border: 1px solid rgba(139,92,246,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 32px rgba(139,92,246,0.15); // Soft glow
          }
          .icon {
            color: #a855f7; // Brighter version of theme color
            width: 28px;
            height: 28px;
          }
        `,
        advantages: [
          "Cohesive with dark theme",
          "Subtle but visible",
          "Glow adds premium depth",
          "Circular = modern, friendly"
        ],
        editableIn: "Edit panel as 'Icon Style' with container and icon color controls"
      },

      style2_minimalistStroke: {
        description: "Icon with no background, just colored stroke",
        structure: `
          .icon-container {
            display: inline-flex;
          }
          .icon {
            color: #a855f7;
            width: 32px;
            height: 32px;
            stroke-width: 1.5;
          }
        `,
        usage: "For minimal, text-heavy sections"
      },

      style3_glassmorphism: {
        description: "Frosted glass effect with backdrop blur",
        structure: `
          .icon-container {
            backdrop-filter: blur(12px);
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 16px;
            padding: 16px;
          }
        `
      }
    },

    forbidden: {
      avoidTheseStyles: [
        "Flat solid color squares (e.g., bg-blue-600 with white icon)",
        "Multiple bright colors that clash with theme",
        "Heavy drop shadows that look like early 2010s design",
        "Icons that are too large or too small (sweet spot: 24-32px)",
        "Sharp corners on icon containers (min 8px radius)"
      ]
    },

    colorHarmony: {
      rule: "Icon colors should be part of site color scheme",
      darkThemes: {
        background: "rgba(THEME_COLOR, 0.08-0.15)", // Very subtle
        border: "rgba(THEME_COLOR, 0.2-0.3)",
        iconColor: "Brighter version of theme color (300-400 shade)",
        glow: "rgba(THEME_COLOR, 0.15-0.25)"
      },
      examples: {
        purpleTheme: {
          containerBg: "rgba(139,92,246,0.1)",
          containerBorder: "rgba(139,92,246,0.2)",
          iconColor: "#a855f7",
          glow: "rgba(139,92,246,0.2)"
        },
        blueTheme: {
          containerBg: "rgba(59,130,246,0.1)",
          containerBorder: "rgba(59,130,246,0.2)",
          iconColor: "#60a5fa",
          glow: "rgba(59,130,246,0.2)"
        }
      }
    },

    editableProperties: {
      mustBeEditable: [
        "Container size (40px, 48px, 56px, 64px presets)",
        "Container shape (circle, rounded square, square)",
        "Background color + opacity",
        "Border color + opacity + width",
        "Icon color",
        "Icon size",
        "Glow color + opacity + blur radius",
        "Padding/spacing"
      ]
    }
  },

  spacing: {
    system: "8px grid system - STRICT adherence",
    sections: "minimum 80px vertical spacing between major sections",
    components: "24px internal padding for components, 32px for hero sections",
    margins: "Use only: 16px, 24px, 32px, 48px, 64px, 80px, 96px, 128px",
    containerPadding: "px-6 md:px-8 lg:px-12 for responsive containers"
  },

  colors: {
    philosophy: "ONE background color for entire site - absolute consistency",
    
    backgroundRule: {
      critical: "ENTIRE WEBSITE MUST USE SAME BACKGROUND COLOR",
      implementation: `
        body {
          background: #0a0a0b; /* or #0f0f10, #1a1a1c */
          margin: 0;
          padding: 0;
        }
        /* ALL sections inherit or use transparent */
        section {
          background: transparent; /* NEVER override body background */
        }
      `,
      forbidden: [
        "Section-specific backgrounds",
        "Alternating light/dark sections",
        "Gradient backgrounds that differ from body",
        "Any background property on hero/features/pricing/footer sections"
      ]
    },

    textContrast: {
      criticalRule: "Text must have WCAG AA contrast (4.5:1 minimum)",
      onDarkBackgrounds: {
        headings: "#ffffff or #f8fafc", // Bright white
        body: "#94a3b8 or #cbd5e1", // Medium gray
        muted: "#64748b" // Darker gray for secondary text
      },
      forbidden: [
        "Blue text on blue backgrounds",
        "Purple text on purple backgrounds",
        "Any low-contrast combination that strains eyes"
      ],
      accentColors: {
        usage: "Buttons, links, icons, small highlights only",
        examples: ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"],
        rule: "NEVER use accent color for large text areas"
      }
    }
  },

  animations: {
    philosophy: "Subtle, purposeful motion - never distracting",
    
    acceptable: [
      "Fade in on scroll (opacity 0 → 1, translateY 20px → 0)",
      "Button hover (scale 1.02, shadow increase)",
      "Card lift on hover (translateY -4px, shadow change)",
      "Smooth page transitions (fade, slide)",
      "Loading spinners (minimal, simple)",
      "Progress bars (smooth, linear)"
    ],

    strictlyForbidden: [
      "❌ Floating geometric shapes (circles, squares, triangles)",
      "❌ Bouncing or rotating decorative elements",
      "❌ Particle effects or confetti",
      "❌ Rainbow animations",
      "❌ Auto-playing animations that distract",
      "❌ Wobbling, shaking, pulsing",
      "❌ Excessive motion (> 8px movement)"
    ],

    timings: {
      fast: "150-200ms (small interactions)",
      standard: "300ms (most transitions)",
      slow: "400-600ms (page loads, large movements)",
      easing: "cubic-bezier(0.4, 0, 0.2, 1) or ease-out"
    }
  },

  layout: {
    maxWidth: "1280px or 1440px containers with mx-auto centering",
    grid: "CSS Grid preferred - use gap-6 or gap-8 for spacing",
    alignment: "Left-aligned text, centered page layouts, balanced asymmetry",
    whitespace: "GENEROUS whitespace - double what feels comfortable"
  },

  competitiveAdvantages: {
    vsLovable: [
      "✨ More sophisticated depth system (5-layer cards vs basic shadows)",
      "✨ Built-in premium gradient philosophy (2-color rule)",
      "✨ Superior icon system with glow effects",
      "✨ Everything is editable via visual panel",
      "✨ Consistent dark theme implementation",
      "✨ No tacky animations - only tasteful motion",
      "✨ Better text contrast rules (WCAG AA enforced)",
      "✨ Cohesive color harmony system"
    ],
    
    flexibility: {
      philosophy: "Opinionated defaults + full editability",
      approach: "Generate premium design, then allow granular editing",
      editPanel: "All depth layers, colors, spacing, effects exposed as controls",
      presets: "Quick presets for common adjustments, custom for power users"
    }
  }
};

// Enhanced prompt injection function
export function enhancePromptWithPremiumDesignV2(userPrompt: string): string {
  console.log("🎨 [Prism v2] Enhanced Premium Design System Loading...");
  
  const designInstructions = `
PRISM PREMIUM DESIGN SYSTEM V2.0 - MANDATORY CONSTRAINTS:

YOU ARE CREATING A TOP-TIER, PREMIUM WEB INTERFACE THAT SURPASSES LOVABLE AND RIVALS THE BEST SAAS PRODUCTS.
THINK: Linear, Stripe, Vercel, Notion, Framer - WORLD-CLASS DESIGN QUALITY.

═══════════════════════════════════════════════════════════════════

🎨 CRITICAL RULE #1: TEXT GRADIENTS (2-COLOR MAXIMUM)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**PHILOSOPHY: LESS IS MORE**

✅ CORRECT - Use EXACTLY 2 colors:
   linear-gradient(135deg, #667eea 0%, #764ba2 100%)
   linear-gradient(90deg, #ffffff 0%, #ff6b35 100%) // Like "Escape Brainrot"
   linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)

❌ FORBIDDEN - 3+ colors (looks busy/unprofessional):
   linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%) // TOO MUCH

**IMPLEMENTATION:**
background: linear-gradient(135deg, COLOR1 0%, COLOR2 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
background-clip: text;

**COLOR SELECTION RULES:**
- Use analogous colors (next to each other on color wheel)
- Ensure high contrast against background (#0a0a0b)
- Test readability - gradient text must be legible

═══════════════════════════════════════════════════════════════════

💎 CRITICAL RULE #2: MULTI-LAYER CARD DEPTH SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Premium cards need 5 DEPTH LAYERS (not just border + shadow):

**LAYER 1 - Base Structure:**
background: rgba(255,255,255,0.03);
border-radius: 24px;
padding: 40px;
border: 1px solid rgba(255,255,255,0.08);

**LAYER 2 - Subtle Diagonal Gradient:**
background: linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(139,92,246,0.02) 100%);
/* Applied over base - barely visible color shift */

**LAYER 3 - Top-Left Corner Glow (SIGNATURE EFFECT):**
.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle at top left, rgba(99,102,241,0.12) 0%, transparent 70%);
  border-radius: 24px 0 0 0;
  pointer-events: none;
}
/* Creates premium radial glow like high-end cards */

**LAYER 4 - Inset Highlight (Physical Card Reflection):**
box-shadow: inset 0 1px 0 0 rgba(255,255,255,0.04);
/* Subtle top edge highlight - mimics light hitting card edge */

**LAYER 5 - Outer Shadow with Depth:**
box-shadow: 
  0 8px 32px rgba(0,0,0,0.12),
  0 2px 8px rgba(0,0,0,0.08);

**HOVER STATE - All layers respond:**
- transform: translateY(-4px) // Lift
- Gradient opacity: +20%
- Border: rgba(255,255,255,0.12) // Brighter
- Shadow: 0 16px 48px rgba(99,102,241,0.15) // Colored glow
- Transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)

**WHY THIS WORKS:**
Each layer adds subtle depth - combined effect is sophisticated 3D feel without being heavy-handed.

═══════════════════════════════════════════════════════════════════

✨ CRITICAL RULE #3: PREMIUM ICON SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**PHILOSOPHY: Icons must feel cohesive with theme, not disconnected blocks**

✅ CORRECT APPROACH - Circular Glow Style (Reference: "Features" section):

.icon-container {
  width: 64px;
  height: 64px;
  border-radius: 50%; /* Perfect circle */
  background: rgba(139,92,246,0.1); /* Subtle theme color */
  border: 1px solid rgba(139,92,246,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 32px rgba(139,92,246,0.15); /* Soft glow */
}

.icon {
  color: #a855f7; /* Brighter version of theme color */
  width: 28px;
  height: 28px;
}

**WHY THIS WORKS:**
- Background is barely visible (10% opacity)
- Border adds definition without being harsh
- Glow creates premium halo effect
- Icon color pops against subtle background
- Circular = modern, friendly feel

❌ FORBIDDEN APPROACH - Flat Colored Squares:

.icon-container {
  background: #3b82f6; /* WRONG - too harsh */
  padding: 16px;
  border-radius: 8px;
}
.icon {
  color: white; /* WRONG - lacks sophistication */
}

**COLOR HARMONY RULE:**
Icon container should use theme color at 10-15% opacity
Icon itself should use brighter version (300-400 shade)
Border should be theme color at 20-30% opacity
Glow should match theme color at 15-25% opacity

**LUCIDE ICONS IMPLEMENTATION:**
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>

<div class="icon-container">
  <i data-lucide="zap"></i>
</div>

<script>lucide.createIcons()</script>

Popular icons: sparkles, zap, star, check-circle, arrow-right, shield-check, trending-up, users

═══════════════════════════════════════════════════════════════════

🎯 CRITICAL RULE #4: BACKGROUND COLOR CONSISTENCY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**ABSOLUTE RULE: ONE BACKGROUND COLOR FOR ENTIRE SITE**

✅ CORRECT IMPLEMENTATION:

body {
  background: #0a0a0b; /* Set once, never change */
  margin: 0;
  padding: 0;
}

section.hero,
section.features,
section.pricing,
footer {
  background: transparent; /* All sections inherit body background */
}

❌ FORBIDDEN:

section.hero {
  background: #1a1a2e; /* WRONG - breaks consistency */
}

section.features {
  background: linear-gradient(...); /* WRONG - each section different */
}

**RULE ENFORCEMENT:**
- User scrolls top to bottom: SAME background
- User navigates between pages: SAME background
- No visual background changes anywhere

═══════════════════════════════════════════════════════════════════

📝 CRITICAL RULE #5: TEXT CONTRAST (WCAG AA REQUIRED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**ON DARK BACKGROUNDS (#0a0a0b):**

Headings: #ffffff or #f8fafc (bright white)
Body text: #94a3b8 or #cbd5e1 (medium gray)
Muted text: #64748b (darker gray for secondary)

**ACCENT COLORS:**
Use for: Buttons, links, icons, small highlights
Examples: #3b82f6, #8b5cf6, #10b981, #f59e0b

❌ FORBIDDEN:
- Blue text on blue gradient background
- Purple text on purple background
- Any combination below 4.5:1 contrast ratio

═══════════════════════════════════════════════════════════════════

🚫 STRICTLY FORBIDDEN ANIMATIONS & EFFECTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ NEVER USE THESE (Tacky/Amateur):
- Floating geometric shapes (circles, squares, triangles)
- Bouncing or rotating decorative elements
- Particle effects or confetti
- Rainbow gradients or overly bright colors
- Auto-playing animations that distract
- Wobbling, shaking, excessive motion

✅ ACCEPTABLE ANIMATIONS (Tasteful Only):
- Fade in on scroll (opacity 0 → 1, translateY 20px → 0)
- Button hover (scale 1.02, shadow increase)
- Card lift (translateY -4px)
- Smooth page transitions
- Loading spinners (simple, minimal)

**TIMING:**
150-200ms: Small interactions
300ms: Most transitions  
400-600ms: Page loads
Easing: cubic-bezier(0.4, 0, 0.2, 1) or ease-out

═══════════════════════════════════════════════════════════════════

🎛️ CRITICAL: EVERYTHING MUST BE EDITABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**USER MUST BE ABLE TO EDIT IN VISUAL PANEL:**

Card Settings:
- Background color + opacity
- Border radius (8/12/16/24px presets)
- Padding (24/32/40px presets)
- Border color/opacity/width

Depth Effects:
- Gradient overlay (enable/color1/color2/opacity/angle)
- Corner glow (enable/position/color/size)
- Inset highlight (enable/opacity)
- Shadow depth (none/subtle/medium/strong/custom)

Icon Settings:
- Container size (40/48/56/64px presets)
- Container shape (circle/rounded/square)
- Background color + opacity
- Border color/opacity/width
- Icon color
- Icon size
- Glow color/opacity/blur

Hover Effects:
- Lift amount (0/2/4/8px)
- Shadow intensity

**IMPLEMENTATION NOTE:**
All these properties should be stored as CSS custom properties or inline styles that can be easily targeted by edit panel.

═══════════════════════════════════════════════════════════════════

ORIGINAL USER REQUEST: ${userPrompt}

GENERATE A STUNNING, PREMIUM WEB INTERFACE WITH:
✨ 2-color text gradients (never 3+)
✨ Multi-layer card depth system (5 layers)
✨ Premium circular glow icons
✨ Perfect text contrast (WCAG AA)
✨ Consistent background color throughout
✨ No tacky animations - only tasteful motion
✨ Everything editable via visual panel

Make it feel like a $10,000 custom design. Every pixel matters.
This should look BETTER than Lovable.`;

  console.log("✨ [Prism v2] Enhanced instructions prepared with competitive advantages");
  return designInstructions;
}