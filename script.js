(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const ORDER = ['task', 'approach', 'process', 'brief'];
  const desk = $('#desk');
  const stage = $('#stage');
  const wins = Object.fromEntries($$('.win').map((w) => [w.dataset.view, w]));
  const readme = $('#readmeWin');
  const readmeBtn = $('#readmeBtn');
  const form = $('#briefForm');

  let currentView = 'desktop';
  let lastTrigger = null;
  let hideTimer = 0;

  /* ---------- Навигация ---------- */

  function showWin(name, dir) {
    const el = wins[name];
    el.style.setProperty('--ex', dir * 28 + 'px');
    el.classList.remove('is-leaving');
    el.hidden = false;
    el.getBoundingClientRect();
    el.classList.add('is-open');
    const body = $('.win-body', el);
    if (body) body.scrollTop = 0;
    focusWin(el);
  }

  function focusWin(el) {
    el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }

  function open(name, trigger) {
    if (name === currentView) return;
    closeReadme(false);
    window.clearTimeout(hideTimer);

    if (currentView === 'desktop') {
      if (trigger) lastTrigger = trigger;
      stage.hidden = false;
      stage.getBoundingClientRect();
      stage.classList.add('is-open');
      desk.inert = true;
      showWin(name, 0);
    } else {
      const from = currentView;
      const dir = ORDER.indexOf(name) >= ORDER.indexOf(from) ? 1 : -1;
      const old = wins[from];
      old.style.setProperty('--lx', -dir * 24 + 'px');
      old.classList.remove('is-open');
      old.classList.add('is-leaving');
      window.setTimeout(() => {
        old.hidden = true;
        old.classList.remove('is-leaving');
      }, 230);
      showWin(name, name === 'success' ? 0 : dir);
    }
    currentView = name;
  }

  function closeAll() {
    if (currentView === 'desktop') return;
    const old = wins[currentView];
    old.classList.remove('is-open');
    stage.classList.remove('is-open');
    desk.inert = false;
    currentView = 'desktop';
    hideTimer = window.setTimeout(() => {
      old.hidden = true;
      stage.hidden = true;
      $$('.folder.is-opening').forEach((f) => f.classList.remove('is-opening'));
    }, 320);
    if (lastTrigger) lastTrigger.focus({ preventScroll: true });
  }

  function step(delta) {
    const i = ORDER.indexOf(currentView);
    if (i === -1) return;
    const n = i + delta;
    if (n < 0) closeAll();
    else if (n < ORDER.length) open(ORDER[n]);
  }

  $$('.folder').forEach((f) =>
    f.addEventListener('click', () => {
      f.classList.add('is-opening');
      open(f.dataset.open, f);
    })
  );
  $$('[data-close]').forEach((b) => b.addEventListener('click', closeAll));
  $$('[data-prev]').forEach((b) => b.addEventListener('click', () => step(-1)));
  $$('[data-next]').forEach((b) => b.addEventListener('click', () => step(1)));

  /* ---------- README ---------- */

  function openReadme() {
    readme.hidden = false;
    readme.getBoundingClientRect();
    readme.classList.add('is-open');
    readme.setAttribute('tabindex', '-1');
    readme.focus({ preventScroll: true });
  }
  function closeReadme(restore = true) {
    if (readme.hidden) return;
    readme.classList.remove('is-open');
    window.setTimeout(() => { if (!readme.classList.contains('is-open')) readme.hidden = true; }, 300);
    if (restore) readmeBtn.focus({ preventScroll: true });
  }
  readmeBtn.addEventListener('click', () => (readme.hidden ? openReadme() : closeReadme()));
  $('#readmeClose').addEventListener('click', () => closeReadme());
  document.addEventListener('pointerdown', (e) => {
    if (!readme.hidden && !readme.contains(e.target) && !readmeBtn.contains(e.target)) closeReadme(false);
  });

  /* ---------- Клавиатура ---------- */

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!readme.hidden) closeReadme();
      else if (currentView !== 'desktop') closeAll();
      return;
    }
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
    if (!typing && ORDER.includes(currentView)) {
      if (e.key === 'ArrowRight' && currentView !== 'brief') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    }
    if (e.key === 'Tab' && currentView !== 'desktop') {
      const win = wins[currentView];
      const items = $$('button, input, textarea, a[href], [tabindex]:not([tabindex="-1"])', win).filter((n) => !n.disabled && n.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === win)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- Форма ---------- */

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const isTg = (v) => /^@[a-zA-Z0-9_]{4,32}$/.test(v) || /^(https?:\/\/)?t\.me\/[a-zA-Z0-9_]{4,32}$/.test(v);
  const isUrl = (v) => {
    try {
      const u = new URL(/^https?:\/\//i.test(v) ? v : 'https://' + v);
      return u.hostname.includes('.') && !/\s/.test(v);
    } catch (_) { return false; }
  };

  const rules = {
    name: (v) => (v ? '' : 'Введите название проекта.'),
    what: (v) => (v ? '' : 'Напишите, что вы продаёте.'),
    site: (v) => (!v || isUrl(v) ? '' : 'Укажите ссылку целиком, например https://example.com.'),
    task: (v) => (!v ? 'Опишите, что нужно сделать.' : v.length < 10 ? 'Опишите задачу подробнее: хотя бы одно-два предложения.' : ''),
    contact: (v) => (!v ? 'Оставьте email или Telegram.' : isEmail(v) || isTg(v) ? '' : 'Укажите email (name@mail.ru) или Telegram (@name).'),
  };

  function check(input) {
    const field = input.closest('.field');
    const msg = rules[input.name](input.value.trim());
    $('.err', field).textContent = msg;
    field.classList.toggle('is-invalid', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }

  const inputs = $$('input[name], textarea[name]', form).filter((i) => rules[i.name]);
  inputs.forEach((i) => {
    i.addEventListener('blur', () => { if (i.value || i.closest('.field').classList.contains('is-invalid')) check(i); });
    i.addEventListener('input', () => { if (i.closest('.field').classList.contains('is-invalid')) check(i); });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

  // Валидация (твоя, не трогаем)
    const bad = inputs.filter((i) => !check(i));
    if (bad.length) { bad[0].focus(); return; }

  // Находим кнопку "Сохранить" — она вне формы, привязана через form="briefForm"
    const submitBtn = document.querySelector('button[type="submit"][form="briefForm"]');
    const label = submitBtn?.querySelector('span');
    const originalText = label?.textContent || 'Сохранить';

    if (submitBtn) submitBtn.disabled = true;
    if (label) label.textContent = 'Отправка…';

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        form.reset();
        resetAttach();
        open('success');
      } else {
        let msg = 'Не удалось отправить. Попробуйте ещё раз.';
        try {
         const err = await res.json();
          if (err?.errors?.length) msg = err.errors.map((x) => x.message).join(' ');
        } catch (_) {}
        alert(msg);
      }
    } catch (err) {
      alert('Ошибка сети. Проверьте подключение и попробуйте снова.');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (label) label.textContent = originalText;
    }
  });

  /* ---------- Прикрепление файла (без отправки) ---------- */

  const fileInput = $('#f-file');
  const attachName = $('#attachName');
  const attach = $('.attach');
  const attachDefault = attachName.textContent;
  const resetAttach = () => { attachName.textContent = attachDefault; };
  const size = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' МБ' : Math.max(1, Math.round(b / 1024)) + ' КБ');
  const showFile = () => {
    const f = fileInput.files[0];
    attachName.textContent = f ? f.name + ' · ' + size(f.size) : attachDefault;
  };
  fileInput.addEventListener('change', showFile);
  ['dragenter', 'dragover'].forEach((t) => attach.addEventListener(t, (e) => { e.preventDefault(); attach.classList.add('is-drag'); }));
  ['dragleave', 'drop'].forEach((t) => attach.addEventListener(t, () => attach.classList.remove('is-drag')));
  attach.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) { fileInput.files = e.dataTransfer.files; showFile(); }
  });

  /* ---------- Курсор (только мышь) ---------- */

  const cursor = $('#cursor');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine && cursor) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dot = $('.c-dot', cursor);
    const halo = $('.c-halo', cursor);
    let tx = 0, ty = 0, hx = 0, hy = 0, raf = 0;
    document.documentElement.classList.add('has-cursor');

    const tick = () => {
      hx += (tx - hx) * (reduce ? 1 : 0.18);
      hy += (ty - hy) * (reduce ? 1 : 0.18);
      halo.style.transform = `translate3d(${hx}px,${hy}px,0)`;
      raf = Math.abs(tx - hx) + Math.abs(ty - hy) > 0.1 ? requestAnimationFrame(tick) : 0;
    };

    document.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      tx = e.clientX; ty = e.clientY;
      dot.style.transform = `translate3d(${tx}px,${ty}px,0)`;
      cursor.classList.add('is-on');
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });

    document.addEventListener('pointerover', (e) => {
      cursor.classList.toggle('is-hot', !!e.target.closest('button, a, label, input, textarea, [role="button"]'));
    });
    document.documentElement.addEventListener('mouseleave', () => cursor.classList.remove('is-on'));
  }
})();
