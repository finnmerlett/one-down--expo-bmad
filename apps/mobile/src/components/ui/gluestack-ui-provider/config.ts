'use client';
import { vars } from 'nativewind';

/**
 * One Down "warm & playful" palette (single light theme).
 *
 * - primary   → coral accent (#F2634F) — CTAs, FAB, active states, links
 * - secondary → warm cream neutrals — pills, tracks, subtle fills
 * - tertiary  → star gold (#F0A32F) — stars & celebrations ONLY
 * - error     → guilt-free terracotta (#D9634A), never alarm red
 * - success   → sage (#5FA672)
 * - warning   → honey amber — health chips, "been a while" hints
 * - info      → muted teal (#4E9B8F)
 * - typography→ warm ink (#33302B) down to faint (#A8A199)
 * - background→ white surfaces over warm cream (#FAF6EF)
 *
 * The app is pinned to light mode; the same ramp backs both scheme keys so a
 * leaked OS dark scheme can never flip the app to the old grayscale.
 */
const warmPalette = {
  /* Primary — coral accent */
  '--color-primary-0': '255 248 246',
  '--color-primary-50': '254 242 240',
  '--color-primary-100': '253 229 224',
  '--color-primary-200': '250 204 195',
  '--color-primary-300': '247 169 154',
  '--color-primary-400': '245 133 114',
  '--color-primary-500': '242 99 79',
  '--color-primary-600': '217 80 62',
  '--color-primary-700': '181 66 51',
  '--color-primary-800': '143 52 40',
  '--color-primary-900': '107 39 30',
  '--color-primary-950': '71 26 20',

  /* Secondary — warm cream neutrals */
  '--color-secondary-0': '255 255 255',
  '--color-secondary-50': '252 249 244',
  '--color-secondary-100': '250 246 239',
  '--color-secondary-200': '243 237 226',
  '--color-secondary-300': '237 230 219',
  '--color-secondary-400': '224 216 203',
  '--color-secondary-500': '203 194 179',
  '--color-secondary-600': '168 161 153',
  '--color-secondary-700': '122 115 106',
  '--color-secondary-800': '87 82 75',
  '--color-secondary-900': '58 52 44',
  '--color-secondary-950': '51 48 43',

  /* Tertiary — star gold */
  '--color-tertiary-0': '255 251 242',
  '--color-tertiary-50': '252 239 217',
  '--color-tertiary-100': '250 228 192',
  '--color-tertiary-200': '247 212 150',
  '--color-tertiary-300': '244 192 106',
  '--color-tertiary-400': '242 177 76',
  '--color-tertiary-500': '240 163 47',
  '--color-tertiary-600': '217 140 29',
  '--color-tertiary-700': '179 113 23',
  '--color-tertiary-800': '140 88 19',
  '--color-tertiary-900': '102 64 15',
  '--color-tertiary-950': '64 40 10',

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

  /* Success — sage */
  '--color-success-0': '243 249 244',
  '--color-success-50': '231 243 234',
  '--color-success-100': '211 233 217',
  '--color-success-200': '176 215 186',
  '--color-success-300': '141 196 156',
  '--color-success-400': '116 181 134',
  '--color-success-500': '95 166 114',
  '--color-success-600': '78 143 96',
  '--color-success-700': '63 116 78',
  '--color-success-800': '49 90 61',
  '--color-success-900': '36 66 45',
  '--color-success-950': '22 41 28',

  /* Warning — honey amber */
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

  /* Info — muted teal */
  '--color-info-0': '241 248 247',
  '--color-info-50': '227 241 239',
  '--color-info-100': '201 228 224',
  '--color-info-200': '163 207 201',
  '--color-info-300': '125 186 178',
  '--color-info-400': '99 170 160',
  '--color-info-500': '78 155 143',
  '--color-info-600': '63 131 120',
  '--color-info-700': '51 106 97',
  '--color-info-800': '39 82 75',
  '--color-info-900': '27 59 54',
  '--color-info-950': '16 36 32',

  /* Typography — warm ink */
  '--color-typography-0': '255 255 255',
  '--color-typography-50': '250 246 239',
  '--color-typography-100': '243 237 226',
  '--color-typography-200': '237 230 219',
  '--color-typography-300': '216 209 199',
  '--color-typography-400': '168 161 153',
  '--color-typography-500': '122 115 106',
  '--color-typography-600': '107 100 91',
  '--color-typography-700': '87 82 75',
  '--color-typography-800': '69 65 59',
  '--color-typography-900': '51 48 43',
  '--color-typography-950': '38 36 31',

  /* Outline — warm hairlines */
  '--color-outline-0': '255 253 250',
  '--color-outline-50': '250 246 239',
  '--color-outline-100': '243 237 226',
  '--color-outline-200': '237 230 219',
  '--color-outline-300': '227 219 206',
  '--color-outline-400': '198 190 176',
  '--color-outline-500': '168 161 153',
  '--color-outline-600': '138 131 122',
  '--color-outline-700': '107 100 91',
  '--color-outline-800': '87 82 75',
  '--color-outline-900': '58 53 46',
  '--color-outline-950': '38 36 31',

  /* Background — white surfaces over warm cream */
  '--color-background-0': '255 255 255',
  '--color-background-50': '255 249 240',
  '--color-background-100': '250 246 239',
  '--color-background-200': '243 237 226',
  '--color-background-300': '237 230 219',
  '--color-background-400': '224 216 203',
  '--color-background-500': '168 161 153',
  '--color-background-600': '122 115 106',
  '--color-background-700': '87 82 75',
  '--color-background-800': '69 65 59',
  '--color-background-900': '58 52 44',
  '--color-background-950': '51 48 43',

  /* Background Special — soft tinted fills */
  '--color-background-error': '253 234 229',
  '--color-background-warning': '253 243 224',
  '--color-background-success': '231 243 234',
  '--color-background-muted': '250 246 239',
  '--color-background-info': '227 241 239',

  /* Focus Ring Indicator */
  '--color-indicator-primary': '242 99 79',
  '--color-indicator-info': '78 155 143',
  '--color-indicator-error': '193 82 58',
};

export const config = {
  light: vars(warmPalette),
  // Single light theme: the dark key mirrors the warm palette so an OS-level
  // dark scheme can never restyle the app.
  dark: vars(warmPalette),
};
