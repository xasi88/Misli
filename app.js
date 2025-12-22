// Minimal UI logic: tabs, write modal, char counter, 1-per-24h limit, local posts
const SELECTORS = {
  tabs: document.querySelectorAll('.tab'),
  panels: document.querySelectorAll('.panel'),
  writeBtn: document.getElementById('writeBtn'),
  writeModal: document.getElementById('writeModal'),
  closeModal: document.getElementById('closeModal'),
  thought: document.getElementById('thought'),
  counter: document.getElementById('counter'),
  postBtn: document.getElementById('postBtn'),
  posts: document.getElementById('posts'),
  timelinePosts: document.getElementById('timelinePosts'),
  count: document.getElementById('count'),
  streak: document.getElementById('streak'),
  cooldown: document.getElementById('cooldown')
};

// Storage keys
const POSTS_KEY = 'misli_posts_v1';
const LAST_POST_KEY = 'misli_last_post_v1';

function switchTab(target){
  SELECTORS.tabs.forEach(t=>t.classList.toggle('active', t.dataset.target===target));
  SELECTORS.panels.forEach(p=>p.classList.toggle('active', p.id===target));
}

SELECTORS.tabs.forEach(t=>t.addEventListener('click', ()=>switchTab(t.dataset.target)));

// modal
function openModal(){
  SELECTORS.writeModal.setAttribute('aria-hidden','false');
  SELECTORS.thought.focus();
  updateCooldown();
}
function closeModal(){
  SELECTORS.writeModal.setAttribute('aria-hidden','true');
}
SELECTORS.writeBtn.addEventListener('click', openModal);
SELECTORS.closeModal.addEventListener('click', closeModal);
window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeModal(); });

// counter
SELECTORS.thought.addEventListener('input', ()=>{
  const v = SELECTORS.thought.value || '';
  SELECTORS.counter.textContent = `${v.length} / ${SELECTORS.thought.maxLength}`;
});

function loadPosts(){
  try{ return JSON.parse(localStorage.getItem(POSTS_KEY) || '[]'); }catch(e){return []}
}
function savePosts(posts){ localStorage.setItem(POSTS_KEY, JSON.stringify(posts)); }

function renderPosts(){
  const posts = loadPosts().slice().reverse();
  SELECTORS.posts.innerHTML = '';
  SELECTORS.timelinePosts.innerHTML = '';
  posts.forEach(p=>{
    const el = document.createElement('article');
    el.className = 'post enter';
    el.innerHTML = `
      <div class="meta">${new Date(p.t).toLocaleString()}</div>
      <div class="body">${escapeHtml(p.text)}</div>
    `;
    SELECTORS.posts.appendChild(el);
    // timeline also
    const t = el.cloneNode(true);
    SELECTORS.timelinePosts.appendChild(t);
    requestAnimationFrame(()=>el.classList.add('play'));
  });
  SELECTORS.count.textContent = posts.length;
  // simple streak (consecutive days with posts)
  SELECTORS.streak.textContent = calcStreak(loadPosts());
}

function calcStreak(posts){
  if(!posts.length) return 0;
  // assume posts sorted ascending
  posts = posts.slice().sort((a,b)=>a.t-b.t);
  let streak = 0;
  let lastDay = null;
  for(let i=posts.length-1;i>=0;i--){
    const d = new Date(posts[i].t);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if(lastDay===null){ streak=1; lastDay = day; }
    else{
      const diff = (lastDay - day) / (1000*60*60*24);
      if(diff===1){ streak++; lastDay = day; }
      else break;
    }
  }
  return streak;
}

function escapeHtml(s){ return s.replace(/[&<>"']/g, function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]; }); }

// posting
function canPost(){
  const last = parseInt(localStorage.getItem(LAST_POST_KEY) || '0',10);
  if(!last) return true;
  const diff = Date.now() - last;
  return diff >= 24*60*60*1000;
}

function timeUntilNext(){
  const last = parseInt(localStorage.getItem(LAST_POST_KEY) || '0',10);
  if(!last) return 0;
  const remaining = 24*60*60*1000 - (Date.now() - last);
  return Math.max(0, remaining);
}

function updateCooldown(){
  const ms = timeUntilNext();
  if(ms<=0){ SELECTORS.cooldown.textContent = ''; SELECTORS.postBtn.disabled = false; return; }
  SELECTORS.postBtn.disabled = true;
  // simple human-friendly
  const h = Math.floor(ms/(1000*60*60));
  const m = Math.floor((ms - h*3600000)/(1000*60));
  SELECTORS.cooldown.textContent = `Next post in ${h}h ${m}m`;
}

SELECTORS.postBtn.addEventListener('click', ()=>{
  if(!canPost()) return updateCooldown();
  const text = (SELECTORS.thought.value || '').trim();
  if(!text) return;
  const posts = loadPosts();
  posts.push({ t: Date.now(), text });
  savePosts(posts);
  localStorage.setItem(LAST_POST_KEY, String(Date.now()));
  SELECTORS.thought.value = '';
  SELECTORS.counter.textContent = `0 / ${SELECTORS.thought.maxLength}`;
  closeModal();
  renderPosts();
});

// live cooldown updater
setInterval(updateCooldown, 30*1000);
updateCooldown();
renderPosts();

// Register Service Worker for PWA support
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js').catch(()=>{});
}

// small helper to seed UI when empty (for demo only)
if(!localStorage.getItem(POSTS_KEY)){
  localStorage.setItem(POSTS_KEY, JSON.stringify([
    {t: Date.now()-1000*60*60*24*3, text: 'First seeds of thought'},
    {t: Date.now()-1000*60*60*24*1, text: 'A short reflection yesterday'}
  ]));
  renderPosts();
}
