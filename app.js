// Minimal journaling app logic with a daily posting window, streak stats, and local-first storage
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
  longest: document.getElementById('longest'),
  lastEntry: document.getElementById('lastEntry'),
  lastEntryAgo: document.getElementById('lastEntryAgo'),
  cooldown: document.getElementById('cooldown'),
  nextWindow: document.getElementById('nextWindow'),
  limitLabel: document.getElementById('limitLabel')
};

const DAY_MS = 24 * 60 * 60 * 1000;
const STORAGE_KEYS = {
  posts: 'misli_posts_v1',
  lastPost: 'misli_last_post_v1'
};

const store = {
  load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEYS.posts);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    }catch(e){
      return [];
    }
  },
  save(posts){
    localStorage.setItem(STORAGE_KEYS.posts, JSON.stringify(posts));
  },
  add(text){
    const posts = this.load();
    const now = Date.now();
    posts.push({ t: now, text });
    this.save(posts);
    localStorage.setItem(STORAGE_KEYS.lastPost, String(now));
    return now;
  },
  sortedDesc(){
    return this.load().slice().sort((a,b)=>b.t - a.t);
  },
  lastPostTs(){
    return parseInt(localStorage.getItem(STORAGE_KEYS.lastPost) || '0', 10) || 0;
  }
};

function switchTab(target){
  SELECTORS.tabs.forEach(t=>t.classList.toggle('active', t.dataset.target===target));
  SELECTORS.panels.forEach(p=>p.classList.toggle('active', p.id===target));
}

SELECTORS.tabs.forEach(t=>t.addEventListener('click', ()=>switchTab(t.dataset.target)));

// modal
function openModal(){
  SELECTORS.writeModal.setAttribute('aria-hidden','false');
  SELECTORS.thought.focus();
  updateCooldownUI();
}
function closeModal(){
  SELECTORS.writeModal.setAttribute('aria-hidden','true');
}
SELECTORS.writeBtn.addEventListener('click', openModal);
SELECTORS.closeModal.addEventListener('click', closeModal);
window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeModal(); });

// counter
function updateCounter(){
  const v = SELECTORS.thought.value || '';
  SELECTORS.counter.textContent = `${v.length} / ${SELECTORS.thought.maxLength}`;
  SELECTORS.counter.classList.toggle('warn', v.length > SELECTORS.thought.maxLength - 40);
}
SELECTORS.thought.addEventListener('input', updateCounter);

function formatDateTime(ts){
  return new Intl.DateTimeFormat(undefined, { dateStyle:'medium', timeStyle:'short' }).format(ts);
}

function formatDay(ts){
  return new Intl.DateTimeFormat(undefined, { weekday:'short', month:'short', day:'numeric' }).format(ts);
}

function formatRelative(ts){
  const diff = Date.now() - ts;
  if(diff < 60_000) return 'just now';
  const mins = Math.floor(diff/60_000);
  if(mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins/60);
  if(hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours/24);
  return `${days}d ago`;
}

function createPostElement(post){
  const el = document.createElement('article');
  el.className = 'post enter';
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = formatDateTime(post.t);
  const body = document.createElement('div');
  body.className = 'body';
  body.textContent = post.text;
  el.append(meta, body);
  requestAnimationFrame(()=>el.classList.add('play'));
  return el;
}

function renderEmpty(target, message){
  target.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'empty';
  wrap.textContent = message;
  target.appendChild(wrap);
}

function groupByDay(posts){
  const map = new Map();
  posts.forEach(p=>{
    const d = new Date(p.t);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const arr = map.get(dayStart) || [];
    arr.push(p);
    map.set(dayStart, arr);
  });
  return Array.from(map.entries()).sort((a,b)=>b[0]-a[0]).map(([day, items])=>({ day, items: items.sort((a,b)=>b.t-a.t) }));
}

function renderFeed(posts){
  SELECTORS.posts.innerHTML = '';
  if(!posts.length) return renderEmpty(SELECTORS.posts, 'No thoughts yet. Start with one meaningful note.');
  posts.forEach(p=>SELECTORS.posts.appendChild(createPostElement(p)));
}

function renderTimeline(posts){
  SELECTORS.timelinePosts.innerHTML = '';
  if(!posts.length) return renderEmpty(SELECTORS.timelinePosts, 'Your timeline will grow as you add thoughts.');
  groupByDay(posts).forEach(({day, items})=>{
    const section = document.createElement('div');
    section.className = 'day-group';
    const heading = document.createElement('div');
    heading.className = 'meta';
    heading.textContent = formatDay(day);
    section.appendChild(heading);
    items.forEach(p=>section.appendChild(createPostElement(p)));
    SELECTORS.timelinePosts.appendChild(section);
  });
}

function calcStreaks(posts){
  if(!posts.length) return { current:0, longest:0 };
  const days = groupByDay(posts).map(g=>g.day);
  const tolerance = 5*60*1000; // allow small DST drift

  // Longest streak across history
  let longest = 1;
  let run = 1;
  for(let i=1;i<days.length;i++){
    const diff = days[i-1] - days[i];
    if(Math.abs(diff - DAY_MS) < tolerance){
      run += 1;
    }else{
      run = 1;
    }
    longest = Math.max(longest, run);
  }

  // Current streak starting from the most recent day
  let current = 1;
  for(let i=1;i<days.length;i++){
    const diff = days[i-1] - days[i];
    if(Math.abs(diff - DAY_MS) < tolerance){
      current += 1;
    }else{
      break;
    }
  }

  const todayStart = new Date().setHours(0,0,0,0);
  const lastDay = days[0];
  const currentStreak = (todayStart - lastDay) <= DAY_MS ? current : 0;
  return { current: currentStreak, longest };
}

function renderStats(posts){
  SELECTORS.count.textContent = posts.length;
  const streaks = calcStreaks(posts);
  SELECTORS.streak.textContent = streaks.current;
  SELECTORS.longest.textContent = streaks.longest;

  if(!posts.length){
    SELECTORS.lastEntry.textContent = '—';
    SELECTORS.lastEntryAgo.textContent = 'No posts yet';
    return;
  }
  const last = posts[0].t;
  SELECTORS.lastEntry.textContent = formatDateTime(last);
  SELECTORS.lastEntryAgo.textContent = `Updated ${formatRelative(last)}`;
}

function canPost(){
  const last = store.lastPostTs();
  if(!last) return true;
  return (Date.now() - last) >= DAY_MS;
}

function timeUntilNext(){
  const last = store.lastPostTs();
  if(!last) return 0;
  return Math.max(0, DAY_MS - (Date.now() - last));
}

function humanDuration(ms){
  const h = Math.floor(ms/(1000*60*60));
  const m = Math.floor((ms - h*3600000)/(1000*60));
  if(h <= 0 && m <= 0) return 'a few moments';
  if(h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function updateCooldownUI(){
  const ms = timeUntilNext();
  if(ms<=0){
    SELECTORS.cooldown.textContent = '';
    SELECTORS.nextWindow.textContent = 'Ready to post';
    SELECTORS.postBtn.disabled = false;
    return;
  }
  const label = `Next post in ${humanDuration(ms)}`;
  SELECTORS.cooldown.textContent = label;
  SELECTORS.nextWindow.textContent = label;
  SELECTORS.postBtn.disabled = true;
}

function render(){
  SELECTORS.limitLabel.textContent = '1 post / 24h • Local first';
  const posts = store.sortedDesc();
  renderFeed(posts);
  renderTimeline(posts);
  renderStats(posts);
  updateCooldownUI();
}

SELECTORS.postBtn.addEventListener('click', ()=>{
  const text = (SELECTORS.thought.value || '').trim();
  if(!text) return;
  if(!canPost()){
    updateCooldownUI();
    return;
  }
  store.add(text);
  SELECTORS.thought.value = '';
  updateCounter();
  closeModal();
  render();
});

// Keep cooldown fresh while the tab is open
setInterval(updateCooldownUI, 30*1000);
updateCounter();
render();

// Listen for storage changes (multi-tab support)
window.addEventListener('storage', (e)=>{
  if(e.key === STORAGE_KEYS.posts || e.key === STORAGE_KEYS.lastPost){
    render();
  }
});

// Register Service Worker for PWA support
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}

// Demo seeds if empty
if(!localStorage.getItem(STORAGE_KEYS.posts)){
  store.save([
    {t: Date.now()-DAY_MS*4, text: 'First seeds of thought'},
    {t: Date.now()-DAY_MS*2, text: 'A short reflection yesterday'},
    {t: Date.now()-DAY_MS*1, text: 'A reminder to slow down and breathe'}
  ]);
  render();
}
