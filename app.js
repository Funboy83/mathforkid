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
    progress: {}, // progress[profileId][skillId] = { rounds, asked, firstTry, bestStars, great, missed: {key: n}, review: [...], history: [...] }
    rounds: {}, // rounds[profileId] = rounds played, used to space out review questions
  };
  const REVIEW_MAX = 10; // missed questions kept per skill for spaced review
  const MASTERY_ROUNDS = 2; // rounds of 9+/10 needed to call a skill mastered
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
    const st = (data.progress[pid][sid] = data.progress[pid][sid] || { rounds: 0, asked: 0, firstTry: 0, bestStars: 0, missed: {}, history: [] });
    st.review = st.review || [];
    st.great = st.great || 0;
    return st;
  }
  const isMastered = (st) => !!st && (st.great || 0) >= MASTERY_ROUNDS;

  // Mixed review: questions from every skill in a grade the kid has already tried (interleaved practice).
  function mixedSkill(grade) {
    const pool = skills.filter((s) => s.grade === grade);
    return {
      id: `mix-g${grade}`, grade, icon: "🔀", name: "Mixed review", mixed: true, pool,
      gen() {
        const prog = data.progress[state.profile.id] || {};
        const tried = pool.filter((s) => prog[s.id] && prog[s.id].rounds > 0);
        const src = pick(tried.length >= 2 ? tried : pool);
        return Object.assign(src.gen(), { skillId: src.id, from: `${src.icon} ${src.name}` });
      },
    };
  }

  // Spaced review: a question missed in an earlier round comes back in a later one.
  function takeReview() {
    const pid = state.profile.id, r = state.round;
    const now = data.rounds[pid] || 0;
    const ids = state.skill.mixed ? state.skill.pool.map((s) => s.id) : [state.skill.id];
    for (const sid of ids) {
      const st = (data.progress[pid] || {})[sid];
      if (!st || !st.review) continue;
      const item = st.review.find((it) => it.addedAt < now && !r.usedReview.includes(it.q.text + (it.q.svg || "")));
      if (item) {
        r.usedReview.push(item.q.text + (item.q.svg || ""));
        const src = skills.find((s) => s.id === sid);
        return Object.assign({}, item.q, { skillId: sid, isReview: true, from: `${src.icon} ${src.name}` });
      }
    }
    return null;
  }
  const sameQ = (a, b) => a.text === b.text && (a.svg || "") === (b.svg || "");
  const shownInput = (q, input) => (q.format === "time" && input.length >= 3 ? `${input.slice(0, -2)}:${input.slice(-2)}` : input);

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
    const prog = data.progress[p.id] || {};
    const gradeSkills = skills.filter((s) => s.grade === state.grade);
    const nextUp = state.grade === p.grade ? gradeSkills.find((s) => !isMastered(prog[s.id])) : null;
    const mix = mixedSkill(state.grade);
    const tiles = [mix, ...gradeSkills].map((s) => {
      const st = prog[s.id];
      const toReview = st && st.review ? st.review.length : 0;
      const badge = s.mixed ? '<span class="badge">All skills</span>'
        : isMastered(st) ? '<span class="badge done">🏅 Mastered</span>'
        : nextUp && nextUp.id === s.id ? '<span class="badge next">👉 Next up</span>'
        : toReview ? `<span class="badge">🔁 ${toReview} to review</span>` : "";
      return `<button class="skill ${nextUp && nextUp.id === s.id ? "is-next" : ""}" data-sid="${s.id}">
        ${badge}
        <span class="icon">${s.icon}</span>
        <span class="label">${s.name}</span>
        <span class="stars">${starsHtml(st ? st.bestStars : 0)}</span>
      </button>`;
    }).join("");
    state.mix = mix;
    app.innerHTML = `${topbar()}<div class="tabs">${tabs}</div><div class="skills">${tiles}</div>`;
    app.querySelector('[data-act="back"]').onclick = () => { state.screen = "profiles"; render(); };
    app.querySelectorAll(".tab").forEach((t) => (t.onclick = () => { state.grade = Number(t.dataset.grade); render(); }));
    app.querySelectorAll(".skill").forEach((t) => (t.onclick = () => startRound(t.dataset.sid === state.mix.id ? state.mix : skills.find((s) => s.id === t.dataset.sid))));
  }

  function startRound(skill) {
    state.skill = skill;
    state.round = { n: 0, score: 0, streak: 0, bestStreak: 0, missedKeys: [], usedReview: [] };
    state.screen = "practice";
    nextQuestion();
  }

  function nextQuestion() {
    const r = state.round;
    if (r.n >= ROUND) return finishRound();
    // avoid repeating the exact same question twice in a row
    // every 3rd question is a review of something missed in an earlier round, if there is one
    let q = r.n % 3 === 2 ? takeReview() : null, tries = 0;
    if (!q) do { q = state.skill.gen(); } while (r.q && sameQ(q, r.q) && ++tries < 10);
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
      const shown = r.input ? shownInput(q, r.input) : `<span class="placeholder">${q.format === "time" ? "?:??" : "?"}</span>`;
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
        <div style="color:var(--muted);font-weight:700">${q.isReview ? "🔁 Review: you missed this one before · " : ""}${q.from || `${state.skill.icon} ${state.skill.name}`}</div>
        <div class="qtext ${q.text.length > 40 ? "long" : ""}">${q.text}</div>
        ${q.svg || ""}
        ${input}
        ${q.format === "time" && !r.done ? '<div class="tip">Type the numbers, the : goes in by itself</div>' : ""}
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
    else if (k === "ok") { if (r.input) return submit(shownInput(r.q, r.input)); return; }
    else if (r.input.length < (r.q.format === "time" ? 4 : 5)) r.input = (r.input === "0" ? "" : r.input) + k;
    r.feedback = r.feedback && r.feedback.type === "hint" ? r.feedback : null;
    render();
  }

  function submit(ans) {
    const r = state.round, q = r.q;
    const st = skillStats(state.profile.id, q.skillId || state.skill.id);
    if (ans === q.answer) {
      if (r.tries === 0 && q.isReview) st.review = st.review.filter((it) => !sameQ(it.q, q));
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
      if (!st.review.some((it) => sameQ(it.q, q))) {
        const { skillId, isReview, from, ...plain } = q;
        st.review.push({ q: plain, addedAt: data.rounds[state.profile.id] || 0 });
        if (st.review.length > REVIEW_MAX) st.review.shift();
      }
      r.missedKeys.push(q.text);
      if (q.choices) r.picked.push(ans);
      r.done = true;
      r.input = q.choices ? "" : q.answer.replace(":", "");
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
    const wasMastered = isMastered(st);
    st.rounds++;
    if (r.score >= 9) st.great++;
    r.justMastered = !state.skill.mixed && !wasMastered && isMastered(st);
    data.rounds[state.profile.id] = (data.rounds[state.profile.id] || 0) + 1;
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
        ${r.justMastered ? `<div class="msg">🏅 You mastered ${state.skill.name}! Time to try the next skill.</div>` : r.newBest ? `<div class="msg">🎉 New best for ${state.skill.name}!</div>` : ""}
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

  // read-only hook for automated tests
  window.__mathquest = { current: () => state.round && state.round.q };

  render();
})();
