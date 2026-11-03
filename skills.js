// Math skills, grouped by grade. Each skill has a generator that returns one question:
//   { text, answer, choices?, hint, svg?, key }
// - answer is a string; choices (if present) is an array of strings containing answer.
// - key identifies the "fact" so the parent page can show what a kid keeps missing.
// To add a new grade later, add skills with a new `grade` number.

(function (root) {
  const R = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const pick = (arr) => arr[R(0, arr.length - 1)];
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = R(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const uniqChoices = (answer, others, n = 4) => {
    const set = [String(answer)];
    for (const o of shuffle(others.map(String))) {
      if (set.length >= n) break;
      if (!set.includes(o)) set.push(o);
    }
    return shuffle(set);
  };
  const numChoices = (ans, spread = 3) => {
    const others = [];
    for (let d = 1; others.length < 12; d++) {
      for (const s of [ans + d, ans - d, ans + d * spread, ans - d * spread]) {
        if (s >= 0 && s !== ans) others.push(s);
      }
    }
    return uniqChoices(ans, others);
  };
  const pad = (m) => String(m).padStart(2, "0");
  const fmtTime = (h, m) => `${h}:${pad(m)}`;
  const addMinutes = (h, m, add) => {
    let total = (h % 12) * 60 + m + add;
    total = ((total % 720) + 720) % 720;
    let hh = Math.floor(total / 60);
    if (hh === 0) hh = 12;
    return [hh, total % 60];
  };
  const NAMES = ["Sam", "Mia", "Leo", "Ava", "Ben", "Zoe", "Max", "Lily"];
  const THINGS = ["stickers", "marbles", "cookies", "crayons", "stamps", "shells", "cards", "rocks"];

  // ---------- SVG helpers ----------
  const svgWrap = (w, h, body) =>
    `<svg viewBox="0 0 ${w} ${h}" class="q-svg" role="img" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

  function clockSvg(h, m) {
    let ticks = "";
    for (let i = 1; i <= 12; i++) {
      const a = (i * 30 - 90) * (Math.PI / 180);
      ticks += `<text x="${100 + 72 * Math.cos(a)}" y="${100 + 72 * Math.sin(a) + 7}" text-anchor="middle" font-size="20" font-weight="700" fill="currentColor">${i}</text>`;
    }
    for (let i = 0; i < 60; i++) {
      const a = (i * 6 - 90) * (Math.PI / 180);
      const r1 = i % 5 === 0 ? 84 : 88;
      ticks += `<line x1="${100 + r1 * Math.cos(a)}" y1="${100 + r1 * Math.sin(a)}" x2="${100 + 92 * Math.cos(a)}" y2="${100 + 92 * Math.sin(a)}" stroke="currentColor" stroke-width="${i % 5 === 0 ? 3 : 1}"/>`;
    }
    const ha = ((h % 12) + m / 60) * 30;
    const ma = m * 6;
    return svgWrap(
      200,
      200,
      `<circle cx="100" cy="100" r="95" fill="var(--card)" stroke="currentColor" stroke-width="4"/>${ticks}
       <line x1="100" y1="100" x2="100" y2="52" stroke="var(--accent)" stroke-width="7" stroke-linecap="round" transform="rotate(${ha} 100 100)"/>
       <line x1="100" y1="100" x2="100" y2="24" stroke="currentColor" stroke-width="4" stroke-linecap="round" transform="rotate(${ma} 100 100)"/>
       <circle cx="100" cy="100" r="6" fill="currentColor"/>`
    );
  }

  function barGraphSvg(cats, values, scale) {
    const w = 320, h = 220, left = 40, bottom = 180, top = 20;
    const maxV = Math.max(...values);
    const steps = Math.ceil(maxV / scale);
    const unit = (bottom - top) / steps;
    let body = "";
    for (let s = 0; s <= steps; s++) {
      const y = bottom - s * unit;
      body += `<line x1="${left}" y1="${y}" x2="${w - 10}" y2="${y}" stroke="currentColor" stroke-opacity="0.2"/>`;
      body += `<text x="${left - 6}" y="${y + 5}" text-anchor="end" font-size="13" fill="currentColor">${s * scale}</text>`;
    }
    const bw = (w - left - 20) / cats.length;
    cats.forEach((c, i) => {
      const bh = (values[i] / scale) * unit;
      const x = left + 10 + i * bw;
      body += `<rect x="${x}" y="${bottom - bh}" width="${bw - 20}" height="${bh}" rx="4" fill="var(--bar${i})"/>`;
      body += `<text x="${x + (bw - 20) / 2}" y="${bottom + 26}" text-anchor="middle" font-size="22">${c}</text>`;
    });
    body += `<line x1="${left}" y1="${bottom}" x2="${w - 10}" y2="${bottom}" stroke="currentColor" stroke-width="2"/>`;
    return svgWrap(w, h + 10, body);
  }

  function fractionShapeSvg(parts, shaded) {
    let body = "";
    const w = 240 / parts;
    for (let i = 0; i < parts; i++) {
      body += `<rect x="${10 + i * w}" y="10" width="${w}" height="100" fill="${i < shaded ? "var(--accent)" : "var(--card)"}" stroke="currentColor" stroke-width="3"/>`;
    }
    return svgWrap(260, 120, body);
  }

  function numberLineSvg(den, num) {
    const x0 = 20, x1 = 300, y = 50;
    let body = `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="currentColor" stroke-width="3"/>`;
    for (let i = 0; i <= den; i++) {
      const x = x0 + ((x1 - x0) * i) / den;
      body += `<line x1="${x}" y1="${y - 12}" x2="${x}" y2="${y + 12}" stroke="currentColor" stroke-width="3"/>`;
    }
    body += `<text x="${x0}" y="${y + 36}" text-anchor="middle" font-size="18" fill="currentColor">0</text>`;
    body += `<text x="${x1}" y="${y + 36}" text-anchor="middle" font-size="18" fill="currentColor">1</text>`;
    const px = x0 + ((x1 - x0) * num) / den;
    body += `<circle cx="${px}" cy="${y}" r="10" fill="var(--accent)"/>`;
    body += `<text x="${px}" y="${y - 20}" text-anchor="middle" font-size="18" font-weight="700" fill="var(--accent)">?</text>`;
    return svgWrap(320, 100, body);
  }

  function arraySvg(rows, cols) {
    let body = "";
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        body += `<circle cx="${20 + c * 30}" cy="${20 + r * 30}" r="10" fill="var(--accent)"/>`;
    return svgWrap(cols * 30 + 10, rows * 30 + 10, body);
  }

  function gridSvg(w, h) {
    const s = Math.min(28, 260 / Math.max(w, h));
    let body = "";
    for (let r = 0; r < h; r++)
      for (let c = 0; c < w; c++)
        body += `<rect x="${5 + c * s}" y="${5 + r * s}" width="${s}" height="${s}" fill="var(--accent-soft)" stroke="currentColor" stroke-width="1.5"/>`;
    return svgWrap(w * s + 10, h * s + 10, body);
  }

  function rectSvg(w, h, unit) {
    const sw = 60 + w * 16, sh = 30 + h * 12;
    return svgWrap(
      sw + 80,
      sh + 60,
      `<rect x="40" y="20" width="${sw}" height="${sh}" fill="var(--accent-soft)" stroke="currentColor" stroke-width="3"/>
       <text x="${40 + sw / 2}" y="${sh + 48}" text-anchor="middle" font-size="18" fill="currentColor">${w} ${unit}</text>
       <text x="${sw + 48}" y="${20 + sh / 2 + 6}" font-size="18" fill="currentColor">${h} ${unit}</text>`
    );
  }

  function rulerSvg(len) {
    const unit = 28, x0 = 15;
    let body = `<rect x="${x0}" y="20" width="${len * unit}" height="18" rx="4" fill="var(--accent)"/>`;
    body += `<rect x="${x0}" y="50" width="${10 * unit}" height="40" fill="var(--card)" stroke="currentColor" stroke-width="2"/>`;
    for (let i = 0; i <= 10; i++) {
      const x = x0 + i * unit;
      body += `<line x1="${x}" y1="50" x2="${x}" y2="66" stroke="currentColor" stroke-width="2"/>`;
      body += `<text x="${x}" y="84" text-anchor="middle" font-size="13" fill="currentColor">${i}</text>`;
    }
    return svgWrap(10 * unit + 30, 100, body);
  }

  // ---------- Skills ----------
  const skills = [
    // ===== 2nd grade =====
    {
      id: "g2-facts20", grade: 2, icon: "➕", name: "Add & subtract within 20",
      gen() {
        if (Math.random() < 0.5) {
          const a = R(2, 10), b = R(2, 10);
          return { text: `${a} + ${b} = ?`, answer: String(a + b), key: `${a}+${b}`,
            hint: 10 - a > 0 && 10 - a < b
              ? `Make a 10 first: ${a} + ${10 - a} = 10, then add ${b - (10 - a)} more.`
              : `Start at ${a} and count up ${b}.` };
        }
        const b = R(2, 10), c = R(2, 10), a = b + c;
        return { text: `${a} − ${b} = ?`, answer: String(c), key: `${a}-${b}`,
          hint: `Think addition: ${b} + ? = ${a}` };
      },
    },
    {
      id: "g2-add100", grade: 2, icon: "💯", name: "Add & subtract within 100",
      gen() {
        if (Math.random() < 0.5) {
          const a = R(11, 70), b = R(11, 99 - a);
          return { text: `${a} + ${b} = ?`, answer: String(a + b), key: `${a}+${b}`,
            hint: `Add the tens first: ${Math.floor(a / 10) * 10} + ${Math.floor(b / 10) * 10} = ${Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10}. Then add the ones: ${a % 10} + ${b % 10}.` };
        }
        const a = R(30, 99), b = R(11, a - 5);
        return { text: `${a} − ${b} = ?`, answer: String(a - b), key: `${a}-${b}`,
          hint: `Take away the tens first: ${a} − ${Math.floor(b / 10) * 10} = ${a - Math.floor(b / 10) * 10}. Then take away ${b % 10} more.` };
      },
    },
    {
      id: "g2-words", grade: 2, icon: "📖", name: "Word problems",
      gen() {
        const n = pick(NAMES), t = pick(THINGS);
        const kind = R(0, 2);
        if (kind === 0) {
          const a = R(10, 50), b = R(5, 40);
          return { text: `${n} has ${a} ${t}. ${n} gets ${b} more. How many ${t} now?`, answer: String(a + b), key: "add-more",
            hint: `"Gets more" means add: ${a} + ${b}` };
        } else if (kind === 1) {
          const a = R(20, 90), b = R(5, a - 5);
          return { text: `${n} has ${a} ${t} and gives away ${b}. How many are left?`, answer: String(a - b), key: "take-away",
            hint: `"Gives away" means subtract: ${a} − ${b}` };
        }
        const a = R(5, 40), b = R(a + 3, 80);
        return { text: `${n} has ${a} ${t}. Their friend has ${b}. How many more does the friend have?`, answer: String(b - a), key: "compare",
          hint: `"How many more" means find the difference: ${b} − ${a}` };
      },
    },
    {
      id: "g2-place", grade: 2, icon: "🧱", name: "Place value",
      gen() {
        const n = R(101, 999);
        const which = pick(["hundreds", "tens", "ones"]);
        const digit = which === "hundreds" ? Math.floor(n / 100) : which === "tens" ? Math.floor(n / 10) % 10 : n % 10;
        return { text: `In ${n}, what digit is in the ${which} place?`, answer: String(digit), key: which,
          hint: `${n} = ${Math.floor(n / 100)} hundreds, ${Math.floor(n / 10) % 10} tens, ${n % 10} ones` };
      },
    },
    {
      id: "g2-compare", grade: 2, icon: "🐊", name: "Compare numbers",
      gen() {
        const a = R(100, 999);
        const b = Math.random() < 0.15 ? a : pick([R(100, 999), Number(String(a).split("").reverse().join("")) || a + 1, a + pick([-10, 10, -1, 1])]);
        const ans = a > b ? ">" : a < b ? "<" : "=";
        return { text: `${a}  ☐  ${b}`, answer: ans, choices: [">", "<", "="], key: "compare",
          hint: `Compare the hundreds first, then tens, then ones. The alligator eats the bigger number!` };
      },
    },
    {
      id: "g2-skip", grade: 2, icon: "🐸", name: "Skip counting",
      gen() {
        const step = pick([2, 5, 10, 100]);
        const start = step === 100 ? R(1, 5) * 100 : R(1, 10) * step;
        const seq = [0, 1, 2, 3].map((i) => start + i * step);
        return { text: `${seq.join(", ")}, ?`, answer: String(start + 4 * step), key: `by${step}`,
          hint: `Each number goes up by ${step}.` };
      },
    },
    {
      id: "g2-oddeven", grade: 2, icon: "🧦", name: "Odd or even",
      gen() {
        const n = R(1, 99);
        return { text: `Is ${n} odd or even?`, answer: n % 2 ? "odd" : "even", choices: ["odd", "even"], key: String(n % 10),
          hint: `Look at the ones digit (${n % 10}). Even numbers end in 0, 2, 4, 6, 8.` };
      },
    },
    {
      id: "g2-add1000", grade: 2, icon: "🏔️", name: "Add & subtract within 1,000",
      gen() {
        if (Math.random() < 0.5) {
          const a = R(10, 60) * 10, b = R(5, (1000 - a) / 10 - 1) * 10;
          return { text: `${a} + ${b} = ?`, answer: String(a + b), key: "add",
            hint: `Add hundreds, then tens: ${Math.floor(a / 100) * 100} + ${Math.floor(b / 100) * 100}, then ${a % 100} + ${b % 100}` };
        }
        const a = R(30, 99) * 10, b = R(5, a / 10 - 5) * 10;
        return { text: `${a} − ${b} = ?`, answer: String(a - b), key: "sub",
          hint: `Take away the hundreds first, then the tens.` };
      },
    },
    {
      id: "g2-time", grade: 2, icon: "⏰", name: "Tell time",
      gen() {
        const h = R(1, 12), m = R(0, 11) * 5;
        const ans = fmtTime(h, m);
        return { text: "What time is it?", svg: clockSvg(h, m), answer: ans, format: "time", key: m === 0 ? "o'clock" : `:${pad(m)}`,
          hint: `The short hand shows the hour. The long hand: count by 5s from the 12.` };
      },
    },
    {
      id: "g2-money", grade: 2, icon: "🪙", name: "Count money",
      gen() {
        const coins = [["quarter", 25], ["dime", 10], ["nickel", 5], ["penny", 1]];
        let total = 0, parts = [];
        for (const [name, v] of coins) {
          const c = R(0, name === "quarter" ? 3 : 3);
          if (c) { parts.push(`${c} ${c > 1 ? (name === "penny" ? "pennies" : name + "s") : name}`); total += c * v; }
        }
        if (!parts.length) { parts = ["1 quarter"]; total = 25; }
        return { text: `How many cents? ${parts.join(" + ")}`, answer: String(total), key: "coins", unit: "¢",
          hint: `Quarter = 25¢, dime = 10¢, nickel = 5¢, penny = 1¢. Start with the biggest coins.` };
      },
    },
    {
      id: "g2-measure", grade: 2, icon: "📏", name: "Measure length",
      gen() {
        const len = R(2, 10);
        const unit = pick(["inches", "centimeters"]);
        return { text: `How long is the bar, in ${unit}?`, svg: rulerSvg(len), answer: String(len), key: "ruler",
          hint: `The bar starts at 0. Find the number where it ends.` };
      },
    },
    {
      id: "g2-graph", grade: 2, icon: "📊", name: "Read graphs",
      gen() {
        const cats = shuffle(["🐶", "🐱", "🐰", "🐟", "🐦"]).slice(0, 4);
        const vals = cats.map(() => R(1, 10));
        const i = R(0, 3);
        let j = R(0, 3); if (j === i) j = (j + 1) % 4;
        if (Math.random() < 0.5 || vals[i] === vals[j]) {
          return { text: `How many kids picked ${cats[i]}?`, svg: barGraphSvg(cats, vals, 1), answer: String(vals[i]), key: "read",
            hint: `Look at the top of the ${cats[i]} bar and read across to the numbers.` };
        }
        const [hi, lo] = vals[i] > vals[j] ? [i, j] : [j, i];
        return { text: `How many more picked ${cats[hi]} than ${cats[lo]}?`, svg: barGraphSvg(cats, vals, 1), answer: String(vals[hi] - vals[lo]), key: "how-many-more",
          hint: `${cats[hi]} has ${vals[hi]}, ${cats[lo]} has ${vals[lo]}. Subtract.` };
      },
    },
    {
      id: "g2-shapes", grade: 2, icon: "🍕", name: "Halves, thirds, fourths",
      gen() {
        const parts = pick([2, 3, 4]);
        const shaded = R(1, parts - 1);
        const ans = `${shaded}/${parts}`;
        const others = ["1/2", "1/3", "2/3", "1/4", "2/4", "3/4", `${parts}/${shaded}`];
        return { text: "What fraction is shaded?", svg: fractionShapeSvg(parts, shaded), answer: ans, choices: uniqChoices(ans, others), key: ans,
          hint: `Count all the parts (bottom number) and the shaded parts (top number).` };
      },
    },
    {
      id: "g2-arrays", grade: 2, icon: "🔵", name: "Arrays",
      gen() {
        const r = R(2, 5), c = R(2, 5);
        return { text: `${r} rows of ${c}. How many dots?`, svg: arraySvg(r, c), answer: String(r * c), key: `${r}x${c}`,
          hint: `Add ${c} over and over, ${r} times: ${Array(r).fill(c).join(" + ")}` };
      },
    },

    // ===== 3rd grade =====
    {
      id: "g3-times", grade: 3, icon: "✖️", name: "Times tables",
      gen() {
        const a = R(2, 10), b = R(0, 10);
        return { text: `${a} × ${b} = ?`, answer: String(a * b), key: `${Math.min(a, b)}x${Math.max(a, b)}`,
          hint: b === 0 ? "Anything times 0 is 0." : `${a} × ${b} is ${b} groups of ${a}. Try ${a} × ${b - 1} = ${a * (b - 1)}, then add ${a}.` };
      },
    },
    {
      id: "g3-divide", grade: 3, icon: "➗", name: "Division facts",
      gen() {
        const b = R(2, 10), c = R(1, 10), a = b * c;
        return { text: `${a} ÷ ${b} = ?`, answer: String(c), key: `${a}/${b}`,
          hint: `Think: ${b} × ? = ${a}` };
      },
    },
    {
      id: "g3-missing", grade: 3, icon: "❓", name: "Missing number",
      gen() {
        const a = R(2, 10), b = R(2, 10);
        if (Math.random() < 0.5) return { text: `${a} × ? = ${a * b}`, answer: String(b), key: `${a}x?=${a * b}`, hint: `Count by ${a}s until you reach ${a * b}.` };
        return { text: `? ÷ ${a} = ${b}`, answer: String(a * b), key: `?/${a}=${b}`, hint: `Multiply back: ${a} × ${b}` };
      },
    },
    {
      id: "g3-multwords", grade: 3, icon: "🍎", name: "× and ÷ word problems",
      gen() {
        const n = pick(NAMES), a = R(2, 9), b = R(2, 9);
        const kind = R(0, 2);
        if (kind === 0) return { text: `There are ${a} bags with ${b} apples in each. How many apples?`, answer: String(a * b), key: "groups", hint: `${a} groups of ${b}: ${a} × ${b}` };
        if (kind === 1) return { text: `${n} shares ${a * b} cookies equally with ${a} friends. How many does each friend get?`, answer: String(b), key: "share", hint: `Share equally means divide: ${a * b} ÷ ${a}` };
        return { text: `A garden has ${a} rows with ${b} plants in each row. How many plants?`, answer: String(a * b), key: "rows", hint: `Rows times plants in each row: ${a} × ${b}` };
      },
    },
    {
      id: "g3-twostep", grade: 3, icon: "🧩", name: "Two-step problems",
      gen() {
        const n = pick(NAMES);
        const kind = R(0, 2);
        if (kind === 0) {
          const q = R(2, 4), p = R(2, 6), pay = q * p < 20 ? pick([20, 50]) : 50;
          return { text: `${n} buys ${q} toys that cost $${p} each and pays with $${pay}. How much change?`, answer: String(pay - q * p), key: "change", unit: "$",
            hint: `Step 1: cost = ${q} × $${p}. Step 2: $${pay} minus the cost.` };
        }
        if (kind === 1) {
          const boxes = R(2, 6), per = R(3, 9), extra = R(2, 9);
          return { text: `${n} has ${boxes} boxes with ${per} crayons each, plus ${extra} loose crayons. How many crayons in all?`, answer: String(boxes * per + extra), key: "groups+extra",
            hint: `Step 1: ${boxes} × ${per}. Step 2: add ${extra}.` };
        }
        const total = R(3, 8) * 6, eaten = R(1, 5) * 6;
        const left = total - eaten > 0 ? total - eaten : 6;
        const t2 = left + eaten;
        return { text: `There were ${t2} cupcakes. ${eaten} were eaten. The rest go equally onto 6 plates. How many on each plate?`, answer: String(left / 6), key: "sub-then-share",
          hint: `Step 1: ${t2} − ${eaten}. Step 2: divide by 6.` };
      },
    },
    {
      id: "g3-round", grade: 3, icon: "🎯", name: "Rounding",
      gen() {
        const n = R(101, 999);
        const to = pick([10, 100]);
        const ans = Math.round(n / to) * to;
        return { text: `Round ${n} to the nearest ${to}.`, answer: String(ans), key: `nearest${to}`,
          hint: `Look at the ${to === 10 ? "ones" : "tens"} digit. 5 or more rounds up, 4 or less rounds down.` };
      },
    },
    {
      id: "g3-add1000", grade: 3, icon: "🏗️", name: "Add & subtract within 1,000",
      gen() {
        if (Math.random() < 0.5) {
          const a = R(100, 700), b = R(100, 999 - a);
          return { text: `${a} + ${b} = ?`, answer: String(a + b), key: "add", hint: `Add ones, then tens, then hundreds. Remember to carry when a column is 10 or more.` };
        }
        const a = R(300, 999), b = R(100, a - 50);
        return { text: `${a} − ${b} = ?`, answer: String(a - b), key: "sub", hint: `Subtract ones, then tens, then hundreds. Borrow when the top digit is smaller.` };
      },
    },
    {
      id: "g3-mult10", grade: 3, icon: "🔟", name: "Multiply by tens",
      gen() {
        const a = R(2, 9), b = R(1, 9) * 10;
        return { text: `${a} × ${b} = ?`, answer: String(a * b), key: `${a}x${b}`,
          hint: `${a} × ${b / 10} = ${(a * b) / 10}, then put a 0 on the end.` };
      },
    },
    {
      id: "g3-numline", grade: 3, icon: "📍", name: "Fractions on a number line",
      gen() {
        const den = pick([2, 3, 4, 6, 8]), num = R(1, den - 1);
        const ans = `${num}/${den}`;
        const others = [`${num + 1}/${den}`, `${Math.max(1, num - 1)}/${den}`, `${den}/${num}`, `1/${den}`, `${num}/${den + 1}`];
        return { text: "What fraction is at the dot?", svg: numberLineSvg(den, num), answer: ans, choices: uniqChoices(ans, others), key: ans,
          hint: `From 0 to 1 there are ${den} equal jumps. Count the jumps to the dot.` };
      },
    },
    {
      id: "g3-fraccompare", grade: 3, icon: "⚖️", name: "Compare fractions",
      gen() {
        if (Math.random() < 0.5) {
          const d = pick([3, 4, 6, 8]);
          const a = R(1, d - 1), b = R(1, d - 1);
          const ans = a > b ? ">" : a < b ? "<" : "=";
          return { text: `${a}/${d}  ☐  ${b}/${d}`, answer: ans, choices: [">", "<", "="], key: "same-bottom",
            hint: `Same size pieces: more pieces is bigger.` };
        }
        if (Math.random() < 0.5) {
          const n = R(1, 3);
          const d1 = pick([2, 3, 4, 6, 8]), d2 = pick([2, 3, 4, 6, 8].filter((x) => x !== d1));
          const n1 = Math.min(n, d1 - 1), n2 = Math.min(n, d2 - 1);
          if (n1 === n2) {
            const ans = d1 < d2 ? ">" : "<";
            return { text: `${n1}/${d1}  ☐  ${n2}/${d2}`, answer: ans, choices: [">", "<", "="], key: "same-top",
              hint: `Same number of pieces: the smaller bottom number means bigger pieces.` };
          }
        }
        const base = pick([[1, 2], [1, 3], [1, 4], [2, 3], [3, 4]]);
        const k = pick([2, 3, 4]);
        return { text: `${base[0]}/${base[1]} = ?/${base[1] * k}`, answer: String(base[0] * k), key: "equivalent",
          hint: `The bottom was multiplied by ${k}. Multiply the top by ${k} too.` };
      },
    },
    {
      id: "g3-elapsed", grade: 3, icon: "⏳", name: "Time & elapsed time",
      gen() {
        if (Math.random() < 0.4) {
          const h = R(1, 12), m = R(0, 59);
          const ans = fmtTime(h, m);
          return { text: "What time is it?", svg: clockSvg(h, m), answer: ans, format: "time", key: "read-minute",
            hint: `Long hand: count by 5s to the last big number, then count the little lines.` };
        }
        const h = R(1, 11), m = R(0, 11) * 5, dur = R(2, 18) * 5;
        const ans = fmtTime(...addMinutes(h, m, dur));
        return { text: `A game starts at ${fmtTime(h, m)} and lasts ${dur} minutes. When does it end?`, answer: ans, format: "time", key: "elapsed",
          hint: `Jump to the next hour first, then add the minutes that are left.` };
      },
    },
    {
      id: "g3-area", grade: 3, icon: "🟩", name: "Area",
      gen() {
        const w = R(2, 9), h = R(2, 7);
        if (Math.random() < 0.5) return { text: "How many square units cover this shape?", svg: gridSvg(w, h), answer: String(w * h), key: `${w}x${h}`, unit: "sq",
          hint: `Count the squares in one row (${w}), then multiply by the number of rows (${h}).` };
        return { text: "What is the area?", svg: rectSvg(w, h, "ft"), answer: String(w * h), key: `${w}x${h}`, unit: "sq ft",
          hint: `Area = length × width = ${w} × ${h}` };
      },
    },
    {
      id: "g3-perimeter", grade: 3, icon: "🔲", name: "Perimeter",
      gen() {
        const w = R(2, 12), h = R(2, 9);
        return { text: "What is the perimeter (distance all the way around)?", svg: rectSvg(w, h, "cm"), answer: String(2 * (w + h)), key: "rect", unit: "cm",
          hint: `Add all four sides: ${w} + ${h} + ${w} + ${h}` };
      },
    },
    {
      id: "g3-graph", grade: 3, icon: "📈", name: "Graphs with scales",
      gen() {
        const scale = pick([2, 5, 10]);
        const cats = shuffle(["🍕", "🌮", "🍔", "🍝", "🥗"]).slice(0, 4);
        const vals = cats.map(() => R(1, 8) * scale);
        const i = R(0, 3);
        let j = R(0, 3); if (j === i) j = (j + 1) % 4;
        if (Math.random() < 0.5 || vals[i] === vals[j]) {
          return { text: `How many votes for ${cats[i]}?`, svg: barGraphSvg(cats, vals, scale), answer: String(vals[i]), key: `scale${scale}`,
            hint: `Each line counts by ${scale}. Read the top of the ${cats[i]} bar.` };
        }
        const [hi, lo] = vals[i] > vals[j] ? [i, j] : [j, i];
        return { text: `How many more votes for ${cats[hi]} than ${cats[lo]}?`, svg: barGraphSvg(cats, vals, scale), answer: String(vals[hi] - vals[lo]), key: "how-many-more",
          hint: `${cats[hi]} has ${vals[hi]}, ${cats[lo]} has ${vals[lo]}. Subtract.` };
      },
    },
    {
      id: "g3-quads", grade: 3, icon: "🔷", name: "Shapes",
      gen() {
        const qs = [
          ["Which shape has 4 equal sides AND 4 square corners?", "square", ["square", "rhombus", "rectangle", "trapezoid"], "A rhombus has equal sides but not square corners."],
          ["Which shape has 4 equal sides but corners that are NOT square?", "rhombus", ["square", "rhombus", "rectangle", "triangle"], "Think of a diamond shape."],
          ["Which shape has 4 square corners, but sides that are not all equal?", "rectangle", ["square", "rhombus", "rectangle", "pentagon"], "Like a door or a book."],
          ["How many sides does a quadrilateral have?", "4", ["3", "4", "5", "6"], "Quad means four."],
          ["How many sides does a pentagon have?", "5", ["4", "5", "6", "8"], "Penta means five."],
          ["How many sides does a hexagon have?", "6", ["5", "6", "7", "8"], "A honeycomb cell is a hexagon."],
          ["Is every square also a rectangle?", "yes", ["yes", "no"], "A rectangle just needs 4 square corners. Does a square have them?"],
          ["Is every rectangle also a square?", "no", ["yes", "no"], "A square needs all 4 sides equal."],
        ];
        const [text, ans, choices, hint] = pick(qs);
        return { text, answer: ans, choices: shuffle(choices), key: ans, hint };
      },
    },
  ];

  const api = { skills, R, pick, shuffle };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MathSkills = api;
})(typeof window !== "undefined" ? window : globalThis);
