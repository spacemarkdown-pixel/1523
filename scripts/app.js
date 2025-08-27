/* ZhangYang.Email — App */
const qs = (s, el=document) => el.querySelector(s);
const qsa = (s, el=document) => [...el.querySelectorAll(s)];
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Theme + Accent
const root = document.documentElement;
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
function getStored(key, fallback){ try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function setStored(key, val){ try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function applyTheme(theme){ root.setAttribute('data-theme', theme); setStored('theme', theme); }
function applyAccent(color){ root.style.setProperty('--accent', color); setStored('accent', color); }

// Toasts
function showToast(message){
  const container = qs('#toastContainer');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  container.appendChild(el);
  setTimeout(()=>{ el.style.opacity = '0'; el.style.transform = 'translateY(6px)'; }, 2600);
  setTimeout(()=>{ el.remove(); }, 3100);
}

// Smooth anchor nav
qsa('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', (e)=>{
    const target = qs(a.getAttribute('href'));
    if(target){ e.preventDefault(); target.scrollIntoView({behavior:'smooth', block:'start'}); }
  });
});

// Active nav highlighting
(function navHighlight(){
  const sections = ['home','features','playground','stories','pricing','cta'];
  const linkFor = (id) => qs(`.nav a[href="#${id}"]`);
  const links = new Map(sections.map(id=>[id, linkFor(id)]));
  function setActive(id){
    links.forEach((a, key)=>{ if(!a) return; a.removeAttribute('aria-current'); });
    const active = links.get(id); if(active) active.setAttribute('aria-current','page');
  }
  const io = new IntersectionObserver((entries)=>{
    const visible = entries.filter(e=>e.isIntersecting).sort((a,b)=> b.intersectionRatio - a.intersectionRatio)[0];
    if(visible){ setActive(visible.target.id); }
  }, { rootMargin:'-20% 0px -60% 0px', threshold:[0,0.25,0.5,0.75,1] });
  sections.forEach(id=>{ const el = qs('#'+id); if(el) io.observe(el); });
})();

// Header theme + accent
(function setupTheme(){
  const themeStored = getStored('theme', prefersDark ? 'dark' : 'light');
  applyTheme(themeStored);
  const accentStored = getStored('accent', '#7c3aed');
  applyAccent(accentStored);
  const year = new Date().getFullYear();
  const yearSpan = qs('#year'); if(yearSpan) yearSpan.textContent = String(year);

  const themeToggle = qs('#themeToggle');
  themeToggle?.addEventListener('click', ()=>{
    const newTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme); showToast(`Theme: ${newTheme}`);
  });
  const accentInput = qs('#accentInput');
  accentInput?.addEventListener('input', (e)=> applyAccent(e.target.value));
})();

// Tilt interactions
(function setupTilt(){
  if(reduceMotion) return;
  const maxDeg = 8;
  qsa('.tilt').forEach(card=>{
    card.addEventListener('pointermove', (e)=>{
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top + rect.height/2;
      const dx = (e.clientX - cx) / (rect.width/2);
      const dy = (e.clientY - cy) / (rect.height/2);
      const rx = clamp(-dy * maxDeg, -maxDeg, maxDeg);
      const ry = clamp(dx * maxDeg, -maxDeg, maxDeg);
      card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(8px)`;
    });
    card.addEventListener('pointerleave', ()=>{
      card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)';
    });
  });
})();

// Hero Three.js particles
(async function heroThree(){
  const canvas = qs('#hero-canvas'); if(!canvas) return;
  const { Scene, PerspectiveCamera, WebGLRenderer, BufferGeometry, Float32BufferAttribute, PointsMaterial, Points, AdditiveBlending, Color, Clock, Fog } = await import('https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js');
  const scene = new Scene();
  scene.fog = new Fog(new Color('#0b0d12'), 10, 60);
  const camera = new PerspectiveCamera(65, canvas.clientWidth/canvas.clientHeight, 0.1, 100);
  const renderer = new WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  function resize(){
    const w = canvas.clientWidth; const h = canvas.clientHeight; if(h === 0) return;
    renderer.setSize(w, h, false); camera.aspect = w/h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  camera.position.set(0, 0.8, 7.5);

  // Envelope-like particle field
  const geometry = new BufferGeometry();
  const COUNT = 2200;
  const positions = new Float32BufferAttribute(COUNT * 3, 3);
  const speeds = new Float32BufferAttribute(COUNT, 1);
  for(let i=0;i<COUNT;i++){
    const t = Math.random()*Math.PI*2;
    const r = Math.pow(Math.random(), 0.55) * 4.6 + 0.4;
    const y = (Math.random()-0.5) * 1.8; // envelope flap thickness
    const x = Math.cos(t) * r;
    const z = Math.sin(t) * r;
    positions.setXYZ(i, x, y, z);
    speeds.setX(i, (Math.random()*0.6+0.2) * (Math.random()<0.5?-1:1));
  }
  geometry.setAttribute('position', positions);
  geometry.setAttribute('speed', speeds);

  const mat = new PointsMaterial({ size: 0.04, color: new Color(getComputedStyle(root).getPropertyValue('--accent')), transparent:true, opacity:0.95, blending: AdditiveBlending, depthWrite:false });
  const points = new Points(geometry, mat);
  scene.add(points);

  const clock = new Clock();
  function tick(){
    const t = clock.getElapsedTime();
    const pos = geometry.getAttribute('position');
    const spd = geometry.getAttribute('speed');
    for(let i=0;i<COUNT;i++){
      const x = pos.getX(i); const z = pos.getZ(i); const s = spd.getX(i)*0.15;
      const y0 = pos.getY(i);
      const y = Math.sin((x*0.75 + z*0.6) + t*1.2 + s) * 0.5 + (y0*0.2);
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    points.rotation.y = Math.sin(t*0.15) * 0.2;
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  if(reduceMotion){ renderer.render(scene, camera); return; }
  tick();

  // Recolor on accent change
  const mo = new MutationObserver(()=>{
    const newColor = new Color(getComputedStyle(root).getPropertyValue('--accent'));
    mat.color = newColor; mat.needsUpdate = true;
  });
  mo.observe(root, { attributes:true, attributeFilter:['style'] });
})();

// Inbox Playground
const sampleSenders = [
  {name:'Mira', email:'mira@studio.dev'},
  {name:'Kai', email:'kai@uni.edu'},
  {name:'Hana', email:'hana@press.io'},
  {name:'Diego', email:'diego@design.co'},
  {name:'Zhang', email:'hello@zhangyang.email'},
];
const sampleBodies = [
  `# Hello from ZhangYang.Email\n\n- This is a live Markdown editor\n- Use the command palette (Ctrl/Cmd K)\n- Toggle themes, change accents\n\n> Youthful, agile, free.`,
  `Quick update: **ship it** tonight.\n\n- Animations look crisp\n- Offline works great\n\nCheers!`,
  `Question: Should we make the hero more interactive?\n\nMaybe add a \`tilt\` effect and GSAP scroll reveals.`,
  `Sketch for the team onboarding flow attached.\n\n\`\`\`js\nconsole.log('Email, Unbound');\n\`\`\``,
];
function generateMail(id){
  const sender = sampleSenders[Math.floor(Math.random()*sampleSenders.length)];
  const subject = [
    'Welcome to Email, Unbound', 'Your flow state awaits', 'Playground invite', 'Design mock v2',
    'Idea: velocity labels', 'Lunch on Friday?', 'Offline mode demo', 'Command palette tips'
  ][Math.floor(Math.random()*8)];
  const body = sampleBodies[Math.floor(Math.random()*sampleBodies.length)];
  return { id, sender, subject, body, starred:false, date: new Date(Date.now()-Math.random()*864e5) };
}
const MAIL = Array.from({length:18}, (_,i)=>generateMail(i+1));
const removedIds = new Set();
const starredIds = new Set();

(async function setupPlayground(){
  const list = qs('#mailList'); if(!list) return;
  const readerSubject = qs('#readerSubject');
  const readerMeta = qs('#readerMeta');
  const readerBody = qs('#readerBody');
  const searchInput = qs('#searchInput');
  const newBtn = qs('#newMailBtn');
  const toInput = qs('#toInput');
  const subjectInput = qs('#subjectInput');
  const bodyInput = qs('#bodyInput');
  const preview = qs('#preview');
  const sendBtn = qs('#sendBtn');
  const attachmentZone = qs('#attachmentZone');
  const starBtn = qs('#starBtn');
  const archiveBtn = qs('#archiveBtn');
  const deleteBtn = qs('#deleteBtn');

  list.tabIndex = 0;

  let selectedId = null;
  let selectedIndex = 0;
  let current = MAIL.filter(m=>!removedIds.has(m.id));

  function renderList(items){
    list.innerHTML = '';
    items.forEach((msg, idx)=>{
      const li = document.createElement('li');
      li.className = 'mail-item';
      li.role = 'option';
      li.id = `mail-${msg.id}`;
      li.dataset.id = String(msg.id);
      li.tabIndex = -1;
      li.setAttribute('aria-selected', String(selectedId === msg.id));
      const isStar = starredIds.has(msg.id);
      li.innerHTML = `
        <div class=\"avatar\"></div>
        <div>
          <div class=\"subject\">${isStar ? '★ ' : ''}${msg.subject}</div>
          <div class=\"snippet\">${msg.sender.name} • ${msg.body.slice(0, 80).replace(/\\n/g,' ')}...</div>
        </div>
        <div class=\"date\">${msg.date.toLocaleDateString()}</div>
      `;
      li.addEventListener('click', ()=> selectIndex(idx));
      list.appendChild(li);
    });
  }

  function updateSelectionUI(){
    qsa('.mail-item', list).forEach((el)=>{
      const id = Number(el.dataset.id);
      const sel = id === selectedId;
      el.setAttribute('aria-selected', String(sel));
    });
    const msg = current[selectedIndex];
    if(msg){
      readerSubject.textContent = `${msg.subject}`;
      readerMeta.textContent = `${msg.sender.name} • ${msg.date.toLocaleTimeString()}`;
      starBtn?.setAttribute('aria-pressed', String(starredIds.has(msg.id)));
      starBtn && (starBtn.title = starredIds.has(msg.id) ? 'Unstar' : 'Star');
    }
  }

  function selectIndex(i){
    if(i<0 || i>=current.length) return;
    selectedIndex = i;
    selectedId = current[i].id;
    renderMarkdown(current[i].body, readerBody);
    updateSelectionUI();
    const active = qs(`#mail-${selectedId}`);
    active?.scrollIntoView({ block:'nearest' });
  }

  function rebuildList(){
    const q = searchInput.value.trim().toLowerCase();
    current = MAIL.filter(m=>!removedIds.has(m.id)).filter(m=>{
      if(!q) return true;
      return m.subject.toLowerCase().includes(q) || m.sender.name.toLowerCase().includes(q) || m.body.toLowerCase().includes(q);
    });
    if(current.length === 0){ list.innerHTML = '<li class="mail-item" aria-disabled="true">No messages</li>'; readerBody.innerHTML = '<p>Nothing here yet.</p>'; return; }
    renderList(current);
    if(selectedIndex >= current.length) selectedIndex = current.length-1;
    if(selectedIndex < 0) selectedIndex = 0;
    selectedId = current[selectedIndex]?.id ?? null;
    updateSelectionUI();
  }

  searchInput.addEventListener('input', rebuildList);
  newBtn.addEventListener('click', ()=>{
    toInput.value = '';
    subjectInput.value = '';
    bodyInput.value = '';
    preview.innerHTML = '';
    showToast('New message');
  });

  // Keyboard navigation
  list.addEventListener('keydown', (e)=>{
    if(['ArrowDown','j','J'].includes(e.key)){ e.preventDefault(); selectIndex(selectedIndex+1); }
    else if(['ArrowUp','k','K'].includes(e.key)){ e.preventDefault(); selectIndex(selectedIndex-1); }
    else if(e.key === 'Enter'){ e.preventDefault(); selectIndex(selectedIndex); }
    else if(e.key.toLowerCase() === 'a'){ e.preventDefault(); archiveSelected(); }
    else if(e.key.toLowerCase() === 's'){ e.preventDefault(); toggleStarSelected(); }
    else if(e.key === 'Delete' || e.key === 'Backspace'){ e.preventDefault(); deleteSelected(); }
  });

  // Markdown live preview
  const { marked } = await import('https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js');
  function sanitize(html){
    const template = document.createElement('template');
    template.innerHTML = html;
    qsa('script,style,iframe', template.content).forEach(n=>n.remove());
    qsa('*', template.content).forEach(n=>{
      [...n.attributes].forEach(a=>{ if(/^(on|srcdoc)/i.test(a.name)) n.removeAttribute(a.name); });
    });
    return template.innerHTML;
  }
  function renderMarkdown(text, target){
    const html = marked.parse(text ?? '');
    target.innerHTML = sanitize(html);
    Prism?.highlightAllUnder?.(target);
  }
  bodyInput.addEventListener('input', ()=> renderMarkdown(bodyInput.value, preview));

  // Attachments drag-drop
  const attachments = [];
  function renderAttachments(){
    attachmentZone.innerHTML = '';
    if(attachments.length === 0){ attachmentZone.textContent = 'Drop files here'; return; }
    attachments.forEach(file=>{
      const chip = document.createElement('span'); chip.className = 'attachment-chip';
      chip.textContent = `${file.name} (${Math.ceil(file.size/1024)}KB)`;
      attachmentZone.appendChild(chip);
    });
  }
  ;['dragenter','dragover'].forEach(evt=> attachmentZone.addEventListener(evt, (e)=>{ e.preventDefault(); attachmentZone.style.borderColor = 'var(--accent)'; }));
  ;['dragleave','drop'].forEach(evt=> attachmentZone.addEventListener(evt, (e)=>{ e.preventDefault(); attachmentZone.style.borderColor = 'rgba(255,255,255,.08)'; }));
  attachmentZone.addEventListener('drop', (e)=>{
    const files = [...(e.dataTransfer?.files || [])];
    attachments.push(...files);
    renderAttachments();
    showToast(`${files.length} file(s) attached`);
  });

  // Actions
  function toggleStarSelected(){
    const id = selectedId; if(!id) return;
    if(starredIds.has(id)) starredIds.delete(id); else starredIds.add(id);
    showToast(starredIds.has(id) ? 'Starred' : 'Unstarred');
    rebuildList();
    updateSelectionUI();
  }
  function archiveSelected(){
    const id = selectedId; if(!id) return;
    removedIds.add(id);
    showToast('Archived');
    rebuildList();
  }
  function deleteSelected(){
    const id = selectedId; if(!id) return;
    removedIds.add(id);
    showToast('Deleted');
    rebuildList();
  }

  starBtn?.addEventListener('click', toggleStarSelected);
  archiveBtn?.addEventListener('click', archiveSelected);
  deleteBtn?.addEventListener('click', deleteSelected);

  // Send
  sendBtn.addEventListener('click', ()=>{
    const to = toInput.value || 'someone@internet';
    const subject = subjectInput.value || 'No subject';
    const words = (bodyInput.value || '').split(/\s+/).filter(Boolean).length;
    showToast(`Sent to ${to}: ${subject} • ${words} words`);
  });

  rebuildList();
  if(current[0]) selectIndex(0);
})();

// Testimonials slider
(function slider(){
  const slides = qs('#slides'); if(!slides) return;
  const prev = qs('.slider .prev'); const next = qs('.slider .next');
  let index = 0; const count = slides.children.length;
  function go(i){ index = (i+count)%count; slides.style.transform = `translateX(${index*-100}%)`; }
  prev.addEventListener('click', ()=> go(index-1));
  next.addEventListener('click', ()=> go(index+1));
  setInterval(()=> go(index+1), 5000);
})();

// Pricing controls
(function pricing(){
  const monthly = { solo:6, studio:12, teamPerSeat:24 };
  const yearlyFactor = 0.8;
  const billingSwitch = qs('#billingSwitch'); if(!billingSwitch) return;
  const seatRange = qs('#seatRange');
  const seatValue = qs('#seatValue');
  const priceSolo = qs('#priceSolo');
  const priceStudio = qs('#priceStudio');
  const priceTeam = qs('#priceTeam');

  function recalc(){
    const yearly = billingSwitch.checked;
    const perSeat = monthly.teamPerSeat * (yearly ? yearlyFactor : 1);
    const seats = Number(seatRange.value);
    const solo = monthly.solo * (yearly ? yearlyFactor : 1);
    const studio = monthly.studio * (yearly ? yearlyFactor : 1);
    priceSolo.textContent = `$${solo.toFixed(0)}`;
    priceStudio.textContent = `$${studio.toFixed(0)}`;
    priceTeam.textContent = `$${(perSeat*seats).toFixed(0)}`;
    seatValue.textContent = String(seats);
  }
  billingSwitch.addEventListener('change', recalc);
  seatRange.addEventListener('input', recalc);
  recalc();
})();

// Command Palette
(function palette(){
  const dialog = qs('#commandPalette'); if(!dialog) return;
  const input = qs('#paletteInput');
  const results = qs('#paletteResults');
  const commands = [
    { id:'new', title:'New message', run:()=> qs('#newMailBtn')?.click() },
    { id:'send', title:'Send message', run:()=> qs('#sendBtn')?.click() },
    { id:'toggle-theme', title:'Toggle theme', run:()=> qs('#themeToggle')?.click() },
    { id:'go-playground', title:'Go to Playground', run:()=> location.hash = '#playground' },
    { id:'go-features', title:'Go to Features', run:()=> location.hash = '#features' },
    { id:'go-pricing', title:'Go to Pricing', run:()=> location.hash = '#pricing' },
  ];
  function open(){ dialog.showModal(); results.innerHTML = ''; input.value=''; input.focus(); render(commands); }
  function close(){ dialog.close(); }
  function score(q, s){ q = q.toLowerCase(); s = s.toLowerCase(); let i=0,j=0,sc=0; while(i<q.length && j<s.length){ if(q[i]===s[j]){ sc+=2; i++; } j++; } return sc - (s.length - q.length); }
  function render(list){ results.innerHTML = ''; list.forEach((c,idx)=>{ const li=document.createElement('li'); li.textContent=c.title; li.setAttribute('role','option'); if(idx===0) li.setAttribute('aria-selected','true'); li.addEventListener('click', ()=>{ c.run(); close(); }); results.appendChild(li); }); }
  input.addEventListener('input', ()=>{ const q=input.value.trim(); if(!q) return render(commands); const scored = commands.map(c=>({ c, s:score(q, c.title)})).sort((a,b)=>b.s-a.s).map(x=>x.c); render(scored); });
  window.addEventListener('keydown', (e)=>{
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); open(); }
    if(e.key==='Escape' && dialog.open) close();
  });
  qs('#demoButton')?.addEventListener('click', open);
})();

// GSAP animations (ScrollTrigger)
(async function animationsGSAP(){
  if(reduceMotion) return;
  try {
    const gsap = (await import('https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js')).default;
    const { ScrollTrigger } = await import('https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js');
    gsap.registerPlugin(ScrollTrigger);

    gsap.set(['.headline','.kicker','.hero-cta'], { opacity:0, y:14 });
    gsap.to('.headline', { opacity:1, y:0, duration:0.8, ease:'power2.out', delay:0.1 });
    gsap.to('.kicker', { opacity:1, y:0, duration:0.8, ease:'power2.out', delay:0.25 });
    gsap.to('.hero-cta', { opacity:1, y:0, duration:0.8, ease:'power2.out', delay:0.4 });

    gsap.utils.toArray('.section').forEach(section=>{
      const cards = section.querySelectorAll('.card');
      if(cards.length){
        gsap.from(cards, { opacity:0, y:16, duration:0.6, ease:'power2.out', stagger:0.08, scrollTrigger:{ trigger: section, start:'top 80%' } });
      }
    });

    gsap.from('.pane-left', { opacity:0, x:-20, duration:0.7, ease:'power2.out', scrollTrigger:{ trigger: '.workbench', start: 'top 85%' }});
    gsap.from('.pane-right', { opacity:0, x:20, duration:0.7, ease:'power2.out', scrollTrigger:{ trigger: '.workbench', start: 'top 85%' }});
  } catch (e) {
    // Optional: run minimal CSS-based fallbacks silently
  }
})();

// PWA registration
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('/service-worker.js').catch(()=>{});
  });
}