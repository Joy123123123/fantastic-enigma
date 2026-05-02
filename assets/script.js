const toggleButton = document.getElementById('toggleTheme');
const root = document.documentElement;

const setTheme = (theme) => {
  root.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
};

const storedTheme = localStorage.getItem('theme');
if (storedTheme) {
  setTheme(storedTheme);
}

toggleButton?.addEventListener('click', () => {
  const isDark = root.getAttribute('data-theme') === 'dark';
  setTheme(isDark ? 'light' : 'dark');
});

const form = document.getElementById('generatorForm');
const resetButton = document.getElementById('resetForm');
const cancelButton = document.getElementById('cancelJob');
const formError = document.getElementById('formError');

const jobStatus = document.getElementById('jobStatus');
const jobId = document.getElementById('jobId');
const progressBar = document.getElementById('jobProgressBar');
const progressLabel = document.getElementById('jobProgressLabel');
const jobSteps = [...document.querySelectorAll('#jobSteps [data-step]')];

const outputPreview = document.getElementById('outputPreview');
const outputResolution = document.getElementById('outputResolution');
const outputDuration = document.getElementById('outputDuration');
const outputStyle = document.getElementById('outputStyle');
const outputFormat = document.getElementById('outputFormat');
const outputUpdated = document.getElementById('outputUpdated');
const downloadReport = document.getElementById('downloadReport');

const historyList = document.getElementById('historyList');
const activeCount = document.getElementById('activeCount');
const completedCount = document.getElementById('completedCount');

const HISTORY_KEY = 'fe_history_v1';
const MAX_HISTORY_ITEMS = 6;

const state = {
  activeJob: null,
  timers: [],
  reportUrl: null,
};

const formatTime = (iso) =>
  new Date(iso).toLocaleString('bn-BD', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const setStatus = (statusKey, label) => {
  jobStatus.textContent = label;
  const statusClassMap = {
    idle: 'is-idle',
    queued: 'is-running',
    script: 'is-running',
    render: 'is-running',
    packaging: 'is-running',
    complete: 'is-complete',
    cancelled: 'is-error',
    error: 'is-error',
  };
  const className = statusClassMap[statusKey] || 'is-idle';
  jobStatus.className = `status-pill ${className}`;
};

const setProgress = (value) => {
  const normalized = Math.min(Math.max(value, 0), 100);
  progressBar.style.width = `${normalized}%`;
  progressLabel.textContent = `${normalized}%`;
};

const updateSteps = (currentKey) => {
  const order = ['queued', 'script', 'render', 'packaging', 'complete'];
  const currentIndex = order.indexOf(currentKey);
  jobSteps.forEach((step, index) => {
    if (currentIndex === -1) {
      step.classList.remove('is-active', 'is-complete');
      return;
    }
    step.classList.toggle('is-active', index === currentIndex);
    step.classList.toggle('is-complete', index < currentIndex);
  });
};

const setOutput = (job) => {
  if (!job) {
    outputPreview.textContent = 'এখনও কোনো ভিডিও তৈরি হয়নি।';
    outputPreview.classList.remove('is-ready');
    outputResolution.textContent = '-';
    outputDuration.textContent = '-';
    outputStyle.textContent = '-';
    outputFormat.textContent = '-';
    outputUpdated.textContent = '-';
    return;
  }

  outputResolution.textContent = job.resolution || '-';
  outputDuration.textContent = job.duration ? `${job.duration} সেকেন্ড` : '-';
  outputStyle.textContent = job.style || '-';
  outputFormat.textContent = job.format || '-';
  outputUpdated.textContent = formatTime(job.updatedAt);

  if (job.status === 'complete') {
    outputPreview.textContent = `জেনারেশন সম্পন্ন (${job.id})`;
    outputPreview.classList.add('is-ready');
  } else {
    outputPreview.textContent = `রেন্ডার চলছে: ${job.statusLabel}`;
    outputPreview.classList.remove('is-ready');
  }
};

const setDownload = (job) => {
  if (state.reportUrl) {
    URL.revokeObjectURL(state.reportUrl);
    state.reportUrl = null;
  }

  if (!job || job.status !== 'complete') {
    downloadReport.setAttribute('aria-disabled', 'true');
    downloadReport.removeAttribute('href');
    return;
  }

  const report = {
    id: job.id,
    prompt: job.prompt,
    story: job.story,
    style: job.style,
    duration: job.duration,
    resolution: job.resolution,
    aspect: job.aspect,
    format: job.format,
    platform: job.platform,
    reference: job.referenceName,
    status: job.status,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  state.reportUrl = URL.createObjectURL(blob);
  downloadReport.href = state.reportUrl;
  downloadReport.setAttribute('aria-disabled', 'false');
};

const loadHistory = () => {
  const stored = localStorage.getItem(HISTORY_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (error) {
    return [];
  }
};

const saveHistory = (history) => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

const updateCounts = (history) => {
  const completed = history.filter((job) => job.status === 'complete').length;
  completedCount.textContent = completed.toString();
  activeCount.textContent = state.activeJob ? '1' : '0';
};

const renderHistory = (history) => {
  historyList.innerHTML = '';
  if (!history.length) {
    const empty = document.createElement('p');
    empty.className = 'history-empty';
    empty.textContent = 'এখনও কোনো জব নেই।';
    historyList.append(empty);
    updateCounts(history);
    return;
  }

  history.forEach((job) => {
    const item = document.createElement('div');
    item.className = 'history-item';

    const info = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = job.id;
    const meta = document.createElement('div');
    meta.className = 'history-meta';
    meta.textContent = `${job.resolution} • ${job.duration}s • ${formatTime(job.updatedAt)}`;
    info.append(title, meta);

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'দেখুন';
    button.addEventListener('click', () => {
      setStatus(job.status, job.statusLabel);
      setProgress(job.progress);
      updateSteps(job.status);
      setOutput(job);
      setDownload(job);
      jobId.textContent = job.id;
    });

    item.append(info, button);
    historyList.append(item);
  });

  updateCounts(history);
};

const setFormEnabled = (enabled) => {
  [...form.elements].forEach((element) => {
    element.disabled = !enabled;
  });
};

const clearTimers = () => {
  state.timers.forEach((timer) => clearTimeout(timer));
  state.timers = [];
};

const resetForm = () => {
  form.reset();
  formError.textContent = '';
};

const startJob = (job) => {
  state.activeJob = job;
  setFormEnabled(false);
  cancelButton.disabled = false;
  formError.textContent = '';

  setStatus('queued', 'Queued');
  setProgress(5);
  updateSteps('queued');
  jobId.textContent = job.id;
  setOutput({ ...job, statusLabel: 'Queued' });
  setDownload(null);
  updateCounts(loadHistory());

  // Duration scale adjusts simulation timing: 30s baseline, 0.8 min, 2.2 max.
  const durationScale = Math.min(Math.max(job.duration / 30, 0.8), 2.2);
  const steps = [
    { key: 'queued', label: 'Queued', progress: 10, delay: 800 },
    { key: 'script', label: 'স্ক্রিপ্ট বিশ্লেষণ', progress: 32, delay: 1200 },
    { key: 'render', label: 'রেন্ডারিং', progress: 70, delay: 2000 },
    { key: 'packaging', label: 'প্যাকেজিং', progress: 92, delay: 1400 },
    { key: 'complete', label: 'সম্পন্ন', progress: 100, delay: 800 },
  ];

  let totalDelay = 0;
  steps.forEach((step) => {
    const timer = setTimeout(() => {
      if (!state.activeJob || state.activeJob.id !== job.id) return;

      job.status = step.key;
      job.statusLabel = step.label;
      job.progress = step.progress;
      job.updatedAt = new Date().toISOString();

      setStatus(step.key, step.label);
      setProgress(step.progress);
      updateSteps(step.key);
      setOutput(job);

      if (step.key === 'complete') {
        job.completedAt = job.updatedAt;
        finishJob(job);
      }
    }, totalDelay);

    state.timers.push(timer);
    totalDelay += step.delay * durationScale;
  });
};

const finishJob = (job) => {
  state.activeJob = null;
  setFormEnabled(true);
  cancelButton.disabled = true;

  const history = loadHistory();
  history.unshift(job);
  saveHistory(history.slice(0, MAX_HISTORY_ITEMS));
  renderHistory(history.slice(0, MAX_HISTORY_ITEMS));
  setDownload(job);
};

const cancelJob = () => {
  if (!state.activeJob) return;
  clearTimers();
  const cancelled = { ...state.activeJob };
  cancelled.status = 'cancelled';
  cancelled.statusLabel = 'Cancelled';
  cancelled.updatedAt = new Date().toISOString();

  setStatus('cancelled', 'Cancelled');
  setProgress(0);
  updateSteps(null);
  setOutput(cancelled);
  setDownload(null);
  jobId.textContent = cancelled.id;

  state.activeJob = null;
  setFormEnabled(true);
  cancelButton.disabled = true;
  updateCounts(loadHistory());
};

form?.addEventListener('submit', (event) => {
  event.preventDefault();

  if (state.activeJob) {
    formError.textContent = 'একটি জব চলমান রয়েছে, আগে সেটি শেষ করুন অথবা ক্যান্সেল করুন।';
    return;
  }

  const formData = new FormData(form);
  const prompt = formData.get('prompt')?.toString().trim();
  const story = formData.get('story')?.toString().trim();
  const style = formData.get('style')?.toString();
  const durationValue = Number(formData.get('duration'));
  const resolution = formData.get('resolution')?.toString();
  const aspect = formData.get('aspect')?.toString();
  const format = formData.get('format')?.toString();
  const platform = formData.get('platform')?.toString();
  const referenceFile = formData.get('reference');

  const errors = [];
  if (!prompt) errors.push('প্রম্পট লিখুন।');
  if (!durationValue) errors.push('ভিডিও দৈর্ঘ্য দিন।');
  if (!resolution) errors.push('রেজোলিউশন সিলেক্ট করুন।');
  if (!format) errors.push('আউটপুট ফরম্যাট সিলেক্ট করুন।');

  if (errors.length) {
    formError.textContent = errors.join(' ');
    return;
  }

  const job = {
    id: `JOB-${Date.now().toString(36).toUpperCase()}`,
    prompt,
    story,
    style,
    duration: durationValue,
    resolution,
    aspect,
    format,
    platform,
    referenceName: referenceFile?.name || 'N/A',
    status: 'queued',
    statusLabel: 'Queued',
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  startJob(job);
});

resetButton?.addEventListener('click', () => {
  if (state.activeJob) {
    formError.textContent = 'চলমান জব থাকলে রিসেট করা যাবে না।';
    return;
  }
  resetForm();
});

cancelButton?.addEventListener('click', cancelJob);

const initialHistory = loadHistory();
renderHistory(initialHistory);
setStatus('idle', 'Idle');
setProgress(0);
updateSteps(null);
setOutput(null);
setDownload(null);
