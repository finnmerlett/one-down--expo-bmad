/**
 * The canvas layout: user journeys as rows of screens, left to right in the
 * order a user moves through them. Every frame is a real story from
 * apps/mobile (`*.stories.tsx`), rendered live by the web story renderer —
 * edit a component or a story and its frames hot-reload in place.
 *
 * Story ids are Storybook's: `<title>--<export>` kebab-cased, e.g. title
 * 'task-list/TaskListView' + export `RecycleBin` →
 * 'task-list-tasklistview--recycle-bin'. The renderer index (open the
 * Stories panel on the canvas) lists them all. Stories not placed on any
 * journey still appear in the component library below the journeys.
 */
export interface JourneyFrame {
  /** Storybook story id. */
  story: string;
  /** Caption above the frame; defaults to the story's own name. */
  label?: string;
  /** One-line note under the frame: what the user does here / why it exists. */
  note?: string;
}

export interface Journey {
  id: string;
  title: string;
  description: string;
  frames: JourneyFrame[];
}

export const JOURNEYS: Journey[] = [
  {
    id: 'sign-in',
    title: 'Sign in',
    description: 'Optional account for cloud sync — the app works signed out.',
    frames: [
      { story: 'screens-auth--login-idle', label: 'Log in' },
      { story: 'screens-auth--login-typing', label: 'Typing' },
      { story: 'screens-auth--login-error', label: 'Wrong password' },
      { story: 'screens-auth--signup-idle', label: 'Create account' },
      { story: 'screens-auth--signup-typing', label: 'Typing' },
      { story: 'screens-auth--signup-submitting', label: 'Submitting' },
    ],
  },
  {
    id: 'home',
    title: 'Home',
    description: 'The deck and its filters — every state home can be in.',
    frames: [
      {
        story: 'screens-home--stack',
        label: 'The deck',
        note: 'Curated for the chosen context and size.',
      },
      {
        story: 'screens-home--right-now-sheet',
        label: '"Right now" sheet',
        note: 'Pick what you have to hand.',
      },
      {
        story: 'screens-home--filtered-out',
        label: 'Nothing matches',
        note: 'Tasks exist, but none fit the filters.',
      },
      { story: 'screens-home--all-clear', label: 'All clear' },
      { story: 'screens-home--empty', label: 'New user' },
    ],
  },
  {
    id: 'capture',
    title: 'Capture tasks',
    description: 'Get things out of your head: one at a time, or a whole brain dump.',
    frames: [
      { story: 'screens-home--stack', label: 'Home' },
      {
        story: 'screens-home--quick-add',
        label: 'Quick add',
        note: 'One task, typed straight in.',
      },
      { story: 'screens-braindump--idle', label: 'Brain dump' },
      { story: 'screens-braindump--typing', label: 'Dumping' },
      { story: 'screens-braindump--parsing', label: 'AI parsing' },
      {
        story: 'screens-braindump--check-these',
        label: 'Check these',
        note: 'Review what the AI guessed before it lands in the stack.',
      },
      {
        story: 'screens-home--triage-waiting',
        label: 'Back home',
        note: 'Unchecked guesses wait in triage.',
      },
    ],
  },
  {
    id: 'check-queue',
    title: "Check the AI's guesses",
    description: 'The triage queue for parsed tasks the AI was unsure about.',
    frames: [
      { story: 'screens-home--triage-waiting', label: 'Triage entry' },
      { story: 'screens-checkqueue--first-card', label: 'First card' },
      { story: 'screens-checkqueue--editing-card', label: 'Fixing a guess' },
      { story: 'screens-checkqueue--mid-queue', label: 'Mid-queue' },
      { story: 'screens-checkqueue--last-card', label: 'Last card' },
      { story: 'screens-checkqueue--queue-clear', label: 'Queue clear' },
    ],
  },
  {
    id: 'do-a-task',
    title: 'Do a task',
    description: 'Pick the top card, open it, work through it, collect the stars.',
    frames: [
      { story: 'screens-home--stack', label: 'The deck' },
      {
        story: 'screens-taskrunning--with-steps',
        label: 'Working on it',
        note: 'Tapping a card opens its working screen.',
      },
      { story: 'screens-taskrunning--editing-steps', label: 'Edit steps' },
      { story: 'screens-taskrunning--change-box-open', label: 'Ask for a change' },
      { story: 'screens-taskrunning--change-working', label: 'AI working' },
      { story: 'screens-taskrunning--after-change', label: 'After the change' },
      { story: 'feedback-rewardtoast--completion', label: 'Done — stars awarded' },
    ],
  },
  {
    id: 'edit-a-task',
    title: 'Edit a task',
    description:
      'The card back: details, deadline, contexts, size — from the deck or the working screen.',
    frames: [
      {
        story: 'screens-home--card-back-open',
        label: 'From the deck',
        note: 'The pencil flips a card.',
      },
      { story: 'screens-taskdetail--from-card', label: 'Card back' },
      { story: 'screens-taskdetail--editing-text', label: 'Editing' },
      { story: 'screens-taskdetail--needs-check', label: 'Needs a check' },
      { story: 'screens-taskdetail--missing-deadline', label: 'Missing deadline' },
      { story: 'screens-taskdetail--from-working-screen', label: 'From working screen' },
    ],
  },
  {
    id: 'stuck-tasks',
    title: 'Stuck & avoided tasks',
    description: 'Task health: nudges for tasks you keep skipping or that went stale.',
    frames: [
      {
        story: 'screens-home--avoided-task-nudge',
        label: 'Avoided card',
        note: 'Skipped past the threshold.',
      },
      { story: 'screens-taskdetail--avoided-task', label: 'Health prompt' },
      { story: 'screens-triage--all-reasons', label: 'Triage' },
      { story: 'screens-triage--all-caught-up', label: 'All caught up' },
    ],
  },
  {
    id: 'task-list',
    title: 'Manage the list',
    description: 'Every task at once: browse, multi-select, archive, restore from the bin.',
    frames: [
      { story: 'screens-tasklist--active', label: 'Active tasks' },
      {
        story: 'screens-tasklist--multi-select',
        label: 'Multi-select',
        note: 'Long-press any row.',
      },
      { story: 'screens-tasklist--archive-warning', label: 'Archive warning' },
      { story: 'screens-tasklist--recycle-bin', label: 'Recycle bin' },
      { story: 'screens-tasklist--delete-confirm', label: 'Delete forever' },
      { story: 'screens-tasklist--empty-bin', label: 'Empty bin' },
      { story: 'screens-tasklist--empty', label: 'No tasks yet' },
    ],
  },
  {
    id: 'stars',
    title: 'Stars & premium',
    description: 'Where your stars came from, and upgrading.',
    frames: [
      { story: 'screens-starlog--with-entries', label: 'Star log' },
      { story: 'screens-starlog--today-empty', label: 'Nothing today' },
      { story: 'screens-premium--subscribe', label: 'Premium' },
      { story: 'screens-premium--billing-sheet-open', label: 'Billing (test)' },
      { story: 'screens-premium--purchasing', label: 'Purchasing' },
      { story: 'screens-premium--confirmation', label: 'Welcome to premium' },
      { story: 'screens-premium--purchase-error', label: 'Purchase failed' },
    ],
  },
  {
    id: 'returning',
    title: 'Coming back',
    description: 'After time away: a gentle summary instead of a wall of overdue tasks.',
    frames: [
      { story: 'screens-welcomeback--typical', label: 'Welcome back' },
      { story: 'screens-welcomeback--no-deadlines', label: 'No deadlines' },
      { story: 'screens-welcomeback--singular', label: 'One task' },
      { story: 'screens-welcomeback--nothing-waiting', label: 'Nothing waiting' },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Session behaviour, notifications, AI notes, account.',
    frames: [
      { story: 'screens-settings--signed-in', label: 'Settings' },
      { story: 'screens-settings--editing-ai-notes', label: 'AI notes' },
      { story: 'screens-settings--notifications-denied', label: 'Notifications off' },
      { story: 'screens-settings--challenges-on', label: 'Challenges' },
      { story: 'screens-settings--signed-out', label: 'Signed out' },
    ],
  },
];
