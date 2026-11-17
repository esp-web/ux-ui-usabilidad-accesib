/* Navegación de la presentación. Sin JS, el contenido se lee como documento. */
(() => {
  const root = document.documentElement;
  const slides = [...document.querySelectorAll('.slide')];
  const total = slides.length;
  const mq = matchMedia('(min-width: 761px) and (min-height: 380px) and (min-aspect-ratio: 5/4)');
  const $ = (s) => document.querySelector(s);
  const contador = $('#contador');
  const donde = $('#donde');
  const aviso = $('#aviso');
  const prev = $('#prev');
  const next = $('#next');
  const dlg = $('#indice');
  const navBtns = [...document.querySelectorAll('.bloques [data-ir]')];
  let i = 0;

  const normalizar = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9ñ]+/g, ' ').trim();
  const titulo = (s) => s.dataset.titulo || (s.querySelector('h2, .titulo, .disp')?.textContent || '').replace(/\s+/g, ' ').trim();
  const bloque = (s) => s.dataset.bloque || '';

  slides.forEach((s, n) => {
    s.id = `d${n + 1}`;
    s.setAttribute('aria-roledescription', 'diapositiva');
    s.setAttribute('aria-label', `${n + 1} de ${total}: ${titulo(s)}`);
  });

  // Índice
  const cuerpo = dlg.querySelector('.cuerpo-i');
  let sec, ol, actual = null;
  slides.forEach((s, n) => {
    if (bloque(s) !== actual) {
      actual = bloque(s);
      sec = document.createElement('section');
      sec.innerHTML = `<h3>${actual}</h3>`;
      ol = document.createElement('ol');
      sec.append(ol);
      cuerpo.append(sec);
    }
    const li = document.createElement('li');
    li.innerHTML = `<a href="#d${n + 1}" data-n="${n}"><span>${n + 1}</span>${titulo(s)}</a>`;
    li.dataset.texto = normalizar(`${titulo(s)} ${s.textContent} ${[...s.querySelectorAll('img[alt]')].map((im) => im.alt).join(' ')}`);
    ol.append(li);
  });
  const enlacesIndice = [...cuerpo.querySelectorAll('a')];

  // Buscador: parcial, sin distinguir mayúsculas, tildes ni puntuación
  const campo = $('#buscar-i');
  const nota = $('#buscar-n');
  const items = [...cuerpo.querySelectorAll('li')];
  function buscar() {
    const terminos = normalizar(campo.value).split(' ').filter(Boolean);
    let total = 0;
    items.forEach((li) => {
      const ok = terminos.every((t) => li.dataset.texto.includes(t));
      li.hidden = !ok;
      if (ok) total++;
    });
    cuerpo.querySelectorAll('section').forEach((sec) => { sec.hidden = !sec.querySelector('li:not([hidden])'); });
    nota.textContent = terminos.length ? (total ? `${total} ${total === 1 ? 'diapositiva' : 'diapositivas'}` : 'Sin resultados. Prueba con otra palabra.') : '';
  }
  campo.addEventListener('input', buscar);
  campo.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    cuerpo.querySelector('li:not([hidden]) a')?.click();
  });

  // Orden de revelado: el del documento, salvo que un paso lleve data-orden (menor = antes)
  const pasos = (s) => [...s.querySelectorAll('.paso')].sort((a, b) => (Number(a.dataset.orden) || 0) - (Number(b.dataset.orden) || 0));

  function mostrar(n, { desdeAtras = false, anunciar = true } = {}) {
    n = Math.max(0, Math.min(total - 1, n));
    slides[i].classList.remove('activa');
    slides[i].setAttribute('inert', '');
    i = n;
    const s = slides[i];
    s.classList.add('activa');
    s.removeAttribute('inert');
    pasos(s).forEach((p) => p.classList.toggle('visto', desdeAtras));
    contador.textContent = `${i + 1} / ${total}`;
    donde.textContent = bloque(s);
    prev.disabled = i === 0;
    next.disabled = i === total - 1 && pasos(s).every((p) => p.classList.contains('visto'));
    navBtns.forEach((b) => b.setAttribute('aria-current', b.dataset.ir === bloque(s) ? 'true' : 'false'));
    enlacesIndice.forEach((a, k) => a.setAttribute('aria-current', k === i ? 'true' : 'false'));
    history.replaceState(null, '', `#d${i + 1}`);
    if (anunciar) aviso.textContent = `Diapositiva ${i + 1} de ${total}: ${titulo(s)}`;
  }

  function avanzar() {
    const p = pasos(slides[i]).find((x) => !x.classList.contains('visto'));
    if (p) { p.classList.add('visto'); aviso.textContent = p.textContent.replace(/\s+/g, ' ').trim(); actualizarNext(); return; }
    if (i < total - 1) mostrar(i + 1);
  }
  function retroceder() {
    const vistos = pasos(slides[i]).filter((x) => x.classList.contains('visto'));
    if (vistos.length) { vistos.at(-1).classList.remove('visto'); actualizarNext(); return; }
    if (i > 0) mostrar(i - 1, { desdeAtras: true });
  }
  function actualizarNext() {
    next.disabled = i === total - 1 && pasos(slides[i]).every((p) => p.classList.contains('visto'));
  }
  const desdeHash = () => {
    const m = location.hash.match(/^#d(\d+)$/);
    return m ? Number(m[1]) - 1 : 0;
  };

  let lectura = false;
  function activarModo() {
    root.classList.toggle('manual', lectura);
    $('#leer').setAttribute('aria-pressed', String(lectura));
    if (mq.matches && !lectura) {
      root.classList.add('presentar');
      slides.forEach((s) => s.setAttribute('inert', ''));
      mostrar(desdeHash(), { anunciar: false });
    } else {
      root.classList.remove('presentar');
      slides.forEach((s) => { s.removeAttribute('inert'); s.classList.remove('activa'); });
      if (lectura) slides[i].scrollIntoView();
    }
  }
  function alternarLectura() {
    lectura = !lectura;
    activarModo();
    aviso.textContent = lectura ? 'Modo lectura: todas las diapositivas en una página' : 'Modo presentación';
  }
  $('#leer').addEventListener('click', alternarLectura);

  prev.addEventListener('click', retroceder);
  next.addEventListener('click', avanzar);
  navBtns.forEach((b) => b.addEventListener('click', () => {
    const n = slides.findIndex((s) => bloque(s) === b.dataset.ir);
    if (n >= 0) mostrar(n);
  }));
  const abrirIndice = () => { dlg.showModal(); campo.focus(); };
  $('#abrir-indice').addEventListener('click', abrirIndice);
  dlg.querySelector('.cerrar').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  cuerpo.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-n]');
    if (!a || !root.classList.contains('presentar')) { dlg.close(); return; }
    e.preventDefault();
    dlg.close();
    mostrar(Number(a.dataset.n));
  });

  document.addEventListener('keydown', (e) => {
    if (dlg.open || e.altKey || e.ctrlKey || e.metaKey) return;
    if ((e.key === 'l' || e.key === 'L') && mq.matches) { e.preventDefault(); alternarLectura(); return; }
    if (!root.classList.contains('presentar')) return;
    if (e.target.closest('button, a, input, textarea, select') && (e.key === ' ' || e.key === 'Enter')) return;
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(k)) { e.preventDefault(); avanzar(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(k)) { e.preventDefault(); retroceder(); }
    else if (k === 'Home') { e.preventDefault(); mostrar(0); }
    else if (k === 'End') { e.preventDefault(); mostrar(total - 1); }
    else if (k === 'i' || k === 'I') { e.preventDefault(); abrirIndice(); }
    else if (k === 'f' || k === 'F') {
      e.preventDefault();
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
    }
  });

  // Deslizar en pantallas táctiles grandes (tabletas)
  let x0 = null, y0 = null;
  document.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (x0 === null || !root.classList.contains('presentar')) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? avanzar : retroceder)();
    x0 = null;
  });

  window.addEventListener('hashchange', () => { if (root.classList.contains('presentar')) mostrar(desdeHash()); });
  mq.addEventListener('change', activarModo);
  activarModo();
})();
