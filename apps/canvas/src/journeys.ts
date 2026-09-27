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
      { story: 'auth-authform--login', label: 'Log in' },
      { story: 'auth-authform--inline-error', label: 'Wrong password' },
      { story: 'auth-authform--signup', label: 'Sign up' },
      { story: 'auth-authform--submitting', label: 'Submitting' },
    ],
  },
  {
    id: 'capture',
    title: 'Capture tasks',
    description: 'Get things out of your head: one at a time, or a whole brain dump.',
    frames: [
      {
        story: 'app-shell-appshell--home-screen',
        label: 'Home shell',
        note: 'Standing bottom actions: add a task / brain dump.',
      },
      { story: 'quick-add-sheet-quickaddsheet--open', label: 'Quick add' },
      { story: 'brain-dump-braindumpinput--idle', label: 'Brain dump' },
      { story: 'brain-dump-braindumpinput--parsing', label: 'AI parsing' },
      {
        story: 'brain-dump-braindumpcheck--check-these',
        label: 'Check these',
        note: 'Review what the AI guessed before it lands in the stack.',
      },
      { story: 'card-stack-cardstack--three-tasks', label: 'Tasks in the stack' },
    ],
  },
  {
    id: 'do-a-task',
    title: 'Do a task',
    description: 'Pick the top card, open it, work through it, collect the stars.',
    frames: [
      { story: 'card-stack-cardstack--three-tasks', label: 'The stack' },
      {
        story: 'card-stack-cardback--full-details',
        label: 'Card back',
        note: 'Flip a card to see and edit its details.',
      },
      { story: 'task-running-taskrunningview--with-subtasks', label: 'Working on it' },
      { story: 'task-running-stepseditor--editing-steps', label: 'Edit steps' },
      { story: 'task-running-taskrunningview--after-change', label: 'After an AI change' },
      { story: 'feedback-rewardtoast--completion', label: 'Done — stars awarded' },
    ],
  },
  {
    id: 'stuck-tasks',
    title: 'Stuck & avoided tasks',
    description: 'Task health: nudges for tasks you keep skipping or that went stale.',
    frames: [
      { story: 'card-stack-taskcard--avoided-task', label: 'Avoided card' },
      { story: 'card-stack-cardback--with-health-prompt', label: 'Health prompt' },
      { story: 'card-stack-microtasknudge--idle', label: 'Micro-task nudge' },
      { story: 'card-stack-cardback--with-review-flags', label: 'Needs a check' },
      { story: 'triage-triagelist--all-reasons', label: 'Triage queue' },
      { story: 'triage-triagelist--all-caught-up', label: 'All caught up' },
    ],
  },
  {
    id: 'task-list',
    title: 'Manage the list',
    description: 'Every task at once: browse, multi-select, archive, restore from the bin.',
    frames: [
      { story: 'task-list-tasklistview--with-values-and-bonus-row', label: 'Active tasks' },
      { story: 'task-list-tasklistview--multi-select', label: 'Multi-select' },
      { story: 'task-list-confirmdialog--archive-warning', label: 'Archive warning' },
      { story: 'task-list-tasklistview--with-done-tasks', label: 'Done tasks' },
      { story: 'task-list-tasklistview--recycle-bin', label: 'Recycle bin' },
      { story: 'task-list-tasklistview--empty-bin', label: 'Empty bin' },
    ],
  },
  {
    id: 'stars',
    title: 'Stars & premium',
    description: 'Where your stars came from, and upgrading.',
    frames: [
      { story: 'star-log-staractivitylog--with-entries', label: 'Star log' },
      { story: 'premium-premiumfeaturesview--with-subscribe', label: 'Premium' },
      { story: 'premium-fakebillingsheet--pending-request', label: 'Billing (test)' },
      { story: 'premium-premiumfeaturesview--purchasing', label: 'Purchasing' },
      { story: 'premium-premiumfeaturesview--premium-confirmation', label: 'Welcome to premium' },
    ],
  },
  {
    id: 'returning',
    title: 'Coming back',
    description: 'After time away: a gentle summary instead of a wall of overdue tasks.',
    frames: [
      { story: 'welcome-back-welcomebacksummary--typical', label: 'Welcome back' },
      { story: 'welcome-back-welcomebacksummary--nothing-waiting', label: 'Nothing waiting' },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Session behaviour, notifications, AI notes, account.',
    frames: [
      { story: 'settings-settingsview--with-notifications-section', label: 'Settings' },
      { story: 'settings-ainotessection--with-learnings', label: 'AI notes' },
      { story: 'settings-accountsection--signed-in', label: 'Account' },
    ],
  },
];
