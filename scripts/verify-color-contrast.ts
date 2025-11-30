/**
 * Color Contrast Verification Script for "The Boss" Rebranding
 *
 * This script validates WCAG color contrast ratios for the Prometheus brand colors
 * and suggests corrections where needed.
 *
 * WCAG Requirements:
 * - Level AA: 4.5:1 for normal text, 3:1 for large text (18pt+) and UI components
 * - Level AAA: 7:1 for enhanced accessibility
 *
 * Run with: npx tsx scripts/verify-color-contrast.ts
 */

// Prometheus Brand Colors from docs/branding/README.md
const COLORS = {
  // Primary colors
  navy: '#0A192D',
  yellow: '#FFDD00',
  orange: '#FF5500',
  red: '#FF4D4D',
  turquoise: '#00A3A3',
  lightBlue: '#4D9FFF',
  lavender: '#9D8DF1',

  // Neutral colors
  white: '#FFFFFF',
  ultraLightGray: '#F8F8F8',
  lightGray: '#F5F5F5',
  mediumGray: '#CCCCCC',
  darkGray: '#333333',
  lightNavy: '#0F2440',

  // Additional UI colors
  black: '#000000'
} as const

// Color pair definitions for validation
interface ColorPair {
  foreground: string
  background: string
  name: string
  useCase: string
  minRatio: number // 4.5 for text, 3.0 for UI components
  isLargeText?: boolean
}

const COLOR_PAIRS: ColorPair[] = [
  // Dark mode text
  {
    foreground: COLORS.white,
    background: COLORS.navy,
    name: 'White on Navy',
    useCase: 'Dark mode primary text',
    minRatio: 4.5
  },
  {
    foreground: COLORS.ultraLightGray,
    background: COLORS.navy,
    name: 'Ultra Light Gray on Navy',
    useCase: 'Dark mode secondary text',
    minRatio: 4.5
  },
  {
    foreground: COLORS.lightBlue,
    background: COLORS.navy,
    name: 'Light Blue on Navy',
    useCase: 'Dark mode primary accent/links',
    minRatio: 4.5
  },
  {
    foreground: COLORS.yellow,
    background: COLORS.navy,
    name: 'Yellow on Navy',
    useCase: 'Dark mode secondary accent',
    minRatio: 4.5
  },
  {
    foreground: COLORS.turquoise,
    background: COLORS.navy,
    name: 'Turquoise on Navy',
    useCase: 'Dark mode tertiary accent',
    minRatio: 4.5
  },
  {
    foreground: COLORS.red,
    background: COLORS.navy,
    name: 'Red on Navy',
    useCase: 'Dark mode error text',
    minRatio: 4.5
  },

  // Light mode text
  {
    foreground: COLORS.navy,
    background: COLORS.ultraLightGray,
    name: 'Navy on Ultra Light Gray',
    useCase: 'Light mode primary text',
    minRatio: 4.5
  },
  {
    foreground: COLORS.navy,
    background: COLORS.white,
    name: 'Navy on White',
    useCase: 'Light mode text on cards',
    minRatio: 4.5
  },
  {
    foreground: COLORS.darkGray,
    background: COLORS.ultraLightGray,
    name: 'Dark Gray on Ultra Light Gray',
    useCase: 'Light mode secondary text',
    minRatio: 4.5
  },
  {
    foreground: COLORS.turquoise,
    background: COLORS.ultraLightGray,
    name: 'Turquoise on Ultra Light Gray',
    useCase: 'Light mode links',
    minRatio: 4.5
  },
  {
    foreground: COLORS.turquoise,
    background: COLORS.white,
    name: 'Turquoise on White',
    useCase: 'Light mode links on cards',
    minRatio: 4.5
  },
  {
    foreground: COLORS.red,
    background: COLORS.ultraLightGray,
    name: 'Red on Ultra Light Gray',
    useCase: 'Light mode error text',
    minRatio: 4.5
  },

  // Button text combinations
  {
    foreground: COLORS.navy,
    background: COLORS.yellow,
    name: 'Navy on Yellow',
    useCase: 'Yellow button text (primary CTA)',
    minRatio: 4.5
  },
  {
    foreground: COLORS.white,
    background: COLORS.turquoise,
    name: 'White on Turquoise',
    useCase: 'Turquoise button text',
    minRatio: 4.5
  },
  {
    foreground: COLORS.white,
    background: COLORS.navy,
    name: 'White on Navy',
    useCase: 'Navy button text',
    minRatio: 4.5
  },
  {
    foreground: COLORS.navy,
    background: COLORS.lightBlue,
    name: 'Navy on Light Blue',
    useCase: 'Light blue button text',
    minRatio: 4.5
  },

  // UI component borders (3:1 minimum)
  {
    foreground: COLORS.mediumGray,
    background: COLORS.ultraLightGray,
    name: 'Medium Gray border on Light bg',
    useCase: 'Light mode input borders',
    minRatio: 3.0
  },
  {
    foreground: COLORS.darkGray,
    background: COLORS.navy,
    name: 'Dark Gray border on Navy',
    useCase: 'Dark mode input borders',
    minRatio: 3.0
  },

  // Hover/focus states
  {
    foreground: COLORS.lightBlue,
    background: COLORS.lightNavy,
    name: 'Light Blue on Light Navy',
    useCase: 'Dark mode hover state',
    minRatio: 4.5
  }
]

/**
 * Parse hex color to RGB components
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`)
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  }
}

/**
 * Calculate relative luminance per WCAG 2.1
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)

  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Calculate contrast ratio between two colors per WCAG 2.1
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
function getContrastRatio(foreground: string, background: string): number {
  const l1 = getRelativeLuminance(foreground)
  const l2 = getRelativeLuminance(background)

  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Get WCAG compliance level
 */
function getComplianceLevel(ratio: number, minRatio: number): 'AAA' | 'AA' | 'FAIL' {
  if (minRatio === 3.0) {
    // UI components
    if (ratio >= 4.5) return 'AAA'
    if (ratio >= 3.0) return 'AA'
    return 'FAIL'
  } else {
    // Text
    if (ratio >= 7.0) return 'AAA'
    if (ratio >= 4.5) return 'AA'
    return 'FAIL'
  }
}

/**
 * Suggest a darker/lighter variant of a color to improve contrast
 */
function suggestImprovedColor(foreground: string, background: string, targetRatio: number): string | null {
  const bgLuminance = getRelativeLuminance(background)
  const { r, g, b } = hexToRgb(foreground)

  // Determine if we need to lighten or darken
  const fgLuminance = getRelativeLuminance(foreground)
  const shouldLighten = fgLuminance < bgLuminance

  // Binary search for the right adjustment
  for (let step = 1; step <= 100; step += 5) {
    const factor = shouldLighten ? 1 + step / 100 : 1 - step / 100

    const newR = Math.min(255, Math.max(0, Math.round(r * factor)))
    const newG = Math.min(255, Math.max(0, Math.round(g * factor)))
    const newB = Math.min(255, Math.max(0, Math.round(b * factor)))

    const newHex =
      `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`.toUpperCase()
    const newRatio = getContrastRatio(newHex, background)

    if (newRatio >= targetRatio) {
      return newHex
    }
  }

  return null
}

interface ValidationResult {
  pair: ColorPair
  ratio: number
  compliance: 'AAA' | 'AA' | 'FAIL'
  suggestion?: string
}

/**
 * Validate all color pairs and generate report
 */
function validateColors(): ValidationResult[] {
  const results: ValidationResult[] = []

  for (const pair of COLOR_PAIRS) {
    const ratio = getContrastRatio(pair.foreground, pair.background)
    const compliance = getComplianceLevel(ratio, pair.minRatio)

    const result: ValidationResult = {
      pair,
      ratio,
      compliance
    }

    if (compliance === 'FAIL') {
      const suggestion = suggestImprovedColor(pair.foreground, pair.background, pair.minRatio)
      if (suggestion) {
        result.suggestion = suggestion
      }
    }

    results.push(result)
  }

  return results
}

/**
 * Generate CSS variables with corrected colors
 */
function generateCorrectedCSS(results: ValidationResult[]): Map<string, string> {
  const corrections = new Map<string, string>()

  for (const result of results) {
    if (result.compliance === 'FAIL' && result.suggestion) {
      // Find which color needs correction
      const colorName = Object.entries(COLORS).find(([_, hex]) => hex === result.pair.foreground)?.[0]
      if (colorName) {
        corrections.set(colorName, result.suggestion)
      }
    }
  }

  return corrections
}

/**
 * Main execution
 */
function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗')
  console.log('║     Color Contrast Verification for "The Boss" Rebranding        ║')
  console.log('║              WCAG 2.1 Compliance Check                           ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝\n')

  const results = validateColors()

  // Summary counts
  const passed = results.filter((r) => r.compliance !== 'FAIL').length
  const failed = results.filter((r) => r.compliance === 'FAIL').length
  const aaa = results.filter((r) => r.compliance === 'AAA').length

  console.log(`Summary: ${passed}/${results.length} pass, ${aaa} AAA, ${failed} fail\n`)

  // Detailed results
  console.log('─'.repeat(80))
  console.log('DETAILED RESULTS')
  console.log('─'.repeat(80))

  for (const result of results) {
    const status = result.compliance === 'AAA' ? '✅ AAA' : result.compliance === 'AA' ? '✅ AA ' : '❌ FAIL'

    const ratioStr = result.ratio.toFixed(2).padStart(5)
    const requiredStr = result.pair.minRatio.toFixed(1)

    console.log(`\n${status} | Ratio: ${ratioStr}:1 (need ${requiredStr}:1)`)
    console.log(`     ${result.pair.name}`)
    console.log(`     Use case: ${result.pair.useCase}`)
    console.log(`     Foreground: ${result.pair.foreground} | Background: ${result.pair.background}`)

    if (result.suggestion) {
      const newRatio = getContrastRatio(result.suggestion, result.pair.background)
      console.log(`     ⚠️  SUGGESTION: Change foreground to ${result.suggestion} (ratio: ${newRatio.toFixed(2)}:1)`)
    }
  }

  // Generate corrections
  const corrections = generateCorrectedCSS(results)

  if (corrections.size > 0) {
    console.log('\n' + '─'.repeat(80))
    console.log('RECOMMENDED COLOR CORRECTIONS')
    console.log('─'.repeat(80))

    for (const [name, hex] of corrections) {
      console.log(`  ${name}: ${COLORS[name as keyof typeof COLORS]} → ${hex}`)
    }

    console.log('\nApply these corrections to src/renderer/src/assets/styles/color.css')
  }

  // Final recommendations
  console.log('\n' + '─'.repeat(80))
  console.log('RECOMMENDATIONS FOR color.css')
  console.log('─'.repeat(80))

  console.log(`
Based on the contrast analysis, here are the validated color mappings:

DARK MODE (Navy background #0A192D):
  --color-background: ${COLORS.navy}
  --color-text: ${COLORS.white} (ratio: ${getContrastRatio(COLORS.white, COLORS.navy).toFixed(2)}:1 ✅)
  --color-primary: ${COLORS.lightBlue} (ratio: ${getContrastRatio(COLORS.lightBlue, COLORS.navy).toFixed(2)}:1 ✅)
  --color-link: ${COLORS.turquoise} (ratio: ${getContrastRatio(COLORS.turquoise, COLORS.navy).toFixed(2)}:1)
  --color-error: ${COLORS.red} (ratio: ${getContrastRatio(COLORS.red, COLORS.navy).toFixed(2)}:1)

LIGHT MODE (Ultra Light Gray background #F8F8F8):
  --color-background: ${COLORS.ultraLightGray}
  --color-text: ${COLORS.navy} (ratio: ${getContrastRatio(COLORS.navy, COLORS.ultraLightGray).toFixed(2)}:1 ✅)
  --color-primary: ${COLORS.navy} (ratio: ${getContrastRatio(COLORS.navy, COLORS.ultraLightGray).toFixed(2)}:1 ✅)
  --color-link: ${COLORS.turquoise} (ratio: ${getContrastRatio(COLORS.turquoise, COLORS.ultraLightGray).toFixed(2)}:1)
  --color-error: ${COLORS.red} (ratio: ${getContrastRatio(COLORS.red, COLORS.ultraLightGray).toFixed(2)}:1)

BUTTONS:
  Yellow CTA: Navy text on Yellow bg (ratio: ${getContrastRatio(COLORS.navy, COLORS.yellow).toFixed(2)}:1 ✅)
  Turquoise: White text on Turquoise bg (ratio: ${getContrastRatio(COLORS.white, COLORS.turquoise).toFixed(2)}:1)
  Navy: White text on Navy bg (ratio: ${getContrastRatio(COLORS.white, COLORS.navy).toFixed(2)}:1 ✅)
`)

  // Check for issues that need manual attention
  const turquoiseOnLight = getContrastRatio(COLORS.turquoise, COLORS.ultraLightGray)
  if (turquoiseOnLight < 4.5) {
    console.log(`⚠️  WARNING: Turquoise (#00A3A3) on light backgrounds has ratio ${turquoiseOnLight.toFixed(2)}:1`)
    console.log(`   Consider using darker turquoise #008080 (Teal) for light mode links`)
    console.log(`   Teal ratio: ${getContrastRatio('#008080', COLORS.ultraLightGray).toFixed(2)}:1`)
  }

  // Exit with error if any failures
  if (failed > 0) {
    console.log(`\n❌ ${failed} color pair(s) failed WCAG compliance. Review suggestions above.`)
    process.exit(1)
  } else {
    console.log('\n✅ All color pairs pass WCAG AA compliance!')
    process.exit(0)
  }
}

main()
