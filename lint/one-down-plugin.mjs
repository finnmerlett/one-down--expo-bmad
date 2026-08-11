/**
 * Project-local oxlint plugin (ESLint-compatible rule format).
 *
 * no-arbitrary-text-size: arbitrary Tailwind font sizes (`text-[13px]`,
 * `text-[1.2rem]`, …) bypass the global UI_SCALE in tailwind.config.js AND
 * get silently dropped by gluestack's tailwind-merge when they collide with
 * a color class — every font size must come from the standard scale
 * (text-2xs … text-4xl) unless a bespoke size was explicitly requested.
 *
 * Types are self-contained JSDoc — eslint is not a dependency of this repo
 * (oxlint loads the plugin through its ESLint-compatible API).
 */

/**
 * @typedef {{ value: { raw: string } }} TemplateElementNode
 * @typedef {{ value: unknown }} LiteralNode
 * @typedef {{ node: object, messageId: string, data?: Record<string, string> }} ReportDescriptor
 * @typedef {{ report: (descriptor: ReportDescriptor) => void }} RuleContext
 */

const ARBITRARY_TEXT_SIZE = /text-\[[0-9][0-9.]*(?:px|rem|em|pt|%)?\]/;

const MESSAGE =
  "Arbitrary text size '{{match}}' — use a standard Tailwind size " +
  '(text-2xs … text-4xl; the whole scale rides UI_SCALE in ' +
  'tailwind.config.js) unless a bespoke size was explicitly requested.';

const noArbitraryTextSize = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ban arbitrary Tailwind text sizes in favour of the scaled standard tokens',
    },
    schema: [],
    messages: {
      arbitraryTextSize: MESSAGE,
    },
  },
  /** @param {RuleContext} context */
  create(context) {
    /**
     * @param {object} node
     * @param {unknown} value
     */
    const check = (node, value) => {
      if (typeof value !== 'string') return;
      const match = ARBITRARY_TEXT_SIZE.exec(value);
      if (match) {
        context.report({
          node,
          messageId: 'arbitraryTextSize',
          data: { match: match[0] },
        });
      }
    };
    return {
      /** @param {LiteralNode} node */
      Literal(node) {
        check(node, node.value);
      },
      /** @param {TemplateElementNode} node */
      TemplateElement(node) {
        check(node, node.value.raw);
      },
    };
  },
};

export default {
  meta: {
    name: 'one-down',
  },
  rules: {
    'no-arbitrary-text-size': noArbitraryTextSize,
  },
};
