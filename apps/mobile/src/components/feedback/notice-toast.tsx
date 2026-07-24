import { Toast, ToastTitle, useToast } from '@/components/ui/toast';

/**
 * Plain confirmation toast (Story 7.1, UX-DR 21): housekeeping feedback with
 * no star amount — "Archived 3 tasks", "Restored". Same placement/duration
 * as the reward toast so all transient feedback reads as one system.
 */
export function NoticeToast({ nativeID, message }: { nativeID: string; message: string }) {
  return (
    <Toast
      nativeID={nativeID}
      accessible
      accessibilityLiveRegion="polite"
      className="mt-2 items-center px-6 py-3"
    >
      <ToastTitle size="lg">{message}</ToastTitle>
    </Toast>
  );
}

/** Show the standard notice toast (top placement, ~2 s). */
export function showNoticeToast(toast: ReturnType<typeof useToast>, message: string): void {
  toast.show({
    placement: 'top',
    duration: 2000,
    render: ({ id }) => <NoticeToast nativeID={`toast-${id}`} message={message} />,
  });
}
