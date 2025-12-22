// Main app logic: localStorage persistence, optional Firebase support, radius filtering, char limits, 1 per 24h rule
(function(){
  // Config
  const DAILY_LIMIT = 1; // number of thoughts per 24h
  const CHAR_LIMIT = 10000;
  const STORAGE_KEY = 'mysli_thoughts_v2';
  const LIMIT_KEY = 'mysli_last_post_v2';

  // Elements
  const listView = document.getElementById('listView');
  const writeView = document.getElementById('writeView');
  const writeBtn = document.getElementById('writeBtn');
  const backBtn = document.getElementById('backBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const publishBtn = document.getElementById('publishBtn');
  const thoughtInput = document.getElementById('thoughtInput');
  const charCounter = document.getElementById('charCounter');
  const remainingPerDay = document.getElementById('remainingPerDay');
  const dailyLimitText = document.getElementById('dailyLimitText');

  const thoughtListEl = document.getElementById('thoughtList');
  const radiusTabs = document.getElementById('radiusTabs');
  const radiusDropdown = document.getElementById('radiusDropdown');
  const radiusValue = document.getElementById('radiusValue');

  // State
  let currentRadius = 500;
  let userPos = null;
  let remoteEnabled = (typeof firebase !== 'undefined' && firebase && window.firebaseConfig);

  // Utility functions
  function now(){ return Date.now(); }
  function loadLocal(){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }catch(e){return []}}
  function saveLocal(items){ localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
  function canPost(){
    const last = parseInt(localStorage.getItem(LIMIT_KEY) || '0',10);
    if(!last) return true;
    return (now() - last) > 24*60*60*1000;
  }
  function markPosted(){ localStorage.setItem(LIMIT_KEY, ''+now()); }

  function haversine(lat1,lon1,lat2,lon2){
    const R=6371000; const toRad=Math.PI/180;
    const dLat=(lat2-lat1)*toRad; const dLon=(lon2-lon1)*toRad;
    const a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*toRad)*Math.cos(lat2*toRad)*Math.sin(dLon/2)*Math.sin(dLon/2);
    const c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); return R*c; }

  function formatDistance(m){ if(m<1000) return Math.round(m)+' м'; return (m/1000).toFixed(1)+' км'; }
  function timeAgo(ts){ const diff=(Date.now()-ts)/1000; if(diff<60) return Math.floor(diff)+' секунд назад'; if(diff<3600) return Math.floor(diff/60)+' минут назад'; if(diff<86400) return Math.floor(diff/3600)+' часов назад'; return Math.floor(diff/86400)+' дней назад'; }

  // Seed sample posts if empty
  function seedIfEmpty(){ const items=loadLocal(); if(items.length===0){ const baseLat=55.75; const baseLng=37.62; const samples=[
    {text:'Иногда так хочется просто исчезнуть на время, чтобы никто не искал...', lat:baseLat+0.0015, lng:baseLng-0.0012, createdAt: Date.now()-5*60*1000},
    {text:'Почему разговоры с незнакомцами в транспорте бывают такими искренними!', lat:baseLat+0.0035, lng:baseLng+0.0021, createdAt: Date.now()-15*60*1000},
    {text:'Кажется, я стою на перепутье, и не знаю, куда двигаться дальше...', lat:baseLat-0.0045, lng:baseLng+0.001, createdAt: Date.now()-30*60*1000}
  ]; saveLocal(samples); }}

  // Render
  function renderList(){ thoughtListEl.innerHTML=''; const items = loadLocal();
    let filtered = items.slice().reverse();
    if(userPos){ filtered = filtered.filter(it => { if(!it.lat||!it.lng) return false; const d=haversine(userPos.latitude,userPos.longitude,it.lat,it.lng); return d<=currentRadius; }); }
    if(filtered.length===0){ const empty=document.createElement('div'); empty.className='thought-card'; empty.innerHTML='<p>Здесь будет отображаться ваша лента мыслей по радиусу.</p>'; thoughtListEl.appendChild(empty); return; }
    filtered.forEach(it => {
      const card=document.createElement('div'); card.className='thought-card';
      const dist = (userPos && it.lat && it.lng) ? formatDistance(haversine(userPos.latitude,userPos.longitude,it.lat,it.lng)) : '—';
      card.innerHTML = `<div class="text">${escapeHtml(it.text)}</div><div class="meta">📍 ${dist} · ${timeAgo(it.createdAt)}</div>`;
      thoughtListEl.appendChild(card);
    });
  }

  function escapeHtml(t){ const d=document.createElement('div'); d.textContent=t; return d.innerHTML; }

  // Radius controls
  radiusTabs.addEventListener('click', (e)=>{ const btn=e.target.closest('button'); if(!btn) return; const r=parseInt(btn.dataset.radius,10); currentRadius=r; Array.from(radiusTabs.querySelectorAll('button')).forEach(b=>b.classList.toggle('active',b===btn)); radiusValue.textContent = displayRadius(r); renderList(); });
  radiusDropdown.addEventListener('change',(e)=>{ currentRadius=parseInt(e.target.value,10); // sync tabs
    Array.from(radiusTabs.querySelectorAll('button')).forEach(b=>b.classList.toggle('active',parseInt(b.dataset.radius,10)===currentRadius)); radiusValue.textContent = displayRadius(currentRadius); renderList(); });

  function displayRadius(r){ if(r<1000) return r+' метров'; if(r%1000===0) return (r/1000)+' км'; return (r/1000)+' км'; }
  radiusValue.textContent = displayRadius(currentRadius);

  // Geolocation
  function tryGeolocate(){ if(navigator.geolocation){ navigator.geolocation.getCurrentPosition(pos=>{ userPos=pos.coords; renderList(); }, err=>{ console.warn('no geo', err); renderList(); }, {timeout:5000}); } else { renderList(); } }

  // View switching
  writeBtn.addEventListener('click', ()=>{ showView('write'); });
  backBtn.addEventListener('click', ()=>{ showView('list'); });
  cancelBtn.addEventListener('click', ()=>{ thoughtInput.value=''; updateChar(); showView('list'); });

  function showView(name){ if(name==='write'){ listView.classList.remove('active'); writeView.classList.add('active'); } else { writeView.classList.remove('active'); listView.classList.add('active'); } }

  // Character counter
  thoughtInput.addEventListener('input', updateChar);
  function updateChar(){ const len = thoughtInput.value.length; charCounter.textContent = `${len} / ${CHAR_LIMIT} знаков`; }

  // Publish
  publishBtn.addEventListener('click', async ()=>{
    const text = thoughtInput.value.trim(); if(!text){ alert('Введите мысль'); return; }
    if(text.length>CHAR_LIMIT){ alert('Слишком длинная мысль'); return; }
    if(!canPost()){ alert('Можно публиковать не более '+DAILY_LIMIT+' мысли(ей) в 24 часа.'); return; }
    // get current pos for post
    let lat=null,lng=null;
    try{ const pos = await getCurrentPosition({timeout:5000}); lat=pos.coords.latitude; lng=pos.coords.longitude; }catch(e){ console.warn('no pos for post',e); }

    const item = { id: 'id_'+Date.now(), text, lat, lng, createdAt: Date.now() };

    // If firebase configured, try to push remote (firestore) — optional
    if(remoteEnabled && window.firebaseConfig){
      try{
        if(!firebase.apps.length){ firebase.initializeApp(window.firebaseConfig); }
        const db = firebase.firestore();
        await db.collection('thoughts').add(item);
      }catch(e){ console.warn('remote push failed', e); }
    }

    // Always save locally for demo
    const items = loadLocal(); items.push(item); saveLocal(items); markPosted(); thoughtInput.value=''; updateChar(); renderList(); showView('list');
  });

  function getCurrentPosition(opts){ return new Promise((res,rej)=>{ navigator.geolocation.getCurrentPosition(res,rej,opts); }); }

  // initialization
  seedIfEmpty(); tryGeolocate(); renderList(); updateChar(); remainingPerDay.textContent = DAILY_LIMIT;

  // Optional: sync remote firestore to local (if configured)
  if(remoteEnabled && window.firebaseConfig){
    try{ if(!firebase.apps.length){ firebase.initializeApp(window.firebaseConfig); }
      const db = firebase.firestore();
      db.collection('thoughts').orderBy('createdAt','desc').limit(200).onSnapshot(snapshot=>{
        const items = snapshot.docs.map(d=>d.data()); saveLocal(items); renderList(); });
    }catch(e){ console.warn('firebase sync failed', e); }
  }
})();
