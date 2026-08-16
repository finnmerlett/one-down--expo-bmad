/**
 * The ONE text size for editable body surfaces (Story 9.8, Keep A1): task
 * notes, brain dump, quick-add inputs, AI general notes, step rewrite — all
 * read and edit at the step-text size (`text-sm`). Pass EDITABLE_BODY_SIZE to
 * gluestack Input/Textarea `size` (their sm variant maps to text-sm); use
 * EDITABLE_BODY_TEXT to override a field that must keep a larger container.
 */
export const EDITABLE_BODY_SIZE = 'sm' as const;
export const EDITABLE_BODY_TEXT = 'text-sm';
