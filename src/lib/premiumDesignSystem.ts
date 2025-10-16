// Premium Design System for Prism - AI Website Builder
// This module handles injecting premium design constraints before sending prompts to Claude

const premiumDesignSystem = {
  typography: {
    headings: { 
      fontWeight: 700, 
      fontFamily: "Inter",
      lineHeight: "1.2"
    },
    body: { 
      fontWeight: 500, 
      fontFamily: "Inter",
      lineHeight: "1.6" 
    },
    secondary: { 
      fontWeight: 400, 
      color: "text-gray-600",
      fontFamily: "Inter"
    }
  },
  icons: {
    libraries: ["Lucide", "Heroicons", "Phosphor", "Tabler"],
    forbidden: ["SystemUI", "default browser icons", "emoji icons"]
  },
  spacing: {
    system: "8px grid system",
    sections: "minimum 80px vertical spacing between sections",
    components: "24px internal padding for components",
    margins: "16px, 24px, 32px, 48px, 64px, 80px increments only"
  },
  colors: {
    background: "Clean whites (#ffffff) or subtle grays (#f8fafc, #f1f5f9)",
    accents: "Single primary color + neutral gray palette",
    forbidden: ["neon colors", "multiple bright accent colors", "pure black text"],
    text: {
      primary: "#0f172a or #1e293b",
      secondary: "#64748b or #94a3b8", 
      muted: "#cbd5e1"
    }
  },
  layout: {
    maxWidth: "1200px containers with proper centering",
    grid: "CSS Grid preferred over flexbox for complex layouts",
    alignment: "Left-aligned text, centered page layouts",
    whitespace: "Generous use of whitespace for breathing room"
  },
  components: {
    buttons: {
      style: "Subtle shadows (shadow-sm), rounded corners (rounded-lg)",
      padding: "px-6 py-3 for primary buttons",
      hover: "Smooth transitions with subtle scale/shadow effects"
    },
    cards: {
      style: "Minimal borders (border-gray-200), proper elevation (shadow-sm)",
      padding: "p-6 or p-8 for content areas",
      radius: "rounded-xl for modern feel"
    },
    forms: {
      style: "Clean inputs with proper focus states (ring-2 ring-blue-500)",
      spacing: "space-y-4 between form elements",
      labels: "font-medium text-gray-700"
    }
  },
  antiPatterns: [
    "Comic Sans or system fonts",
    "More than 2-3 colors in design",
    "Cramped spacing or layouts",
    "Overuse of shadows or gradients",
    "Generic stock photography",
    "Inconsistent spacing systems"
  ]
};

// Function to enhance user prompts with premium design constraints
export function enhancePromptWithPremiumDesign(userPrompt: string): string {
  console.log("🎨 [Prism] Premium Design System: Preparing enhanced prompt...");
  console.log("📋 [Prism] Loading design constraints:", Object.keys(premiumDesignSystem));
  
  const designInstructions = `
PREMIUM DESIGN SYSTEM - MANDATORY CONSTRAINTS:
${JSON.stringify(premiumDesignSystem, null, 2)}

CRITICAL DESIGN REQUIREMENTS:
- Typography: ALL headings use font-weight: 700, body text uses font-weight: 500
- Font Family: Inter ONLY - no system fonts
- Icons: Use ONLY premium libraries: ${premiumDesignSystem.icons.libraries.join(', ')}
- Spacing: Follow 8px grid system religiously
- Colors: Clean whites/grays with single accent color
- Layout: Maximum 1200px containers, generous whitespace
- Components: Subtle shadows, proper elevation, rounded corners

ICON IMPLEMENTATION REQUIREMENTS:
- ALWAYS include Lucide React CDN in the <head>: <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
- Use Lucide icons with this exact syntax: <i data-lucide="icon-name"></i>
- After DOM insertion, call lucide.createIcons() to render icons
- Popular icon names: "chart-bar", "users", "settings", "arrow-right", "check", "star", "heart", "home", "search", "menu"
- Example: <i data-lucide="chart-bar" class="w-6 h-6"></i>

IMAGE AND LOGO REQUIREMENTS:
- NEVER use placeholder.com, via.placeholder.com, or any placeholder services
- Use ONLY high-quality, royalty-free image services:
  * Unsplash: https://images.unsplash.com/photo-[ID]?w=[WIDTH]&h=[HEIGHT]&fit=crop&crop=center
  * Picsum: https://picsum.photos/[WIDTH]/[HEIGHT]?random=[SEED]
- For logos, use simple SVG shapes or CSS-based designs instead of external images
- Profile photos: Use Unsplash portrait photos with specific dimensions
- Hero images: Use Unsplash landscape photos with proper aspect ratios
- Company logos: Create simple SVG or CSS-based geometric designs
- Example: <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face" alt="Profile photo" class="w-16 h-16 rounded-full object-cover">
- Always include proper alt text and responsive classes

FORBIDDEN ELEMENTS:
${premiumDesignSystem.antiPatterns.map(pattern => `- ${pattern}`).join('\n')}

Original User Request: ${userPrompt}

Generate code that strictly follows these premium design constraints. Focus on clean, modern, professional aesthetics that rival top-tier SaaS products. ENSURE all icons are properly implemented using Lucide with the CDN and createIcons() call.`;

  console.log("✨ [Prism] Premium instructions prepared with icon implementation guide");
  return designInstructions;
}
