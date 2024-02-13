const joinClass = (...classes) =>
  Array.from(
    new Set(
      classes
        .filter((a) => !!a)
        .join(" ")
        .split(" ")
        .reverse()
    )
  )
    .reverse()
    .join(" ");
/**
 * # `classes`
 *
 * ```javascript
 * import classes from 'classes';
 * <div className=${classes('className', condition && 'anotherClass', 'andSoOn')} />
 * ```
 *
 * `classes` returns a function whose `toString()` method has been overloaded to
 * return a valid, deduplicated className string.  Calling the function directly will
 * return another function, decorated the same way, with the arguments passed
 * appended to the list. Any falsy values in the list are ignored, which makes
 * `classes` a good way to build out a list of conditional classes.
 *
 * `.and(...)` is equivalent to directly calling the function, and is nicer,
 * semantically, e.g., `classes('className').and(condition && 'anotherClass').
 *
 * `classes` is used by the CSS-in-JS template function, [`css`](./css.md) for
 * its slugs, so if you're using `css`, you probably won't need `classes` directly.
 */
export function classes(...names) {
  return Object.assign((...more) => classes(...names, ...more), {
    toString: () => joinClass(...names),
    and: (...more) => classes(...names, ...more),
  });
}

/**
 * # `css`
 *
 * ```javascript
 * import css from 'css';
 *
 * const { widget } = css`
 *   .widget {
 *     property: value;
 *     another-property: anotherValue;
 *   }
 * `;
 * ```
 *
 * This is a minimalist CSS-in-JS tagged template that seeks to provide the same
 * benefit as CSS modules as they exist in a webpack/node build environment, but
 * lets you work on a component's CSS co-located with the component, and running
 * natively in-browser.
 *
 * Accepts a simple templated stylesheet.  `css` adds a unique slug to each class
 * name in the stylesheet, injects it into the document, and returns an object
 * mapping the original class names to their slugged values, wrapped in a
 * `classes` object.
 *
 * ## Example:
 *
 * ```javascript
 * import css from './lib/css.js';
 * import { colors } from './theme.js'
 * const styles = css`
 *   .about {
 *     background: ${colors.background};
 *     color: ${colors.text};
 *   }
 * `;
 *
 * export default ({ isBlue }) => html`
 *   <article className=${styles.about.and('some-other-style', isBlue && 'about--blue')}>
 *     <h1>About</h1>
 *     <p>
 *       Neat stuff goes here
 *     </p>
 *   </article>
 * `;
 * ```
 */

const createStylesheet = (str) => {
  const rid = Math.random().toString(36).substr(2);
  const cssRules = parseRules(str);
  const styles = {};
  cssRules.forEach((rule) => Object.assign(styles, insertRule(rule, rid)));
  Object.keys(styles).forEach((name) => {
    styles[name] = classes(styles[name]);
  });
  return styles;
};

const head = document.querySelector("head");
const { sheet } = head.appendChild(document.createElement("style"));

const clsRx = /\.([^ \.\[:>,]+)/g;
export default (...args) => createStylesheet(String.raw(...args));

const appendId = (str, id) => (str.endsWith(`_${id}`) ? str : `${str}_${id}`);
const aniKwRx =
  /infinite|none|forwards|backwards|both|paused|running|normal|reverse|alternate-normal|alternate-reverse/;

const insertRule = (rule, id) => {
  const classNames = allRules(rule).reduce((cls, r) => {
    if (r.type === CSSRule.KEYFRAMES_RULE) {
      r.name = appendId(r.name, id);
    }
    if (r.style) {
      if (r.style["animation-name"]) {
        r.style["animation-name"] = r.style["animation-name"]
          .split(",")
          .map((p) => appendId(p.trim(), id))
          .join(",");
      }
      if (r.style.animation) {
        r.style.animation = r.style.animation
          .replace(/,[\s\r\n\t]+/g, ",")
          .split(/[\s\r\n\t]+/)
          .map((part) => {
            // Can have multiple values
            const [piece, ...pieces] = part.split(",");
            // Starts with a number; it's a time value or iteration count
            if (/^[\.0-9]/.test(piece)) return part;
            // keywords
            if (aniKwRx.test(piece)) return part;
            // Not a keyword or numeric; it's an ID.
            return [piece, ...pieces]
              .map((p) => appendId(p.trim(), id))
              .join(",");
          })
          .join(" ");
      }
    }
    if (r.selectorText) {
      r.selectorText = r.selectorText.replace(clsRx, (_, m) => {
        cls[m] = appendId(m, id);
        return `.${cls[m]}`;
      });
    }
    return cls;
  }, {});
  sheet.insertRule(rule.cssText);
  return classNames;
};

const allRules = (a) =>
  a.selectorText
    ? [a]
    : Array.from(a.cssRules || []).reduce(
        (list, rule) => [a, ...list, ...allRules(rule)],
        []
      );

const parseRules = (css) => {
  const t = document.createElement("style");
  t.textContent = css;
  head.appendChild(t);
  const r = t.sheet;
  head.removeChild(t);
  return Array.from(r.cssRules);
};

/**
 * Create and recalculate CSS variables based on events
 * @param {() => object} calculate
 * @param {string[]} [events=["resize"]]
 * @param {Node} [container=window]
 */
export function cssVars(calculate, events = ["resize"], container = window) {
  const variables = document.createElement("style");
  document.head.appendChild(variables);
  const updateVariables = () => {
    const vars = calculate();
    variables.innerHTML = `
        :root {
          ${Object.keys(vars)
            .map((name) => `--${name}: ${vars[name]};`)
            .join("\n")}
        }
      `;
  };
  events.forEach((event) => {
    container.addEventListener(event, updateVariables);
  });
  updateVariables();
  return updateVariables;
}
