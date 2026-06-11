import type { PostHogOptions } from 'posthog-react-native';

import { sanitizeEventProperties } from './sanitize';

// Derive the hook type from the declared package — @posthog/core is a
// transitive dep and importing it directly is a phantom dependency.
// before_send is `Fn | Fn[]`; exclude the array member to get the fn type.
type BeforeSendFn = Exclude<NonNullable<PostHogOptions['before_send']>, readonly unknown[]>;

// Wired as the SDK's before_send so NFR-S3 redaction covers EVERY event
// uniformly — autocapture, lifecycle, screens, and custom track() events.
// Runs at enqueue time (before the event enters the send queue).
export const posthogBeforeSend: BeforeSendFn = (event) => {
  if (!event) {
    return null;
  }
  return {
    ...event,
    properties: event.properties ? sanitizeEventProperties(event.properties) : event.properties,
    $set: event.$set ? sanitizeEventProperties(event.$set) : event.$set,
    $set_once: event.$set_once ? sanitizeEventProperties(event.$set_once) : event.$set_once,
  };
};
