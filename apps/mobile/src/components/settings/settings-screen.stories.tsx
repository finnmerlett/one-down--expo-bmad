import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import type { AppearanceMode } from '@/services/appearance';
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefs,
} from '@/services/notifications/notification-prefs';

import { WithLearnings } from './ai-notes-section.stories';
import type { NotificationPermissionState } from './notification-preferences-section';
import { SettingsScreen } from './settings-screen';

const LEARNINGS = WithLearnings.args?.notes ?? '';
const SNAPSHOT_ID = 'a1b2c3d4-0000-4000-8000-1234567890ab';
const noop = () => {};

/**
 * Settings with its values held locally (seeded from args) — so on the
 * canvas the appearance chips, toggles, cadence selector and AI notes all
 * respond, and signing out drops to the signed-out state, just like the app.
 * Persistence and navigation are no-ops; the snapshot resolves a fixed id.
 */
function InteractiveSettings({
  email = 'you@example.com',
  permission = 'granted',
  initialPrefs = DEFAULT_NOTIFICATION_PREFS,
  initialAppearance = 'system',
  initialAiNotes = '',
  initialAutoOpen = true,
}: {
  email?: string | null;
  permission?: NotificationPermissionState;
  initialPrefs?: NotificationPrefs;
  initialAppearance?: AppearanceMode;
  initialAiNotes?: string;
  initialAutoOpen?: boolean;
}) {
  const [signedInEmail, setSignedInEmail] = useState(email);
  const [prefs, setPrefs] = useState(initialPrefs);
  const [appearance, setAppearance] = useState(initialAppearance);
  const [aiNotes, setAiNotes] = useState(initialAiNotes);
  const [autoOpen, setAutoOpen] = useState(initialAutoOpen);
  return (
    <SettingsScreen
      onBack={noop}
      appearance={appearance}
      onAppearanceChange={setAppearance}
      email={signedInEmail}
      onSignIn={noop}
      onCreateAccount={noop}
      onSignOut={() => setSignedInEmail(null)}
      aiNotes={aiNotes}
      onAiNotesChange={setAiNotes}
      onAiNotesBlur={noop}
      permission={permission}
      prefs={prefs}
      onToggleDeadline={(enabled) => setPrefs((p) => ({ ...p, deadlineUrgency: enabled }))}
      onChangeChallenges={(cadence) => setPrefs((p) => ({ ...p, challenges: cadence }))}
      onOpenSystemSettings={noop}
      contextAutoOpen={autoOpen}
      onContextAutoOpenToggle={setAutoOpen}
      signedIn={signedInEmail !== null}
      onCapture={() => Promise.resolve(SNAPSHOT_ID)}
    />
  );
}

const meta = {
  title: 'screens/Settings',
  component: InteractiveSettings,
} satisfies Meta<typeof InteractiveSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Signed in with defaults: every section, the snapshot button live. */
export const SignedIn: Story = {};

/** Signed out: sign-in / create-account CTAs, snapshots disabled. */
export const SignedOut: Story = { args: { email: null } };

/** Notification permission denied: the calm banner with the system-settings link. */
export const NotificationsDenied: Story = { args: { permission: 'denied' } };

/** Challenges switched on: the cadence selector appears. */
export const ChallengesOn: Story = {
  args: { initialPrefs: { deadlineUrgency: true, challenges: 'weekly' } },
};

/** AI notes grown from learnings plus a hand-written line. */
export const AiNotesWithLearnings: Story = { args: { initialAiNotes: LEARNINGS } };

/** Editing the AI notes — the keyboard is up. */
export const EditingAiNotes: Story = {
  args: { initialAiNotes: LEARNINGS },
  parameters: { canvas: { keyboard: true } },
};
