import { Toast, ToastDescription, ToastTitle } from '@/components/ui/toast';

/**
 * Reward acknowledgment toast body (Stories 2.3/2.4, UX-DR 21): positive
 * title ("One down!" / "Released") plus the star amount. Stars are DISPLAY
 * ONLY until Epic 4 wires the real earning pipeline — the amount comes from
 * the shared STAR_WEIGHTS constant at the call site.
 *
 * Rendered via `useToast().show({ placement: 'top', duration: 2000, ... })`
 * at the provider root, so it survives the route pop that follows Done/Cut
 * loose. The polite live region announces the award to TalkBack without
 * interrupting (UX a11y: announce task completion/star awards).
 */
export function RewardToast({
  nativeID,
  title,
  stars,
}: {
  nativeID: string;
  title: string;
  stars: number;
}) {
  return (
    <Toast
      nativeID={nativeID}
      accessible
      accessibilityLiveRegion="polite"
      className="mt-2 items-center px-6 py-3"
    >
      <ToastTitle size="lg">{title}</ToastTitle>
      <ToastDescription>{`+${stars} ${stars === 1 ? 'star' : 'stars'}`}</ToastDescription>
    </Toast>
  );
}
