import { fetchJson } from "../lib/fetch.js";

export const parseRoll = (str) => {
  const [name, count, sides, multiplier, modifier] = String(str).match(
    /^(\d+)\s*d\s*(\d+)(?:\s*[\*]\s*(\d+))?(?:\s*([+-]\s*\d+))?$/
  );
  const handler = () => {
    const rolls = [];
    let sum = handler.modifier;
    for (let i = 0; i < handler.count; i++) {
      const value = Math.floor(Math.random() * handler.sides + 1);
      rolls.push(value);
      sum += value * handler.multiplier;
    }
    return {
      sum,
      rolls,
      modifier: handler.modifier,
      multiplier: handler.multiplier,
      sides: handler.sides,
    };
  };
  Object.assign(handler, {
    count: parseInt(count),
    sides: parseInt(sides),
    modifier: parseInt(modifier ?? 0),
    multiplier: parseInt(multiplier ?? 1),
  });
  return handler;
};

export const parseRange = (str) => {
  const dashI = str.indexOf("-");
  const [low, high] =
    dashI === -1
      ? ((a) => [a, a])(parseInt(str))
      : ((l, h) => [parseInt(l), parseInt(h)])(...str.split("-"));
  const range = [low, high];
  range.includes = (n) => n >= low && n <= high;
  range.range = str;
  return range;
};

export const rollString = (str) =>
  str.replace(/@\{([^}]+)\}/, (_, m) => {
    return `${parseRoll(m)().sum} (${m})`;
  });

export const rollTable = ({ name, d, ranges }) => {
  const rollDice = parseRoll(d);
  const effects = Object.keys(ranges).map((r) => {
    const [description, effect] = ranges[r];
    const range = parseRange(r);
    return (n) => {
      if (range.includes(n)) {
        return { description, effect, range: r };
      }
    };
  });
  const tableRoller = () => {
    return { name, d, ranges, ...tableRoller.lookup(rollDice().sum) };
  };

  tableRoller.lookup = (n) => {
    for (let i = 0; i < effects.length; i++) {
      const { description, effect, range } = effects[i](n) ?? {};
      if (effect) {
        return {
          roll: n,
          description: rollString(description),
          effect: rollString(effect),
          range,
        };
      }
    }
    throw new Error(`Table is incomplete: ${n}`);
  };
  tableRoller.rollDice = rollDice;
  Object.defineProperty(tableRoller, "name", { value: name });
  tableRoller.d = d;
  tableRoller.ranges = ranges;
  return tableRoller;
};

const fetchTable = async (name) =>
  rollTable(await fetchJson(`./${name}.json`, import.meta.url));

const tables = {};
await Promise.all(
  [
    "weaponAttackCriticalHit",
    "weaponAttackFumble",
    "spellAttackCriticalHit",
    "spellAttackFumble",
  ].map(async (k) => {
    tables[k] = await fetchTable(k);
  })
);

export default tables;
