'use client';
import { vars } from 'nativewind';

/**
 * One Down v1.5 "Clay & Paper" palette, themed to the owner's saved Claude
 * Design props (themeColor #2C6E6A, screenTint #E7EFEC @ 50% sat / +5 light).
 * Contract: designs/v1.5-implementation-spec.md §0. Values are the COMPUTED
 * results of the design's theme algorithm — do not "correct" them back to the
 * raw clay/cream hexes in the design markup.
 *
 * - primary   → teal (themed clay, #43A7A1) — filled buttons, carets, dots,
 *               selected chips (50 bg / 300 line / 600 ink)
 * - secondary → mint neutrals — pill tracks, subtle fills
 * - tertiary  → gold (#B98A32) — stars, bonus badges & bands ONLY
 * - error     → guilt-free terracotta, never alarm red (unchanged)
 * - success   → pine (#4F7A57) — done states
 * - warning   → honey amber — legacy health chips only
 * - info      → blueprint blue (#3D6796) — unconfirmed guesses & triage
 * - typography→ warm ink: 900 #2C2723 · 600 #6E655C body · 500 #8A8073 muted ·
 *               400 #A29788 faint · 300 #B5AA9A placeholder · 200 #C4B8A6 icon
 *               (note: the design doc says "typography-500 #6E655C" — that
 *               value lives at 600 here so #8A8073 gets a real slot)
 * - background→ 0 card stock white · 100 mint ground #F4F6F5 · 800+ dark set
 *
 * Dark mode arrives in story D7; until then dark mirrors light.
 */
const palette = {
  /* Primary — teal (themed clay) */
  '--color-primary-0': '237 248 249',
  '--color-primary-50': '225 245 245',
  '--color-primary-100': '223 241 241',
  '--color-primary-200': '189 225 225',
  '--color-primary-300': '149 211 211',
  '--color-primary-400': '73 186 185',
  '--color-primary-500': '67 167 161',
  '--color-primary-600': '53 154 150',
  '--color-primary-700': '49 134 131',
  '--color-primary-800': '44 110 106',
  '--color-primary-900': '31 77 74',
  '--color-primary-950': '20 47 45',

  /* Secondary — mint neutrals */
  '--color-secondary-0': '255 255 255',
  '--color-secondary-50': '249 251 250',
  '--color-secondary-100': '244 246 245',
  '--color-secondary-200': '234 237 236',
  '--color-secondary-300': '226 230 228',
  '--color-secondary-400': '209 214 212',
  '--color-secondary-500': '180 186 183',
  '--color-secondary-600': '146 152 149',
  '--color-secondary-700': '110 115 113',
  '--color-secondary-800': '80 84 82',
  '--color-secondary-900': '56 60 58',
  '--color-secondary-950': '43 46 44',

  /* Tertiary — star gold (design gold family, unthemed) */
  '--color-tertiary-0': '255 252 244',
  '--color-tertiary-50': '253 246 231',
  '--color-tertiary-100': '247 235 210',
  '--color-tertiary-200': '241 222 176',
  '--color-tertiary-300': '231 211 166',
  '--color-tertiary-400': '222 196 138',
  '--color-tertiary-500': '185 138 50',
  '--color-tertiary-600': '166 123 44',
  '--color-tertiary-700': '142 106 30',
  '--color-tertiary-800': '110 82 23',
  '--color-tertiary-900': '78 58 16',
  '--color-tertiary-950': '51 38 9',

  /* Error — guilt-free terracotta */
  '--color-error-0': '254 244 241',
  '--color-error-50': '253 234 229',
  '--color-error-100': '250 216 207',
  '--color-error-200': '245 183 168',
  '--color-error-300': '236 148 129',
  '--color-error-400': '227 123 99',
  '--color-error-500': '217 99 74',
  '--color-error-600': '193 82 58',
  '--color-error-700': '158 67 48',
  '--color-error-800': '124 53 38',
  '--color-error-900': '92 39 28',
  '--color-error-950': '59 25 18',

  /* Success — pine */
  '--color-success-0': '244 248 244',
  '--color-success-50': '237 243 237',
  '--color-success-100': '230 238 230',
  '--color-success-200': '199 219 202',
  '--color-success-300': '157 191 163',
  '--color-success-400': '118 157 125',
  '--color-success-500': '79 122 87',
  '--color-success-600': '70 109 77',
  '--color-success-700': '61 97 68',
  '--color-success-800': '47 75 53',
  '--color-success-900': '34 54 38',
  '--color-success-950': '21 33 24',

  /* Warning — honey amber (legacy health chips) */
  '--color-warning-0': '255 250 240',
  '--color-warning-50': '253 243 224',
  '--color-warning-100': '250 231 196',
  '--color-warning-200': '246 211 151',
  '--color-warning-300': '241 188 102',
  '--color-warning-400': '234 168 69',
  '--color-warning-500': '222 146 38',
  '--color-warning-600': '194 124 27',
  '--color-warning-700': '158 99 22',
  '--color-warning-800': '122 76 18',
  '--color-warning-900': '89 55 14',
  '--color-warning-950': '56 34 9',

  /* Info — blueprint blue (unconfirmed guesses, triage) */
  '--color-info-0': '244 248 253',
  '--color-info-50': '234 242 251',
  '--color-info-100': '221 233 247',
  '--color-info-200': '190 213 240',
  '--color-info-300': '159 192 232',
  '--color-info-400': '110 144 184',
  '--color-info-500': '61 103 150',
  '--color-info-600': '44 90 143',
  '--color-info-700': '36 71 112',
  '--color-info-800': '30 52 80',
  '--color-info-900': '22 40 63',
  '--color-info-950': '13 24 38',

  /* Typography — warm ink */
  '--color-typography-0': '255 255 255',
  '--color-typography-50': '250 250 249',
  '--color-typography-100': '240 239 236',
  '--color-typography-200': '196 184 166',
  '--color-typography-300': '181 170 154',
  '--color-typography-400': '162 151 136',
  '--color-typography-500': '138 128 115',
  '--color-typography-600': '110 101 92',
  '--color-typography-700': '87 82 75',
  '--color-typography-800': '69 65 59',
  '--color-typography-900': '44 39 35',
  '--color-typography-950': '33 29 25',

  /* Outline — warm hairlines (≈ rgba(44,39,35,α) flattened on mint) */
  '--color-outline-0': '250 250 249',
  '--color-outline-50': '240 240 238',
  '--color-outline-100': '226 226 223',
  '--color-outline-200': '214 214 210',
  '--color-outline-300': '197 196 191',
  '--color-outline-400': '173 171 165',
  '--color-outline-500': '146 143 136',
  '--color-outline-600': '118 115 108',
  '--color-outline-700': '94 91 84',
  '--color-outline-800': '74 71 65',
  '--color-outline-900': '56 53 48',
  '--color-outline-950': '38 36 32',

  /* Background — mint grounds (0 card stock, 100 screen ground, 800+ dark) */
  '--color-background-0': '255 255 255',
  '--color-background-50': '253 254 254',
  '--color-background-100': '244 246 245',
  '--color-background-200': '239 242 241',
  '--color-background-300': '234 237 236',
  '--color-background-400': '217 222 220',
  '--color-background-500': '168 172 170',
  '--color-background-600': '122 125 123',
  '--color-background-700': '87 89 88',
  '--color-background-800': '63 67 64',
  '--color-background-900': '56 60 57',
  '--color-background-950': '43 46 44',

  /* Background Special — soft tinted fills */
  '--color-background-error': '253 234 229',
  '--color-background-warning': '253 243 224',
  '--color-background-success': '230 238 230',
  '--color-background-muted': '244 246 245',
  '--color-background-info': '221 233 247',

  /* Focus Ring Indicator */
  '--color-indicator-primary': '67 167 161',
  '--color-indicator-info': '61 103 150',
  '--color-indicator-error': '193 82 58',
};

export const config = {
  light: vars(palette),
  // Dark palette lands in story D7; mirroring keeps an OS dark scheme from
  // restyling the app before then.
  dark: vars(palette),
};
