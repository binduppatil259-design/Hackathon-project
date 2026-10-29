// AgriConnect 2.0 frontend interactions and API integration.
// Live listings, prices, buyer matches and AI answers require the configured backend.
const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const toast = $('#toast');
let toastTimer;
function showToast(message){ toast.textContent=message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove('show'),2800); }

function showPage(name){
  const page = $(`#page-${name}`);
  if(!page) return;
  $$('.page').forEach(p=>p.classList.remove('active-page'));
  page.classList.add('active-page');
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===name));
  $('#breadcrumbCurrent').textContent = ({overview:'Overview','my-produce':'My produce','find-buyers':'Find buyers','market-prices':'Market prices',aggregation:'Order aggregation',insights:'AI insights'})[name] || 'Overview';
  $('#sidebar').classList.remove('open');
  window.scrollTo({top:0,behavior:'smooth'});
}
$$('[data-page]').forEach(btn=>btn.addEventListener('click',()=>showPage(btn.dataset.page)));
$('#mobileMenu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));

const cropEmoji = {Tomato:'🍅',Onion:'🧅',Potato:'🥔',Rice:'🌾',Wheat:'🌾',Other:'🌱'};
let userListings = [];
function renderListings(){
  const container=$('#listingList');
  const examples=container.dataset.keepExamples!=='false';
  const sampleCount=examples?4:0;
  container.innerHTML = userListings.map(item=>`<div class="listing-row"><span class="produce-emoji">${cropEmoji[item.crop]||'🌱'}</span><div><strong>${escapeHtml(item.crop)}</strong><small>${Number(item.quantity).toLocaleString()} kg · ${escapeHtml(item.quality)}</small><small>Asking price: ₹${Number(item.askingPrice||0).toLocaleString()}/kg</small><small>${escapeHtml(item.location)}</small></div><span class="status-pill status-ready">New listing</span></div>`).join('') + (examples ? `
    <div class="listing-row"><span class="produce-emoji">🍅</span><div><strong>Tomato</strong><small>2,000 kg · Grade A</small><small>Ramanagara</small></div><span class="status-pill status-ready">Matching</span></div>
    <div class="listing-row"><span class="produce-emoji">🧅</span><div><strong>Onion</strong><small>800 kg · Grade A</small><small>Ramanagara</small></div><span class="status-pill">Available</span></div>
    <div class="listing-row"><span class="produce-emoji">🥔</span><div><strong>Potato</strong><small>500 kg · Standard</small><small>Kanakapura</small></div><span class="status-pill">Available</span></div>
    <div class="listing-row"><span class="produce-emoji">🌾</span><div><strong>Rice</strong><small>350 kg · Grade A</small><small>Ramanagara</small></div><span class="status-pill">Available</span></div>`:'');
  $('#listingCount').textContent=`${userListings.length} saved listing${userListings.length===1?'':'s'}`;
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
$('#produceForm').addEventListener('submit', async e=>{
  e.preventDefault();
    
const listing = {
  farmer_id: 1, // Temporary test ID
  crop_name: $('#crop').value,
  quantity_kg: Number($('#quantity').value),
  price_per_kg: Number($('#askingPrice').value),
  quality: $('#quality').value,
  availableDate: $('#availableDate').value,
  location: $('#location').value.trim(),
  notes: $('#produceNotes').value.trim()
};

  console.log('Listing values:', listing);

if (
  !listing.crop_name ||
  !Number.isFinite(listing.quantity_kg) ||
  listing.quantity_kg <= 0 ||
  !Number.isFinite(listing.price_per_kg) ||
  listing.price_per_kg <= 0 ||
  !listing.availableDate ||
  !listing.location
) {
  console.log('Validation failed:', {
    crop_name: listing.crop_name,
    quantity_kg: listing.quantity_kg,
    price_per_kg: listing.price_per_kg,
    availableDate: listing.availableDate,
    location: listing.location
  });

  showToast('Check the required fields in the browser console.');
  return;
}
  const submit=e.target.querySelector('button[type="submit"]');
  submit.disabled=true; submit.textContent='Saving…';
  try {
    if (window.AgriAPI?.enabled()) {
      const result=await window.AgriAPI.post('/api/produce',listing);
      userListings.unshift(result?.data || result?.produce || result?.listing || listing);
      $('#listingList').dataset.keepExamples='false';
      renderListings(); showToast('Produce listing saved by the backend.');
    } else {
      userListings.unshift(listing); $('#listingList').dataset.keepExamples='false'; renderListings();
      showToast('Listing prepared in this session. Connect the backend to save it permanently.');
    }
    e.target.reset();
  } catch(error) { showToast(`Could not save listing: ${error.message}`); }
  finally { submit.disabled=false; submit.innerHTML='Save listing <span>→</span>'; }
});

const modalBackdrop=$('#modalBackdrop');
function openModal(title,body,buyer=''){
  $('#modalTitle').textContent=title; $('#modalText').textContent=body;
  $('#modalConfirm').dataset.buyer=buyer; modalBackdrop.hidden=false;
}
function closeModal(){modalBackdrop.hidden=true;}
$('#modalClose').addEventListener('click',closeModal); $('#modalCancel').addEventListener('click',closeModal);
modalBackdrop.addEventListener('click',e=>{if(e.target===modalBackdrop)closeModal();});
$('#modalConfirm').addEventListener('click',()=>{const buyer=$('#modalConfirm').dataset.buyer;closeModal();showToast(`${buyer||'Opportunity'} marked for follow-up in this workspace.`);});
$$('.contact-buyer').forEach(btn=>btn.addEventListener('click',()=>openModal(btn.dataset.buyer,"Review the buyer's verified requirements, contact permissions, data source, estimated costs and matching explanation before proceeding.",btn.dataset.buyer)));


$('#runMatching').addEventListener('click', async () => {
  const crop = $('#matchCrop').value.trim();
  const qty = Number($('#matchQty').value);
  const scale = $('#marketScale').value;
  const button = $('#runMatching');
  const results = $('#buyerResults');

  if (!crop || !Number.isFinite(qty) || qty <= 0) {
    showToast('Enter a crop and a quantity greater than zero.');
    return;
  }

  $('#matchResultTitle').textContent =
    `Farmer listings matching ${crop}`;

  if (!window.AgriAPI?.enabled()) {
    results.innerHTML = `
      <div class="panel empty-state">
        <strong>Backend unavailable</strong>
        <p>Connect the backend to retrieve real farmer listings.</p>
      </div>`;
    showToast('Connect the backend before matching.');
    return;
  }

  button.disabled = true;
  button.textContent = 'Matching…';

  try {
    const result = await window.AgriAPI.post('/api/matches', {
      crop,
      quantity: qty,
      marketScale: scale
    });

    const matches = result?.matches ?? result?.data?.matches;

    if (!Array.isArray(matches)) {
      throw new Error('Unexpected matching response from backend.');
    }

    if (matches.length === 0) {
      results.innerHTML = `
        <div class="panel empty-state">
          <strong>No matching farmer listings found</strong>
          <p>Try another crop or a smaller quantity.</p>
        </div>`;
      showToast('No matching listings found.');
      return;
    }

    results.replaceChildren();

    matches.forEach(match => {
      const card = document.createElement('article');
      card.className = 'panel buyer-card';

      const title = document.createElement('h3');
      title.textContent = match.name || `Farmer listing #${match.id}`;

      const cropInfo = document.createElement('p');
      cropInfo.textContent = `Crop: ${match.crop || crop}`;

      const quantityInfo = document.createElement('p');
      quantityInfo.textContent =
        `Available: ${match.demandQuantity} kg`;

      const priceInfo = document.createElement('p');
      priceInfo.textContent =
        `Listed price: ₹${match.price}/kg`;

      const locationInfo = document.createElement('p');
      locationInfo.textContent =
        `Location: ${match.location || 'Not provided'}`;

      const qualityInfo = document.createElement('p');
      qualityInfo.textContent =
        `Quality: ${match.quality || 'Not specified'}`;

      const reason = document.createElement('p');
      reason.textContent = match.reason || 'Review listing details before deciding.';

      card.append(
        title,
        cropInfo,
        quantityInfo,
        priceInfo,
        locationInfo,
        qualityInfo,
        reason
      );

      results.appendChild(card);
    });

    showToast(`Found ${matches.length} matching farmer listings.`);
  } catch (error) {
    results.innerHTML = `
      <div class="panel empty-state">
        <strong>Matching failed</strong>
        <p></p>
      </div>`;
    results.querySelector('p').textContent = error.message;
    showToast(`Matching failed: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = 'Find matches';
  }
});

  
// No fallback market prices are fabricated when the market-data API is unavailable.
async function updatePrices(){
  
async function updatePrices() {
  const crop = document.querySelector('#priceCrop').value;
  const area = document.querySelector('#priceArea').value;

  const lowEl = document.querySelector('#priceLow');
  const avgEl = document.querySelector('#priceAvg');
  const highEl = document.querySelector('#priceHigh');

  const showEmpty = () => {
    lowEl.textContent = '—';
    avgEl.textContent = '—';
    highEl.textContent = '—';
  };

  if (!window.AgriAPI?.enabled()) {
    showEmpty();
    showToast('Enable API mode in config.js first.');
    return;
  }

  try {
    const params = new URLSearchParams({
      commodity: crop,
      limit: '100'
    });

    if (area === 'Karnataka' ||
        area === 'Bengaluru region' ||
        area === 'Near Ramanagara') {
      params.set('state', 'Karnataka');
    }

    // Ramanagara APMC appeared under Bengaluru South
    // in the sample records returned by your API.
    if (area === 'Near Ramanagara') {
      params.set('district', 'Bengaluru South');
    }

    const result = await window.AgriAPI.get(
      `/api/market-prices?${params.toString()}`
    );

    const records = Array.isArray(result.prices)
      ? result.prices
      : [];

    if (records.length === 0) {
      showEmpty();
      showToast('No matching market records found. Try another area.');
      return;
    }

    const minimums = records
      .map(r => Number(r.min_price))
      .filter(Number.isFinite);

    const modals = records
      .map(r => Number(r.modal_price))
      .filter(Number.isFinite);

    const maximums = records
      .map(r => Number(r.max_price))
      .filter(Number.isFinite);

    const formatRupeesPerKg = value =>
      `₹${(value / 100).toFixed(2)}`;

    lowEl.textContent = minimums.length
      ? formatRupeesPerKg(Math.min(...minimums))
      : '—';

    avgEl.textContent = modals.length
      ? formatRupeesPerKg(
          modals.reduce((sum, price) => sum + price, 0)
          / modals.length
        )
      : '—';

    highEl.textContent = maximums.length
      ? formatRupeesPerKg(Math.max(...maximums))
      : '—';

    showToast(
      `Loaded ${records.length} live market records from data.gov.in.`
    );
  } catch (error) {
    showEmpty();
    showToast(`Could not load market prices: ${error.message}`);
  }
}
}

$('#priceCrop').addEventListener('change',updatePrices);
$('#priceArea').addEventListener('change',()=>window.AgriAPI?.enabled()?updatePrices():showToast('Market area changed. Connect the market-data service to retrieve prices.'));

const demandInputs=$$('.demand-quantity');
function recalcAggregation(){
  const total=demandInputs.reduce((sum,input)=>sum+Math.max(0,Number(input.value)||0),0);
  $('#aggTotal').innerHTML=`${total.toLocaleString()} <small>kg</small>`;
  $('#aggTotalBottom').textContent=`${total.toLocaleString()} kg`;
  const reference=2000;const percent=Math.min(100,Math.round(total/reference*100));
  $('#fitPercent').textContent=`${percent}%`;
  $('#fitRing').style.background=`conic-gradient(#83b174 0 ${percent}%, #edf2e9 ${percent}% 100%)`;
  $('#fitTitle').textContent=total===0?'No demand entered':total<=250?'Small demand cluster':total<=1000?'Moderate demand cluster':'Large demand cluster';
  $('#fitDescription').textContent=total===0?'Enter buyer quantities to explore a possible aggregation scenario.':`The example buyer requests total ${total.toLocaleString()} kg. Check crop and grade compatibility, pickup locations, deadlines and actual transport costs before coordinating.`;
}
demandInputs.forEach(input=>input.addEventListener('input',recalcAggregation));
$('#simulateAggregation').addEventListener('click',async()=>{
  recalcAggregation();
  if(window.AgriAPI?.enabled()) {
    const button=$('#simulateAggregation'); button.disabled=true;
    try {
      const result=await window.AgriAPI.post('/api/aggregation/simulate',{demands:demandInputs.map((input,i)=>({buyer:`Buyer ${i+1}`,quantity:Number(input.value)||0})),totalQuantity:demandInputs.reduce((sum,input)=>sum+(Number(input.value)||0),0)});
      const data=result?.data || result;
      if(data.totalQuantity!=null) $('#aggTotalBottom').textContent=`${Number(data.totalQuantity).toLocaleString()} kg`;
      if(data.fitPercent!=null){const pct=Math.max(0,Math.min(100,Number(data.fitPercent)));$('#fitPercent').textContent=`${pct}%`;$('#fitRing').style.background=`conic-gradient(#83b174 0 ${pct}%, #edf2e9 ${pct}% 100%)`;}
      if(data.explanation || data.message) $('#fitDescription').textContent=data.explanation || data.message;
      showToast('Aggregation response received from backend.');
    } catch(error) { showToast(`Aggregation failed: ${error.message}`); }
    finally { button.disabled=false; }
  } else showToast('Aggregation scenario recalculated using example quantities.');
});
$('#resetAggregation').addEventListener('click',()=>{[0,0,0,0].forEach((v,i)=>demandInputs[i].value=v);recalcAggregation();showToast('Demand quantities cleared.');});

const cannedReplies={
  'how should i compare buyers?':'Compare the likely price with quantity fit, distance, delivery timing, quality requirements and estimated transport or handling costs. Look at net proceeds, not only the headline price. Confirm each detail with the relevant buyer and verify the data source before deciding.',
  'explain order aggregation':'Order aggregation groups compatible buyer requirements into a possible coordinated supply or delivery route. Crop, grade, timing, pickup locations and logistics costs must all fit. Confirm the plan with all participants before treating it as an order.',
  'what costs should i check?':'Check transport, loading and unloading, packaging, sorting or grading, market fees, wastage, commissions and any payment or fulfilment charges. Compare estimated net proceeds across routes and verify actual costs with the buyer or service provider.'
};
function addChatMessage(text,role,caption=''){
  const body=$('#chatBody');const row=document.createElement('div');row.className=`chat-message ${role==='user'?'user-message':''}`;
  const avatar=document.createElement('span');avatar.className='chat-avatar';avatar.textContent=role==='user'?'RP':'✦';
  const bubble=document.createElement('div');const p=document.createElement('p');p.textContent=text;bubble.appendChild(p);
  if(caption){const small=document.createElement('small');small.textContent=caption;bubble.appendChild(small);}
  row.append(avatar,bubble);body.appendChild(row);body.scrollTop=body.scrollHeight;
}
async function replyToQuestion(question){
  if(window.AgriAPI?.enabled()) {
    try {
      addChatMessage('Checking your question…','assistant','Connecting to backend');
      const result=await window.AgriAPI.post('/api/assistant/chat',{message:question,question});
      const answer=result?.answer || result?.response || result?.message || result?.data?.answer;
      if(!answer) throw new Error('The API response did not include an answer field.');
      addChatMessage(String(answer),'assistant',result?.source || result?.model || 'Backend AI response');
    } catch(error) { addChatMessage(`I couldn't reach the AI service: ${error.message}`,'assistant','Connection error'); }
    return;
  }
  const key=question.toLowerCase().replace(/[?!.]/g,'').trim();
  const reply=cannedReplies[key]||'Compare crop, quantity, grade, location and availability date, then consider buyer demand, indicative price, distance and logistics costs. Connect the assistant service for responses grounded in current platform data.';
  setTimeout(()=>addChatMessage(reply,'assistant','General guidance · connect assistant service for account-specific answers'),300);
}
$('#chatForm').addEventListener('submit',e=>{
  e.preventDefault();const input=$('#chatInput');const q=input.value.trim();if(!q)return;
  addChatMessage(q,'user');input.value='';replyToQuestion(q);
});
$$('.prompt-chip').forEach(btn=>btn.addEventListener('click',()=>{const q=btn.textContent;addChatMessage(q,'user');replyToQuestion(q);}));

// Integration contract for the backend teammate:
// GET  /api/produce                 -> list current user's produce listings
// POST /api/produce                 -> create a produce listing
// GET  /api/market-prices?crop=...  -> verified prices with source, market, date and unit
// POST /api/matches                 -> matching results + explanation + confidence/limitations
// POST /api/aggregation/simulate    -> compatible buyer cluster and estimated logistics
// POST /api/assistant/chat          -> prompt/context; server calls Nebius Token Factory
// Backend should call an NVIDIA open-source model (e.g. Nemotron) via Nebius; never expose API keys in browser.
// Replace local guidance with service responses where account-specific data is required.
recalcAggregation();

// Show whether API requests are configured for the backend.
document.addEventListener('DOMContentLoaded',()=>{ const status=$('.service-status'); if(status && window.AgriAPI?.enabled()){ status.innerHTML='<i></i> Connected services'; status.title='Requests are sent to the configured backend.'; } });
