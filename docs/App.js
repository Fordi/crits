import html from "html";
import css from "css";
import { useState } from "preact/hooks";
import tables from "./tables/index.js";

const styles = css`
  .active {
    background-color: #ff0000;
  }
`;

window.styles = styles;

export default () => {
  const [lastRoll, setLastRoll] = useState(null);
  return html`
    <div class="buttons">
      ${Object.keys(tables).map(
        (key) => html`
          <button
            class="roller"
            onClick=${() => setLastRoll(tables[key]()) && false}
          >
            ${tables[key].name}
          </button>
        `
      )}
    </div>
    ${lastRoll
      ? html`
          <div class=${styles.result}>
            <div class=${styles.name}>${lastRoll?.name ?? ""}</div>
            <div class=${styles.value}>${lastRoll?.roll ?? ""}</div>
            <div class=${styles.description}>
              ${lastRoll?.description ?? ""}
            </div>
            <div class=${styles.effect}>${lastRoll?.effect ?? ""}</div>
          </div>
        `
      : ""}
  `;
};
