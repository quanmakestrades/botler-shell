document.addEventListener('DOMContentLoaded', () => {
  const data = window.HOMESCHOOL_BOARD_DATA;
  const today = new Date();
  const dateEl = document.getElementById('todayDate');
  dateEl.textContent = today.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  renderBoard(data);
  wireInteractions(data);
});

function renderBoard(data) {
  const contentEl = document.getElementById('lessonContent');
  contentEl.innerHTML = `
    <section class="lesson-overview lesson-card">
      <h2>${data.lesson.title}</h2>
      <p class="theme">${data.lesson.theme}</p>
      <div class="lesson-meta">
        <span class="meta-item"><strong>Focus:</strong> ${data.family.focus}</span>
        <span class="meta-item"><strong>Timing:</strong> ${data.lesson.timing}</span>
        <span class="meta-item"><strong>Format:</strong> family + individual student boards</span>
      </div>
      <p>${data.family.note}</p>
    </section>

    <section class="lesson-card">
      <h3>🌙 Tonight: Tech Night Setup</h3>
      <ul class="lesson-blocks">
        ${data.lesson.tonightSetup.map(item => `<li>${item}</li>`).join('')}
      </ul>
    </section>

    <section class="lesson-card">
      <h3>🎯 Tomorrow Outcomes</h3>
      <div class="goals-list">
        ${data.lesson.outcomes.map(goal => `<span class="goal-badge">${goal}</span>`).join('')}
      </div>
    </section>

    <section class="lesson-card">
      <h3>📦 Supplies</h3>
      <div class="supply-list">
        ${data.lesson.supplies.map(item => `<span class="supply-tag">${item}</span>`).join('')}
      </div>
    </section>

    <section class="lesson-card">
      <h3>🛡️ Family Device Safety Rules</h3>
      <ul class="lesson-blocks">
        ${data.lesson.familySafetyRules.map(item => `<li>${item}</li>`).join('')}
      </ul>
    </section>

    <section class="lesson-card">
      <h3>🗂️ Lesson Flow</h3>
      <div class="blocks-grid">
        ${data.lesson.lessonBlocks.map(block => `
          <div class="block-card">
            <div class="block-duration">${block.duration}</div>
            <h4>${block.title}</h4>
            <ul>
              ${block.details.map(detail => `<li>${detail}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    </section>

    <section class="lesson-card">
      <h3>👧🏽🧒🏽 Student Boards</h3>
      <p class="helper-text">Each child gets their own login card and checklist. Tap a card to focus on that student.</p>
      <div class="student-grid">
        ${data.students.map(student => renderStudentCard(student, data.lesson.studentPlans[student.id])).join('')}
      </div>
    </section>

    <section class="lesson-card">
      <h3>📊 Record Tracking</h3>
      <p class="helper-text">This is the starter record layer. Best next upgrade is syncing this exact shape into Google Sheets while keeping CSV export as backup.</p>
      <div class="table-wrap">${renderRecordsTable(data.records)}</div>
      <div class="export-actions">
        <button class="export-btn" id="downloadCsvBtn">Download CSV</button>
      </div>
    </section>

    <section class="lesson-card parent-steps">
      <h3>👩🏫 Parent Guide</h3>
      <div class="steps-accordion">
        ${data.lesson.parentGuide.map((step, i) => `
          <div class="step ${i === 0 ? 'expanded' : ''}">
            <div class="step-header">
              <span class="step-number">${i + 1}</span>
              <h4>${step.title}</h4>
              <span class="expand-icon">▼</span>
            </div>
            <div class="step-body">
              <ul>
                ${step.body.map(line => `<li>${line}</li>`).join('')}
              </ul>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderStudentCard(student, plan) {
  return `
    <article class="student-card ${student.colorClass}" data-student-id="${student.id}">
      <div class="student-topline">
        <span class="student-login">Login: ${student.loginCode}</span>
        <span class="student-level">${student.level}</span>
      </div>
      <h4>${student.name}</h4>
      <p class="student-mission">${plan.mission}</p>
      <div class="student-section">
        <strong>Goals</strong>
        <ul>
          ${student.goals.map(goal => `<li>${goal}</li>`).join('')}
        </ul>
      </div>
      <div class="student-section">
        <strong>Checklist</strong>
        <ul class="student-checklist">
          ${plan.checklist.map(item => `<li><label><input type="checkbox"> <span>${item}</span></label></li>`).join('')}
        </ul>
      </div>
      <div class="student-section">
        <strong>Reflection prompt</strong>
        <p>${plan.reflectionPrompt}</p>
      </div>
    </article>
  `;
}

function renderRecordsTable(records) {
  const cols = records.columns;
  return `
    <table class="record-table">
      <thead>
        <tr>${cols.map(col => `<th>${humanize(col)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${records.rows.map(row => `
          <tr>${cols.map(col => `<td>${row[col] ?? ''}</td>`).join('')}</tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function wireInteractions(data) {
  document.querySelectorAll('.step-header').forEach(header => {
    header.addEventListener('click', () => {
      header.parentElement.classList.toggle('expanded');
    });
  });

  document.querySelectorAll('.student-card').forEach(card => {
    card.addEventListener('click', (event) => {
      if (event.target.tagName === 'INPUT') return;
      document.querySelectorAll('.student-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });

  const btn = document.getElementById('downloadCsvBtn');
  btn.addEventListener('click', () => downloadCsv(data.records));
}

function humanize(value) {
  return value.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
}

function downloadCsv(records) {
  const cols = records.columns;
  const lines = [cols.join(',')].concat(
    records.rows.map(row => cols.map(col => csvEscape(row[col] ?? '')).join(','))
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'stewart-homeschool-records.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}
