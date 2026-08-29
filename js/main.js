(function () {
  "use strict";
  const SITE = window.COURSE_SITE;
  if (!SITE) return;

  const PALETTE = [
    ["#2563eb", "#dbeafe"], ["#7c3aed", "#ede9fe"], ["#0891b2", "#cffafe"],
    ["#059669", "#d1fae5"], ["#d97706", "#fef3c7"], ["#dc2626", "#fee2e2"],
    ["#db2777", "#fce7f3"], ["#65a30d", "#ecfccb"], ["#0d9488", "#ccfbf1"],
    ["#ea580c", "#ffedd5"], ["#4f46e5", "#e0e7ff"],
  ];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso + "T00:00:00");
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function wd(iso) {
    if (!iso) return "";
    const idx = new Date(iso + "T00:00:00").getDay();
    return "星期" + "日一二三四五六"[idx];
  }

  function colorOf(i) {
    return PALETTE[i % PALETTE.length];
  }

  function typeClass(t) {
    return { "理论": "t-lecture", "技能": "t-skill", "见习": "t-clerk", "自主学习": "t-self" }[t] || "t-other";
  }

  function examBadge(kind) {
    const cls = kind === "期中" ? "b-mid" : kind === "期末" ? "b-final" : "b-exam";
    return `<span class="badge ${cls}">${esc(kind)}</span>`;
  }

  function weekGrid(total, trackSel) {
    let html = "";
    for (let w = 1; w <= total; w++) {
      const cls = ((w - 1) / 3 | 0) % 2 === 0 ? "wb" : "wb-alt";
      html += `<span class="${cls}" style="left:${((w - 1) / total) * 100}%;width:${100 / total}%"></span>`;
    }
    return html;
  }

  function scaleHeader(total) {
    let html = "";
    for (let w = 1; w <= total; w++) {
      html += `<span style="left:${((w - 0.5) / total) * 100}%">${w}</span>`;
    }
    return `<div class="tl-head"><div class="tl-spacer">课程</div><div class="tl-scale">${html}</div></div>`;
  }

  function courseRow(course, i, total) {
    const [c] = colorOf(i);
    const left = ((course.startWeek - 1) / total) * 100;
    const width = (course.spanWeeks / total) * 100;
    let markers = "";
    (course.exams || []).forEach((ex) => {
      const cls = ex.kind === "期中" ? "mk-mid" : "mk-final";
      const mleft = ((ex.week - 0.5) / total) * 100;
      markers += `<span class="mk ${cls}" style="left:${mleft}%" title="${esc(ex.kind)} ${fmtDate(ex.date)}（第${ex.week}周）"></span>`;
    });
    return `
      <div class="tl-row">
        <div class="tl-label">
          <span class="tl-name">${esc(course.name)}</span>
          <span class="tl-weeks">第${course.startWeek}–${course.endWeek}周 · ${course.spanWeeks}周</span>
        </div>
        <div class="tl-track">
          ${weekGrid(total)}
          <a class="tl-bar" href="course.html?course=${encodeURIComponent(course.id)}"
             style="left:${left}%;width:${width}%;background:${c}" title="${esc(course.name)}（点击查看详情）">
            <span class="tl-bar-text">${course.startWeek}–${course.endWeek}周</span>
          </a>
          ${markers}
        </div>
      </div>`;
  }

  function renderTimeline(container, courses, total) {
    container.innerHTML = scaleHeader(total) + courses.map((c, i) => courseRow(c, i, total)).join("");
  }

  function renderExamList(container, courses) {
    const items = [];
    courses.forEach((c) => (c.exams || []).forEach((ex) => items.push({ course: c.name, ex })));
    items.sort((a, b) => a.ex.date.localeCompare(b.ex.date));
    container.innerHTML = items.map((it) => `
      <div class="exam-item">
        <div class="exam-date">${fmtDate(it.ex.date)}<small>${wd(it.ex.date)} · 第${it.ex.week}周</small>${cdHtml(it.ex.date)}</div>
        ${examBadge(it.ex.kind)}
        <span class="exam-course">${esc(it.course)}</span>
      </div>`).join("");
    return items.length;
  }

  function dayGap(a, b) {
    return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
  }

  function daysUntil(iso) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((new Date(iso + "T00:00:00") - today) / 86400000);
  }

  function cdHtml(iso) {
    const n = daysUntil(iso);
    if (n > 0) return `<span class="cd cd-soon">距今天 ${n} 天</span>`;
    if (n === 0) return `<span class="cd cd-today">今天考试</span>`;
    return `<span class="cd cd-done">已结束</span>`;
  }

  const CHECK_KEY = "kbzy_check_v1";
  function loadChecks() {
    try { return JSON.parse(localStorage.getItem(CHECK_KEY) || "{}"); }
    catch (e) { return {}; }
  }
  function saveChecks(s) {
    try { localStorage.setItem(CHECK_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
  }
  function checkKey(courseId, section, text) {
    return courseId + "::" + section + "::" + text;
  }
  function bindCheckbox(container) {
    const checks = loadChecks();
    container.querySelectorAll("input.ck").forEach((inp) => {
      inp.checked = !!checks[inp.dataset.key];
    });
    container.addEventListener("change", (ev) => {
      const inp = ev.target;
      if (!inp.classList || !inp.classList.contains("ck")) return;
      const s = loadChecks();
      if (inp.checked) s[inp.dataset.key] = true;
      else delete s[inp.dataset.key];
      saveChecks(s);
      updateFocusProg();
    });
  }
  function updateFocusProg() {
    const box = document.getElementById("fp-count");
    if (!box) return;
    const checks = loadChecks();
    const cks = document.querySelectorAll("input.ck[data-key]");
    let done = 0;
    cks.forEach((inp) => { if (checks[inp.dataset.key]) done++; });
    box.textContent = `${done} / ${cks.length}`;
  }

  function md(iso) {
    const d = new Date(iso + "T00:00:00");
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  // 考试密集周：看板式时间轴，期中/期末各用一条独立时间轴，间隔 <=4 天红色加粗
  function renderExamDense() {
    const el = document.getElementById("examDense");
    if (!el) return;
    const courses = SITE.courses;
    const all = [];
    courses.forEach((c) => (c.exams || []).forEach((ex) => {
      all.push({
        course: c.name,
        credit: c.credit,
        format: c.examFormat || "待补充",
        kind: ex.kind,
        date: ex.date,
        week: ex.week,
        method: Array.isArray(c.studyMethod) ? c.studyMethod : [],
        focus: c.focus,
      });
    }));

    const segs = [
      { title: "期中考试轴", range: "第 7–12 周 · 10/15 – 11/16", lo: 7, hi: 12 },
      { title: "期末考试轴", range: "第 13–20 周 · 11/23 – 1/12", lo: 13, hi: 20 },
    ];

    const dotClass = (kind) =>
      kind === "期中" ? "mid" : kind === "期末" ? "final" : "exam";

    let html = `
      <div class="dense-overview">
        <p>本学期共 ${all.length} 场考试，第 7–20 周几乎每周一场。下面用两条时间轴展示最密集的两段，<b>间隔 ≤ 4 天</b>的连考会用 <b class="red-b">红色加粗</b>标出；点开每个考试节点可查看题型、复习方法与考试重点。</p>
      </div>`;

    segs.forEach((seg) => {
      const items = all
        .filter((ex) => ex.week >= seg.lo && ex.week <= seg.hi)
        .sort((a, b) => a.date.localeCompare(b.date));

      let rows = "";
      items.forEach((ex, i) => {
        const method = (ex.method || []).map((m) =>
          `<li><b>${esc(m.source || "师兄")}：</b>${esc(m.method)}</li>`).join("");
        const focusSummary = ex.focus ? `<p class="bcard-summary">${esc(ex.focus.summary)}</p>` : "";
        const focusEssay = ex.focus
          ? ex.focus.essay.slice(0, 3).map((e) =>
              `<li><label class="ck-row"><input type="checkbox" class="ck" data-key="${esc(checkKey(ex.course, "essay", e))}"><span>${esc(e)}</span></label></li>`).join("")
          : "";
        rows += `
          <div class="bnode">
            <span class="bnode-dot ${dotClass(ex.kind)}"></span>
            <details class="bcard">
              <summary>
                <span class="bcard-name">${esc(ex.course)}</span>
                <span class="badge ${ex.kind === "期中" ? "b-mid" : ex.kind === "期末" ? "b-final" : "b-exam"}">${esc(ex.kind)}</span>
                <span class="bcard-meta">${md(ex.date)}（${wd(ex.date)}）· 第${ex.week}周 · ${ex.credit ? ex.credit + " 学分" : "学分待定"} · ${cdHtml(ex.date)}</span>
              </summary>
              <div class="bcard-detail">
                <p><b>题型：</b>${esc(ex.format)}</p>
                ${focusSummary}
                <p><b>师兄推荐复习方法：</b></p>
                ${method ? `<ul>${method}</ul>` : `<p class="dense-todo">待补充</p>`}
                ${focusEssay ? `<p><b>考试重点（高频大题 TOP3）：</b></p><ul class="dense-focus">${focusEssay}</ul>` : `<p><b>考试重点：</b><span class="dense-todo">待补充</span></p>`}
              </div>
            </details>
          </div>`;
        if (i < items.length - 1) {
          const gap = dayGap(items[i].date, items[i + 1].date);
          rows += `
            <div class="binterval ${gap <= 4 ? "short" : ""}">
              <span class="bi-line"></span>
              <span class="bi-text">间隔 ${gap} 天</span>
            </div>`;
        }
      });

      html += `
        <div class="dense-board">
          <div class="board-head">
            <span class="board-title">${seg.title}</span>
            <span class="board-range">${seg.range}</span>
            <span class="board-note">${items.length} 场考试</span>
          </div>
          <div class="board-body">${rows}</div>
        </div>`;
    });

    el.innerHTML = html;
    bindCheckbox(el);
  }

  function selfStudyBar(ratio) {
    const pct = Math.round(ratio * 100);
    return `
      <div class="ss-label"><span>自主学习占比</span><b>${pct}%</b></div>
      <div class="ss-bar"><i style="width:${Math.max(pct, 2)}%"></i></div>`;
  }

  function renderCourseCards(container, courses) {
    container.innerHTML = courses.map((c, i) => {
      const [, bg] = colorOf(i);
      const credit = c.credit ? `${c.credit} 学分` : "学分待定";
      const examText = (c.exams || []).map((ex) => `${ex.kind} ${fmtDate(ex.date)}`).join(" · ") || "无考试";
      const types = (c.types || []).map((t) => `<span class="typechip ${typeClass(t)}">${esc(t)}</span>`).join("");
      const focusTeaser = c.focus
        ? `<div class="focus-teaser">
             <div class="focus-teaser-title">🎯 考试重点（已更新）</div>
             <ul>${c.focus.essay.slice(0, 3).map((e) => `<li>${esc(e)}</li>`).join("")}</ul>
           </div>`
        : "";
      return `
        <div class="card">
          <div class="card-head">
            <span class="card-name"><span class="dot" style="background:${PALETTE[i % PALETTE.length][0]}"></span>${esc(c.name)}</span>
            <span class="credit">${esc(credit)}</span>
          </div>
          <div class="card-meta">第 <b>${c.startWeek}–${c.endWeek}</b> 周 · ${fmtDate(c.startDate)} ~ ${fmtDate(c.endDate)}</div>
          ${selfStudyBar(c.selfStudyRatio)}
          ${focusTeaser}
          <div class="card-exams">${examText}</div>
          <div class="typechips">${types}</div>
          <a class="card-link" href="course.html?course=${encodeURIComponent(c.id)}">查看详情 →</a>
        </div>`;
    }).join("");
  }

  function renderFocus(course) {
    const el = document.getElementById("focusBody");
    if (!el) return;
    const f = course.focus;
    if (!f) {
      el.innerHTML = `<div class="placeholder"><div class="big">🔜</div>该课程的考试重点整理中，资料到位后这里会填充：高频大题、名解、选择题考点与记忆口诀。</div>`;
      return;
    }
    const essay = f.essay.map((t, idx) =>
      `<li class="${t.includes("★") ? "star" : ""}"><label class="ck-row"><input type="checkbox" class="ck" data-key="${esc(checkKey(course.id, "essay", t))}"><span>${esc(t)}</span></label></li>`).join("");
    const terms = (f.terms || []).map((t) => `<span class="kw">${esc(t)}</span>`).join("");
    const mcq = (f.mcq || []).map((t) =>
      `<li><label class="ck-row"><input type="checkbox" class="ck" data-key="${esc(checkKey(course.id, "mcq", t))}"><span>${esc(t)}</span></label></li>`).join("");
    const mne = (f.mnemonics || []).map((t) => {
      const idx = t.search(/[：:]/);
      const head = idx >= 0 ? esc(t.slice(0, idx + 1)) : "";
      const rest = idx >= 0 ? esc(t.slice(idx + 1)) : esc(t);
      return `<div class="mne"><b>${head}</b>${rest}</div>`;
    }).join("");
    const strategy = (f.strategy || []).map((t) => `<li>${esc(t)}</li>`).join("");
    const total = (f.essay ? f.essay.length : 0) + (f.mcq ? f.mcq.length : 0);
    el.innerHTML = `
      <div class="focus-prog">
        <span>复习进度（勾选已掌握的考试重点）</span>
        <b id="fp-count">0 / ${total}</b>
        <button type="button" id="fp-reset">重置本课进度</button>
      </div>
      <div class="focus-summary">${esc(f.summary)}</div>
      ${strategy ? `<div class="focus-sec"><h3>📌 复习策略 <span class="tag">先看这里</span></h3><ul class="focus-list">${strategy}</ul></div>` : ""}
      ${essay ? `<div class="focus-sec"><h3>📝 高频大题 / 简答 <span class="tag">★ 为重中之重</span></h3><ul class="focus-list">${essay}</ul></div>` : ""}
      ${terms ? `<div class="focus-sec"><h3>📖 高频名词解释</h3><div class="kw-wrap">${terms}</div></div>` : ""}
      ${mcq ? `<div class="focus-sec"><h3>✅ 选择题高频考点</h3><ul class="focus-list">${mcq}</ul></div>` : ""}
      ${mne ? `<div class="focus-sec"><h3>🧠 记忆口诀</h3>${mne}</div>` : ""}`;
    bindCheckbox(el);
    updateFocusProg();
    const resetBtn = document.getElementById("fp-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        const s = loadChecks();
        const prefix = course.id + "::";
        Object.keys(s).forEach((k) => { if (k.startsWith(prefix)) delete s[k]; });
        saveChecks(s);
        el.querySelectorAll("input.ck").forEach((inp) => { inp.checked = false; });
        updateFocusProg();
      });
    }
  }

  function renderMethod(course) {
    const el = document.getElementById("methodBody");
    if (!el) return;
    const list = Array.isArray(course.studyMethod) ? course.studyMethod : (course.studyMethod ? [course.studyMethod] : []);
    el.innerHTML = list.length
      ? list.map((m) => {
          const text = typeof m === "string" ? m : m.method;
          const src = typeof m === "string" ? "师兄" : (m.source || "师兄");
          return `<div class="method-box"><div class="k">学习方法 · 来源：${esc(src)}</div>${esc(text)}</div>`;
        }).join("")
      : `<div class="placeholder"><div class="big">💡</div>该课程的学习方法待补充（例如：书本为主 / PPT＋刷题）。</div>`;
  }

  function renderExpList(container, courses, generalLinks) {
    const items = courses
      .filter((c) => c.experience)
      .map((c) => ({ course: c.name, ...c.experience }));
    const html = items.map((it) => `
      <div class="exp-item">
        <div>
          <div class="exp-title">${esc(it.title)}</div>
          <div class="exp-meta">${esc(it.course)} · 微信公众号 · 来源：${esc(it.source)}</div>
        </div>
        <a class="exp-link" href="${esc(it.url)}" target="_blank" rel="noopener">阅读原文 ↗</a>
      </div>`).join("");
    const gen = (generalLinks || []).map((g) => `
      <div class="exp-item">
        <div>
          <div class="exp-title">${esc(g.title)}</div>
          <div class="exp-meta">综合备考 · 微信公众号 · 来源：${esc(g.source)}</div>
        </div>
        <a class="exp-link" href="${esc(g.url)}" target="_blank" rel="noopener">阅读原文 ↗</a>
      </div>`).join("");
    container.innerHTML = html + gen;
  }

  // ---------- index page ----------
  function renderIndex() {
    const courses = SITE.courses;
    document.getElementById("heroSub").textContent =
      `2026–2027 学年第 1 学期 · ${courses.length} 门课程 · ${SITE.confirmedCredits} 学分（已确认） · ${SITE.examsTotal} 场考试`;

    const stats = [
      [courses.length, "开课课程"],
      [`${SITE.confirmedCredits}<small> 学分</small>`, "已确认学分"],
      [SITE.examsTotal, "考试场次"],
      [`${SITE.weekCount}<small> 周</small>`, "学期总周数"],
    ];
    document.getElementById("stats").innerHTML = stats.map(([n, l]) =>
      `<div class="stat"><div class="num">${n}</div><div class="label">${l}</div></div>`).join("");

    renderTimeline(document.getElementById("timeline"), courses, SITE.weekCount);

    const n = renderExamList(document.getElementById("examList"), courses);
    document.getElementById("examCount").textContent = `共 ${n} 场（含期中/期末）`;

    renderExamDense();

    renderCourseCards(document.getElementById("courseCards"), courses);
    renderExpList(document.getElementById("expList"), courses, SITE.generalLinks);
  }

  // ---------- course detail page ----------
  function renderCourse() {
    const params = new URLSearchParams(location.search);
    const id = params.get("course") || "";
    const course = SITE.courses.find((c) => c.id === id);
    if (!course) {
      document.getElementById("courseTitle").textContent = "未找到该课程";
      document.getElementById("courseSub").textContent = "请返回总览重新选择";
      return;
    }

    const i = SITE.courses.indexOf(course);
    document.getElementById("courseTitle").textContent = course.name;
    document.getElementById("courseSub").textContent =
      `${course.credit ? course.credit + " 学分" : "学分待定"} · 第 ${course.startWeek}–${course.endWeek} 周（${course.spanWeeks} 周） · 自主学习占比 ${Math.round(course.selfStudyRatio * 100)}%`;

    const p = course.periods || {};
    const info = [
      ["学分", course.credit ? `${course.credit}` : "待补充", course.credit ? "分" : ""],
      ["教学周数", `${course.spanWeeks}`, "周"],
      ["首次上课", fmtDate(course.startDate), wd(course.startDate)],
      ["最后教学", fmtDate(course.endDate), wd(course.endDate)],
      ["自主学习占比", `${Math.round(course.selfStudyRatio * 100)}`, "%"],
      ["总学时（小节）", `${course.totalPeriods || 0}`, ""],
      ["理论 / 技能", `${p.theory || 0} / ${p.skill || 0}`, "学时"],
      ["见习 / 自学", `${p.clerkship || 0} / ${p.selfStudy || 0}`, "学时"],
    ];
    document.getElementById("infoGrid").innerHTML = info.map(([k, v, u]) => `
      <div class="d-cell"><div class="k">${esc(k)}</div><div class="v">${esc(v)} <small>${esc(u)}</small></div></div>`).join("");

    const exams = (course.exams || []).slice().sort((a, b) => a.date.localeCompare(b.date));
    document.getElementById("courseExams").innerHTML = exams.length
      ? exams.map((ex) => `
          <div class="exam-item">
            <div class="exam-date">${fmtDate(ex.date)}<small>${wd(ex.date)} · 第${ex.week}周</small></div>
            ${examBadge(ex.kind)}
            <span class="exam-course">${esc(course.name)}</span>
          </div>`).join("")
      : `<div class="placeholder"><div class="big">🎉</div>本学期该课程没有考试安排（以“考查”或其他方式考核）。</div>`;

    renderTimeline(document.getElementById("courseTimeline"), [course], SITE.weekCount);

    renderFocus(course);
    renderMethod(course);

    document.getElementById("courseExp").innerHTML = course.experience
      ? `<div class="exp-item" style="max-width:560px">
           <div>
             <div class="exp-title">${esc(course.experience.title)}<span class="src-badge">来源：${esc(course.experience.source)}</span></div>
             <div class="exp-meta">${esc(course.name)} · 微信公众号</div>
           </div>
           <a class="exp-link" href="${esc(course.experience.url)}" target="_blank" rel="noopener">阅读原文 ↗</a>
         </div>
         <p class="legend" style="margin-top:12px">更多备考经验整理（重点、资料、复习节奏）将随课程详情页逐步补充。</p>`
      : `<div class="placeholder"><div class="big">📚</div>暂未收录该课程的经验帖。如果你有资料，之后可以补充到这里。</div>`;
  }

  if (document.getElementById("timeline")) renderIndex();
  else if (document.getElementById("courseTimeline")) renderCourse();
})();
