<script type="module">
// ===============================================================
// 1. CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
// ===============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, doc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ===============================================================
// 2. ELEMENTOS DA UI E ESTADO DA APLICAÇÃO
// ===============================================================
const appContainer = document.getElementById('app');
const togglePassword = document.getElementById('toggle-password');
const passwordInput = document.getElementById('password');
const authContainer = document.getElementById('auth-container');
const loginButton = document.getElementById('login-button');
const registerButton = document.getElementById('register-button');
const authFeedback = document.getElementById('auth-feedback');
const logoutButton = document.getElementById('logout-button');
const userEmailDisplay = document.getElementById('user-email');
const btnHamburger = document.getElementById('btn-hamburger');
const checkboxHamburger = document.getElementById('checkbox');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const btnCloseSidebar = document.getElementById('btn-close-sidebar');
const mainContent = document.getElementById('main-content');
const sidebarTitle = document.querySelector('.sidebar-title');
const sidebarTexts = document.querySelectorAll('.sidebar-text');
const pageHome = document.getElementById('page-home');
const pageLearned = document.getElementById('page-learned');
const navButtons = sidebar.querySelectorAll('button[data-page]');
const formAddWord = document.getElementById('form-add-word');
const btnShowForm = document.getElementById('btn-show-form');
const learnedWordsContainer = document.getElementById('learned-words-container');
const searchLearnedInput = document.getElementById('search-learned');
const clearSearchButton = document.getElementById('clear-search');
const sortLearnedSelect = document.getElementById('sort-learned');
const modalWordDetails = document.getElementById('modal-word-details');
const btnCloseModal = document.getElementById('btn-close-modal');
const modalWordTitle = document.getElementById('modal-word-title');
const modalWordContent = document.getElementById('modal-word-content');
const inputWord = document.getElementById('input-word');
const inputContext = document.getElementById('input-context');
const inputMeaning = document.getElementById('input-meaning');
const inputImage = document.getElementById('input-image');
const inputCategorySearch = document.getElementById('input-category-search');
const btnCreateCategory = document.getElementById('btn-create-category');
const categoryListbox = document.getElementById('category-listbox');
const btnDiscard = document.getElementById('btn-discard');
const modalCategory = document.getElementById('modal-category-created');
const btnCloseCategoryModal = document.getElementById('btn-close-category-modal');
const categoryCreatedMessage = document.getElementById('category-created-message');
const confirmModal = document.getElementById('modal-delete-confirm');
const btnConfirmDelete = document.getElementById('btn-confirm-delete');
const btnCancelDelete = document.getElementById('btn-cancel-delete');
const modalEditCategory = document.getElementById('modal-edit-category');
const btnCancelEditCategory = document.getElementById('btn-cancel-edit-category');
const btnSaveCategory = document.getElementById('btn-save-category');
const btnDeleteCategory = document.getElementById('btn-delete-category');
const inputEditCategoryName = document.getElementById('input-edit-category-name');
const profileToggle = document.getElementById('profile-toggle');
const profileMenu = document.getElementById('profile-menu');
const modalAlert = document.getElementById('modal-alert');
const alertTitle = document.getElementById('alert-title');
const alertMessage = document.getElementById('alert-message');
const btnCloseAlert = document.getElementById('btn-close-alert');

let words = [];
let categories = [];
let currentUser = null;
let isSidebarExpanded = window.innerWidth >= 768;
let unsubscribeFromWords = null;
let currentSort = "alphabetical";
let wordIdToDelete = null;
let currentCategoryToEdit = null;

// ===============================================================
// 3. LÓGICA DE AUTENTICAÇÃO
// ===============================================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    authFeedback.textContent = "";
    authFeedback.classList.add('hidden');
    logoutButton.classList.remove('hidden');
    userEmailDisplay.textContent = currentUser.email;
    userEmailDisplay.classList.remove('hidden');
    loadData();
    corrigirPalavrasAntigasSemData(); // <-- ADICIONE ESTA LINHA
  } else {
    currentUser = null;
    if (unsubscribeFromWords) unsubscribeFromWords();
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
    logoutButton.classList.add('hidden');
    userEmailDisplay.textContent = "";
    userEmailDisplay.classList.add('hidden');
    words = [];
    renderLearnedWords();
  }
});

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  authFeedback.classList.add('hidden');
  setTimeout(() => { authFeedback.classList.add('hidden'); }, 3000);

  try {
    await signInWithEmailAndPassword(auth, email, password);
    authFeedback.textContent = "🎉 Login efetuado com sucesso!";
    authFeedback.className = 'text-center mt-4 text-green-500';
  } catch (error) {
    if (error.code === 'auth/invalid-login-credentials') {
      authFeedback.textContent = "❌ Email ou senha inválidos.";
    } else {
      authFeedback.textContent = "Ocorreu um erro ao entrar.";
    }
    authFeedback.className = 'text-center mt-4 text-red-500';
  }
});

registerButton.addEventListener('click', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  authFeedback.classList.add('hidden');

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    authFeedback.textContent = "✅ Conta criada! Você já está logado.";
    authFeedback.className = 'text-center mt-4 text-green-500';
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      authFeedback.textContent = "Este email já está registado. Tente entrar.";
    } else if (error.code === 'auth/weak-password') {
      authFeedback.textContent = "A senha precisa de ter pelo menos 6 caracteres.";
    } else {
      authFeedback.textContent = "Ocorreu um erro ao criar a conta.";
    }
    authFeedback.className = 'text-center mt-4 text-red-500';
  }
});

logoutButton.addEventListener('click', () => { signOut(auth); });

// ===============================================================
// 4. LÓGICA DA BASE DE DADOS (FIRESTORE)
// ===============================================================
// APAGUE sua função loadData atual e COLE esta no lugar
function loadData() {
    if (!currentUser) return;

    // Cancela "ouvintes" antigos para não acumular
    if (unsubscribeFromWords) unsubscribeFromWords();
    let unsubscribeFromCategories;
    if (unsubscribeFromCategories) unsubscribeFromCategories();

    // Ouve em tempo real as PALAVRAS
    const wordsQuery = query(collection(db, "palavras"), where("userId", "==", currentUser.uid));
    unsubscribeFromWords = onSnapshot(wordsQuery, (snapshot) => {
        words = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderLearnedWords(searchLearnedInput.value);
    });

    // Ouve em tempo real as CATEGORIAS
    const categoriesQuery = query(collection(db, "categories"), where("userId", "==", currentUser.uid));
    unsubscribeFromCategories = onSnapshot(categoriesQuery, (snapshot) => {
        categories = snapshot.docs.map(doc => doc.data().name).sort();
    });
}
async function addWord(newWordObject) {
  if (!currentUser) return;
  await addDoc(collection(db, "palavras"), {
    ...newWordObject,
    userId: currentUser.uid,
    createdAt: serverTimestamp()
  });
}

async function updateWord(wordId, updatedData) {
  if (!currentUser) return;
  const wordRef = doc(db, "palavras", wordId);
  await updateDoc(wordRef, updatedData);
}

async function deleteWord(wordId) {
  if (!currentUser) return;
  await deleteDoc(doc(db, "palavras", wordId));
}

async function corrigirPalavrasAntigasSemData() {
  if (!currentUser) return;

  const palavrasRef = collection(db, "palavras");
  const snapshot = await getDocs(query(palavrasRef, where("userId", "==", currentUser.uid)));
  const updates = [];

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (!data.createdAt) {
      updates.push(updateDoc(doc(db, "palavras", docSnap.id), {
        createdAt: serverTimestamp()
      }));
    }
  });

  if (updates.length > 0) {
    await Promise.all(updates);
    console.log(`✅ Corrigido: ${updates.length} palavras receberam createdAt.`);
  } else {
    console.log("✅ Nenhuma palavra sem createdAt foi encontrada.");
  }
}

// ===============================================================
// 5. LÓGICA DA APLICAÇÃO E UI
// ===============================================================
function isDuplicate(list, newItemName, currentItemName = null) {
  const normalizedNewName = newItemName.trim().toLowerCase();
  const normalizedCurrentName = currentItemName ? currentItemName.trim().toLowerCase() : null;

  return list.some(item => {
    const normalizedItem = typeof item === 'string' ? item.toLowerCase() : item.word.toLowerCase();
    return normalizedItem === normalizedNewName && normalizedItem !== normalizedCurrentName;
  });
}
function renderCategorySuggestions(searchTerm) {
  if (!searchTerm) {
    categoryListbox.classList.add('hidden');
    return;
  }
  const filteredCategories = categories.filter(cat => 
    cat.toLowerCase().startsWith(searchTerm.toLowerCase())
  );
  if (filteredCategories.length === 0) {
    categoryListbox.classList.add('hidden');
    return;
  }
  categoryListbox.innerHTML = filteredCategories.map(cat => `
    <li class="px-3 py-2 cursor-pointer hover:bg-[rgb(92,130,255)]" tabindex="0">
      ${cat}
    </li>
  `).join('');
  categoryListbox.classList.remove('hidden');
}

// 1. Mostra sugestões ao digitar
inputCategorySearch.addEventListener('input', () => {
  renderCategorySuggestions(inputCategorySearch.value);
});

// 2. Preenche o campo ao clicar na sugestão
categoryListbox.addEventListener('click', (e) => {
  if (e.target.tagName === 'LI') {
    inputCategorySearch.value = e.target.textContent.trim();
    categoryListbox.classList.add('hidden');
  }
});

// 3. (Bônus) Esconde a lista ao clicar fora dela
window.addEventListener('click', (e) => {
  if (!inputCategorySearch.contains(e.target) && !categoryListbox.contains(e.target)) {
    categoryListbox.classList.add('hidden');
  }
});
// --- Formulários ---
formAddWord.addEventListener('submit', async (e) => { // A palavra 'async' é essencial
  e.preventDefault();
  const wordValue = inputWord.value.trim();
  const meaningValue = inputMeaning.value.trim();
  
  document.getElementById('word-error').classList.toggle('hidden', !!wordValue);
  document.getElementById('meaning-error').classList.toggle('hidden', !!meaningValue);

 // ... (código anterior) ...

if (!wordValue || !meaningValue) return;

// VERIFICAÇÃO DE DUPLICIDADE
// -------------------------------------------------------------
if (isDuplicate(words, wordValue)) {
  showAlert(`A palavra "${wordValue}" já existe no seu dicionário.`, "Palavra duplicada");
  return;
}
// -------------------------------------------------------------

const newWord = {
  word: wordValue,
  meaning: meaningValue,
  context: inputContext.value.trim(),
  image: inputImage.value.trim(),
  category: inputCategorySearch.value.trim() || 'Sem Categoria',
};

try {
  await addWord(newWord);

// ... (restante do código) ...
    
    // 2. SÓ DEPOIS que a palavra foi salva com sucesso, o código continua.
    formAddWord.reset();
    inputCategorySearch.value = '';
    hideForm();
    
    // 3. Mostra o modal de sucesso.
    document.getElementById('modal-word-added').classList.remove('hidden');

  } catch (error) {
    console.error("Erro ao adicionar palavra: ", error);
    alert("Ocorreu um erro ao salvar a palavra. Verifique sua conexão e tente novamente.");
  }
});
document.getElementById('btn-close-word-added-modal').addEventListener('click', () => {
  document.getElementById('modal-word-added').classList.add('hidden');
});
document.getElementById('form-edit-word').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const wordId = form.querySelector('#edit-id').value;
  const updatedData = {
    word: form.querySelector('#edit-word').value.trim(),
    meaning: form.querySelector('#edit-meaning').value.trim(),
    context: form.querySelector('#edit-context').value.trim(),
    image: form.querySelector('#edit-image').value.trim(),
    category: form.querySelector('#edit-category').value.trim() || 'Sem Categoria',
  };
   if (!updatedData.word || !updatedData.meaning) {
        showAlert("Palavra e significado são obrigatórios."); // <-- LINHA NOVA
        return;
    }
    const originalWord = words.find(w => w.id === wordId);
if (originalWord && updatedData.word !== originalWord.word && isDuplicate(words, updatedData.word, originalWord.word)) {
  showAlert(`A palavra "${updatedData.word}" já existe no seu dicionário.`, "Palavra duplicada");
  return;
}
  updateWord(wordId, updatedData);
  document.getElementById('modal-edit-word').classList.add('hidden');
});
// Adicione esta função junto com showPage, renderLearnedWords, etc.
function showAlert(message, title = "Atenção") {
    alertTitle.textContent = title;
    alertMessage.textContent = message;
    modalAlert.classList.remove('hidden');
}

function hideForm() { formAddWord.classList.add('hidden'); btnShowForm.classList.remove('hidden'); }
function showForm() { formAddWord.classList.remove('hidden'); btnShowForm.classList.add('hidden'); }
btnShowForm.addEventListener('click', showForm);
btnDiscard.addEventListener('click', hideForm);

// --- Sidebar e Navegação ---
function updateSidebarState() {
    const isDesktop = window.innerWidth >= 768;
    mainContent.classList.remove('ml-20', 'ml-64');
    sidebar.classList.remove('w-20', 'w-64', '-translate-x-full');
    overlay.classList.add('hidden');
    sidebarTitle.classList.add('hidden');
    sidebarTexts.forEach(text => text.classList.add('hidden', 'opacity-0'));
    if (isDesktop) {
        if (isSidebarExpanded) {
            sidebar.classList.add('w-64');
            mainContent.classList.add('ml-64');
            sidebarTitle.classList.remove('hidden');
            sidebarTexts.forEach(text => text.classList.remove('hidden', 'opacity-0'));
        } else {
            sidebar.classList.add('w-20');
            mainContent.classList.add('ml-20');
        }
    } else {
        sidebar.classList.add('w-64');
        sidebarTitle.classList.remove('hidden');
        sidebarTexts.forEach(text => text.classList.remove('hidden', 'opacity-0'));
        if (isSidebarExpanded) {
            sidebar.classList.remove('-translate-x-full');
            overlay.classList.remove('hidden');
        } else {
            sidebar.classList.add('-translate-x-full');
        }
    }
    checkboxHamburger.checked = isSidebarExpanded;
}
function toggleSidebar() { isSidebarExpanded = !isSidebarExpanded; updateSidebarState(); }
function showPage(page) {
  pageHome.classList.add('hidden');
  pageLearned.classList.add('hidden');

  if (page === 'home') pageHome.classList.remove('hidden');
  if (page === 'learned') pageLearned.classList.remove('hidden');

  navButtons.forEach(btn => {
    const isSelected = btn.dataset.page === page;
    btn.classList.toggle('bg-[rgb(92,130,255)]', isSelected);
    btn.classList.toggle('text-white', isSelected);
    btn.classList.toggle('text-custom-blue', !isSelected);
  });

  // 🧼 Fecha o modal de categoria ao trocar de tela
  modalCategory.classList.add('hidden');

  if (window.innerWidth < 768) {
    isSidebarExpanded = false;
    updateSidebarState();
  }
}

btnHamburger.addEventListener('click', toggleSidebar);
btnCloseSidebar.addEventListener('click', toggleSidebar);
overlay.addEventListener('click', toggleSidebar);
window.addEventListener('resize', updateSidebarState);
navButtons.forEach(btn => { btn.addEventListener('click', () => showPage(btn.dataset.page)); });

// --- Renderização e Modais ---
function renderLearnedWords(searchTerm = "") {
  if (!learnedWordsContainer) return;
  let processedWords = words.filter(word =>
    word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
    word.meaning?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    word.context?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // AONDE MUDAR: Dentro da função `renderLearnedWords`

// A ordenação deve ser feita AQUI, antes do agrupamento.
if (currentSort === "date") {
  // Ordena do mais recente para o mais antigo.
  processedWords.sort((a, b) => {
    // Garante que palavras sem data sejam tratadas.
    const dateA = a.createdAt?.seconds || 0;
    const dateB = b.createdAt?.seconds || 0;
    return dateB - dateA;
  });
} else {
  // Ordenação alfabética (A-Z).
  processedWords.sort((a, b) => a.word.localeCompare(b.word));
}

// O agrupamento por categoria vem logo em seguida.
const grouped = processedWords.reduce((acc, w) => {
  const cat = w.category || 'Sem Categoria';
  if (!acc[cat]) { acc[cat] = []; }
  acc[cat].push(w);
  return acc;
}, {});
  let categoryOrder;
if (currentSort === 'alphabetical') {
  // Ordena as categorias alfabeticamente.
  categoryOrder = Object.keys(grouped).sort();
} else { 
  categoryOrder = [...new Set(processedWords.map(w => w.category || 'Sem Categoria'))];
}
  if (processedWords.length === 0) {
    learnedWordsContainer.innerHTML = `<p class="text-center text-gray-400">Nenhuma palavra encontrada.</p>`;
    return;
  }
  learnedWordsContainer.innerHTML = categoryOrder.map(cat => {
    const wordsInCategory = grouped[cat];
    return `
      <div class="space-y-3">
        <h3 class="text-xl font-extrabold text-custom-blue flex items-center gap-2">
          <span>${cat}</span>
          <button class="text-sm text-gray-400 hover:text-white" data-action="edit-category" data-category="${cat}" title="Editar categoria">
            <i class="fas fa-pen"></i>
          </button>
        </h3>
        <ul class="space-y-1">
          ${wordsInCategory.map(w => `
            <li data-word-id="${w.id}" data-action="details" class="rounded-md px-3 py-2 hover:bg-[rgb(92,130,255)] flex justify-between items-center cursor-pointer">
              <span class="flex-1">${w.word}</span>
              <button data-word-id="${w.id}" data-action="edit" class="ml-4 p-2 text-gray-400 hover:text-white">
                <i class="fas fa-pen"></i>
              </button>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }).join('');
}

function openModalWordDetails(wordId) {
  const word = words.find(w => w.id === wordId);
  if (!word) return;
  modalWordTitle.textContent = word.word;
  modalWordContent.innerHTML = `
    ${word.image ? `<img src="${word.image}" alt="Imagem de ${word.word}" class="w-full max-h-60 object-cover rounded-md mb-4">` : ''}
    <p><strong class="font-semibold text-custom-blue">Significado:</strong><br>${word.meaning.replace(/\n/g, '<br>')}</p>
    ${word.context ? `<p class="mt-2"><strong class="font-semibold text-custom-blue">Contexto/Exemplo:</strong><br>${word.context.replace(/\n/g, '<br>')}</p>` : ''}
    <p class="mt-2 text-sm text-gray-400"><strong>Categoria:</strong> ${word.category || 'Nenhuma'}</p>
  `;
  modalWordDetails.classList.remove('hidden');
}

function openEditModal(wordId) {
  const word = words.find(w => w.id === wordId);
  if (!word) return;
  const modal = document.getElementById('modal-edit-word');
  modal.querySelector('#edit-id').value = word.id;
  modal.querySelector('#edit-word').value = word.word;
  modal.querySelector('#edit-meaning').value = word.meaning;
  modal.querySelector('#edit-context').value = word.context || '';
  modal.querySelector('#edit-image').value = word.image || '';
  modal.querySelector('#edit-category').value = word.category || '';
  modal.classList.remove('hidden');
}

// --- Listeners de Eventos (Declarados uma única vez) ---
togglePassword.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  togglePassword.innerHTML = `<i class="fas ${isPassword ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
});

document.getElementById('btn-close-edit-modal').addEventListener('click', () => {
  document.getElementById('modal-edit-word').classList.add('hidden');
});

document.getElementById('btn-delete-word').addEventListener('click', () => {
  wordIdToDelete = document.getElementById('edit-id').value;
  confirmModal.classList.remove('hidden');
});

btnCancelDelete.addEventListener('click', () => {
  wordIdToDelete = null;
  confirmModal.classList.add('hidden');
});

btnCloseAlert.addEventListener('click', () => {
    modalAlert.classList.add('hidden');
});

document.getElementById('btn-cancel-edit').addEventListener('click', () => {
  document.getElementById('modal-edit-word').classList.add('hidden');
});

btnCloseModal.addEventListener('click', () => {
  modalWordDetails.classList.add('hidden');
});

learnedWordsContainer.addEventListener('click', (e) => {
  const target = e.target;
  const action = target.closest('[data-action]')?.dataset.action;
  const wordId = target.closest('[data-word-id]')?.dataset.wordId;
  const category = target.closest('[data-category]')?.dataset.category;

  if (action === 'details') { openModalWordDetails(wordId); } 
  else if (action === 'edit') { openEditModal(wordId); } 
  else if (action === 'edit-category') {
    currentCategoryToEdit = category;
    inputEditCategoryName.value = currentCategoryToEdit;
    modalEditCategory.classList.remove('hidden');
  }
});

btnCancelEditCategory.addEventListener('click', () => {
  modalEditCategory.classList.add('hidden');
  currentCategoryToEdit = null;
});

// SUBSTITUA O LISTENER DO BOTÃO CRIAR CATEGORIA POR ESTE
btnCreateCategory.addEventListener('click', async () => {
  const newCatName = inputCategorySearch.value.trim();
  if (!newCatName) {
    showAlert("Digite um nome de categoria válido.");
    return;
  }
  
  // VERIFICAÇÃO DE DUPLICIDADE
  // -------------------------------------------------------------
  if (isDuplicate(categories, newCatName)) {
    showAlert(`A categoria "${newCatName}" já existe.`, "Nome duplicado");
    return;
  }
  // -------------------------------------------------------------

  try {
    await addDoc(collection(db, "categories"), {
      name: newCatName,
      userId: currentUser.uid
    });

    inputCategorySearch.value = "";
    categoryListbox.classList.add('hidden');

    categoryCreatedMessage.textContent = `A categoria "${newCatName}" foi criada com sucesso.`;
    modalCategory.classList.remove('hidden');

  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    showAlert("Erro ao criar categoria. Tente novamente.");
  }
});
    btnCloseCategoryModal.addEventListener('click', () => {
      modalCategory.classList.add('hidden');
    });

btnSaveCategory.addEventListener('click', async () => {
  const newName = inputEditCategoryName.value.trim();
  if (!newName || !currentCategoryToEdit || newName === currentCategoryToEdit) return;

  const updates = words.filter(w => w.category === currentCategoryToEdit);
  for (const word of updates) {
    await updateWord(word.id, { category: newName });
  }
  modalEditCategory.classList.add('hidden');
  currentCategoryToEdit = null;
});

btnDeleteCategory.addEventListener('click', () => {
  modalEditCategory.classList.add('hidden');
  confirmModal.classList.remove('hidden');
  wordIdToDelete = '__CATEGORY__' + currentCategoryToEdit;
});

btnConfirmDelete.addEventListener('click', async () => {
  if (!wordIdToDelete) return;

  if (wordIdToDelete.startsWith('__CATEGORY__')) {
    const categoryName = wordIdToDelete.replace('__CATEGORY__', '');
    const updates = words.filter(w => w.category === categoryName);
    for (const word of updates) {
      await updateWord(word.id, { category: 'Sem Categoria' });
    }
  } else {
    await deleteWord(wordIdToDelete);
  }

  document.getElementById('modal-edit-word').classList.add('hidden');
  confirmModal.classList.add('hidden');
  wordIdToDelete = null;
});

clearSearchButton?.addEventListener('click', () => {
  searchLearnedInput.value = "";
  renderLearnedWords();
  searchLearnedInput.focus();
});

sortLearnedSelect?.addEventListener('change', (e) => {
  currentSort = e.target.value;
  renderLearnedWords(searchLearnedInput.value);
});

searchLearnedInput?.addEventListener('input', (e) => {
  renderLearnedWords(e.target.value);
});

profileToggle?.addEventListener('click', () => {
  profileMenu.classList.toggle('hidden');
});

window.addEventListener('click', (e) => {
  if (!profileMenu.contains(e.target) && !profileToggle.contains(e.target)) {
    profileMenu.classList.add('hidden');
  }
});

// ===============================================================
// 6. INICIALIZAÇÃO DA APLICAÇÃO
// ===============================================================
function initialize() {
  updateSidebarState();
  showPage('home');
}
initialize();
</script>