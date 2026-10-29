/* Role-based workspaces: distinct farmer and buyer journeys. */
(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const state = { role: 'farmer', mode: 'login', name: '', location: '' };
  const roleNames = { farmer: 'Farmer', buyer: 'Buyer' };
  const roleCopy = {
    farmer: {
      greeting:'Your harvest. Your decisions.',
      intro:'Manage your produce, compare market prices and choose the right buyers for your harvest.', emoji:'🌾',
      actions:[['📦','Track orders','Review accepted orders, dispatch progress and delivery confirmation.','orders'],['＋','List your produce','Add crop, quantity, quality, asking price and pickup location.','my-produce'],['⌕','Find buyers','Review buyer requirements that may fit your produce.','find-buyers'],['↗','Market prices','Compare sourced prices before setting your asking price.','market-prices'],['⤢','Order aggregation','Explore compatible demand and delivery options.','aggregation'],['✦','Agri assistant','Get help comparing selling options and costs.','insights']]
    },
    buyer: {
      greeting:'Source produce with confidence.',
      intro:'Find available crops across regions, publish bulk requirements and organize your purchase orders.', emoji:'🛒',
      actions:[['🌱','Browse produce','Search available farmer listings by crop, region, quantity and price.','browse-produce'],['＋','Post buying requirement','Tell farmers what crop, quantity and delivery date you need.','buyer-demand'],['📦','Manage orders','Review enquiries, confirmed orders and fulfilment status.','orders'],['↗','Market prices','Review sourced market information to support purchasing decisions.','market-prices'],['✦','Agri assistant','Get help comparing supply options and requirements.','insights']]
    }
  };
  const authScreen = $('#authScreen');
  const appShell = $('#appShell');

  function selectRole(role) {
    state.role = role;
    $$('.role-option').forEach(b => b.classList.toggle('selected', b.dataset.role === role));
    $('#authFeedback').textContent = `${roleNames[role]} selected. Log in or create an account to continue.`;
    $('#authName').placeholder = role === 'buyer' ? 'Your name or business name' : 'Your full name';
    $('#authLocation').placeholder = role === 'buyer' ? 'Business location / delivery region' : 'Village / town, district';
  }
  function selectMode(mode) {
    state.mode = mode;
    $$('.auth-tab').forEach(b => b.classList.toggle('active', b.dataset.authMode === mode));
    $('#nameField').hidden = mode !== 'register';
    $('#locationField').hidden = mode !== 'register';
    $('#authName').required = mode === 'register';
    $('#authLocation').required = mode === 'register';
    $('#authHeading').textContent = mode === 'login' ? 'Welcome back' : 'Create your account';
    $('#authIntro').textContent = mode === 'login' ? `Log in to continue to your ${roleNames[state.role].toLowerCase()} workspace.` : `Create a ${roleNames[state.role].toLowerCase()} account to get a workspace designed for your needs.`;
    $('#authSubmit').innerHTML = mode === 'login' ? 'Continue to workspace <span>→</span>' : 'Create account <span>→</span>';
    $('#authPassword').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  }
  $$('.role-option').forEach(b => b.addEventListener('click', () => { selectRole(b.dataset.role); selectMode(state.mode); }));
  $$('.auth-tab').forEach(b => b.addEventListener('click', () => selectMode(b.dataset.authMode)));

  function addPage(id, title, description, body) {
    let el = $(`#page-${id}`);
    if (!el) {
      el = document.createElement('section'); el.className = 'page'; el.id = `page-${id}`;
      $('#appShell .main-content').insertBefore(el, $('.app-footer'));
    }
    el.innerHTML = `<div class="page-intro"><div><div class="eyebrow">${roleNames[state.role].toUpperCase()} WORKSPACE</div><h1>${title}</h1><p class="subheading">${description}</p></div><span class="page-icon">${state.role === 'buyer' ? '🛒' : '🌾'}</span></div>${body}`;
  }
  function buildBuyerPages() {
    addPage('buyer-demand','Buying requirements','Publish bulk purchasing needs and manage the details farmers need to respond.', `<div class="content-grid form-layout"><article class="panel"><div class="panel-heading"><div><h3>New buying requirement</h3><p>Specify what your business needs and when it is required.</p></div></div><form id="buyerDemandForm" class="form-grid"><label>Crop / produce *<select id="demandCrop" required><option value="">Choose produce</option><option>Tomato</option><option>Onion</option><option>Potato</option><option>Rice</option><option>Wheat</option><option>Other</option></select></label><label>Quantity required (kg) *<input id="demandQty" type="number" min="1" required placeholder="e.g. 5000"></label><label>Required quality<select id="demandQuality"><option>Any suitable grade</option><option>Grade A</option><option>Grade B</option><option>Standard</option><option>Organic certified</option></select></label><label>Required delivery date *<input id="demandDate" type="date" required></label><label class="span-2">Delivery region / location *<input id="demandLocation" required placeholder="Town / district / region"></label><label class="span-2">Target price or other requirements<textarea id="demandNotes" rows="3" placeholder="Target price per kg, packaging, delivery schedule…"></textarea></label><div class="span-2 form-actions"><button class="button button-primary" type="submit">Publish requirement →</button></div></form></article><article class="panel"><div class="panel-heading"><div><h3>Your requirements</h3><p>Requirements you create in this session appear here.</p></div></div><div id="demandList" class="empty-state"><span>🛒</span><strong>No requirements yet</strong><p>Publish a buying requirement to help suitable farmers understand your bulk needs.</p></div></article></div>`);
    addPage('browse-produce','Browse available produce','Search farmer listings and review asking prices, quantities and pickup regions.', `<div class="panel"><div class="panel-heading"><div><h3>Marketplace listings</h3><p>Only listings returned by the connected marketplace service should appear here.</p></div><button class="button button-outline" id="refreshProduce">Refresh listings</button></div><div class="filter-bar browse-filter"><label>Crop<input id="browseCropFilter" placeholder="e.g. tomato"></label><label>Region<input id="browseRegionFilter" placeholder="District / state"></label><label>Minimum quantity (kg)<input id="browseQtyFilter" type="number" min="0" placeholder="Any quantity"></label></div><div id="browseProduceList" class="empty-state"><span>🌱</span><strong>Search farmer listings</strong><p>Connect the marketplace API to retrieve current produce availability. No invented inventory is shown.</p></div></div>`);
    buildTrackingPage();
  }
  function buildTrackingPage() {
    const isBuyer = state.role === 'buyer';
    addPage('orders', isBuyer ? 'Order tracking' : 'Order fulfilment', isBuyer
      ? 'Follow each purchase from confirmation to delivery and confirm receipt when it arrives.'
      : 'Prepare accepted orders, record dispatch and follow delivery progress.',
      `<div class="tracking-summary-grid">
        <article class="tracking-summary"><span class="tracking-summary-icon">📦</span><div><small>Active orders</small><strong id="trackingActiveCount">—</strong></div></article>
        <article class="tracking-summary"><span class="tracking-summary-icon">🚚</span><div><small>In transit</small><strong id="trackingTransitCount">—</strong></div></article>
        <article class="tracking-summary"><span class="tracking-summary-icon">✓</span><div><small>Delivered / received</small><strong id="trackingDeliveredCount">—</strong></div></article>
      </div>
      <div class="tracking-toolbar"><div><h2>${isBuyer ? 'Your incoming deliveries' : 'Orders to fulfil'}</h2><p>Order status and timestamps are supplied by the marketplace service.</p></div><button class="button button-outline" id="refreshOrders">↻ Refresh orders</button></div>
      <div id="trackingOrdersList" class="tracking-orders-list"><div class="panel empty-state"><span>🚚</span><strong>Loading your orders</strong><p>Retrieving orders associated with your account.</p></div></div>
      <div class="tracking-footnote"><span>ⓘ</span><p><strong>Location accuracy:</strong> The timeline shows recorded order events. A live map and estimated arrival require GPS or a logistics-provider integration; the interface will not invent a truck location.</p></div>`);
  }
  const trackingStages = [
    ['placed','Order placed'],['confirmed','Order confirmed'],['preparing','Preparing produce'],['dispatched','Dispatched'],['in_transit','In transit'],['out_for_delivery','Out for delivery'],['delivered','Delivered'],['received','Receipt confirmed']
  ];
  const trackingStatusLabel = status => ({placed:'Order placed',pending:'Awaiting confirmation',confirmed:'Order confirmed',preparing:'Preparing produce',dispatched:'Dispatched',in_transit:'In transit',out_for_delivery:'Out for delivery',delivered:'Delivered',received:'Receipt confirmed',cancelled:'Cancelled'})[String(status||'').toLowerCase()] || String(status||'Status unavailable').replaceAll('_',' ');
  function trackingDate(value) {
    if (!value) return 'Not recorded';
    const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString([], {dateStyle:'medium',timeStyle:'short'});
  }
  function renderTrackingOrders(raw) {
    const box = $('#trackingOrdersList'); if (!box) return;
    const orders = Array.isArray(raw) ? raw : Array.isArray(raw?.orders) ? raw.orders : Array.isArray(raw?.data?.orders) ? raw.data.orders : Array.isArray(raw?.data) ? raw.data : [];
    $('#trackingActiveCount').textContent = orders.filter(o=>!['received','cancelled'].includes(String(o.status||'').toLowerCase())).length;
    $('#trackingTransitCount').textContent = orders.filter(o=>['dispatched','in_transit','out_for_delivery'].includes(String(o.status||'').toLowerCase())).length;
    $('#trackingDeliveredCount').textContent = orders.filter(o=>['delivered','received'].includes(String(o.status||'').toLowerCase())).length;
    if (!orders.length) {
      box.innerHTML = `<div class="panel empty-state"><span>📦</span><strong>No orders to track yet</strong><p>${state.role==='buyer'?'When a farmer accepts one of your purchase orders, its status and delivery events will appear here.':'When a buyer places an order and you confirm it, you can prepare it, record dispatch and follow its delivery status here.'}</p><p class="tracking-empty-note">Connect the order APIs to load live account records. No sample shipments or fake locations are displayed.</p></div>`;
      return;
    }
    box.innerHTML = orders.map(order => {
      const id = order.id || order._id || order.orderId || '';
      const status = String(order.status || 'placed').toLowerCase();
      const idx = trackingStages.findIndex(s=>s[0]===status);
      const stageIndex = idx < 0 ? 0 : idx;
      const events = Array.isArray(order.events) ? order.events : Array.isArray(order.trackingEvents) ? order.trackingEvents : [];
      const eventMap = new Map(events.map(e=>[String(e.status||e.stage||'').toLowerCase(),e]));
      const timeline = trackingStages.map((stage,i)=>{
        const event = eventMap.get(stage[0]);
        const done = i <= stageIndex || Boolean(event);
        return `<div class="tracking-step ${done?'is-complete':''} ${i===stageIndex?'is-current':''}"><span class="tracking-step-dot">${done?'✓':i+1}</span><div><strong>${stage[1]}</strong><small>${event ? trackingDate(event.timestamp||event.createdAt||event.at) : (i===stageIndex ? trackingDate(order.updatedAt||order.statusUpdatedAt||order.createdAt) : 'Awaiting update')}</small></div></div>`;
      }).join('');
      const location = order.latestLocation || order.currentLocation || order.lastKnownLocation;
      let actions = '';
      if (state.role==='farmer' && status==='confirmed') actions = `<button class="button button-outline" data-order-action="preparing" data-order-id="${escapeAttr(id)}">Start preparing</button>`;
      if (state.role==='farmer' && status==='preparing') actions = `<button class="button button-primary" data-order-action="dispatched" data-order-id="${escapeAttr(id)}">Mark as dispatched</button>`;
      if (state.role==='farmer' && ['dispatched','in_transit'].includes(status)) actions = `<button class="button button-outline" data-order-action="in_transit" data-order-id="${escapeAttr(id)}">Update to in transit</button>`;
      if (state.role==='buyer' && status==='delivered') actions = `<button class="button button-primary" data-order-action="received" data-order-id="${escapeAttr(id)}">Confirm receipt</button>`;
      return `<article class="panel tracking-order-card"><div class="tracking-order-head"><div><span class="eyebrow">ORDER ${escapeHtml(id || 'ID pending')}</span><h3>${escapeHtml(order.crop || order.produceName || order.title || 'Produce order')}</h3><p>${escapeHtml(order.quantity != null ? Number(order.quantity).toLocaleString()+' kg' : 'Quantity not supplied')} · ${escapeHtml(order.region||order.location||order.deliveryLocation||'Delivery location not supplied')}</p></div><span class="tracking-status status-${escapeAttr(status)}">${escapeHtml(trackingStatusLabel(status))}</span></div>
      <div class="tracking-order-meta"><div><small>${state.role==='buyer'?'Farmer':'Buyer'}</small><strong>${escapeHtml((state.role==='buyer' ? order.farmerName||order.sellerName : order.buyerName||order.businessName)||'Participant details unavailable')}</strong></div><div><small>Expected delivery</small><strong>${escapeHtml(trackingDate(order.expectedDelivery||order.deliveryDate))}</strong></div><div><small>Order value</small><strong>${order.totalPrice!=null?'₹'+Number(order.totalPrice).toLocaleString():order.price!=null?'₹'+Number(order.price).toLocaleString()+'/kg':'Not confirmed'}</strong></div></div>
      <div class="tracking-progress-head"><strong>Delivery progress</strong><span>${escapeHtml(trackingStatusLabel(status))}</span></div><div class="tracking-timeline">${timeline}</div>
      <div class="tracking-shipment"><div class="tracking-shipment-icon">${location?'📍':'🚛'}</div><div><strong>${location?'Latest reported location':'Shipment location'}</strong><p>${location ? escapeHtml(typeof location==='string'?location:(location.address||location.name||`${location.latitude??location.lat??''}, ${location.longitude??location.lng??''}`)) : 'Live location is not available for this order.'}</p><small>${location ? `Last updated ${escapeHtml(trackingDate(order.locationUpdatedAt||order.updatedAt))}` : 'GPS or logistics provider integration required for map tracking.'}</small></div></div>
      <div class="tracking-card-actions">${actions || `<span class="muted tracking-action-hint">${status==='received'?'Delivery completed and receipt recorded.':status==='cancelled'?'This order has been cancelled.':'Waiting for the next authorized status update.'}</span>`}<button class="button button-ghost" data-order-refresh="${escapeAttr(id)}">Refresh tracking</button></div></article>`;
    }).join('');
  }
  function escapeHtml(v) { return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(v) { return escapeHtml(v).replace(/`/g,'&#96;'); }
  async function loadTrackingOrders() {
    const box=$('#trackingOrdersList'); if(!box) return;
    if (!window.AgriAPI?.enabled()) { renderTrackingOrders([]); return; }
    box.innerHTML='<div class="panel empty-state"><span>↻</span><strong>Refreshing order records</strong><p>Loading current status from the marketplace service.</p></div>';
    try { const result=await window.AgriAPI.get('/api/orders'); renderTrackingOrders(result?.orders||result?.data?.orders||result?.data||result); }
    catch(err) { box.innerHTML=`<div class="panel empty-state"><span>ⓘ</span><strong>Order tracking unavailable</strong><p>${escapeHtml(err.message)}. Check the order API and try again.</p><button class="button button-outline" id="refreshOrders">Try again</button></div>`; }
  }
  document.addEventListener('click', async e=>{
    const refresh=e.target.closest('#refreshOrders,[data-order-refresh]');
    if(refresh){e.preventDefault(); if(refresh.dataset.orderRefresh && window.AgriAPI?.enabled()){try{const r=await window.AgriAPI.get(`/api/orders/${encodeURIComponent(refresh.dataset.orderRefresh)}/tracking`);const o=r?.order||r?.data?.order||r?.data||r;renderTrackingOrders([o]);showToast('Tracking details refreshed.');}catch(err){showToast(`Could not refresh tracking: ${err.message}`);}}else loadTrackingOrders();return;}
    const action=e.target.closest('[data-order-action]'); if(!action)return;
    const id=action.dataset.orderId, next=action.dataset.orderAction;
    if(!id){showToast('This order does not have an ID from the backend.');return;}
    if(!window.AgriAPI?.enabled()){showToast('Connect the backend to save order status changes.');return;}
    action.disabled=true;
    try {
      let result;
      if(next==='dispatched') result=await window.AgriAPI.post(`/api/orders/${encodeURIComponent(id)}/dispatch`,{});
      else if(next==='received') result=await window.AgriAPI.post(`/api/orders/${encodeURIComponent(id)}/confirm-receipt`,{});
      else result=await window.AgriAPI.patch(`/api/orders/${encodeURIComponent(id)}/status`,{status:next});
      showToast(result?.message||'Order status updated.'); await loadTrackingOrders();
    } catch(err){showToast(`Could not update order: ${err.message}`);}
    finally{action.disabled=false;}
  });
  function buildOverview() {
    const cfg = roleCopy[state.role];
    const ov = $('#page-overview');
    ov.className = 'page active-page workspace-page';
    const subtitle = state.role === 'buyer' ? 'Your sourcing at a glance' : 'Your farm at a glance';
    ov.innerHTML = `<div class="workspace-hero ${state.role === 'buyer' ? 'buyer-hero' : 'farmer-hero'}"><div><div class="eyebrow">${roleNames[state.role].toUpperCase()} WORKSPACE</div><h1>${cfg.greeting}</h1><p>${cfg.intro}</p><div class="workspace-hero-actions"><button class="button button-primary" data-page="${state.role === 'buyer' ? 'browse-produce' : 'my-produce'}">${state.role === 'buyer' ? 'Browse produce' : '＋ Add produce'} <span>→</span></button><button class="button button-outline" data-page="${state.role === 'buyer' ? 'buyer-demand' : 'market-prices'}">${state.role === 'buyer' ? 'Post buying requirement' : 'Check market prices'}</button></div></div><span class="workspace-emoji">${cfg.emoji}</span></div><div class="section-heading"><div><h2>${subtitle}</h2><p>Choose an action to continue.</p></div></div><div class="workspace-grid">${cfg.actions.map(a=>`<button class="workspace-action" data-page="${a[3]}"><span class="action-icon">${a[0]}</span><strong>${a[1]}</strong><small>${a[2]}</small></button>`).join('')}</div><div class="workspace-note"><strong>${state.role === 'buyer' ? 'Buy with clear information.' : 'Make decisions with clear information.'}</strong> Prices, available inventory, buyer requirements and order status should come from configured sources or saved records. Estimates are not guarantees.</div>`;
  }
  function configureWorkspace() {
    authScreen.hidden = true; appShell.hidden = false;
    const name = state.name || (state.role === 'buyer' ? 'Buyer account' : 'Farmer account');
    $('#profileName').textContent = name;
    $('#profileRole').textContent = roleNames[state.role];
    $('#roleContext').textContent = `${roleNames[state.role]} workspace`;
    $('#welcomeTitle').textContent = `Welcome, ${name}`;
    buildOverview();
    buildBuyerPages();
    const allowed = state.role === 'farmer'
      ? ['overview','my-produce','find-buyers','market-prices','aggregation','orders','insights']
      : ['overview','browse-produce','buyer-demand','orders','market-prices','insights'];
    const titles = {overview:['◫','Overview'],'my-produce':['🌾','My produce'],'find-buyers':['⌕','Find buyers'],'market-prices':['↗','Market prices'],aggregation:['⤢','Order aggregation'],insights:['✦','Agri assistant'],'buyer-demand':['＋','Buying requirements'],'browse-produce':['🌱','Browse produce'],orders:['🚚',state.role==='buyer'?'Order tracking':'Order fulfilment']};
    $('.nav-list').innerHTML = allowed.map(id=>`<button class="nav-item ${id==='overview'?'active':''}" data-page="${id}"><span>${titles[id][0]}</span> ${titles[id][1]}</button>`).join('');
    $$('.page').forEach(page => { const id = page.id.replace('page-',''); page.style.display = allowed.includes(id) ? '' : 'none'; });
    $('.sidebar-bottom .help-card p').textContent = state.role === 'buyer' ? 'Find suitable supply and manage bulk purchasing.' : 'Compare market information and find suitable buyers.';
    $('.sidebar-bottom .help-card strong').textContent = state.role === 'buyer' ? 'Source smarter' : 'Plan your sale';
    $('.sidebar-bottom .help-card .text-button').textContent = state.role === 'buyer' ? 'Browse produce →' : 'Explore market prices →';
    $('.sidebar-bottom .help-card .text-button').dataset.page = state.role === 'buyer' ? 'browse-produce' : 'market-prices';
    $('#breadcrumbCurrent').textContent = 'Overview';
    document.body.classList.toggle('buyer-workspace',state.role==='buyer');
    document.body.classList.remove('organization-workspace');
    const listingList = $('#listingList');
    if (listingList) { listingList.dataset.keepExamples='false'; listingList.innerHTML='<div class="empty-state"><span>🌾</span><strong>No saved produce listings yet</strong><p>Add your first listing. Saved listings will appear here when the backend is connected.</p></div>'; $('#listingCount').textContent='Your saved listings'; }
    showWorkspacePage('overview');
    if (!window.AgriAPI?.enabled()) showToast('Workspace preview opened. Connect the backend to verify accounts and save data permanently.');
  }
  function showWorkspacePage(id) {
    const page = $(`#page-${id}`); if (!page || page.style.display === 'none') return;
    $$('.page').forEach(p=>p.classList.remove('active-page')); page.classList.add('active-page');
    $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
    const names = {overview:'Overview','my-produce':'My produce','find-buyers':'Find buyers','market-prices':'Market prices',aggregation:'Order aggregation',insights:'Agri assistant','buyer-demand':'Buying requirements','browse-produce':'Browse produce',orders:'Order tracking'};
    $('#breadcrumbCurrent').textContent = names[id] || 'Workspace';
    $('#sidebar').classList.remove('open'); if(id==='orders') loadTrackingOrders(); window.scrollTo({top:0,behavior:'smooth'});
  }
  document.addEventListener('click', e => { const btn=e.target.closest('[data-page]'); if(btn && appShell && !appShell.hidden){e.preventDefault();showWorkspacePage(btn.dataset.page);} });
  $('#authForm').addEventListener('submit', async e => {
    e.preventDefault();
    state.name = $('#authName').value.trim(); state.location = $('#authLocation').value.trim();
    const email=$('#authEmail').value.trim(), password=$('#authPassword').value;
    if(state.mode==='register' && (!state.name || !state.location)){ $('#authFeedback').textContent='Enter your name and location to create an account.'; return; }
    if(window.AgriAPI?.enabled()) {
      const endpoint=state.mode==='login'?'/api/login':'/api/register';
      const payload=state.mode==='login'?{email,password,role:state.role}:{name:state.name,email,password,role:state.role,location:state.location};
      const button=$('#authSubmit'); button.disabled=true; button.textContent='Please wait…';
      try {
  const result = await window.AgriAPI.post(endpoint, payload);

  const token = result?.access_token || result?.data?.access_token;

  if (!token) {
    throw new Error("Login succeeded without an access token.");
  }

  localStorage.setItem("access_token", token);

  state.name =
    result?.user?.name ||
    result?.data?.user?.name ||
    state.name;

  configureWorkspace();
}
      catch(err){$('#authFeedback').textContent=`Could not ${state.mode==='login'?'log in':'create account'}: ${err.message}. Confirm the backend endpoint and request format.`;}
      finally {button.disabled=false;button.innerHTML=state.mode==='login'?'Continue to workspace <span>→</span>':'Create account <span>→</span>';}
    } else {
      if(!email || password.length<8){ $('#authFeedback').textContent='Enter a valid email and a password with at least 8 characters.'; return; }
      configureWorkspace();
    }
  });
  document.addEventListener('submit', async e => {
    if(e.target.id==='buyerDemandForm'){
      e.preventDefault(); const data={crop:$('#demandCrop').value,quantity:Number($('#demandQty').value),quality:$('#demandQuality').value,deliveryDate:$('#demandDate').value,location:$('#demandLocation').value.trim(),notes:$('#demandNotes').value.trim()};
      const list=$('#demandList');
      try { let saved=data; if(window.AgriAPI?.enabled()){const result=await window.AgriAPI.post('/api/buyer-demands',data);saved=result?.data||result?.demand||result;}
        list.className='listing-list';list.innerHTML=`<div class="listing-row"><span class="produce-emoji">🛒</span><div><strong>${safe(saved.crop||data.crop)} · ${Number(saved.quantity||data.quantity).toLocaleString()} kg</strong><small>${safe(saved.quality||data.quality)} · ${safe(saved.deliveryDate||data.deliveryDate)}</small><small>${safe(saved.location||data.location)}</small></div><span class="status-pill">${window.AgriAPI?.enabled()?'Published':'Session only'}</span></div>`;
        $('#toast').textContent=window.AgriAPI?.enabled()?'Buying requirement saved by the backend.':'Requirement prepared in this session; connect the backend to publish it to farmers.';$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),2800);e.target.reset();
      } catch(err){$('#toast').textContent=`Could not save requirement: ${err.message}`;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),3000);}
    }
  });
  function safe(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  document.addEventListener('click', async e=>{if(e.target.closest('#refreshProduce')){const box=$('#browseProduceList');try{if(!window.AgriAPI?.enabled())throw new Error('API connection is not enabled in config.js');const result=await window.AgriAPI.get('/api/produce');const raw=result?.data||result?.produce||result?.listings||result;const crop=($('#browseCropFilter')?.value||'').trim().toLowerCase();const region=($('#browseRegionFilter')?.value||'').trim().toLowerCase();const minQty=Number($('#browseQtyFilter')?.value||0);const items = Array.isArray(raw)
  ? raw.filter(x =>
      (!crop || String(x.crop_name || x.crop || '').toLowerCase().includes(crop)) &&
      (!region || String(x.location || '').toLowerCase().includes(region)) &&
      Number(x.quantity_kg ?? x.quantity ?? 0) >= minQty
    ).map(x => ({
      ...x,
      crop: x.crop_name || x.crop || 'Unknown crop',
      quantity: x.quantity_kg ?? x.quantity ?? 0,
      askingPrice: x.price_per_kg ?? x.price_per_unit ?? x.askingPrice
    }))
   :[];if(!items.length){box.className='empty-state';box.innerHTML='<span>🌱</span><strong>No matching listings found</strong><p>Try changing your filters or check again when farmers publish produce.</p>';return;}box.className='listing-list';box.innerHTML=items.map(x=>`<div class="listing-row"><span class="produce-emoji">🌾</span><div><strong>${safe(x.crop)}</strong><small>${Number(x.quantity||0).toLocaleString()} kg · ${safe(x.quality||'Grade not specified')}</small><small>${safe(x.location||'Location not specified')} · Asking price: ${x.askingPrice!=null?'₹'+safe(x.askingPrice)+'/kg':'Not supplied'}</small></div><button class="button button-outline buyer-enquiry" data-listing-id="${safe(x.id||x._id||'')}" data-listing-crop="${safe(x.crop||'produce')}">Enquire</button></div>`).join('');}catch(err){box.className='empty-state';box.innerHTML=`<span>ⓘ</span><strong>Listings unavailable</strong><p>${safe(err.message)}</p>`;}}});
  document.addEventListener('click', async e => {
    const button=e.target.closest('.buyer-enquiry'); if(!button) return;
    const listingId=button.dataset.listingId;
    if(!listingId){showToast('This listing has no marketplace ID yet. Refresh listings after the backend returns listing IDs.');return;}
    if(!window.AgriAPI?.enabled()){showToast('Enquiry prepared. Connect the backend to send it to the farmer.');return;}
    button.disabled=true;
    try { await window.AgriAPI.post('/api/offers',{listingId, type:'enquiry', message:'I am interested in this produce listing. Please confirm availability, final price and delivery terms.'}); showToast('Enquiry sent to the farmer.'); }
    catch(err){showToast(`Could not send enquiry: ${err.message}`);}
    finally {button.disabled=false;}
  });
  selectRole('farmer'); selectMode('login');
})();
