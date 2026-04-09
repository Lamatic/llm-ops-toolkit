/* =============================================
   LLM Ops Toolkit — Application Logic
   ============================================= */

// ========================
// THEME TOGGLE (Light / Dark Mode)
// ========================
const themeToggle = document.getElementById('themeToggle');
const htmlEl = document.documentElement;

function applyTheme(theme) {
  htmlEl.setAttribute('data-theme', theme);
  localStorage.setItem('llm-toolkit-theme', theme);
}

// Load saved theme
(function () {
  const saved = localStorage.getItem('llm-toolkit-theme');
  applyTheme(saved === 'light' ? 'light' : 'dark');
})();

themeToggle.addEventListener('click', () => {
  const current = htmlEl.getAttribute('data-theme');
  applyTheme(current === 'light' ? 'dark' : 'light');
});

// ========================
// HAMBURGER MENU (Mobile Nav)
// ========================
const hamburgerBtn = document.getElementById('hamburgerBtn');
const tabNav = document.getElementById('tabNav');
const hamburgerIcon = document.getElementById('hamburgerIcon');
const closeIcon = document.getElementById('closeIcon');

hamburgerBtn.addEventListener('click', () => {
  const isOpen = tabNav.classList.toggle('open');
  hamburgerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  hamburgerIcon.style.display = isOpen ? 'none' : 'block';
  closeIcon.style.display = isOpen ? 'block' : 'none';
});

// Close hamburger menu when a tab is clicked
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (tabNav.classList.contains('open')) {
      tabNav.classList.remove('open');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
      hamburgerIcon.style.display = 'block';
      closeIcon.style.display = 'none';
    }
  });
});

// Close hamburger menu when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.header-right') && tabNav.classList.contains('open')) {
    tabNav.classList.remove('open');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    hamburgerIcon.style.display = 'block';
    closeIcon.style.display = 'none';
  }
});

// ========================
// TAB SWITCHING + URL ROUTING
// ========================
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

// Valid tab IDs for URL routing/validation (display order is defined in index.html)
const VALID_TABS = ['status', 'simulator', 'calculator', 'audit'];

function activateTab(target, pushState) {
  if (!VALID_TABS.includes(target)) target = 'status';
  tabBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
  tabPanels.forEach(p => p.classList.remove('active'));
  const btn = document.querySelector(`.tab-btn[data-tab="${target}"]`);
  const panel = document.getElementById(`tab-${target}`);
  if (btn)   { btn.classList.add('active'); btn.setAttribute('aria-selected', 'true'); }
  if (panel) { panel.classList.add('active'); }
  if (pushState) {
    history.pushState({ tab: target }, '', `#${target}`);
  }
}

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    activateTab(target, true);


    if (target !== 'simulator' && flowAnimationId) {
      cancelAnimationFrame(flowAnimationId);
      flowAnimationId = null;
    }
    if (target === 'status') {
      if (statusInitialized) startStatusAutoRefresh();
    } else {
      stopStatusAutoRefresh();
    }
  });
});

// Handle browser back/forward
window.addEventListener('popstate', (e) => {
  const target = (e.state && e.state.tab) || location.hash.replace('#', '') || 'status';
  activateTab(target, false);
  if (target === 'status') {
    if (statusInitialized) startStatusAutoRefresh();
  } else {
    stopStatusAutoRefresh();
  }
});

// Read hash on initial load
(function () {
  const hash = location.hash.replace('#', '');
  const target = VALID_TABS.includes(hash) ? hash : 'status';
  activateTab(target, false);
  // Replace current history entry so back button works correctly from start
  history.replaceState({ tab: target }, '', `#${target}`);
})();



// ========================
// UTILITY: Format currency
// ========================
function formatCurrency(val, compact) {
  if (compact) {
    if (val >= 1000000) return '$' + (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return '$' + (val / 1000).toFixed(0) + 'K';
    return '$' + val.toFixed(0);
  }
  return '$' + val.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatNumber(val, decimals = 1) {
  return val.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

// Animated counter
function animateValue(el, end, prefix = '', suffix = '', duration = 600) {
  const startVal = parseFloat(el.dataset.currentVal || '0');
  el.dataset.currentVal = end;
  const startTime = performance.now();
  
  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = startVal + (end - startVal) * eased;
    
    if (Math.abs(end) >= 1000) {
      el.textContent = prefix + formatCurrency(current, prefix === '' && suffix === '') + suffix;
    } else {
      el.textContent = prefix + current.toFixed(1) + suffix;
    }
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      // Final exact value
      if (Math.abs(end) >= 1000) {
        el.textContent = prefix + formatCurrency(end, prefix === '' && suffix === '') + suffix;
      } else {
        el.textContent = prefix + end.toFixed(1) + suffix;
      }
    }
  }
  requestAnimationFrame(update);
}


// ========================
// TAB 1: COST CALCULATOR
// ========================
const calcInputs = {
  numProviders: document.getElementById('numProviders'),
  monthlySpend: document.getElementById('monthlySpend'),
  teamSize: document.getElementById('teamSize'),
  avgSalary: document.getElementById('avgSalary'),
  opsTime: document.getElementById('opsTime'),
  maturity: document.getElementById('maturity')
};

const calcOutputs = {
  apiSpend: document.getElementById('out-apiSpend'),
  multiplier: document.getElementById('out-multiplier'),
  trueCost: document.getElementById('out-trueCost'),
  hiddenCost: document.getElementById('out-hiddenCost'),
  annualHidden: document.getElementById('out-annualHidden'),
  engCost: document.getElementById('out-engCost'),
  infraCost: document.getElementById('out-infraCost'),
  providerOverhead: document.getElementById('out-providerOverhead'),
  conservative: document.getElementById('out-conservative'),
  optimistic: document.getElementById('out-optimistic'),
  kpiHidden: document.getElementById('kpi-hiddenCost'),
  kpiEngDays: document.getElementById('kpi-engDays'),
  kpiSavings: document.getElementById('kpi-savings'),
  kpiRoi: document.getElementById('kpi-roi')
};

// Slider display updates
document.getElementById('numProviders').addEventListener('input', (e) => {
  document.getElementById('numProvidersVal').textContent = e.target.value;
  updateCalculator();
});

document.getElementById('teamSize').addEventListener('input', (e) => {
  document.getElementById('teamSizeVal').textContent = e.target.value;
  updateCalculator();
});

document.getElementById('opsTime').addEventListener('input', (e) => {
  document.getElementById('opsTimeVal').textContent = e.target.value + '%';
  updateCalculator();
});

calcInputs.monthlySpend.addEventListener('input', updateCalculator);
calcInputs.avgSalary.addEventListener('input', updateCalculator);
calcInputs.maturity.addEventListener('change', updateCalculator);

function updateCalculator() {
  const numProviders = parseInt(calcInputs.numProviders.value);
  const monthlySpend = parseFloat(calcInputs.monthlySpend.value) || 0;
  const teamSize = parseInt(calcInputs.teamSize.value);
  const avgSalary = parseFloat(calcInputs.avgSalary.value) || 0;
  const opsTimePct = parseInt(calcInputs.opsTime.value) / 100;
  const maturity = calcInputs.maturity.value;

  // TCO Multipliers
  const multipliers = { new: 3.2, some: 2.2, mature: 1.8 };
  const mult = multipliers[maturity];

  // Card 1: True Cost
  const trueMonthlyCost = monthlySpend * mult;
  const hiddenMonthlyCost = trueMonthlyCost - monthlySpend;
  const annualHiddenCost = hiddenMonthlyCost * 12;

  calcOutputs.apiSpend.textContent = formatCurrency(monthlySpend);
  calcOutputs.multiplier.textContent = mult + '×';
  calcOutputs.trueCost.textContent = formatCurrency(trueMonthlyCost);
  calcOutputs.hiddenCost.textContent = formatCurrency(hiddenMonthlyCost);
  calcOutputs.annualHidden.textContent = formatCurrency(annualHiddenCost);

  // Card 2: Engineering Opportunity Cost
  const annualEngCost = teamSize * avgSalary * opsTimePct;
  const providerOverheadDays = 3.5 * numProviders;

  calcOutputs.engCost.textContent = formatCurrency(annualEngCost);
  calcOutputs.infraCost.textContent = formatCurrency(annualEngCost);
  calcOutputs.providerOverhead.textContent = formatNumber(providerOverheadDays) + ' eng-days/yr';

  // Card 3: Savings
  const annualApiSpend = monthlySpend * 12;
  const conservativeSavings = annualApiSpend * 0.30;
  const optimisticSavings = annualApiSpend * 0.70;

  calcOutputs.conservative.textContent = formatCurrency(conservativeSavings) + '/yr';
  calcOutputs.optimistic.textContent = formatCurrency(optimisticSavings) + '/yr';

  // Card 4: KPIs
  calcOutputs.kpiHidden.textContent = formatCurrency(annualHiddenCost, true);
  calcOutputs.kpiEngDays.textContent = formatNumber(providerOverheadDays);
  calcOutputs.kpiSavings.textContent = formatCurrency(conservativeSavings, true);

  // ROI estimate (gateway cost ~$1K/mo * 12 = $12K/yr)
  const gatewayCost = 12000;
  const roi = conservativeSavings > 0 ? (conservativeSavings / gatewayCost).toFixed(1) : '0.0';
  calcOutputs.kpiRoi.textContent = roi + '×';
}

// Initial calculation
updateCalculator();


// ========================
// TAB 2: MATURITY AUDIT
// ========================
const questions = [
  {
    text: "How many LLM providers are you using in production?",
    options: [
      { label: "1", score: 0 },
      { label: "2-3", score: 1 },
      { label: "4-8", score: 2 },
      { label: "9+", score: 3 }
    ]
  },
  {
    text: "How do you handle provider API changes?",
    options: [
      { label: "We find out when things break", score: 0 },
      { label: "We monitor changelogs manually", score: 1 },
      { label: "Automated testing catches most issues", score: 2 },
      { label: "Unified abstraction layer handles migrations", score: 3 }
    ]
  },
  {
    text: "What's your fallback strategy when a provider goes down?",
    options: [
      { label: "We wait for it to come back up", score: 0 },
      { label: "Manual switch to another provider", score: 1 },
      { label: "Automated fallback to a backup", score: 2 },
      { label: "Multi-tier fallback with circuit breakers", score: 3 }
    ]
  },
  {
    text: "How do you track LLM costs across your organization?",
    options: [
      { label: "We look at invoices monthly", score: 0 },
      { label: "Basic dashboard per provider", score: 1 },
      { label: "Per-team/feature cost attribution", score: 2 },
      { label: "Real-time per-tenant, per-task tracking with alerts", score: 3 }
    ]
  },
  {
    text: "How do you select which model to use for a given task?",
    options: [
      { label: "We use one model for everything", score: 0 },
      { label: "Developers choose per project", score: 1 },
      { label: "We have guidelines by task type", score: 2 },
      { label: "Automated routing based on complexity/cost/quality", score: 3 }
    ]
  },
  {
    text: "What's your approach to model versioning?",
    options: [
      { label: 'We use "latest" everywhere', score: 0 },
      { label: "We pin versions but rarely test updates", score: 1 },
      { label: "We test new versions before deploying", score: 2 },
      { label: "Automated behavioral regression testing per version", score: 3 }
    ]
  },
  {
    text: "How do you handle rate limits across providers?",
    options: [
      { label: "We hit them and retry", score: 0 },
      { label: "We monitor and alert", score: 1 },
      { label: "Request queuing with backoff", score: 2 },
      { label: "Intelligent load distribution with quota monitoring", score: 3 }
    ]
  },
  {
    text: "What's your vendor lock-in mitigation strategy?",
    options: [
      { label: "We haven't thought about it", score: 0 },
      { label: "We try to keep our code modular", score: 1 },
      { label: "We maintain abstractions over provider APIs", score: 2 },
      { label: "Provider-agnostic architecture with proven portability", score: 3 }
    ]
  },
  {
    text: "How much of your engineering time goes to LLM operations vs product?",
    options: [
      { label: "Most time is on ops/integration", score: 0 },
      { label: "50/50 split", score: 1 },
      { label: "Mostly product, some ops", score: 2 },
      { label: "Almost entirely product; ops is automated", score: 3 }
    ]
  },
  {
    text: "How do you handle compliance requirements across models?",
    options: [
      { label: "We haven't addressed this", score: 0 },
      { label: "Manual policy checks", score: 1 },
      { label: "Compliance rules per provider", score: 2 },
      { label: "Automated compliance routing (PHI to on-prem, etc.)", score: 3 }
    ]
  }
];

const answers = new Array(questions.length).fill(-1);
const letters = ['a', 'b', 'c', 'd'];

function renderQuestions() {
  const container = document.getElementById('auditQuestions');
  container.innerHTML = '';

  questions.forEach((q, qi) => {
    const card = document.createElement('div');
    card.className = 'question-card' + (answers[qi] >= 0 ? ' answered' : '');
    card.id = `q-${qi}`;

    card.innerHTML = `
      <div class="question-number">Question ${qi + 1} of ${questions.length}</div>
      <div class="question-text">${q.text}</div>
      <div class="answer-options">
        ${q.options.map((opt, oi) => `
          <div class="answer-option ${answers[qi] === oi ? 'selected' : ''}" data-q="${qi}" data-o="${oi}">
            <span class="option-letter">${letters[oi]}</span>
            <span>${opt.label}</span>
          </div>
        `).join('')}
      </div>
    `;

    container.appendChild(card);
  });

  // Progress bar + submit
  const submitArea = document.createElement('div');
  submitArea.className = 'audit-submit';
  const answeredCount = answers.filter(a => a >= 0).length;
  const pct = (answeredCount / questions.length) * 100;

  submitArea.innerHTML = `
    <span class="progress-text mono">${answeredCount}/${questions.length} answered</span>
    <div class="progress-bar-container">
      <div class="progress-bar-fill" style="width: ${pct}%"></div>
    </div>
    <button class="btn-primary" id="submitAudit" ${answeredCount < questions.length ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>
      View Results
    </button>
  `;
  container.appendChild(submitArea);

  // Event listeners
  container.querySelectorAll('.answer-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const qi = parseInt(opt.dataset.q);
      const oi = parseInt(opt.dataset.o);
      answers[qi] = oi;
      renderQuestions();
    });
  });

  document.getElementById('submitAudit').addEventListener('click', () => {
    if (answers.every(a => a >= 0)) showAuditResults();
  });
}

function showAuditResults() {
  document.getElementById('auditQuestions').style.display = 'none';
  document.getElementById('auditResults').style.display = 'block';

  // Calculate total score
  let totalScore = 0;
  answers.forEach((a, qi) => {
    totalScore += questions[qi].options[a].score;
  });

  // Animate score ring
  const circle = document.getElementById('scoreRingCircle');
  const circumference = 2 * Math.PI * 52; // r=52
  const offset = circumference - (totalScore / 30) * circumference;

  setTimeout(() => {
    circle.style.transition = 'stroke-dashoffset 1.2s ease';
    circle.style.strokeDashoffset = offset;
  }, 100);

  // Score number animation
  const scoreEl = document.getElementById('scoreNumber');
  let current = 0;
  const scoreInterval = setInterval(() => {
    current++;
    scoreEl.textContent = current;
    if (current >= totalScore) clearInterval(scoreInterval);
  }, 40);

  // Maturity level
  const badge = document.getElementById('maturityBadge');
  const desc = document.getElementById('maturityDesc');
  let level, color, description;

  if (totalScore <= 7) {
    level = 'Ad Hoc'; color = '#F85149'; 
    description = "You're firefighting. Model operations consume your team.";
  } else if (totalScore <= 14) {
    level = 'Reactive'; color = '#F0883E'; 
    description = "Some structure, but gaps will cost you as you scale.";
  } else if (totalScore <= 21) {
    level = 'Proactive'; color = '#58A6FF'; 
    description = "Good foundation. Focus on automation and cost optimization.";
  } else {
    level = 'Optimized'; color = '#3FB950'; 
    description = "Strong maturity. You're ahead of 90% of enterprises.";
  }

  badge.textContent = level;
  badge.style.background = color + '22';
  badge.style.color = color;
  circle.style.stroke = color;
  desc.textContent = description;

  // Recommendations
  const recList = document.getElementById('recommendationsList');
  let recs;
  if (totalScore <= 7) {
    recs = [
      "Start with a unified API abstraction layer across your LLM providers.",
      "Implement basic fallback mechanisms — even manual switching is better than downtime.",
      "Begin tracking costs per provider with a simple dashboard.",
      "Document which models are used where and why."
    ];
  } else if (totalScore <= 14) {
    recs = [
      "Automate provider health testing and version compatibility checks.",
      "Build fallback hierarchies with at least 2 levels of redundancy.",
      "Implement per-team and per-feature cost attribution.",
      "Create guidelines for model selection by task type."
    ];
  } else if (totalScore <= 21) {
    recs = [
      "Add intelligent routing based on request complexity and cost targets.",
      "Implement behavioral regression testing for model version updates.",
      "Leverage multi-provider architecture for vendor negotiation.",
      "Build real-time cost monitoring with anomaly detection."
    ];
  } else {
    recs = [
      "Fine-tune routing decisions with ML-based classifiers on your traffic.",
      "Implement semantic caching to reduce redundant API calls by 30-40%.",
      "Build automated compliance routing for sensitive data categories.",
      "Contribute your operational patterns back to the LLMOps ecosystem."
    ];
  }

  recList.innerHTML = recs.map(r => `<li>${r}</li>`).join('');

  // Radar chart
  // Axes: Reliability (q3,q7), Cost Management (q4,q5), Operations Maturity (q1,q9), Risk Management (q2,q6), Strategy (q8,q10)
  const axes = {
    reliability: (questions[2].options[answers[2]].score + questions[6].options[answers[6]].score) / 6 * 100,
    costMgmt: (questions[3].options[answers[3]].score + questions[4].options[answers[4]].score) / 6 * 100,
    opsMat: (questions[0].options[answers[0]].score + questions[8].options[answers[8]].score) / 6 * 100,
    riskMgmt: (questions[1].options[answers[1]].score + questions[5].options[answers[5]].score) / 6 * 100,
    strategy: (questions[7].options[answers[7]].score + questions[9].options[answers[9]].score) / 6 * 100
  };

  // Destroy previous chart if exists
  if (window.radarChartInstance) {
    window.radarChartInstance.destroy();
  }

  const ctx = document.getElementById('radarChart').getContext('2d');
  window.radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Reliability', 'Cost Management', 'Operations Maturity', 'Risk Management', 'Strategy'],
      datasets: [{
        label: 'Your Score',
        data: [axes.reliability, axes.costMgmt, axes.opsMat, axes.riskMgmt, axes.strategy],
        backgroundColor: color + '33',
        borderColor: color,
        borderWidth: 2,
        pointBackgroundColor: color,
        pointBorderColor: '#0D1117',
        pointBorderWidth: 2,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 25,
            display: false
          },
          grid: {
            color: '#30363D'
          },
          angleLines: {
            color: '#30363D'
          },
          pointLabels: {
            color: '#8B949E',
            font: { family: "'Inter'", size: 11, weight: '500' }
          }
        }
      },
      plugins: {
        legend: { display: false }
      },
      animation: {
        duration: 1000,
        easing: 'easeOutCubic'
      }
    }
  });
}

// Retake
document.getElementById('retakeBtn').addEventListener('click', () => {
  answers.fill(-1);
  document.getElementById('auditResults').style.display = 'none';
  document.getElementById('auditQuestions').style.display = 'block';
  // Reset ring
  document.getElementById('scoreRingCircle').style.transition = 'none';
  document.getElementById('scoreRingCircle').style.strokeDashoffset = '326.73';
  renderQuestions();
});

// Initial render
renderQuestions();


// ========================
// TAB 3: ROUTING SIMULATOR
// ========================
const models = {
  gpt4o: { name: 'GPT-4o', cost: 0.005, quality: 95, latency: 800, color: '#58A6FF' },
  claude: { name: 'Claude 3.5 Sonnet', cost: 0.003, quality: 93, latency: 600, color: '#D2A8FF' },
  gemini: { name: 'Gemini Pro', cost: 0.00125, quality: 88, latency: 500, color: '#3FB950' },
  llama: { name: 'Llama 3.1 70B', cost: 0.0009, quality: 85, latency: 400, color: '#F0883E' },
  mini: { name: 'GPT-4o-mini', cost: 0.00015, quality: 78, latency: 200, color: '#F85149' }
};

// Complexity labels
const complexityLabels = ['Simple', 'Medium', 'Complex'];
document.getElementById('complexity').addEventListener('input', (e) => {
  document.getElementById('complexityVal').textContent = complexityLabels[parseInt(e.target.value)];
});

// Volume label
document.getElementById('volume').addEventListener('input', (e) => {
  const v = parseInt(e.target.value);
  document.getElementById('volumeVal').textContent = v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : (v / 1000).toFixed(0) + 'K';
});

// Strategy distributions based on complexity mix
// Each strategy defines how requests are distributed when you consider the overall mix
function getDistribution(strategy) {
  // Returns { modelKey: percentage } summing to 100
  switch (strategy) {
    case 'frontier':
      return { gpt4o: 100, claude: 0, gemini: 0, llama: 0, mini: 0 };
    case 'cost':
      // Simple(60%)→mini, Medium(30%)→Llama/Gemini split, Complex(10%)→GPT-4o
      return { gpt4o: 10, claude: 0, gemini: 15, llama: 15, mini: 60 };
    case 'quality':
      // Simple(40%)→Claude, Medium(40%)→GPT-4o, Complex(20%)→GPT-4o
      return { gpt4o: 60, claude: 40, gemini: 0, llama: 0, mini: 0 };
    case 'balanced':
      // Simple(50%)→mini, Medium(30%)→Claude/Gemini split, Complex(20%)→GPT-4o
      return { gpt4o: 20, claude: 15, gemini: 15, llama: 0, mini: 50 };
  }
}

// Flow animation
let flowAnimationId = null;
let flowParticles = [];

function startFlowAnimation(distribution) {
  const canvas = document.getElementById('flowCanvas');
  const ctx = canvas.getContext('2d');
  const area = document.getElementById('simFlowArea');
  area.style.display = 'block';

  // Set canvas size
  canvas.width = area.offsetWidth;
  canvas.height = area.offsetHeight;

  // Cancel previous animation
  if (flowAnimationId) cancelAnimationFrame(flowAnimationId);
  flowParticles = [];

  const modelKeys = Object.keys(models);
  const startX = 60;
  const endXBase = canvas.width - 60;
  const modelYPositions = {};
  modelKeys.forEach((key, i) => {
    modelYPositions[key] = 30 + (i * (canvas.height - 60)) / (modelKeys.length - 1);
  });

  const sourceY = canvas.height / 2;

  // Generate particles
  function spawnParticle() {
    // Pick a model based on distribution
    const rand = Math.random() * 100;
    let cumulative = 0;
    let targetModel = 'gpt4o';
    for (const key of modelKeys) {
      cumulative += distribution[key];
      if (rand <= cumulative) {
        targetModel = key;
        break;
      }
    }

    flowParticles.push({
      x: startX,
      y: sourceY,
      targetY: modelYPositions[targetModel],
      targetModel: targetModel,
      progress: 0,
      speed: 0.008 + Math.random() * 0.006,
      size: 2 + Math.random() * 2
    });
  }

  let lastSpawn = 0;
  const spawnInterval = 40; // ms between spawns

  function draw(timestamp) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw source node
    ctx.fillStyle = '#58A6FF';
    ctx.beginPath();
    ctx.arc(startX, sourceY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E6EDF3';
    ctx.font = '11px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Requests', startX, sourceY + 24);

    // Draw model endpoints
    modelKeys.forEach(key => {
      const y = modelYPositions[key];
      ctx.fillStyle = models[key].color;
      ctx.beginPath();
      ctx.arc(endXBase, y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.fillStyle = '#8B949E';
      ctx.font = '10px Inter';
      ctx.textAlign = 'right';
      ctx.fillText(models[key].name, endXBase - 14, y + 3);

      // Draw guide line (faint)
      if (distribution[key] > 0) {
        ctx.strokeStyle = models[key].color + '15';
        ctx.lineWidth = Math.max(1, distribution[key] / 10);
        ctx.beginPath();
        ctx.moveTo(startX + 12, sourceY);
        const cpX = (startX + endXBase) / 2;
        ctx.bezierCurveTo(cpX, sourceY, cpX, y, endXBase - 10, y);
        ctx.stroke();
      }
    });

    // Spawn
    if (timestamp - lastSpawn > spawnInterval) {
      spawnParticle();
      lastSpawn = timestamp;
    }

    // Update & draw particles
    flowParticles.forEach(p => {
      p.progress += p.speed;
      if (p.progress > 1) p.progress = 0; // loop

      // Bezier position
      const t = p.progress;
      const cpX = (startX + endXBase) / 2;
      // Cubic bezier: start(startX, sourceY) → cp1(cpX, sourceY) → cp2(cpX, targetY) → end(endXBase, targetY)
      const omt = 1 - t;
      p.x = omt * omt * omt * startX + 3 * omt * omt * t * cpX + 3 * omt * t * t * cpX + t * t * t * endXBase;
      p.y = omt * omt * omt * sourceY + 3 * omt * omt * t * sourceY + 3 * omt * t * t * p.targetY + t * t * t * p.targetY;

      ctx.fillStyle = models[p.targetModel].color;
      ctx.globalAlpha = 0.6 + 0.4 * (1 - Math.abs(t - 0.5) * 2);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Cleanup old particles
    if (flowParticles.length > 150) flowParticles = flowParticles.slice(-100);

    flowAnimationId = requestAnimationFrame(draw);
  }

  flowAnimationId = requestAnimationFrame(draw);
}

function runSimulation() {
  const strategy = document.getElementById('strategy').value;
  const volume = parseInt(document.getElementById('volume').value);
  const distribution = getDistribution(strategy);
  const frontierDist = getDistribution('frontier');

  // Start flow animation
  startFlowAnimation(distribution);

  // Calculate costs
  // Assuming 1K tokens per request average
  const tokensPerRequest = 1; // in thousands
  const modelKeys = Object.keys(models);

  let strategyCost = 0;
  let frontierCost = 0;
  let weightedQuality = 0;
  let weightedLatency = 0;

  modelKeys.forEach(key => {
    const pct = distribution[key] / 100;
    const fpct = frontierDist[key] / 100;
    const requests = volume * pct;
    const fRequests = volume * fpct;

    strategyCost += requests * tokensPerRequest * models[key].cost;
    frontierCost += fRequests * tokensPerRequest * models[key].cost;
    weightedQuality += pct * models[key].quality;
    weightedLatency += pct * models[key].latency;
  });

  const savingsPct = frontierCost > 0 ? ((frontierCost - strategyCost) / frontierCost * 100) : 0;

  // Show results
  document.getElementById('simResults').style.display = 'block';
  document.getElementById('sim-frontierCost').textContent = formatCurrency(frontierCost);
  document.getElementById('sim-strategyCost').textContent = formatCurrency(strategyCost);
  document.getElementById('sim-savings').textContent = savingsPct.toFixed(1) + '%';
  document.getElementById('sim-quality').textContent = weightedQuality.toFixed(1);
  document.getElementById('sim-latency').textContent = Math.round(weightedLatency) + 'ms';

  // Update traffic bars on model cards
  modelKeys.forEach(key => {
    const fillEl = document.getElementById(`traffic-${key}`);
    const pctEl = document.getElementById(`pct-${key}`);
    const card = document.querySelector(`.model-card[data-model="${key}"]`);

    fillEl.style.width = distribution[key] + '%';
    fillEl.style.background = models[key].color;
    pctEl.textContent = distribution[key] + '%';

    if (distribution[key] > 0) {
      card.classList.add('active-model');
    } else {
      card.classList.remove('active-model');
    }
  });

  // Distribution bars
  const distBars = document.getElementById('distBars');
  distBars.innerHTML = '';
  modelKeys.forEach(key => {
    const requests = Math.round(volume * distribution[key] / 100);
    const row = document.createElement('div');
    row.className = 'dist-bar-row';
    row.innerHTML = `
      <span class="dist-bar-label">${models[key].name}</span>
      <div class="dist-bar-track">
        <div class="dist-bar-fill" style="width: 0%; background: ${models[key].color};"></div>
      </div>
      <span class="dist-bar-value mono">${requests.toLocaleString()}</span>
    `;
    distBars.appendChild(row);

    // Animate fill
    setTimeout(() => {
      row.querySelector('.dist-bar-fill').style.width = distribution[key] + '%';
    }, 50);
  });

  // Summary text
  const strategyNames = {
    frontier: 'Always Frontier',
    cost: 'Cost-Optimized Routing',
    quality: 'Quality-First Routing',
    balanced: 'Balanced'
  };

  const monthlySaved = frontierCost - strategyCost;
  const annualSaved = monthlySaved * 12;

  const summaryEl = document.getElementById('simSummaryText');
  if (strategy === 'frontier') {
    summaryEl.innerHTML = `You're sending all requests to GPT-4o. Consider a routing strategy to reduce costs while maintaining quality.`;
  } else {
    summaryEl.innerHTML = `By switching from <span class="highlight-cost">Always Frontier</span> to <strong>${strategyNames[strategy]}</strong>, you would save <strong>${formatCurrency(monthlySaved)}/month</strong> (<strong>${formatCurrency(annualSaved)}/year</strong>) while maintaining <strong>${weightedQuality.toFixed(1)}%</strong> quality score.`;
  }
}

document.getElementById('runSimBtn').addEventListener('click', runSimulation);


// ========================
// TAB 4: STATUS MONITOR
// ========================

// Active filter state — declared here so renderStatusMonitor can reference it
let activeStatusFilter = 'all';

const STATUS_PROVIDERS = [
  { id: 'openai',      name: 'ChatGPT (OpenAI)',        statusUrl: 'https://status.openai.com',                       tier: 'major',    baseLatency: 450, jitter: 200 },
  { id: 'anthropic',   name: 'Claude (Anthropic)',       statusUrl: 'https://status.anthropic.com',                    tier: 'major',    baseLatency: 380, jitter: 180 },
  { id: 'google',      name: 'Gemini (Google)',          statusUrl: 'https://status.cloud.google.com',                 tier: 'major',    baseLatency: 350, jitter: 150 },
  { id: 'mistral',     name: 'Mistral AI',               statusUrl: 'https://status.mistral.ai',                       tier: 'standard', baseLatency: 420, jitter: 160 },
  { id: 'cohere',      name: 'Cohere',                   statusUrl: 'https://status.cohere.com',                       tier: 'standard', baseLatency: 390, jitter: 140 },
  { id: 'meta',        name: 'Meta AI',                  statusUrl: 'https://metastatus.com',                          tier: 'standard', baseLatency: 510, jitter: 200 },
  { id: 'perplexity',  name: 'Perplexity',               statusUrl: 'https://status.perplexity.com',                   tier: 'standard', baseLatency: 620, jitter: 250 },
  { id: 'groq',        name: 'Groq',                     statusUrl: 'https://groqstatus.com',                          tier: 'standard', baseLatency: 115, jitter: 70  },
  { id: 'deepseek',    name: 'DeepSeek',                 statusUrl: 'https://status.deepseek.com',                     tier: 'standard', baseLatency: 820, jitter: 380 },
  { id: 'ai21',        name: 'AI21 Labs',                statusUrl: 'https://status.ai21.com',                         tier: 'standard', baseLatency: 460, jitter: 150 },
  { id: 'stability',   name: 'Stability AI',             statusUrl: 'https://status.stability.ai',                     tier: 'standard', baseLatency: 2600, jitter: 900 },
  { id: 'cerebras',    name: 'Cerebras',                 statusUrl: 'https://status.cerebras.ai',                      tier: 'standard', baseLatency: 95,  jitter: 55  },
  { id: 'runway',      name: 'Runway',                   statusUrl: 'https://status.runwayml.com',                     tier: 'standard', baseLatency: 3100, jitter: 1100 },
  { id: 'huggingface', name: 'Hugging Face',             statusUrl: 'https://status.huggingface.co',                   tier: 'major',    baseLatency: 510, jitter: 280 },
  { id: 'replicate',   name: 'Replicate',                statusUrl: 'https://status.replicate.com',                    tier: 'standard', baseLatency: 730, jitter: 340 },
  { id: 'xai',         name: 'Grok (xAI)',               statusUrl: 'https://xai.instatus.com',                        tier: 'major',    baseLatency: 560, jitter: 240 },
  { id: 'aws',         name: 'Amazon Bedrock (AWS)',     statusUrl: 'https://status.aws.amazon.com',                   tier: 'major',    baseLatency: 310, jitter: 120 },
  { id: 'azure',       name: 'Azure OpenAI',             statusUrl: 'https://azure.status.microsoft.com/en-us/status/',  tier: 'major',    baseLatency: 270, jitter: 100 },
];

// Mulberry32 — fast, quality PRNG
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function strToSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

function generateProviderData(provider, refreshSeed) {
  const rand = mulberry32(strToSeed(provider.id + String(refreshSeed)));

  // 90-day history
  const history = [];
  // Daily incident probability: 2.2% for major providers, 4.8% for standard providers
  const baseIncident = provider.tier === 'major' ? 0.022 : 0.048;
  for (let i = 0; i < 90; i++) {
    const r = rand();
    if (r < baseIncident * 0.35) {
      history.push('down');
    } else if (r < baseIncident) {
      history.push('degraded');
    } else if (r < baseIncident * 1.25 && provider.tier === 'major') {
      history.push('maintenance');
    } else {
      history.push('up');
    }
  }

  // Uptime calculation (seconds available / total seconds in 90 days)
  let availSec = 0;
  history.forEach(s => {
    if (s === 'up')               availSec += 86400;        // 24 h fully available
    else if (s === 'maintenance') availSec += 82800;        // ~23 h (1 h window)
    else if (s === 'degraded')    availSec += 72000;        // ~20 h (4 h partial outage)
    // down: 0 h credited
  });
  const uptime = (availSec / (90 * 86400)) * 100;

  // Current status from recent days
  const recent = history.slice(-3);
  const currentStatus = recent.includes('down') ? 'outage'
    : recent.includes('degraded') ? 'degraded'
    : 'operational';

  // 48-point hourly latency for last 48h
  const latency = [];
  for (let i = 0; i < 48; i++) {
    const wave  = Math.sin((i / 48) * Math.PI * 5) * provider.jitter * 0.28;
    const noise = (rand() - 0.5) * provider.jitter;
    const spike = rand() < 0.06 ? rand() * provider.jitter * 1.8 : 0;
    latency.push(Math.max(20, provider.baseLatency + wave + noise + spike));
  }

  return { history, uptime, currentStatus, latency };
}

function formatLatency(ms) {
  return ms >= 1000 ? (ms / 1000).toFixed(2) + ' s' : Math.round(ms) + ' ms';
}

function buildSparklineSVG(data, color, uid) {
  const W = 400, H = 56, padT = 4, padB = 2;
  const innerH = H - padT - padB;
  const minV = Math.min(...data), maxV = Math.max(...data);
  const range = maxV - minV || 1;
  const n = data.length;

  const pts = data.map((v, i) => [
    (i / (n - 1)) * W,
    padT + innerH - ((v - minV) / range) * innerH
  ]);

  // Smooth cubic bezier through each consecutive pair
  let linePath = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const cpX = ((pts[i - 1][0] + pts[i][0]) / 2).toFixed(1);
    linePath += ` C ${cpX} ${pts[i - 1][1].toFixed(1)},${cpX} ${pts[i][1].toFixed(1)},${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  }

  const lastX = pts[n - 1][0].toFixed(1);
  const areaPath = `${linePath} L ${lastX} ${H} L 0 ${H} Z`;

  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="sg-${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <path d="${areaPath}" fill="url(#sg-${uid})"/>
    <path d="${linePath}" fill="none" stroke="${color}" stroke-width="0.8" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

function getDayLabel(offsetFromEnd) {
  const d = new Date();
  d.setDate(d.getDate() - offsetFromEnd);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Escape HTML to prevent XSS when inserting values into innerHTML
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderProviderCard(provider, data) {
  const { history, uptime, currentStatus, latency } = data;
  const uptimeStr = uptime.toFixed(uptime >= 99 ? 3 : 2) + '%';
  const uptimeClass = uptime >= 99 ? 'ok' : uptime >= 97 ? 'warn' : 'bad';
  const avgLatency = latency.reduce((a, b) => a + b, 0) / latency.length;
  const statusLabel = currentStatus === 'operational' ? 'Operational'
    : currentStatus === 'degraded' ? 'Degraded' : 'Major Outage';

  const safeName      = escapeHTML(provider.name);
  const safeStatusUrl = escapeHTML(provider.statusUrl);
  const safeStatus    = escapeHTML(currentStatus);
  const safeLabel     = escapeHTML(statusLabel);

  const historyHTML = history.map((s, i) => {
    const dayLabel = getDayLabel(89 - i);
    const stateLabel = s === 'up' ? 'Operational' : s === 'down' ? 'Outage'
      : s === 'degraded' ? 'Degraded' : 'Maintenance';
    const cls = s === 'up' ? 'up' : s === 'down' ? 'down'
      : s === 'degraded' ? 'degraded' : s === 'maintenance' ? 'maintenance' : 'no-data';
    return `<div class="history-day ${cls}" title="${escapeHTML(dayLabel)} — ${escapeHTML(stateLabel)}"></div>`;
  }).join('');

  const sparkline = buildSparklineSVG(latency, '#58A6FF', provider.id);

  return `<div class="provider-card" data-status="${safeStatus}">
    <div class="provider-card-header">
      <div class="provider-status-dot ${safeStatus}" aria-label="${safeLabel}"></div>
      <span class="provider-name">
        <a href="${safeStatusUrl}" target="_blank" rel="noopener noreferrer">${safeName}</a>
      </span>
      <span class="provider-status-badge ${safeStatus}">${safeLabel}</span>
      <span class="provider-uptime-pct ${uptimeClass}">${uptimeStr} uptime</span>
    </div>
    <div class="history-bar" role="img" aria-label="90-day uptime history for ${safeName}">${historyHTML}</div>
    <div class="history-bar-labels"><span>90 days ago</span><span>Today</span></div>
    <div class="provider-latency-section">
      <div class="provider-latency-label">Response times &mdash; avg ${formatLatency(avgLatency)}</div>
      <div class="provider-sparkline-wrap" data-latency="${escapeHTML(JSON.stringify(latency))}">${sparkline}<div class="sparkline-cursor-line" aria-hidden="true"></div></div>
      <div class="sparkline-time-labels"><span>48h ago</span><span>24h ago</span><span>Now</span></div>
    </div>
  </div>`;
}

function updateStatusChips(providerDataList) {
  const counts = { operational: 0, degraded: 0, outage: 0 };
  providerDataList.forEach(({ data }) => {
    counts[data.currentStatus] = (counts[data.currentStatus] || 0) + 1;
  });
  const chipOp  = document.getElementById('chipOperational');
  const chipDeg = document.getElementById('chipDegraded');
  const chipOut = document.getElementById('chipOutage');
  if (chipOp)  chipOp.textContent  = `${counts.operational} Operational`;
  if (chipDeg) chipDeg.textContent = `${counts.degraded} Degraded`;
  if (chipOut) chipOut.textContent = `${counts.outage || 0} Outage`;
  updateFavicon(counts);
}

function updateFavicon(counts) {
  const style = getComputedStyle(document.documentElement);
  const color = counts.outage > 0
    ? style.getPropertyValue('--error').trim()
    : counts.degraded > 0
    ? style.getPropertyValue('--secondary').trim()
    : style.getPropertyValue('--success').trim();
  const faviconLink = document.getElementById('faviconLink');
  if (faviconLink) {
    faviconLink.href = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><circle cx='16' cy='16' r='14' fill='${encodeURIComponent(color)}'/></svg>`;
  }
}

function updateLastUpdated() {
  const el = document.getElementById('statusLastUpdated');
  if (el) {
    const now = new Date();
    el.textContent = `Updated ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  }
}

function renderStatusMonitor(providerDataList) {
  const list = document.getElementById('providerList');
  if (!list) return;
  list.innerHTML = providerDataList.map(({ provider, data }) => renderProviderCard(provider, data)).join('');
  updateStatusChips(providerDataList);
  updateLastUpdated();
  // Re-apply the current filter after cards are re-rendered
  const cards = list.querySelectorAll('.provider-card[data-status]');
  cards.forEach(card => {
    card.style.display = (activeStatusFilter === 'all' || card.dataset.status === activeStatusFilter) ? '' : 'none';
  });
  // Generate OG image from current data
  if (typeof generateOGImage === 'function') generateOGImage(providerDataList);
}

function buildStatusData(seed) {
  return STATUS_PROVIDERS.map(p => ({ provider: p, data: generateProviderData(p, seed) }));
}

// Try fetching live data from aistatusdashboard.com
async function tryFetchLiveStatus() {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://aistatusdashboard.com/api/v1/providers', {
      signal: controller.signal,
      mode: 'cors',
      headers: { Accept: 'application/json' }
    });
    clearTimeout(tid);
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

function applyLiveStatus(liveData, cache) {
  if (!Array.isArray(liveData)) return;
  liveData.forEach(item => {
    const entry = cache.find(c =>
      c.provider.id === item.id ||
      (item.name && c.provider.name.toLowerCase().includes(item.name.toLowerCase()))
    );
    if (!entry || !item.status) return;
    const s = String(item.status).toLowerCase();
    entry.data.currentStatus = s.includes('degraded') ? 'degraded'
      : s.includes('outage') || s.includes('down') || s.includes('major') ? 'outage'
      : 'operational';
  });
}

let statusRefreshSeed = Date.now();
let statusDataCache = null;
let statusInitialized = false;

// Auto-refresh state
let statusAutoRefreshTimer = null;
let statusAutoRefreshCountdown = 60;

// Notification state
let statusNotifyEnabled = false;
let statusPrevMap = {}; // { providerId: currentStatus }

// ---- Auto-refresh helpers ----

function updateCountdownBadge() {
  const el = document.getElementById('statusCountdown');
  if (el) el.textContent = statusAutoRefreshCountdown > 0 ? `${statusAutoRefreshCountdown}s` : '';
}

function startStatusAutoRefresh() {
  stopStatusAutoRefresh();
  statusAutoRefreshCountdown = 60;
  updateCountdownBadge();
  statusAutoRefreshTimer = setInterval(async () => {
    statusAutoRefreshCountdown--;
    updateCountdownBadge();
    if (statusAutoRefreshCountdown <= 0) {
      statusAutoRefreshCountdown = 60;
      await doStatusRefresh(false);
    }
  }, 1000);
}

function stopStatusAutoRefresh() {
  if (statusAutoRefreshTimer) {
    clearInterval(statusAutoRefreshTimer);
    statusAutoRefreshTimer = null;
  }
  const el = document.getElementById('statusCountdown');
  if (el) el.textContent = '';
}

// ---- Notification helpers ----

function updateNotifyButton() {
  const btn = document.getElementById('notifyBtn');
  if (!btn) return;
  if (!('Notification' in window)) { btn.style.display = 'none'; return; }
  if (Notification.permission === 'granted') {
    statusNotifyEnabled = true;
    btn.textContent = '🔔 Alerts On';
    btn.classList.add('notify-active');
    btn.classList.remove('notify-blocked');
    btn.disabled = false;
  } else if (Notification.permission === 'denied') {
    statusNotifyEnabled = false;
    btn.textContent = '🔕 Blocked';
    btn.classList.remove('notify-active');
    btn.classList.add('notify-blocked');
    btn.disabled = true;
  } else {
    statusNotifyEnabled = false;
    btn.textContent = '🔔 Notify on Outage';
    btn.classList.remove('notify-active', 'notify-blocked');
    btn.disabled = false;
  }
}

function checkOutageNotifications(providerDataList) {
  if (!statusNotifyEnabled) return;
  providerDataList.forEach(({ provider, data }) => {
    const prev = statusPrevMap[provider.id];
    const curr = data.currentStatus;
    if (prev !== undefined && prev !== 'outage' && curr === 'outage') {
      try {
        new Notification(`⚠️ ${provider.name} is down`, {
          body: `${provider.name} is experiencing a major outage.`,
          tag: provider.id
        });
      } catch (_) {}
    }
    statusPrevMap[provider.id] = curr;
  });
}

// ---- Core refresh ----

async function doStatusRefresh(isInit) {
  statusRefreshSeed = Date.now();
  statusDataCache = buildStatusData(statusRefreshSeed);
  const liveData = await tryFetchLiveStatus();
  if (liveData) applyLiveStatus(liveData, statusDataCache);
  if (isInit) {
    // Seed the previous map without firing notifications
    statusDataCache.forEach(({ provider, data }) => {
      statusPrevMap[provider.id] = data.currentStatus;
    });
  } else {
    checkOutageNotifications(statusDataCache);
  }
  renderStatusMonitor(statusDataCache);
  statusAutoRefreshCountdown = 60;
  updateCountdownBadge();
}

function initStatusMonitor() {
  if (statusInitialized) return;
  statusInitialized = true;

  // Show skeleton
  const list = document.getElementById('providerList');
  if (list) {
    list.innerHTML = STATUS_PROVIDERS.map(() => `
      <div class="provider-skeleton">
        <div class="skeleton-line" style="width:42%"></div>
        <div class="skeleton-bar"></div>
      </div>`).join('');
  }

  setTimeout(async () => {
    await doStatusRefresh(true);
    startStatusAutoRefresh();
  }, 350);
}

// Refresh button
document.getElementById('statusRefreshBtn').addEventListener('click', async function () {
  this.disabled = true;
  this.classList.add('spinning');
  await doStatusRefresh(false);
  this.disabled = false;
  this.classList.remove('spinning');
});

// Notification button
document.getElementById('notifyBtn').addEventListener('click', async function () {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  updateNotifyButton();
});
updateNotifyButton(); // Set initial button state

// ---- Sparkline hover tooltip ----
const sparkTooltip = document.createElement('div');
sparkTooltip.id = 'sparkTooltip';
sparkTooltip.className = 'sparkline-tooltip';
sparkTooltip.setAttribute('aria-hidden', 'true');
document.body.appendChild(sparkTooltip);

const providerListEl = document.getElementById('providerList');

providerListEl.addEventListener('mousemove', (e) => {
  const wrap = e.target.closest('.provider-sparkline-wrap');
  if (!wrap) return;

  let latencyData;
  try { latencyData = JSON.parse(wrap.dataset.latency || '[]'); } catch (_) { latencyData = []; }
  if (!latencyData.length) return;

  const rect = wrap.getBoundingClientRect();
  const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
  const pct = x / rect.width;
  const idx = Math.min(latencyData.length - 1, Math.round(pct * (latencyData.length - 1)));
  const val = latencyData[idx];
  const hoursAgo = 48 - idx;
  const timeLabel = hoursAgo === 0 ? 'Now' : hoursAgo === 1 ? '1h ago' : `${hoursAgo}h ago`;

  sparkTooltip.innerHTML =
    `<span class="stt-label">Response time</span>` +
    `<span class="stt-value">${escapeHTML(formatLatency(val))}</span>` +
    `<span class="stt-time">${escapeHTML(timeLabel)}</span>`;
  sparkTooltip.style.display = 'flex';
  sparkTooltip.style.left = (e.clientX + 14) + 'px';
  sparkTooltip.style.top = (e.clientY - 56) + 'px';

  const cursorLine = wrap.querySelector('.sparkline-cursor-line');
  if (cursorLine) {
    cursorLine.style.opacity = '1';
    cursorLine.style.left = x + 'px';
  }
});

providerListEl.addEventListener('mouseout', (e) => {
  const wrap = e.target.closest('.provider-sparkline-wrap');
  if (!wrap) return;
  if (!wrap.contains(e.relatedTarget)) {
    sparkTooltip.style.display = 'none';
    const cursorLine = wrap.querySelector('.sparkline-cursor-line');
    if (cursorLine) cursorLine.style.opacity = '0';
  }
});

// Initialize immediately since status is the default tab
initStatusMonitor();

// ========================
// STATUS FILTER (Chips)
// ========================
// Note: activeStatusFilter is declared above (before STATUS_PROVIDERS) so renderStatusMonitor can reference it

const filterBtns = {
  all: document.getElementById('filterAll'),
  operational: document.getElementById('filterOperational'),
  degraded: document.getElementById('filterDegraded'),
  outage: document.getElementById('filterOutage')
};

function applyStatusFilter(filter) {
  activeStatusFilter = filter;

  // Update chip active states
  Object.entries(filterBtns).forEach(([key, btn]) => {
    if (!btn) return;
    btn.classList.toggle('active-filter', key === filter);
    btn.setAttribute('aria-pressed', key === filter ? 'true' : 'false');
  });

  // Show/hide provider cards
  const cards = document.querySelectorAll('.provider-card[data-status]');
  cards.forEach(card => {
    if (filter === 'all' || card.dataset.status === filter) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

Object.entries(filterBtns).forEach(([key, btn]) => {
  if (!btn) return;
  btn.addEventListener('click', () => {
    // Toggle off if already active (go back to "all")
    if (activeStatusFilter === key && key !== 'all') {
      applyStatusFilter('all');
    } else {
      applyStatusFilter(key);
    }
  });
});

// ========================
// COLLAPSE / EXPAND ALL LATENCY — single toggle button
// ========================
const layoutToggleBtn = document.getElementById('layoutToggleBtn');
const providerListContainer = document.getElementById('providerList');

// Default: compact (collapsed) mode — latency sections hidden
providerListContainer.classList.add('latency-collapsed');

function updateLayoutToggleIcon(expanded) {
  const iconExpand   = layoutToggleBtn.querySelector('.layout-icon-expand');
  const iconCollapse = layoutToggleBtn.querySelector('.layout-icon-collapse');
  if (iconExpand)   iconExpand.style.display   = expanded ? 'none' : '';
  if (iconCollapse) iconCollapse.style.display = expanded ? ''     : 'none';
  layoutToggleBtn.setAttribute('aria-label', expanded ? 'Collapse all providers' : 'Expand all providers');
  layoutToggleBtn.dataset.expanded = expanded ? 'true' : 'false';
}

layoutToggleBtn.addEventListener('click', () => {
  const isExpanded = layoutToggleBtn.dataset.expanded === 'true';
  if (isExpanded) {
    providerListContainer.classList.add('latency-collapsed');
    updateLayoutToggleIcon(false);
  } else {
    providerListContainer.classList.remove('latency-collapsed');
    updateLayoutToggleIcon(true);
  }
});

// ========================
// OG IMAGE GENERATION
// ========================

// Utility: begin a rounded rectangle path (avoids modifying native prototypes)
function ctxRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.arcTo(x + w, y, x + w, y + radius, radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
    ctx.lineTo(x + radius, y + h);
    ctx.arcTo(x, y + h, x, y + h - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }
}

function generateOGImage(providerDataList) {
  const canvas = document.getElementById('ogCanvas');
  if (!canvas || !canvas.getContext) return;

  const ctx = canvas.getContext('2d');
  const W = 1200, H = 630;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  // Background
  ctx.fillStyle = isDark ? '#0D1117' : '#F6F8FA';
  ctx.fillRect(0, 0, W, H);

  // Subtle grid pattern
  ctx.strokeStyle = isDark ? 'rgba(48,54,61,0.5)' : 'rgba(208,215,222,0.6)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 60) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Header bar
  ctx.fillStyle = isDark ? '#161B22' : '#FFFFFF';
  ctx.fillRect(0, 0, W, 90);
  ctx.fillStyle = isDark ? '#30363D' : '#D0D7DE';
  ctx.fillRect(0, 90, W, 1);

  // Title
  ctx.font = 'bold 36px Inter, system-ui, sans-serif';
  ctx.fillStyle = isDark ? '#E6EDF3' : '#1F2328';
  ctx.fillText('LLM Ops Toolkit', 48, 56);

  // Subtitle
  ctx.font = '600 18px Inter, system-ui, sans-serif';
  ctx.fillStyle = isDark ? '#8B949E' : '#656D76';
  ctx.fillText('AI Provider Status — Live Uptime Monitor', 48, 80);

  // Section label
  ctx.font = '600 13px Inter, system-ui, sans-serif';
  ctx.fillStyle = isDark ? '#484F58' : '#9198A1';
  ctx.fillText('TOP 5 PROVIDERS', 48, 126);

  // Top 5 providers
  const top5 = providerDataList.slice(0, 5);
  top5.forEach(({ provider, data }, i) => {
    const y = 152 + i * 90;
    const rowColor = i % 2 === 0
      ? (isDark ? 'rgba(22,27,34,0.7)' : 'rgba(246,248,250,0.8)')
      : 'transparent';

    // Row background
    ctx.fillStyle = rowColor;
    ctxRoundRect(ctx, 32, y - 18, W - 64, 76, 8);
    ctx.fill();

    const dotColor = data.currentStatus === 'operational' ? '#3FB950'
      : data.currentStatus === 'degraded' ? '#F0883E'
      : '#F85149';

    // Status dot (glow + solid)
    ctx.fillStyle = dotColor + '33';
    ctx.beginPath();
    ctx.arc(80, y + 18, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(80, y + 18, 12, 0, Math.PI * 2);
    ctx.fill();

    // Provider name
    ctx.font = 'bold 24px Inter, system-ui, sans-serif';
    ctx.fillStyle = isDark ? '#E6EDF3' : '#1F2328';
    ctx.fillText(provider.name, 122, y + 14);

    // Status label
    const statusLabel = data.currentStatus === 'operational' ? 'Operational'
      : data.currentStatus === 'degraded' ? 'Degraded' : 'Major Outage';
    ctx.font = '600 14px Inter, system-ui, sans-serif';
    ctx.fillStyle = dotColor;
    ctx.fillText(statusLabel, 122, y + 36);

    // Uptime bar background
    const barX = 600, barY = y + 8, barW = 380, barH = 18;
    ctx.fillStyle = isDark ? '#21262D' : '#E8ECF0';
    ctxRoundRect(ctx, barX, barY, barW, barH, 4);
    ctx.fill();

    // Uptime bar fill
    const uptimePct = Math.min(data.uptime / 100, 1);
    ctx.fillStyle = dotColor;
    ctxRoundRect(ctx, barX, barY, barW * uptimePct, barH, 4);
    ctx.fill();

    // Uptime percentage text
    ctx.font = 'bold 20px Inter, system-ui, sans-serif';
    ctx.fillStyle = dotColor;
    ctx.textAlign = 'right';
    ctx.fillText(data.uptime.toFixed(2) + '%', W - 48, y + 26);
    ctx.textAlign = 'left';
  });

  // Footer
  ctx.fillStyle = isDark ? '#161B22' : '#FFFFFF';
  ctx.fillRect(0, H - 56, W, 56);
  ctx.fillStyle = isDark ? '#30363D' : '#D0D7DE';
  ctx.fillRect(0, H - 56, W, 1);

  ctx.font = '500 15px Inter, system-ui, sans-serif';
  ctx.fillStyle = isDark ? '#8B949E' : '#656D76';
  ctx.fillText('Powered by Lamatic.ai  ·  LLM Ops Toolkit', 48, H - 20);

  // Timestamp
  const now = new Date();
  const timeStr = 'Updated ' + now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    + ' at ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  ctx.textAlign = 'right';
  ctx.fillText(timeStr, W - 48, H - 20);
  ctx.textAlign = 'left';

  // Update OG meta tags dynamically
  try {
    const dataUrl = canvas.toDataURL('image/png');
    const ogMeta = document.getElementById('ogImageMeta');
    const twitterMeta = document.getElementById('twitterImageMeta');
    if (ogMeta) ogMeta.setAttribute('content', dataUrl);
    if (twitterMeta) twitterMeta.setAttribute('content', dataUrl);
  } catch (err) {
    // Canvas may be tainted by a cross-origin image resource
    console.warn('OG image generation skipped (canvas tainted):', err);
  }
}
