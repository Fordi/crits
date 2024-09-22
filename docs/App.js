import html from "html";
import css, { joinClass } from "css";

import { useState } from "preact/hooks";
import tables from "./tables/index.js";

const styles = css`
  .root {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    font-family: Arial;
    background-color: #222;
    color: #DDD;
  }
  .active {
    background-color: #ff0000;
  }
  .result {
    display: flex;
    flex-direction: row;
    padding-bottom: 0.5em;
    margin-bottom: 0.5em;
    border-bottom: 1px solid black;
  }
  .name {
    text-align: center;
    font-size: 1em;
    color: #FFF;
  }
  .value {
    font-size: 1em;
    padding-right: 0.5em;
  }
  .value > input {
    width: 2em;
    border: none;
    font-size: 2em;
    text-align: right;
    padding: 0;
    background: transparent;
    color: #FFF;
  }
  .flavor {
    font-size: 1em;
  }
  .table {
    overflow-y: auto;
  }
  .table th {
    min-width: 3em;
    text-align: left;
  }
  .table tr:nth-child(2n+1) {
    background-color: rgba(0, 0, 0, 0.25);
  }
`;

window.styles = styles;

export default () => {
  const [currentTable, setCurrentTable] = useState(null);
  const [lastRoll, setLastRoll] = useState(null);
  const updateRoll = (e) => {
    const rollValue = Math.min(99, Math.max(0, parseInt(e.target.value)));
    setLastRoll(tables[currentTable](rollValue));
  }
  return html`
    <div class="${styles.root}">
      <div class="${styles.buttons}">
        ${Object.keys(tables).map(
          (key) => {
              const roll = () => {
                setCurrentTable(key);
                setLastRoll(tables[key]()) && false
              };
              return html`
              <button
                class=${joinClass(
                  styles.roller,
                  currentTable === key && styles.active 
                )}
                onClick=${roll}
              >
                ${tables[key].name}
              </button>
            `;
          }
        )}
      </div>
      ${lastRoll
        ? html`
          <h1 class=${styles.name}>${lastRoll.name ?? ""}</h1>
          <div class=${styles.result}>
            <div class=${styles.value}>
              <input type="number" value=${lastRoll.roll} onChange=${updateRoll} />
            </div>
            <div class=${styles.flavor}>
              <div class=${styles.description}>
                ${lastRoll?.description ?? ""}
              </div>
              <div class=${styles.effect}>${lastRoll.effect ?? ""}</div>
            </div>
          </div>
          <div class=${styles.table}>
            <table>
              ${Object.entries(tables[currentTable].ranges).map(([range, [effect, description]]) => html`
                <tr>
                  <th>${[...new Set(range.split('-'))].join('-')}</th>
                  <td>${effect}</td>
                  <td>${description}</td>
                </tr>
              `)}
            </table>
          </div>
        `
      : ""}
    </root>
  `;
};
