/* =============================================
   LLM Ops Toolkit — Application Logic
   ============================================= */

// ========================
// TAB SWITCHING
// ========================
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    tabBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
    tabPanels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    document.getElementById(`tab-${target}`).classList.add('active');
  });
});

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

// Clean up animation when switching tabs
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.tab !== 'simulator' && flowAnimationId) {
      cancelAnimationFrame(flowAnimationId);
      flowAnimationId = null;
    }
  });
});
