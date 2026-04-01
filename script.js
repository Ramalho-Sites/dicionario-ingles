// ════════════════════════════════════════════════
// 1. FIREBASE
// ════════════════════════════════════════════════
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut, sendEmailVerification, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, query, where, doc,
  updateDoc, deleteDoc, onSnapshot, serverTimestamp, getDocs
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ════════════════════════════════════════════════
// GEMINI CONFIG — 100% gratuito, 1500 req/dia
// ➤ Crie sua chave GRÁTIS em: https://aistudio.google.com/apikey
// ════════════════════════════════════════════════
const GEMINI_API_KEY = 'AIzaSyB7630IGfz2WarldnhhaIRmzf472B53TY0';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// ════════════════════════════════════════════════
// PEXELS CONFIG — 100% gratuito, sem limite diário
// ════════════════════════════════════════════════
const PEXELS_API_KEY = 'IHfe8yODYm4XCZwB9aQGWkvwLvVlnQ1hyFgPJinwBkQXx9Ok7ZftkqcA';

// ════════════════════════════════════════════════
// 2. ELEMENTS
// ════════════════════════════════════════════════
const $ = id => document.getElementById(id);

const appEl          = $('app');
const authEl         = $('auth-container');
const verifyEl       = $('verify-email-container');
const togglePwBtn    = $('toggle-password');
const pwInput        = $('password');
const registerBtn    = $('register-button');
const authFb         = $('auth-feedback');
const logoutBtn      = $('logout-button');
const userEmailEl    = $('user-email');
const profileToggle  = $('profile-toggle');
const profileMenu    = $('profile-menu');
const hamburgerBtn   = $('btn-hamburger');
const mobDrawer      = $('mob-drawer');
const mobLogout      = $('mob-logout');
const pageHome       = $('page-home');
const pageLearned    = $('page-learned');
const wordsContainer = $('learned-words-container');
const searchInput    = $('search-learned');
const clearSearchBtn = $('clear-search');
const sortSel        = $('sort-learned');
const modalDetails   = $('modal-word-details');
const modalTitle     = $('modal-word-title');
const modalContent   = $('modal-word-content');
const inputWord      = $('input-word');
const inputContext   = $('input-context');
const inputMeaning   = $('input-meaning');
const inputImage     = $('input-image');
const inputCatSearch = $('input-category-search');
const createCatBtn   = $('btn-create-category');
const catListbox     = $('category-listbox');
const discardBtn     = $('btn-discard');
const modalCat       = $('modal-category-created');
const closeCatModal  = $('btn-close-category-modal');
const catCreatedMsg  = $('category-created-message');
const confirmModal   = $('modal-delete-confirm');
const confirmDelBtn  = $('btn-confirm-delete');
const cancelDelBtn   = $('btn-cancel-delete');
const editCatModal   = $('modal-edit-category');
const cancelEditCat  = $('btn-cancel-edit-category');
const saveCatBtn     = $('btn-save-category');
const deleteCatBtn   = $('btn-delete-category');
const editCatInput   = $('input-edit-category-name');
const modalAlert     = $('modal-alert');
const alertTitleEl   = $('alert-title');
const alertMsgEl     = $('alert-message');
const closeAlertBtn  = $('btn-close-alert');
const dateContainer  = $('date-filter-container');
const dateInput      = $('date-filter-input');
const clearDateBtn   = $('clear-date-filter');
const generateAIBtn  = $('btn-generate-ai');
const aiStatus       = $('ai-status');
const aiBtnText      = $('ai-btn-text');
const chipsBar       = $('chips-bar');
const formAddWord    = $('form-add-word');
const btnShowForm    = $('btn-show-form');
const dictStats      = $('dict-stats');
const wordSuggestBox = $('word-suggestions');
const imagePreviewEl = $('image-preview');
const btnChangeImg   = $('btn-change-image');
const btnRefreshImg  = $('btn-refresh-image');
const imageLoadingEl = $('image-loading');
const manualImgWrap  = $('manual-image-wrap');

const allNavBtns = document.querySelectorAll('[data-page]');

// State
const PER_PAGE = 20;
let words           = [];
let categories      = [];
let currentUser     = null;
let unsubWords      = null;
let currentSort     = 'alphabetical';
let wordToDelete    = null;
let categoryToEdit  = null;
let dateFilter      = null;
let activeCatFilter = 'all';
let pagination      = {};
let suggestTimer    = null;
let pexelsResults   = [];
let pexelsIndex     = 0;
let currentImageUrl = '';

// ════════════════════════════════════════════════
// 3. WORD AUTOCOMPLETE — Datamuse (free, no key needed)
// ════════════════════════════════════════════════
inputWord?.addEventListener('input', () => {
  clearTimeout(suggestTimer);
  const val = inputWord.value.trim();
  if (val.length < 2) { hideSuggestions(); return; }
  suggestTimer = setTimeout(() => fetchSuggestions(val), 280);
});

inputWord?.addEventListener('keydown', e => {
  if (!wordSuggestBox) return;
  const items  = wordSuggestBox.querySelectorAll('.wsug-item');
  const active = wordSuggestBox.querySelector('.wsug-item.focused');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const next = active ? active.nextElementSibling : items[0];
    if (next) { active?.classList.remove('focused'); next.classList.add('focused'); }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prev = active?.previousElementSibling;
    if (prev) { active.classList.remove('focused'); prev.classList.add('focused'); }
  } else if (e.key === 'Enter' && active) {
    e.preventDefault(); pickSuggestion(active.dataset.word);
  } else if (e.key === 'Escape') {
    hideSuggestions();
  }
});

async function fetchSuggestions(prefix) {
  try {
    const res  = await fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(prefix)}&max=7`);
    const data = await res.json();
    renderSuggestions(data.map(d => d.word));
  } catch { hideSuggestions(); }
}

function renderSuggestions(list) {
  if (!wordSuggestBox || !list.length) { hideSuggestions(); return; }
  const q = inputWord.value.trim().toLowerCase();
  wordSuggestBox.innerHTML = list.map(w => {
    const idx = w.toLowerCase().indexOf(q);
    const hl  = idx >= 0
      ? w.slice(0,idx) + `<mark>${w.slice(idx, idx+q.length)}</mark>` + w.slice(idx+q.length)
      : w;
    return `<li class="wsug-item" data-word="${w}">${hl}</li>`;
  }).join('');
  wordSuggestBox.classList.remove('hidden');
}

function hideSuggestions() {
  wordSuggestBox?.classList.add('hidden');
  if (wordSuggestBox) wordSuggestBox.innerHTML = '';
}

function pickSuggestion(word) {
  inputWord.value = word;
  hideSuggestions();
  inputWord.focus();
}

wordSuggestBox?.addEventListener('mousedown', e => {
  const item = e.target.closest('.wsug-item');
  if (item) { e.preventDefault(); pickSuggestion(item.dataset.word); }
});

document.addEventListener('click', e => {
  if (!inputWord?.contains(e.target) && !wordSuggestBox?.contains(e.target)) hideSuggestions();
});

// ════════════════════════════════════════════════
// 4. PEXELS IMAGE AUTO-FETCH
// ════════════════════════════════════════════════
async function fetchPexelsImages(word) {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(word)}&per_page=5&orientation=landscape`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.photos || []).map(p => p.src.large);
  } catch { return []; }
}

function applyImagePreview(url) {
  if (!url) return;
  currentImageUrl  = url;
  inputImage.value = url;
  const wrap = $('img-preview-wrap');
  if (wrap) wrap.classList.remove('hidden');
  if (imagePreviewEl) { imagePreviewEl.src = url; imagePreviewEl.classList.remove('hidden'); }
  if (btnChangeImg)  btnChangeImg.classList.remove('hidden');
  if (btnRefreshImg) btnRefreshImg.classList.toggle('hidden', pexelsResults.length <= 1);
  if (manualImgWrap) manualImgWrap.classList.add('hidden');
}

function clearImagePreview() {
  currentImageUrl  = '';
  inputImage.value = '';
  const wrap = $('img-preview-wrap');
  if (wrap) wrap.classList.add('hidden');
  if (imagePreviewEl) { imagePreviewEl.src=''; imagePreviewEl.classList.add('hidden'); }
  if (btnChangeImg)   btnChangeImg.classList.add('hidden');
  if (btnRefreshImg)  btnRefreshImg.classList.add('hidden');
  if (manualImgWrap)  manualImgWrap.classList.remove('hidden');
}

async function autoFetchImage(word) {
  if (!word) return;
  imageLoadingEl?.classList.remove('hidden');
  pexelsResults = await fetchPexelsImages(word);
  pexelsIndex   = 0;
  imageLoadingEl?.classList.add('hidden');
  if (pexelsResults.length) applyImagePreview(pexelsResults[0]);
}

btnRefreshImg?.addEventListener('click', () => {
  if (!pexelsResults.length) return;
  pexelsIndex = (pexelsIndex + 1) % pexelsResults.length;
  applyImagePreview(pexelsResults[pexelsIndex]);
});

btnChangeImg?.addEventListener('click', () => {
  clearImagePreview();
  pexelsResults = [];
  pexelsIndex   = 0;
});

inputImage?.addEventListener('input', () => {
  const url = inputImage.value.trim();
  if (url.startsWith('http')) {
    currentImageUrl = url;
    if (imagePreviewEl) { imagePreviewEl.src = url; imagePreviewEl.classList.remove('hidden'); }
    if (btnChangeImg) btnChangeImg.classList.remove('hidden');
  } else {
    if (imagePreviewEl) imagePreviewEl.classList.add('hidden');
  }
});

// ════════════════════════════════════════════════
// 5. AI GENERATION — Google Gemini (gratuito, sem CORS)
// ════════════════════════════════════════════════
function normalizeContext(ctx) {
  if (!ctx) return '';
  if (typeof ctx === 'string') return ctx;
  if (Array.isArray(ctx)) {
    return ctx.map(e => {
      if (typeof e === 'string') return e;
      const en = e.en || e['🇺🇸'] || e.english || e.inglês || '';
      const pt = e.pt || e['🇧🇷'] || e.portuguese || e.português || '';
      return `🇺🇸 ${en}\n🇧🇷 ${pt}`;
    }).join('\n\n');
  }
  return String(ctx);
}

async function generateWordContext(word) {
  const prompt = `Você é um especialista em ensino de inglês para brasileiros.

Para a palavra em inglês "${word}", forneça:

1. Significado em português: objetivo e claro, máximo 2 linhas. Comece com o tipo gramatical entre parênteses — ex: "(substantivo)" ou "(verbo)". Se a palavra tiver múltiplos significados comuns, liste até 3 dos mais usados, numerados.

2. Tradução direta: apenas a(s) palavra(s) em português mais usadas para traduzir "${word}". Ex: "escuro, sombrio" ou "correr, fluir". Máximo 5 palavras.

3. Exemplos de uso: crie até 3 exemplos (um por significado principal). O campo "context" deve ser UMA ÚNICA STRING com os exemplos separados por \\n\\n. Cada exemplo ocupa duas linhas:
🇺🇸 frase em inglês de 10 a 18 palavras, concreta e do cotidiano real
🇧🇷 tradução em português da frase acima

4. Categoria em português: escolha a mais específica — Substantivo, Verbo, Adjetivo, Advérbio, Phrasal Verb, Expressão Idiomática, Negócios, Tecnologia, Cotidiano, Acadêmico, Gíria, Viagens, Saúde, Finanças.

Responda SOMENTE com JSON puro, sem markdown, sem texto extra. O campo context DEVE ser uma string, nunca um array:
{"meaning":"...","translation":"...","context":"🇺🇸 exemplo1 em inglês\\n🇧🇷 tradução1\\n\\n🇺🇸 exemplo2 em inglês\\n🇧🇷 tradução2","category":"..."}`;

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini erro ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw  = data.candidates[0].content.parts[0].text
    .replace(/```json|```/g, '')
    .trim();
  return JSON.parse(raw);
}

generateAIBtn?.addEventListener('click', async () => {
  const word = inputWord.value.trim();
  if (!word) { showAlert('Digite uma palavra antes de gerar com IA.', 'Palavra vazia'); return; }

  generateAIBtn.disabled = true;
  aiBtnText.textContent  = 'Gerando...';
  aiStatus.classList.remove('hidden');

  try {
    const [r] = await Promise.all([
      generateWordContext(word),
      autoFetchImage(word)
    ]);
    if (r.meaning) {
      inputMeaning.value = r.meaning + (r.translation ? '\n\n🔤 ' + r.translation : '');
      flashField(inputMeaning);
    }
    if (r.context) {
      inputContext.value = normalizeContext(r.context);
      flashField(inputContext);
    }
    if (r.category) { inputCatSearch.value = r.category; flashField(inputCatSearch); }
  } catch (e) {
    console.error('Erro IA:', e);
    showAlert('Não foi possível gerar o contexto. Verifique sua chave Gemini em: https://aistudio.google.com/apikey', 'Erro na IA');
  } finally {
    generateAIBtn.disabled = false;
    aiBtnText.textContent  = 'Gerar com IA';
    aiStatus.classList.add('hidden');
  }
});

function flashField(el) {
  el.style.borderColor = 'var(--ai)';
  el.style.boxShadow   = '0 0 0 3px var(--ai-dim)';
  setTimeout(() => { el.style.borderColor=''; el.style.boxShadow=''; }, 2500);
}

// ════════════════════════════════════════════════
// 6. AUTH
// ════════════════════════════════════════════════
onAuthStateChanged(auth, user => {
  if (user?.emailVerified) {
    currentUser = user;
    authEl.classList.add('hidden');
    verifyEl.classList.add('hidden');
    appEl.classList.remove('hidden');
    userEmailEl.textContent = user.email;
    const mob = $('mob-email-display');
    if (mob) mob.textContent = user.email;
    loadData();
    fixOldWords();
  } else if (user && !user.emailVerified) {
    currentUser = null;
    authEl.classList.add('hidden');
    appEl.classList.add('hidden');
    verifyEl.classList.remove('hidden');
    $('verification-email-display').textContent = user.email;
  } else {
    currentUser = null;
    if (unsubWords) unsubWords();
    authEl.classList.remove('hidden');
    appEl.classList.add('hidden');
    verifyEl.classList.add('hidden');
    words = [];
    renderWords();
  }
});

$('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  authFb.classList.add('hidden');
  try {
    await signInWithEmailAndPassword(auth, $('email').value, pwInput.value);
  } catch (err) {
    setFb(authFb, ['auth/invalid-login-credentials','auth/user-not-found','auth/wrong-password'].includes(err.code)
      ? '❌ Email ou senha inválidos.' : 'Erro ao entrar.', 'red');
  }
});

$('resend-verification-button').addEventListener('click', async () => {
  const fb = $('verify-feedback');
  fb.textContent='Enviando...'; fb.style.color='var(--muted)';
  try {
    if (auth.currentUser) { await sendEmailVerification(auth.currentUser); setFb(fb,'✅ Reenviado!','ok'); }
  } catch { setFb(fb,'❌ Tente em instantes.','red'); }
  setTimeout(()=>fb.textContent='',5000);
});

$('back-to-login-button').addEventListener('click', () => signOut(auth));

registerBtn.addEventListener('click', async () => {
  authFb.classList.add('hidden');
  try {
    const c = await createUserWithEmailAndPassword(auth, $('email').value, pwInput.value);
    await sendEmailVerification(c.user);
    await signOut(auth);
    setFb(authFb,'✅ Conta criada! Verifique seu e-mail.','ok');
  } catch (e) {
    setFb(authFb,
      e.code==='auth/email-already-in-use' ? 'Email já registrado.' :
      e.code==='auth/weak-password' ? 'Senha com mínimo 6 caracteres.' : 'Erro ao criar conta.','red');
  }
});

logoutBtn.addEventListener('click', () => signOut(auth));
if (mobLogout) mobLogout.addEventListener('click', () => signOut(auth));

$('forgot-password-button').addEventListener('click', async () => {
  const email = $('email').value;
  if (!email) { setFb(authFb,'Digite seu e-mail.','warn'); return; }
  setFb(authFb,'Enviando link...','muted');
  try {
    await sendPasswordResetEmail(auth, email);
    setFb(authFb,'✅ Link enviado! Verifique sua caixa de entrada.','ok');
  } catch (e) {
    setFb(authFb, e.code==='auth/user-not-found'?'❌ E-mail não encontrado.':'Erro.','red');
  }
});

function setFb(el, msg, type) {
  el.textContent = msg;
  el.style.color = type==='red'?'var(--red)':type==='ok'?'var(--ok)':type==='warn'?'var(--warn)':'var(--muted)';
  el.classList.remove('hidden');
}

togglePwBtn.addEventListener('click', () => {
  const isPw = pwInput.type==='password';
  pwInput.type = isPw ? 'text' : 'password';
  togglePwBtn.innerHTML = `<i class="fas ${isPw?'fa-eye-slash':'fa-eye'}"></i>`;
});

// ════════════════════════════════════════════════
// 7. FIRESTORE
// ════════════════════════════════════════════════
function loadData() {
  if (!currentUser) return;
  if (unsubWords) unsubWords();
  unsubWords = onSnapshot(
    query(collection(db,'palavras'), where('userId','==',currentUser.uid)),
    snap => {
      words = snap.docs.map(d=>({id:d.id,...d.data()}));
      renderWords(); renderChips(); updateStats(); updateHomeStats();
    }
  );
  onSnapshot(
    query(collection(db,'categories'), where('userId','==',currentUser.uid)),
    snap => { categories = snap.docs.map(d=>d.data().name).sort(); }
  );
}

const addWord    = async obj => addDoc(collection(db,'palavras'),{...obj,userId:currentUser.uid,createdAt:serverTimestamp()});
const updateWord = async (id,d) => updateDoc(doc(db,'palavras',id),d);
const deleteWord = async id => deleteDoc(doc(db,'palavras',id));

async function fixOldWords() {
  if (!currentUser) return;
  const snap = await getDocs(query(collection(db,'palavras'),where('userId','==',currentUser.uid)));
  const ups = [];
  snap.forEach(d=>{ if(!d.data().createdAt) ups.push(updateDoc(doc(db,'palavras',d.id),{createdAt:serverTimestamp()})); });
  if (ups.length) await Promise.all(ups);
}

// ════════════════════════════════════════════════
// 8. NAV
// ════════════════════════════════════════════════
function showPage(page) {
  pageHome.classList.toggle('hidden', page!=='home');
  pageLearned.classList.toggle('hidden', page!=='learned');
  document.querySelectorAll('.pill').forEach(b => b.classList.toggle('pill-active', b.dataset.page===page));
  document.querySelectorAll('.mob-pill[data-page]').forEach(b => b.classList.toggle('mob-pill-active', b.dataset.page===page));
  mobDrawer?.classList.add('hidden');
}

allNavBtns.forEach(b => b.addEventListener('click', () => showPage(b.dataset.page)));
hamburgerBtn?.addEventListener('click', () => mobDrawer?.classList.toggle('hidden'));
profileToggle?.addEventListener('click', () => {
  profileMenu?.classList.toggle('hidden');
  profileToggle.classList.toggle('open');
});
window.addEventListener('click', e => {
  if (!profileMenu?.contains(e.target) && !profileToggle?.contains(e.target)) {
    profileMenu?.classList.add('hidden');
    profileToggle?.classList.remove('open');
  }
});

// ════════════════════════════════════════════════
// 9. FORM
// ════════════════════════════════════════════════
btnShowForm.addEventListener('click', () => {
  formAddWord.classList.remove('hidden');
  btnShowForm.classList.add('hidden');
  setTimeout(() => formAddWord.scrollIntoView({behavior:'smooth',block:'start'}), 50);
});

discardBtn.addEventListener('click', () => {
  formAddWord.reset();
  inputCatSearch.value='';
  clearImagePreview();
  pexelsResults=[];
  hideSuggestions();
  formAddWord.classList.add('hidden');
  btnShowForm.classList.remove('hidden');
});

function isDup(list, name, current=null) {
  const n=name.trim().toLowerCase(), c=current?.trim().toLowerCase();
  return list.some(item=>{ const v=typeof item==='string'?item.toLowerCase():item.word.toLowerCase(); return v===n&&v!==c; });
}

inputCatSearch.addEventListener('input', () => {
  const t=inputCatSearch.value;
  if (!t) { catListbox.classList.add('hidden'); return; }
  const found=categories.filter(c=>c.toLowerCase().startsWith(t.toLowerCase()));
  if (!found.length) { catListbox.classList.add('hidden'); return; }
  catListbox.innerHTML=found.map(c=>`<li>${c}</li>`).join('');
  catListbox.classList.remove('hidden');
});

catListbox.addEventListener('click', e => {
  if (e.target.tagName==='LI') { inputCatSearch.value=e.target.textContent.trim(); catListbox.classList.add('hidden'); }
});

window.addEventListener('click', e => {
  if (!inputCatSearch?.contains(e.target) && !catListbox?.contains(e.target)) catListbox.classList.add('hidden');
});

formAddWord.addEventListener('submit', async e => {
  e.preventDefault();
  const word=inputWord.value.trim(), meaning=inputMeaning.value.trim();
  $('word-error').classList.toggle('hidden',!!word);
  $('meaning-error').classList.toggle('hidden',!!meaning);
  if (!word||!meaning) return;
  if (isDup(words,word)) { showAlert(`"${word}" já existe no dicionário.`,'Duplicada'); return; }
  const cat=inputCatSearch.value.trim()||'Sem Categoria';
  const imageUrl=inputImage.value.trim()||currentImageUrl;
  try {
    if (cat!=='Sem Categoria'&&!isDup(categories,cat))
      await addDoc(collection(db,'categories'),{name:cat,userId:currentUser.uid});
    await addWord({word,meaning,context:inputContext.value.trim(),image:imageUrl,category:cat});
    formAddWord.reset();
    inputCatSearch.value='';
    clearImagePreview();
    pexelsResults=[];
    formAddWord.classList.add('hidden');
    btnShowForm.classList.remove('hidden');
    $('modal-word-added').classList.remove('hidden');
  } catch { showAlert('Erro ao salvar a palavra.'); }
});

// ════════════════════════════════════════════════
// 10. STATS & CHIPS
// ════════════════════════════════════════════════
function updateStats() {
  if (!dictStats) return;
  const total=words.length, cats=[...new Set(words.map(w=>w.category||'Sem Categoria'))].length;
  dictStats.textContent=`${total} palavra${total!==1?'s':''} · ${cats} categoria${cats!==1?'s':''}`;
}

function animateCount(el, target) {
  if (!el) return;
  const start=parseInt(el.textContent)||0, dur=600, ts0=performance.now();
  const step=ts=>{ const p=Math.min((ts-ts0)/dur,1), e=1-Math.pow(1-p,3); el.textContent=Math.round(start+(target-start)*e); if(p<1)requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

function updateHomeStats() {
  const now=new Date();
  const sow=new Date(now); sow.setDate(now.getDate()-now.getDay()); sow.setHours(0,0,0,0);
  const som=new Date(now.getFullYear(),now.getMonth(),1);
  animateCount($('stat-total'),words.length);
  animateCount($('stat-cats'),new Set(words.map(w=>w.category||'Sem Categoria')).size);
  animateCount($('stat-week'),words.filter(w=>w.createdAt?.seconds&&new Date(w.createdAt.seconds*1000)>=sow).length);
  animateCount($('stat-month'),words.filter(w=>w.createdAt?.seconds&&new Date(w.createdAt.seconds*1000)>=som).length);
  const recentList=$('recent-words-list');
  if (!recentList) return;
  const recent=[...words].filter(w=>w.createdAt?.seconds).sort((a,b)=>b.createdAt.seconds-a.createdAt.seconds).slice(0,5);
  recentList.innerHTML=recent.length
    ?recent.map(w=>`<li class="recent-item"><span class="recent-word">${w.word}</span><span class="recent-meaning">${(w.meaning||'').slice(0,60)}${(w.meaning||'').length>60?'…':''}</span><span class="recent-cat">${w.category||'Sem Categoria'}</span></li>`).join('')
    :`<li class="recent-empty">Nenhuma palavra adicionada ainda.</li>`;
}

function renderChips() {
  if (!chipsBar) return;
  const cats=['all',...new Set(words.map(w=>w.category||'Sem Categoria'))].sort((a,b)=>a==='all'?-1:a.localeCompare(b));
  chipsBar.innerHTML=cats.map(cat=>{
    const label=cat==='all'?'Todas':cat;
    const count=cat==='all'?words.length:words.filter(w=>(w.category||'Sem Categoria')===cat).length;
    return `<button class="chip ${activeCatFilter===cat?'active':''}" data-cat="${cat}">${label}<span class="chip-count">${count}</span></button>`;
  }).join('');
  chipsBar.querySelectorAll('.chip').forEach(c=>{
    c.addEventListener('click',()=>{
      activeCatFilter=c.dataset.cat; pagination={}; renderWords();
      chipsBar.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
      c.classList.add('active');
    });
  });
}

// ════════════════════════════════════════════════
// 11. RENDER WORDS
// ════════════════════════════════════════════════
function renderWords(search='') {
  if (!wordsContainer) return;
  let list=[...words];
  if (activeCatFilter!=='all') list=list.filter(w=>(w.category||'Sem Categoria')===activeCatFilter);
  if (dateFilter) {
    const d=new Date(dateFilter+'T00:00:00');
    list=list.filter(w=>{ if(!w.createdAt?.seconds)return false; const wd=new Date(w.createdAt.seconds*1000); return wd.getFullYear()===d.getFullYear()&&wd.getMonth()===d.getMonth()&&wd.getDate()===d.getDate(); });
  }
  if (search) { const s=search.toLowerCase(); list=list.filter(w=>w.word.toLowerCase().includes(s)||w.meaning?.toLowerCase().includes(s)||w.context?.toLowerCase().includes(s)); }
  if (currentSort==='date') list.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  else list.sort((a,b)=>a.word.localeCompare(b.word));
  if (!list.length) { wordsContainer.innerHTML=`<div class="empty"><i class="fas fa-book-open"></i>Nenhuma palavra encontrada.</div>`; return; }
  const grouped=list.reduce((acc,w)=>{ const c=w.category||'Sem Categoria'; if(!acc[c])acc[c]=[]; acc[c].push(w); return acc; },{});
  const catOrder=currentSort==='alphabetical'?Object.keys(grouped).sort():[...new Set(list.map(w=>w.category||'Sem Categoria'))];
  catOrder.forEach(c=>{ if(!pagination[c])pagination[c]=1; });
  wordsContainer.innerHTML=catOrder.map(cat=>{
    const cw=grouped[cat],total=cw.length,pg=pagination[cat]||1,pages=Math.ceil(total/PER_PAGE),paged=cw.slice((pg-1)*PER_PAGE,pg*PER_PAGE);
    const pgn=pages>1?`<div class="pgn"><button data-action="pgn" data-cat="${cat}" data-dir="prev" ${pg===1?'disabled':''}>← Anterior</button><span>Página ${pg} de ${pages}</span><button data-action="pgn" data-cat="${cat}" data-dir="next" ${pg===pages?'disabled':''}>Próximo →</button></div>`:'';
    return `<div class="cat-section"><div class="cat-header"><span class="cat-label">${cat}</span><button class="cat-edit" data-action="edit-cat" data-cat="${cat}" title="Editar categoria"><i class="fas fa-pen"></i></button><span class="cat-count">${total} palavra${total!==1?'s':''}</span></div><ul class="word-list">${paged.map(w=>`<li class="word-row" data-word-id="${w.id}"><span class="wname" data-action="detail">${w.word}</span><div class="w-actions"><button class="wbtn" data-action="speak" data-wtext="${w.word}" title="Ouvir"><i class="fas fa-volume-up"></i></button><button class="wbtn" data-action="edit" title="Editar"><i class="fas fa-pen"></i></button></div></li>`).join('')}</ul>${pgn}</div>`;
  }).join('');
}

wordsContainer.addEventListener('click', e=>{
  const el=e.target.closest('[data-action]'); if(!el)return;
  const action=el.dataset.action,row=e.target.closest('[data-word-id]'),wid=row?.dataset.wordId,cat=el.dataset.cat;
  if(action==='speak')speakWord(el.dataset.wtext);
  else if(action==='detail')openDetails(wid);
  else if(action==='edit')openEdit(wid);
  else if(action==='edit-cat'){categoryToEdit=cat;editCatInput.value=cat;editCatModal.classList.remove('hidden');}
  else if(action==='pgn'){if(el.dataset.dir==='next')pagination[cat]++;else pagination[cat]--;renderWords(searchInput.value);}
});

// ════════════════════════════════════════════════
// 12. MODALS
// ════════════════════════════════════════════════
function showAlert(msg,title='Atenção'){alertTitleEl.textContent=title;alertMsgEl.textContent=msg;modalAlert.classList.remove('hidden');}
function speakWord(word){const u=new SpeechSynthesisUtterance(word);u.lang='en-US';u.rate=0.6;window.speechSynthesis.speak(u);}

function openDetails(wid){
  const w=words.find(x=>x.id===wid); if(!w)return;
  modalTitle.innerHTML=`<span>${w.word}</span><button id="btn-speak-word" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;padding:0"><i class="fas fa-volume-up"></i></button>`;
  const parts = (w.meaning||'').split('\n\n🔤 ');
  const meaningHtml = parts[0].replace(/\n/g,'<br>');
  const translationHtml = parts[1] ? `<div><strong>Tradução</strong>${parts[1]}</div>` : '';
  const ctxText = normalizeContext(w.context);
  modalContent.innerHTML=`
    ${w.image?`<img src="${w.image}" alt="${w.word}">`:''}
    <div><strong>Significado</strong>${meaningHtml}</div>
    ${translationHtml}
    ${ctxText?`<div><strong>Exemplos</strong>${ctxText.replace(/\n/g,'<br>')}</div>`:''}
    <div style="font-size:11px;color:var(--faint)"><strong>Categoria</strong>${w.category||'—'}</div>`;
  $('btn-speak-word').addEventListener('click',()=>speakWord(w.word));
  modalDetails.classList.remove('hidden');
}

function openEdit(wid){
  const w=words.find(x=>x.id===wid); if(!w)return;
  $('edit-id').value=w.id;$('edit-word').value=w.word;$('edit-meaning').value=w.meaning;
  $('edit-context').value=w.context||'';$('edit-image').value=w.image||'';$('edit-category').value=w.category||'';
  $('modal-edit-word').classList.remove('hidden');
}

$('btn-close-modal').addEventListener('click',()=>modalDetails.classList.add('hidden'));
$('btn-close-edit-modal').addEventListener('click',()=>$('modal-edit-word').classList.add('hidden'));
$('btn-cancel-edit').addEventListener('click',()=>$('modal-edit-word').classList.add('hidden'));
$('btn-close-word-added-modal').addEventListener('click',()=>$('modal-word-added').classList.add('hidden'));
closeAlertBtn.addEventListener('click',()=>modalAlert.classList.add('hidden'));
closeCatModal.addEventListener('click',()=>modalCat.classList.add('hidden'));
cancelDelBtn.addEventListener('click',()=>{wordToDelete=null;confirmModal.classList.add('hidden');});

$('btn-delete-word').addEventListener('click',()=>{wordToDelete=$('edit-id').value;confirmModal.classList.remove('hidden');});

$('form-edit-word').addEventListener('submit',async e=>{
  e.preventDefault();
  const id=$('edit-id').value;
  const data={word:$('edit-word').value.trim(),meaning:$('edit-meaning').value.trim(),context:$('edit-context').value.trim(),image:$('edit-image').value.trim(),category:$('edit-category').value.trim()||'Sem Categoria'};
  if(!data.word||!data.meaning){showAlert('Palavra e significado obrigatórios.');return;}
  const orig=words.find(w=>w.id===id);
  if(orig&&data.word!==orig.word&&isDup(words,data.word,orig.word)){showAlert(`"${data.word}" já existe.`,'Duplicada');return;}
  try{
    if(data.category!=='Sem Categoria'&&!isDup(categories,data.category))
      await addDoc(collection(db,'categories'),{name:data.category,userId:currentUser.uid});
    await updateWord(id,data);$('modal-edit-word').classList.add('hidden');
  }catch{showAlert('Erro ao salvar.');}
});

createCatBtn.addEventListener('click',async()=>{
  const name=inputCatSearch.value.trim();
  if(!name){showAlert('Digite um nome válido.');return;}
  if(isDup(categories,name)){showAlert(`"${name}" já existe.`,'Duplicada');return;}
  try{
    await addDoc(collection(db,'categories'),{name,userId:currentUser.uid});
    inputCatSearch.value='';catListbox.classList.add('hidden');
    catCreatedMsg.textContent=`"${name}" criada com sucesso.`;modalCat.classList.remove('hidden');
  }catch{showAlert('Erro ao criar categoria.');}
});

cancelEditCat.addEventListener('click',()=>{editCatModal.classList.add('hidden');categoryToEdit=null;});

saveCatBtn.addEventListener('click',async()=>{
  const newName=editCatInput.value.trim(),oldName=categoryToEdit;
  if(!newName||!oldName||newName===oldName){editCatModal.classList.add('hidden');return;}
  const exists=isDup(categories,newName);
  try{
    const ws=await getDocs(query(collection(db,'palavras'),where('userId','==',currentUser.uid),where('category','==',oldName)));
    await Promise.all(ws.docs.map(d=>updateDoc(d.ref,{category:newName})));
    const cs=await getDocs(query(collection(db,'categories'),where('userId','==',currentUser.uid),where('name','==',oldName)));
    await Promise.all(cs.docs.map(d=>deleteDoc(d.ref)));
    if(!exists)await addDoc(collection(db,'categories'),{name:newName,userId:currentUser.uid});
    showAlert(`"${oldName}" → "${newName}"`,'Categoria renomeada');
    editCatModal.classList.add('hidden');categoryToEdit=null;
  }catch{showAlert('Erro ao renomear.');}
});

deleteCatBtn.addEventListener('click',()=>{editCatModal.classList.add('hidden');wordToDelete='__CAT__'+categoryToEdit;confirmModal.classList.remove('hidden');});

confirmDelBtn.addEventListener('click',async()=>{
  if(!wordToDelete)return;
  try{
    if(wordToDelete.startsWith('__CAT__')){
      const cat=wordToDelete.replace('__CAT__','');
      const ws=await getDocs(query(collection(db,'palavras'),where('userId','==',currentUser.uid),where('category','==',cat)));
      await Promise.all(ws.docs.map(d=>updateDoc(d.ref,{category:'Sem Categoria'})));
      const cs=await getDocs(query(collection(db,'categories'),where('userId','==',currentUser.uid),where('name','==',cat)));
      await Promise.all(cs.docs.map(d=>deleteDoc(d.ref)));
      activeCatFilter='all';
    }else{await deleteWord(wordToDelete);}
  }catch{showAlert('Erro ao deletar.');}
  $('modal-edit-word').classList.add('hidden');confirmModal.classList.add('hidden');wordToDelete=null;
});

// ════════════════════════════════════════════════
// 13. SEARCH / SORT / DATE
// ════════════════════════════════════════════════
searchInput?.addEventListener('input',e=>{pagination={};renderWords(e.target.value);});
clearSearchBtn?.addEventListener('click',()=>{searchInput.value='';pagination={};renderWords();searchInput.focus();});
sortSel?.addEventListener('change',e=>{
  pagination={};const v=e.target.value;
  dateContainer.classList.add('hidden');dateFilter=null;
  if(v==='by-date'){dateContainer.classList.remove('hidden');if(!dateInput.value)dateInput.value=new Date().toISOString().split('T')[0];dateFilter=dateInput.value;}
  else{currentSort=v;}
  renderWords(searchInput.value);
});
dateInput?.addEventListener('input',e=>{dateFilter=e.target.value;renderWords(searchInput.value);});
clearDateBtn?.addEventListener('click',()=>{dateContainer.classList.add('hidden');dateFilter=null;dateInput.value='';sortSel.value='alphabetical';currentSort='alphabetical';renderWords(searchInput.value);});

// ════════════════════════════════════════════════
// 14. INIT
// ════════════════════════════════════════════════
showPage('home');