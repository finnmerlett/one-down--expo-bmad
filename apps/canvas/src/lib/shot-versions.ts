/**
 * Source versions for frame screenshots, shared by the screenshot service and
 * the canvas. A version is the time of the newest source change that affects a
 * frame. It goes into the shot URL, so a frame refetches only when a change
 * reaches it, and an unaffected frame keeps its URL and its cached image.
 */
export interface ShotVersions {
  /** Time of the newest change that affects every frame. */
  global: number;
  /** Per story id: the newest change reaching that story, never below `global`. */
  stories: Record<string, number>;
  /** Per story title (component rows): the newest version among its stories. */
  titles: Record<string, number>;
}

/**
 * The version for a renderer query string. `?id=` is a single story, `?title=`
 * a component row of every story with that title. A story or title the
 * service doesn't know falls back to `global`.
 */
export function shotVersionFor(versions: ShotVersions, query: string): number {
  const params = new URLSearchParams(query);
  const id = params.get('id');
  if (id !== null) return versions.stories[id] ?? versions.global;
  const title = params.get('title');
  if (title !== null) return versions.titles[title] ?? versions.global;
  return versions.global;
}
