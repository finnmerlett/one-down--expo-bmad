/**
 * Loads frame screenshots for the whole canvas, a few at a time. Frames near
 * the viewport always go first. Off-screen frames use at most
 * MAX_BACKGROUND_LOADS slots, so after a code change every frame refreshes at a
 * steady pace without holding up the ones in view.
 */

export type ShotPriority = 'visible' | 'background';

/** Matches the screenshot service's headless page pool. */
const MAX_LOADS = 4;
const MAX_BACKGROUND_LOADS = 2;

interface Task {
  /** Read when the task starts, so a frame that scrolls into view jumps the queue. */
  priority: () => ShotPriority;
  run: (priority: ShotPriority) => Promise<void>;
  cancelled: boolean;
}

const queue: Task[] = [];
const running: Record<ShotPriority, number> = { visible: 0, background: 0 };
let pumpTimer: ReturnType<typeof setTimeout> | undefined;

/** Re-check the queue, e.g. after a frame's visibility changed. */
export function pumpShotQueue() {
  while (running.visible + running.background < MAX_LOADS) {
    const live = queue.filter((task) => !task.cancelled);
    queue.splice(0, queue.length, ...live);
    let index = queue.findIndex((task) => task.priority() === 'visible');
    if (index === -1 && running.background < MAX_BACKGROUND_LOADS && queue.length > 0) index = 0;
    if (index === -1) return;
    const [task] = queue.splice(index, 1);
    if (!task) return;
    const priority = task.priority();
    running[priority] += 1;
    void task
      .run(priority)
      .catch(() => {})
      .finally(() => {
        running[priority] -= 1;
        pumpShotQueue();
      });
  }
}

/** Queue a load. The returned function cancels it if it hasn't started yet. */
export function queueShot(
  priority: () => ShotPriority,
  run: (priority: ShotPriority) => Promise<void>,
): () => void {
  const task: Task = { priority, run, cancelled: false };
  queue.push(task);
  // Frames queue on mount, before their first visibility callback; a short
  // wait lets those land so the first loads go to frames in view.
  clearTimeout(pumpTimer);
  pumpTimer = setTimeout(pumpShotQueue, 50);
  return () => {
    task.cancelled = true;
  };
}
