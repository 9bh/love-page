// --- Gate (pre-start requirements) ---
const gate = document.getElementById('gate');
const quiz = document.getElementById('quiz');

const camCheck = document.getElementById('camCheck');
const recCheck = document.getElementById('recCheck');
const camBtn = document.getElementById('camBtn');
const recBtn = document.getElementById('recBtn');
const startBtn = document.getElementById('startBtn');
const gateMsg = document.getElementById('gateMsg');
const preview = document.getElementById('preview');
const recording = document.getElementById('recording');

let camStream = null;
let recorder = null;
let recordedChunks = [];

function setGateMsg(t) {
  if (gateMsg) gateMsg.textContent = t || '';
}

function updateStartEnabled() {
  // يفتح زر بدأ إذا تحقق واحد على الأقل
  startBtn.disabled = !(camCheck.checked || recCheck.checked);
}

async function ensureCamera() {
  if (camStream) return camStream;
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('متصفحك ما يدعم الكاميرا');
  }

  camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  preview.srcObject = camStream;
  return camStream;
}

camBtn?.addEventListener('click', async () => {
  try {
    setGateMsg('…جاري تشغيل الكاميرا');
    await ensureCamera();
    camCheck.checked = true;
    setGateMsg('✅ الكاميرا شغالة');
    updateStartEnabled();
  } catch (e) {
    setGateMsg('❌ ما قدرت أشغّل الكاميرا. تأكدي من السماح.');
  }
});

recBtn?.addEventListener('click', async () => {
  try {
    setGateMsg('…جاري تجهيز التسجيل');
    const stream = await ensureCamera();

    recordedChunks = [];
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    recorder = new MediaRecorder(stream, { mimeType: mime });
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) recordedChunks.push(ev.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: mime });
      const url = URL.createObjectURL(blob);
      recording.src = url;
      recording.classList.remove('hidden');
      recCheck.checked = true;
      setGateMsg('✅ تم تسجيل الفيديو');
      updateStartEnabled();
    };

    setGateMsg('⏺️ تسجيل ٥ ثواني…');
    recorder.start();
    setTimeout(() => {
      try { recorder.stop(); } catch {}
    }, 5000);
  } catch (e) {
    setGateMsg('❌ ما قدرت أسجّل. تأكدي من السماح للكام/المايك.');
  }
});

camCheck?.addEventListener('change', updateStartEnabled);
recCheck?.addEventListener('change', updateStartEnabled);

startBtn?.addEventListener('click', () => {
  // حماية: لازم واحد منهم متحقق
  if (!(camCheck.checked || recCheck.checked)) return;

  gate.classList.add('hidden');
  quiz.classList.remove('hidden');

  // نبدأ الأسئلة
  setStep(1);
});

// --- Quiz (existing) ---
const stage = document.querySelector('.stage');
const questionEl = document.getElementById('question');
const yesBtn = document.getElementById('yesBtn');
const noBtn = document.getElementById('noBtn');
const result = document.getElementById('result');
const yayText = document.getElementById('yayText');
const yayGif = document.getElementById('yayGif');
const timer = document.getElementById('timer');
const timerNum = document.getElementById('timerNum');

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function stageRect() {
  return stage.getBoundingClientRect();
}

function placeBtnRandom(btn) {
  const r = stageRect();
  const bw = btn.offsetWidth;
  const bh = btn.offsetHeight;

  const pad = 12;
  const x = Math.random() * (r.width - bw - pad * 2) + pad;
  const y = Math.random() * (r.height - bh - pad * 2) + pad;

  btn.style.left = `${x}px`;
  btn.style.top = `${y}px`;
}

function distanceToBtn(btn, clientX, clientY) {
  const r = btn.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  return Math.hypot(clientX - cx, clientY - cy);
}

// --- State machine ---
let step = 1;
let escapeTarget = noBtn; // step 1: No escapes
let growTarget = yesBtn;
let growScale = 1;

function setStep(n) {
  step = n;

  if (step === 1) {
    questionEl.textContent = 'يا الدو تحبينن؟';
    yesBtn.textContent = 'Yes';
    noBtn.textContent = 'No';
    escapeTarget = noBtn;
    growTarget = yesBtn;
  } else if (step === 2) {
    questionEl.textContent = 'لا تعطينن بوسة اليوم تمام؟';
    yesBtn.textContent = 'Yes';
    noBtn.textContent = 'No';
    escapeTarget = yesBtn; // step 2: Yes escapes
    growTarget = noBtn;
  } else if (step === 3) {
    questionEl.textContent = 'انا ولا حنين ؟';
    yesBtn.textContent = 'علي';
    noBtn.textContent = 'حنين';
    escapeTarget = noBtn; // step 3: حنين تهرب
    growTarget = yesBtn;
  } else if (step === 4) {
    questionEl.textContent = 'اسمك نورة بنت ….؟';
    yesBtn.textContent = 'علي';
    noBtn.textContent = 'فهد';
    escapeTarget = noBtn; // step 4: فهد يهرب
    growTarget = yesBtn;
  }

  // reset visuals
  yesBtn.disabled = false;
  noBtn.disabled = false;
  yesBtn.style.opacity = '1';
  noBtn.style.opacity = '1';
  yesBtn.style.filter = '';
  noBtn.style.filter = '';
  result.classList.add('hidden');
  yayText.classList.remove('bold');

  growScale = 1;
  yesBtn.style.transform = '';
  noBtn.style.transform = '';

  // set positions
  noBtn.style.position = 'absolute';
  yesBtn.style.position = step === 2 ? 'absolute' : 'relative';

  if (step === 1) {
    placeBtnRandom(noBtn);
  } else if (step === 2) {
    placeBtnRandom(yesBtn);
    noBtn.style.left = '50%';
    noBtn.style.top = '60%';
    noBtn.style.transform = 'translate(-50%, -50%)';
  } else if (step === 3) {
    yesBtn.style.left = '';
    yesBtn.style.top = '';
    yesBtn.style.transform = '';
    placeBtnRandom(noBtn);
  } else if (step === 4) {
    yesBtn.style.left = '';
    yesBtn.style.top = '';
    yesBtn.style.transform = '';
    placeBtnRandom(noBtn);
  }
}

function maybeRunAway(e) {
  if (!escapeTarget || escapeTarget.disabled) return;

  const d = distanceToBtn(escapeTarget, e.clientX, e.clientY);
  const threshold = 110;

  if (d < threshold) {
    growScale = clamp(growScale + 0.07, 1, 1.9);
    growTarget.style.transform = `scale(${growScale})`;
    placeBtnRandom(escapeTarget);
  }
}

function onEscapeHover() {
  if (!escapeTarget || escapeTarget.disabled) return;

  growScale = clamp(growScale + 0.08, 1, 2.0);
  growTarget.style.transform = `scale(${growScale})`;
  placeBtnRandom(escapeTarget);
}

function startCountdownThenNextStep(seconds, nextStep) {
  timer.classList.remove('hidden');
  timer.setAttribute('aria-hidden', 'false');

  let s = seconds;
  timerNum.textContent = String(s);

  const iv = setInterval(() => {
    s -= 1;
    timerNum.textContent = String(s);

    if (s <= 0) {
      clearInterval(iv);
      timer.classList.add('hidden');
      timer.setAttribute('aria-hidden', 'true');
      setStep(nextStep);
    }
  }, 1000);
}

// --- Button actions ---
yesBtn.addEventListener('click', () => {
  if (step === 1) {
    yayText.textContent = 'ادري';
    yayText.classList.add('bold');
    result.classList.remove('hidden');

    yesBtn.disabled = true;
    noBtn.disabled = true;
    noBtn.style.opacity = '0.15';

    setTimeout(() => {
      startCountdownThenNextStep(5, 2);
    }, 5000);
  } else if (step === 2) {
    yayText.textContent = 'ههههه لا';
    result.classList.remove('hidden');
  } else if (step === 3) {
    yayText.textContent = 'اللقمي حنين';
    result.classList.remove('hidden');

    yesBtn.disabled = true;
    noBtn.disabled = true;

    setTimeout(() => {
      startCountdownThenNextStep(5, 4);
    }, 5000);
  } else if (step === 4) {
    yayText.textContent = 'مستوى فهد';
    result.classList.remove('hidden');
    yesBtn.disabled = true;
    noBtn.disabled = true;
  }
});

noBtn.addEventListener('click', () => {
  if (step === 1) {
    placeBtnRandom(noBtn);
    return;
  }

  if (step === 2) {
    yayText.textContent = 'تمام ✅';
    result.classList.remove('hidden');

    yesBtn.disabled = true;
    noBtn.disabled = true;

    setTimeout(() => {
      startCountdownThenNextStep(5, 3);
    }, 5000);
  } else if (step === 3) {
    yayText.textContent = 'غشّاش 😅';
    result.classList.remove('hidden');
  } else if (step === 4) {
    yayText.textContent = 'مستحيل 😂';
    result.classList.remove('hidden');
  }
});

// movement handlers
stage.addEventListener('mousemove', maybeRunAway);

yesBtn.addEventListener('mouseenter', () => {
  if (escapeTarget === yesBtn) onEscapeHover();
});

noBtn.addEventListener('mouseenter', () => {
  if (escapeTarget === noBtn) onEscapeHover();
});

window.addEventListener('load', () => {
  updateStartEnabled();
  // stay on gate by default
});
