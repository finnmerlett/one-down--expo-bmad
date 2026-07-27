import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon, StarIcon } from '@/components/ui/icon';
import { Toast, ToastDescription, ToastTitle, useToast } from '@/components/ui/toast';
import { VStack } from '@/components/ui/vstack';

/**
 * Reward acknowledgment toast body (Stories 2.3/2.4, UX-DR 21): positive
 * title ("One down!" / "Released") plus the star amount. Since Story 4.1 the
 * amount is the ACTUAL persisted award, fed from the star-awards service at
 * the call site. Since 2026-07-27 terminal actions offer an inline Undo —
 * complete/cut-loose are one accidental tap away, so the toast is the
 * take-it-back moment.
 *
 * Rendered via `useToast().show({ placement: 'top', ... })` at the provider
 * root, so it survives the route pop that follows Done/Cut loose. The polite
 * live region announces the award to TalkBack without interrupting (UX a11y:
 * announce task completion/star awards).
 */
export function RewardToast({
  nativeID,
  title,
  stars,
  onUndo,
}: {
  nativeID: string;
  title: string;
  stars: number;
  onUndo?: () => void;
}) {
  return (
    <Toast
      nativeID={nativeID}
      accessible
      accessibilityLiveRegion="polite"
      className="mt-2 items-center px-6 py-3.5"
    >
      {/* Gold star + copy: the celebration moment (design brief) — gold is
          reserved for stars, warm brown keeps it kind rather than loud. */}
      <HStack className="items-center gap-3">
        <Icon as={StarIcon} size="xl" className="fill-tertiary-400 text-tertiary-400" />
        <VStack>
          <ToastTitle size="lg">{title}</ToastTitle>
          <ToastDescription>{`+${stars} ${stars === 1 ? 'star' : 'stars'}`}</ToastDescription>
        </VStack>
        {onUndo ? (
          <Button size="sm" variant="outline" onPress={onUndo} aria-label="Undo" className="ml-2">
            <ButtonText>Undo</ButtonText>
          </Button>
        ) : null}
      </HStack>
    </Toast>
  );
}

/**
 * Show the standard reward toast — one helper so the presentation stays
 * identical across every surface (complete, Cut loose from the working
 * screen / overlay / list detail). An undoable toast stays up longer
 * (~5 s vs ~2 s): tapping Undo closes it and reverses the action.
 */
export function showRewardToast(
  toast: ReturnType<typeof useToast>,
  { title, stars, onUndo }: { title: string; stars: number; onUndo?: () => void },
): void {
  toast.show({
    placement: 'top',
    duration: onUndo ? 5000 : 2000,
    render: ({ id }) => (
      <RewardToast
        nativeID={`toast-${id}`}
        title={title}
        stars={stars}
        onUndo={
          onUndo
            ? () => {
                toast.close(id);
                onUndo();
              }
            : undefined
        }
      />
    ),
  });
}
