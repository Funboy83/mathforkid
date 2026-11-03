// Sanity check: every skill generates valid questions many times over.
// Run with: node test/skills.test.js
const { skills } = require("../skills.js");

let failures = 0;
const ids = new Set();
for (const s of skills) {
  if (ids.has(s.id)) { console.error(`duplicate id ${s.id}`); failures++; }
  ids.add(s.id);
  for (let i = 0; i < 2000; i++) {
    const q = s.gen();
    const problems = [];
    if (!q.text) problems.push("missing text");
    if (typeof q.answer !== "string" || q.answer === "") problems.push("answer must be a non-empty string");
    if (!q.hint) problems.push("missing hint");
    if (q.key === undefined) problems.push("missing key");
    if (q.choices) {
      if (!q.choices.includes(q.answer)) problems.push("answer not in choices");
      if (new Set(q.choices).size !== q.choices.length) problems.push("duplicate choices");
      if (q.choices.length < 2) problems.push("too few choices");
    } else if (!/^\d+$/.test(q.answer)) {
      problems.push(`keypad answer is not a whole number: ${q.answer}`);
    }
    if (q.text.includes("NaN") || q.answer.includes("NaN") || (q.svg || "").includes("NaN")) problems.push("NaN");
    if (problems.length) {
      failures++;
      console.error(`${s.id}: ${problems.join(", ")}`, q);
      break;
    }
  }
}
console.log(`${skills.length} skills checked (${skills.filter((s) => s.grade === 2).length} grade 2, ${skills.filter((s) => s.grade === 3).length} grade 3)`);
if (failures) { console.error(`${failures} failing skill(s)`); process.exit(1); }
console.log("all good");
