(function () {
  const { skills } = window.MathSkills;
  const ROUND = 10; // questions per practice round
  const STORE_KEY = "mathquest.v1";
  const app = document.getElementById("app");

  // ---------- Saved data (on this tablet) ----------
  const DEFAULT = {
    profiles: [
      { id: "nathan", name: "Nathan", avatar: "🦊", grade: 3 },
      { id: "ethan", name: "Ethan", avatar: "🐼", grade: 2 },
    ],
    progress: {}, // progress[profileId][skillId] = { rounds, asked, firstTry, bestStars, missed: {key: n}, history: [...] }
  };
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign(structuredClone(DEFAULT), JSON.parse(raw));
    } catch (e) { /* storage unavailable: run without saving */ }
    return structuredClone(DEFAULT);
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
  }
  let data = load();

  function skillStats(pid, sid) {
    data.progress[pid] = data.progress[pid] || {};
    return (data.progress[pid][sid] = data.progress[pid][sid] || { rounds: 0, asked: 0, firstTry: 0, bestStars: 0, missed: {}, history: [] });
  }

  // ---------- State ----------
  let state = { screen: "profiles", profile: null, grade: null, skill: null, round: null };

  const starsHtml = (n, max = 3) => Array.from({ length: max }, (_, i) => (i < n ? "★" : '<span class="off">★</span>')).join("");
  const starsFor = (score) => (score >= 9 ? 3 : score >= 7 ? 2 : score >= 5 ? 1 : 0);
  const cheers = ["Great job!", "You got it!", "Awesome!", "Super!", "Nailed it!", "Math star!", "Yes!"];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // ---------- Screens ----------
  function render() {
    if (state.screen === "profiles") return renderProfiles();
    if (state.screen === "skills") return renderSkills();
    if (state.screen === "practice") return renderPractice();
    if (state.screen === "result") return renderResult();
  }

  function renderProfiles() {
    const cards = data.profiles.map((p) => {
      const prog = data.progress[p.id] || {};
      const stars = Object.values(prog).reduce((s, x) => s + (x.bestStars || 0), 0);
      return `<button class="profile" data-pid="${p.id}">
        <span class="avatar">${p.avatar}</span>
        <span class="name">${p.name}</span>
        <span class="meta">Grade ${p.grade} · ${stars} ★</span>
      </button>`;
    }).join("");
    app.innerHTML = `<h1>Math Quest</h1><p class="sub">Who's playing?</p><div class="profiles">${cards}</div>`;
    app.querySelectorAll(".profile").forEach((b) =>
      b.addEventListener("click", () => {
        state.profile = data.profiles.find((p) => p.id === b.dataset.pid);
        state.grade = state.profile.grade;
        state.screen = "skills";
        render();
      })
    );
  }

  function topbar(right = "") {
    const p = state.profile;
    return `<div class="topbar">
      <button class="back" data-act="back">← Back</button>
      <div class="who"><span class="avatar">${p.avatar}</span>${p.name}</div>
      ${right || '<span style="width:90px"></span>'}
    </div>`;
  }

  function renderSkills() {
    const p = state.profile;
    const grades = [...new Set(skills.map((s) => s.grade))].sort();
    const tabs = grades.map((g) => `<button class="tab ${g === state.grade ? "on" : ""}" data-grade="${g}">Grade ${g}</button>`).join("");
    const tiles = skills.filter((s) => s.grade === state.grade).map((s) => {
      const st = (data.progress[p.id] || {})[s.id];
      return `<button class="skill" data-sid="${s.id}">
        <span class="icon">${s.icon}</span>
        <span class="label">${s.name}</span>
        <span class="stars">${starsHtml(st ? st.bestStars : 0)}</span>
      </button>`;
    }).join("");
    app.innerHTML = `${topbar()}<div class="tabs">${tabs}</div><div class="skills">${tiles}</div>`;
    app.querySelector('[data-act="back"]').onclick = () => { state.screen = "profiles"; render(); };
    app.querySelectorAll(".tab").forEach((t) => (t.onclick = () => { state.grade = Number(t.dataset.grade); render(); }));
    app.querySelectorAll(".skill").forEach((t) => (t.onclick = () => startRound(skills.find((s) => s.id === t.dataset.sid))));
  }

  function startRound(skill) {
    state.skill = skill;
    state.round = { n: 0, score: 0, streak: 0, bestStreak: 0, missedKeys: [] };
    state.screen = "practice";
    nextQuestion();
  }

  function nextQuestion() {
    const r = state.round;
    if (r.n >= ROUND) return finishRound();
    // avoid repeating the exact same question twice in a row
    let q, tries = 0;
    do { q = state.skill.gen(); } while (r.q && q.text === r.q.text && q.svg === r.q.svg && ++tries < 10);
    r.q = q;
    r.n++;
    r.tries = 0;
    r.input = "";
    r.done = false;
    r.feedback = null;
    r.picked = [];
    render();
  }

  function renderPractice() {
    const r = state.round, q = r.q;
    const pct = ((r.n - 1) / ROUND) * 100;
    const streak = r.streak >= 2 ? `🔥 ${r.streak}` : "";
    let input;
    if (q.choices) {
      input = `<div class="choices">${q.choices.map((c) => {
        const cls = r.done && c === q.answer ? "right" : r.picked.includes(c) ? "wrong" : "";
        return `<button class="choice ${cls}" data-c="${c}" ${r.done || r.picked.includes(c) ? "disabled" : ""}>${c}</button>`;
      }).join("")}</div>`;
    } else {
      const unitBefore = q.unit === "$" ? '<span class="unit">$</span>' : "";
      const unitAfter = q.unit && q.unit !== "$" ? `<span class="unit">${q.unit}</span>` : "";
      const shown = r.input ? r.input : '<span class="placeholder">?</span>';
      input = `<div class="answer-box ${r.feedback && r.feedback.type !== "good" && !r.done ? "shake" : ""}">${unitBefore}${shown}${unitAfter}</div>`;
      if (!r.done) {
        input += `<div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button class="key" data-k="${d}">${d}</button>`).join("")}
          <button class="key" data-k="del">⌫</button><button class="key" data-k="0">0</button><button class="key go" data-k="ok">✓</button></div>`;
      }
    }
    const fb = r.feedback ? `<div class="feedback ${r.feedback.type} pop">${r.feedback.msg}</div>` : "";
    const next = r.done ? `<button class="next" data-act="next">${r.n >= ROUND ? "See my stars ⭐" : "Next →"}</button>` : "";
    app.innerHTML = `
      ${topbar(`<span class="pill">${r.n} / ${ROUND}</span>`)}
      <div class="topbar"><div class="progress"><div style="width:${pct}%"></div></div><span class="streak">${streak}</span></div>
      <div class="qcard">
        <div style="color:var(--muted);font-weight:700">${state.skill.icon} ${state.skill.name}</div>
        <div class="qtext ${q.text.length > 40 ? "long" : ""}">${q.text}</div>
        ${q.svg || ""}
        ${input}
        ${fb}
        ${next}
      </div>`;

    app.querySelector('[data-act="back"]').onclick = () => { state.screen = "skills"; render(); };
    app.querySelectorAll(".choice").forEach((b) => (b.onclick = () => submit(b.dataset.c)));
    app.querySelectorAll(".key").forEach((b) => (b.onclick = () => keypad(b.dataset.k)));
    const n = app.querySelector('[data-act="next"]');
    if (n) n.onclick = nextQuestion;
  }

  function keypad(k) {
    const r = state.round;
    if (k === "del") r.input = r.input.slice(0, -1);
    else if (k === "ok") { if (r.input) return submit(r.input); return; }
    else if (r.input.length < 5) r.input = (r.input === "0" ? "" : r.input) + k;
    r.feedback = r.feedback && r.feedback.type === "hint" ? r.feedback : null;
    render();
  }

  function submit(ans) {
    const r = state.round, q = r.q;
    const st = skillStats(state.profile.id, state.skill.id);
    if (ans === q.answer) {
      if (r.tries === 0) {
        r.score++;
        r.streak++;
        r.bestStreak = Math.max(r.bestStreak, r.streak);
        st.firstTry++;
      }
      st.asked++;
      r.done = true;
      r.feedback = { type: "good", msg: r.tries === 0 ? `✅ ${pick(cheers)}` : "✅ You figured it out!" };
    } else if (r.tries === 0) {
      r.tries = 1;
      r.streak = 0;
      if (q.choices) r.picked.push(ans);
      r.input = "";
      r.feedback = { type: "hint", msg: `💡 Not quite. Hint: ${q.hint}` };
    } else {
      st.asked++;
      st.missed[q.key] = (st.missed[q.key] || 0) + 1;
      r.missedKeys.push(q.text);
      if (q.choices) r.picked.push(ans);
      r.done = true;
      r.input = q.choices ? "" : q.answer;
      r.feedback = { type: "bad", msg: `The answer is <b>${q.unit === "$" ? "$" : ""}${q.answer}${q.unit && q.unit !== "$" ? " " + q.unit : ""}</b>. ${q.hint}` };
    }
    save();
    render();
  }

  function finishRound() {
    const r = state.round;
    const st = skillStats(state.profile.id, state.skill.id);
    const stars = starsFor(r.score);
    r.stars = stars;
    r.newBest = stars > st.bestStars;
    st.rounds++;
    st.bestStars = Math.max(st.bestStars, stars);
    st.history.push({ at: new Date().toISOString(), score: r.score, total: ROUND });
    if (st.history.length > 50) st.history.shift();
    save();
    state.screen = "result";
    render();
  }

  function renderResult() {
    const r = state.round;
    const msg = r.stars === 3 ? "Amazing! You're a math star! 🌟" : r.stars === 2 ? "Great work! Keep going for 3 stars!" : r.stars === 1 ? "Good try! Practice makes you stronger 💪" : "Let's practice this one again. You can do it!";
    app.innerHTML = `${topbar()}
      <div class="result pop">
        <div style="font-size:3rem">${state.skill.icon}</div>
        <div class="big-stars">${starsHtml(r.stars)}</div>
        <div class="score">${r.score} / ${ROUND} right</div>
        ${r.bestStreak >= 3 ? `<div class="msg">🔥 Best streak: ${r.bestStreak} in a row</div>` : ""}
        ${r.newBest ? `<div class="msg">🎉 New best for ${state.skill.name}!</div>` : ""}
        <div class="msg">${msg}</div>
        <div class="row">
          <button class="btn primary" data-act="again">Play again</button>
          <button class="btn" data-act="skills">Pick another</button>
        </div>
      </div>`;
    app.querySelector('[data-act="back"]').onclick = () => { state.screen = "skills"; render(); };
    app.querySelector('[data-act="again"]').onclick = () => startRound(state.skill);
    app.querySelector('[data-act="skills"]').onclick = () => { state.screen = "skills"; render(); };
  }

  render();
})();
