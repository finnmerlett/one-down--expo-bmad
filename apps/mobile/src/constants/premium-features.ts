// The premium feature registry — the ONLY place the premium set changes
// (Story 8.2a AC5). The set is a product lever: per the PRD, AI features
// carry the per-user cost, so they are the premium surface. Never gate
// manual task entry, the card stack, completion, or any Epic 1–4 feature
// (FR59 — everything you already use stays free).

export type PremiumFeatureId = 'ai_breakdown' | 'ai_brain_dump';

export interface PremiumFeature {
  id: PremiumFeatureId;
  title: string;
  description: string;
}

export const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    id: 'ai_breakdown',
    title: 'AI task breakdown',
    description: "Stuck? 'Help me with this' turns a task into small, doable steps.",
  },
  {
    id: 'ai_brain_dump',
    title: 'AI brain-dump parsing',
    description: 'Dump everything on your mind — get it back as ready-made task cards.',
  },
];

export function premiumFeatureTitle(id: PremiumFeatureId): string {
  return PREMIUM_FEATURES.find((feature) => feature.id === id)?.title ?? 'Premium';
}
