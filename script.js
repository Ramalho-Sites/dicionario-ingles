// ===============================================================
// 1. CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
// ===============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendEmailVerification, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
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
const dateFilterContainer = document.getElementById('date-filter-container');
const dateFilterInput = document.getElementById('date-filter-input');
const clearDateFilter = document.getElementById('clear-date-filter');
const wordsPerPage = 20;
let paginationState = {};

let words = [];
let categories = [];
let currentUser = null;
let isSidebarExpanded = window.innerWidth >= 768;
let unsubscribeFromWords = null;
let currentSort = "alphabetical";
let wordIdToDelete = null;
let currentCategoryToEdit = null;
let selectedDateFilter = null;

// ===============================================================
// 3. LÓGICA DE AUTENTICAÇÃO
// ===============================================================
// ▼▼▼ SUBSTITUA A FUNÇÃO onAuthStateChanged INTEIRA POR ESTA ▼▼▼

onAuthStateChanged(auth, (user) => {
  // Pega a nova tela de verificação
  const verifyEmailContainer = document.getElementById('verify-email-container');

  if (user) {
    if (user.emailVerified) {
      // --- CASO 1: Usuário logado E VERIFICADO ---
      currentUser = user;
      authContainer.classList.add('hidden');
      verifyEmailContainer.classList.add('hidden'); // Esconde a tela de verificação
      appContainer.classList.remove('hidden');
      
      userEmailDisplay.textContent = currentUser.email;
      loadData();
      corrigirPalavrasAntigasSemData();

    } else {
      // --- CASO 2: Usuário logado, MAS NÃO VERIFICADO ---
      currentUser = null;
      authContainer.classList.add('hidden');
      appContainer.classList.add('hidden');
      verifyEmailContainer.classList.remove('hidden'); // Mostra a tela de verificação
      
      document.getElementById('verification-email-display').textContent = user.email;
    }
  } else {
    // --- CASO 3: Ninguém logado ---
    currentUser = null;
    if (unsubscribeFromWords) unsubscribeFromWords();
    
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
    verifyEmailContainer.classList.add('hidden');
    
    words = [];
    renderLearnedWords();
  }
});
// ▼▼▼ COLE ESTE BLOCO DE CÓDIGO AQUI ▼▼▼

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  authFeedback.classList.add('hidden');

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // A função onAuthStateChanged cuidará de mostrar a tela certa (app ou verificação)
  } catch (error) {
    if (error.code === 'auth/invalid-login-credentials' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      authFeedback.textContent = "❌ Email ou senha inválidos.";
    } else {
      authFeedback.textContent = "Ocorreu um erro ao entrar.";
    }
    authFeedback.className = 'text-center mt-4 text-red-500';
  }
});

// ▲▲▲ FIM DO BLOCO ▲▲▲

// ▲▲▲ FIM DO BLOCO ▲▲▲

// ▼▼▼ ADICIONE ESTE NOVO BLOCO DE CÓDIGO ▼▼▼

// --- Listeners para a tela de Verificação de E-mail ---
document.getElementById('resend-verification-button').addEventListener('click', async () => {
  const feedbackEl = document.getElementById('verify-feedback');
  feedbackEl.textContent = 'Enviando...';
  feedbackEl.className = 'text-center mt-4 h-5 text-gray-400';
  
  try {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
      feedbackEl.textContent = '✅ E-mail reenviado com sucesso!';
      feedbackEl.className = 'text-center mt-4 h-5 text-green-500';
    }
  } catch (error) {
    feedbackEl.textContent = '❌ Tente novamente em alguns instantes.';
    feedbackEl.className = 'text-center mt-4 h-5 text-red-500';
  }
  setTimeout(() => { feedbackEl.textContent = ''; }, 5000);
});

document.getElementById('back-to-login-button').addEventListener('click', () => {
  signOut(auth);
});

registerButton.addEventListener('click', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  authFeedback.className = 'text-center mt-4 hidden';

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
    
    // Desloga o usuário para forçá-lo a verificar o e-mail antes de entrar
    await signOut(auth);

    authFeedback.textContent = "✅ Conta criada! Verifique seu e-mail para ativá-la.";
    authFeedback.className = 'text-center mt-4 text-green-500';

  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      authFeedback.textContent = "Este email já está registrado. Tente entrar.";
    } else if (error.code === 'auth/weak-password') {
      authFeedback.textContent = "A senha precisa ter pelo menos 6 caracteres.";
    } else {
      authFeedback.textContent = "Ocorreu um erro ao criar a conta.";
    }
    authFeedback.className = 'text-center mt-4 text-red-500';
  }
});

logoutButton.addEventListener('click', () => { signOut(auth); });

// ▼▼▼ ADICIONE ESTE BLOCO NO SEU SCRIPT ▼▼▼
document.getElementById('forgot-password-button').addEventListener('click', async () => {
  const emailInput = document.getElementById('email');
  const email = emailInput.value;
  const feedback = document.getElementById('auth-feedback');

  if (!email) {
    feedback.textContent = "Digite seu e-mail para redefinir a senha.";
    feedback.className = 'text-center mt-4 text-yellow-400';
    emailInput.focus(); // Foca no campo de e-mail
    return;
  }

  feedback.textContent = "Enviando link...";
  feedback.className = 'text-center mt-4 text-gray-400';

  try {
    await sendPasswordResetEmail(auth, email);
    feedback.textContent = "✅ Link enviado! Verifique sua caixa de e-mail (e spam).";
    feedback.className = 'text-center mt-4 text-green-500';
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      feedback.textContent = "❌ E-mail não encontrado.";
    } else {
      feedback.textContent = "Ocorreu um erro. Tente novamente.";
    }
    feedback.className = 'text-center mt-4 text-red-500';
  }
});
// ▲▲▲ FIM DO BLOCO ▲▲▲

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
// ▼▼▼ SUBSTITUA O LISTENER 'submit' DO formAddWord POR ESTE ▼▼▼

formAddWord.addEventListener('submit', async (e) => {
  e.preventDefault();
  const wordValue = inputWord.value.trim();
  const meaningValue = inputMeaning.value.trim();

  document.getElementById('word-error').classList.toggle('hidden', !!wordValue);
  document.getElementById('meaning-error').classList.toggle('hidden', !!meaningValue);

  if (!wordValue || !meaningValue) return;

  if (isDuplicate(words, wordValue)) {
    showAlert(`A palavra "${wordValue}" já existe no seu dicionário.`, "Palavra duplicada");
    return;
  }

  const newWord = {
    word: wordValue,
    meaning: meaningValue,
    context: inputContext.value.trim(),
    image: inputImage.value.trim(),
    category: inputCategorySearch.value.trim() || 'Sem Categoria',
  };

  try {
    const categoryName = newWord.category;
    // Garante que a categoria exista na coleção 'categories'
    if (categoryName !== 'Sem Categoria' && !isDuplicate(categories, categoryName)) {
      await addDoc(collection(db, "categories"), {
        name: categoryName,
        userId: currentUser.uid
      });
    }

    await addWord(newWord);

    formAddWord.reset();
    inputCategorySearch.value = '';
    hideForm();
    
    document.getElementById('modal-word-added').classList.remove('hidden');

  } catch (error) {
    console.error("Erro ao adicionar palavra: ", error);
    showAlert("Ocorreu um erro ao salvar a palavra. Verifique sua conexão e tente novamente.");
  }
});

// ▼▼▼ SUBSTITUA O LISTENER 'submit' DO 'form-edit-word' POR ESTE ▼▼▼

document.getElementById('form-edit-word').addEventListener('submit', async (e) => {
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
    showAlert("Palavra e significado são obrigatórios.");
    return;
  }

  const originalWord = words.find(w => w.id === wordId);
  if (originalWord && updatedData.word !== originalWord.word && isDuplicate(words, updatedData.word, originalWord.word)) {
    showAlert(`A palavra "${updatedData.word}" já existe no seu dicionário.`, "Palavra duplicada");
    return;
  }

  try {
    const categoryName = updatedData.category;
    // Garante que a categoria exista na coleção 'categories'
    if (categoryName !== 'Sem Categoria' && !isDuplicate(categories, categoryName)) {
      await addDoc(collection(db, "categories"), {
        name: categoryName,
        userId: currentUser.uid
      });
    }

    await updateWord(wordId, updatedData);
    document.getElementById('modal-edit-word').classList.add('hidden');

  } catch (error) {
    console.error("Erro ao atualizar palavra: ", error);
    showAlert("Ocorreu um erro ao salvar as alterações.");
  }
});

// ▲▲▲ FIM DO BLOCO DE SUBSTITUIÇÃO ▲▲▲


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
  
  let processedWords = [...words]; // Cria uma cópia para não modificar o array original

  // 1. FILTRAGEM POR DATA (se houver)
  if (selectedDateFilter) {
    const filterDate = new Date(selectedDateFilter + 'T00:00:00'); // Adiciona T00:00:00 para evitar problemas de fuso
    processedWords = processedWords.filter(word => {
      if (!word.createdAt || !word.createdAt.seconds) return false;
      const wordDate = new Date(word.createdAt.seconds * 1000);
      
      // Compara ano, mês e dia para garantir que a data seja a mesma, ignorando a hora
      return wordDate.getFullYear() === filterDate.getFullYear() &&
             wordDate.getMonth() === filterDate.getMonth() &&
             wordDate.getDate() === filterDate.getDate();
    });
  }

  // 2. FILTRAGEM POR TERMO DE BUSCA (depois da data)
  if (searchTerm) {
      processedWords = processedWords.filter(word =>
        word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.meaning?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.context?.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }

  // 3. ORDENAÇÃO (com base no que não é filtro de data)
  if (currentSort === "date") {
    processedWords.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  } else {
    processedWords.sort((a, b) => a.word.localeCompare(b.word));
  }

  // 4. AGRUPAMENTO E RENDERIZAÇÃO
  const grouped = processedWords.reduce((acc, w) => {
    const cat = w.category || 'Sem Categoria';
    if (!acc[cat]) { acc[cat] = []; }
    acc[cat].push(w);
    return acc;
  }, {});
  
  // Garante que o estado da paginação seja resetado a cada nova renderização com filtros
  Object.keys(grouped).forEach(cat => {
      if (paginationState[cat] === undefined) {
          paginationState[cat] = 1; // Começa na página 1
      }
  });
  
  let categoryOrder;
  if (currentSort === 'alphabetical') {
    categoryOrder = Object.keys(grouped).sort();
  } else { 
    categoryOrder = [...new Set(processedWords.map(w => w.category || 'Sem Categoria'))];
  }
  
  if (processedWords.length === 0) {
    learnedWordsContainer.innerHTML = `<p class="text-center text-gray-400">Nenhuma palavra encontrada para os filtros aplicados.</p>`;
    return;
  }
  
  learnedWordsContainer.innerHTML = categoryOrder.map(cat => {
    const wordsInCategory = grouped[cat];
    const totalWords = wordsInCategory.length;
    
    // Lógica de Paginação
    const currentPage = paginationState[cat] || 1;
    const totalPages = Math.ceil(totalWords / wordsPerPage);
    const startIndex = (currentPage - 1) * wordsPerPage;
    const endIndex = startIndex + wordsPerPage;
    const paginatedWords = wordsInCategory.slice(startIndex, endIndex);

    // Gera os botões de paginação
    let paginationControls = '';
    if (totalPages > 1) {
      paginationControls = `
        <div class="flex justify-between items-center mt-3 text-sm">
          <button 
            data-action="paginate" 
            data-category="${cat}" 
            data-direction="prev" 
            ${currentPage === 1 ? 'disabled' : ''}
            class="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <span class="text-gray-400">Página ${currentPage} de ${totalPages}</span>
          <button 
            data-action="paginate" 
            data-category="${cat}" 
            data-direction="next" 
            ${currentPage === totalPages ? 'disabled' : ''}
            class="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próximo
          </button>
        </div>
      `;
    }

    return `
      <div class="space-y-3">
        <h3 class="text-xl font-extrabold text-custom-blue flex items-center gap-2">
          <span>${cat}</span>
          <button class="text-sm text-gray-400 hover:text-white" data-action="edit-category" data-category="${cat}" title="Editar categoria">
            <i class="fas fa-pen"></i>
          </button>
        </h3>
        <ul class="space-y-1">
${paginatedWords.map(w => `
  <li data-word-id="${w.id}" class="rounded-md px-3 py-2 hover:bg-[rgb(92,130,255)] flex justify-between items-center">
    <span data-action="details" class="flex-1 cursor-pointer">${w.word}</span>

    <div class="flex items-center">
      <button data-word="${w.word}" data-action="speak" class="p-2 text-gray-400 hover:text-white" title="Ouvir pronúncia">
        <i class="fas fa-volume-up"></i>
      </button>

      <button data-word-id="${w.id}" data-action="edit" class="ml-2 p-2 text-gray-400 hover:text-white" title="Editar">
        <i class="fas fa-pen"></i>
      </button>
    </div>
  </li>
`).join('')}
        </ul>
        ${paginationControls}
      </div>
    `;
  }).join('');
}

function openModalWordDetails(wordId) {
  const word = words.find(w => w.id === wordId);
  if (!word) return;

  modalWordTitle.innerHTML = `
    <span class="mr-3">${word.word}</span>
    <button id="btn-speak-word" title="Ouvir pronúncia" class="text-gray-400 hover:text-white focus:outline-none text-xl">
        <i class="fas fa-volume-up"></i>
    </button>
  `;

  // O conteúdo do modal continua o mesmo
  modalWordContent.innerHTML = `
    ${word.image ? `<img src="${word.image}" alt="Imagem de ${word.word}" class="w-full max-h-60 object-cover rounded-md mb-4">` : ''}
    <p><strong class="font-semibold text-custom-blue">Significado:</strong><br>${word.meaning.replace(/\n/g, '<br>')}</p>
    ${word.context ? `<p class="mt-2"><strong class="font-semibold text-custom-blue">Contexto/Exemplo:</strong><br>${word.context.replace(/\n/g, '<br>')}</p>` : ''}
    <p class="mt-2 text-sm text-gray-400"><strong>Categoria:</strong> ${word.category || 'Nenhuma'}</p>
  `;

  // --- MODIFICAÇÃO 2: Adiciona a lógica para "falar" a palavra ---
  // Capturamos o botão que acabamos de criar.
  const btnSpeak = document.getElementById('btn-speak-word');
  
  // Adicionamos o evento de clique a ele.
  btnSpeak.addEventListener('click', () => {
    // Cria uma instância de "fala" com a palavra desejada.
    const utterance = new SpeechSynthesisUtterance(word.word);
    
    // Define o idioma para inglês americano (você pode ajustar para 'en-GB' para britânico).
    utterance.lang = 'en-US';
    
    // Pede à API do navegador para falar o texto.
    window.speechSynthesis.speak(utterance);
  });

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
document.getElementById('btn-close-word-added-modal').addEventListener('click', () => {
    document.getElementById('modal-word-added').classList.add('hidden');
});
learnedWordsContainer.addEventListener('click', (e) => {
  const target = e.target;
  const action = target.closest('[data-action]')?.dataset.action;

  if (!action) return;

  const wordId = target.closest('[data-word-id]')?.dataset.wordId;
  const category = target.closest('[data-category]')?.dataset.category;

  if (action === 'details') { openModalWordDetails(wordId); } 
  else if (action === 'edit') { openEditModal(wordId); }
  else if (action === 'edit-category') {
    currentCategoryToEdit = category;
    inputEditCategoryName.value = currentCategoryToEdit;
    modalEditCategory.classList.remove('hidden');
  }
  // --- LÓGICA DE PRONÚNCIA ADICIONADA AQUI ---
  else if (action === 'speak') {
    const wordToSpeak = target.closest('[data-word]').dataset.word;
    if (wordToSpeak) {
        const utterance = new SpeechSynthesisUtterance(wordToSpeak);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    }
  }
  // --- FIM DA ADIÇÃO ---
  else if (action === 'paginate') {
    const direction = target.dataset.direction;
    const cat = target.dataset.category;

    if (direction === 'next') {
      paginationState[cat]++;
    } else if (direction === 'prev') {
      paginationState[cat]--;
    }

    renderLearnedWords(searchLearnedInput.value);
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


// ▼▼▼ SUBSTITUA O LISTENER 'click' DO btnSaveCategory POR ESTE ▼▼▼

btnSaveCategory.addEventListener('click', async () => {
  const newName = inputEditCategoryName.value.trim();
  const oldName = currentCategoryToEdit;

  if (!newName || !oldName || newName === oldName) {
    modalEditCategory.classList.add('hidden');
    return;
  }

  const newCategoryAlreadyExists = isDuplicate(categories, newName);

  try {
    // Atualiza todas as palavras que usavam a categoria antiga
    const wordsQuery = query(collection(db, "palavras"), where("userId", "==", currentUser.uid), where("category", "==", oldName));
    const wordsSnapshot = await getDocs(wordsQuery);
    const updatePromises = wordsSnapshot.docs.map(docSnap => updateDoc(docSnap.ref, { category: newName }));
    await Promise.all(updatePromises);

    // Encontra e deleta o documento da categoria ANTIGA
    const oldCategoryQuery = query(collection(db, "categories"), where("userId", "==", currentUser.uid), where("name", "==", oldName));
    const oldCategorySnapshot = await getDocs(oldCategoryQuery);
    const deletePromises = oldCategorySnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);

    // Se a nova categoria NÃO existia, cria um novo documento para ela
    if (!newCategoryAlreadyExists) {
      await addDoc(collection(db, "categories"), { name: newName, userId: currentUser.uid });
    }

    showAlert(`Categoria "${oldName}" foi renomeada para "${newName}".`, "Sucesso!");
    modalEditCategory.classList.add('hidden');
    currentCategoryToEdit = null;

  } catch (error) {
    console.error("Erro ao renomear categoria:", error);
    showAlert("Ocorreu um erro ao renomear a categoria.", "Erro");
  }
});

// ▲▲▲ FIM DO BLOCO DE SUBSTITUIÇÃO ▲▲▲



btnDeleteCategory.addEventListener('click', () => {
  modalEditCategory.classList.add('hidden');
  confirmModal.classList.remove('hidden');
  wordIdToDelete = '__CATEGORY__' + currentCategoryToEdit;
});

// ▼▼▼ SUBSTITUA O LISTENER 'click' DO btnConfirmDelete POR ESTE ▼▼▼

btnConfirmDelete.addEventListener('click', async () => {
  if (!wordIdToDelete) return;

  try {
    if (wordIdToDelete.startsWith('__CATEGORY__')) {
      const categoryName = wordIdToDelete.replace('__CATEGORY__', '');
      
      // Move todas as palavras para "Sem Categoria"
      const wordsQuery = query(collection(db, "palavras"), where("userId", "==", currentUser.uid), where("category", "==", categoryName));
      const wordsSnapshot = await getDocs(wordsQuery);
      const updatePromises = wordsSnapshot.docs.map(docSnap => updateDoc(docSnap.ref, { category: 'Sem Categoria' }));
      await Promise.all(updatePromises);

      // Deleta a categoria da coleção 'categories'
      const categoryQuery = query(collection(db, "categories"), where("userId", "==", currentUser.uid), where("name", "==", categoryName));
      const categorySnapshot = await getDocs(categoryQuery);
      const deletePromises = categorySnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);
      
      showAlert(`Categoria "${categoryName}" deletada.`, "Sucesso");

    } else {
      // Lógica para deletar uma única palavra (continua a mesma)
      await deleteWord(wordIdToDelete);
    }
  } catch(error) {
    console.error("Erro ao deletar:", error);
    showAlert("Ocorreu um erro durante a exclusão.");
  }

  // Limpa e fecha os modais
  document.getElementById('modal-edit-word').classList.add('hidden');
  confirmModal.classList.add('hidden');
  wordIdToDelete = null;
});

// ▲▲▲ FIM DO BLOCO DE SUBSTITUIÇÃO ▲▲▲

clearSearchButton?.addEventListener('click', () => {
  searchLearnedInput.value = "";
  renderLearnedWords();
  searchLearnedInput.focus();
});

sortLearnedSelect?.addEventListener('change', (e) => {
  paginationState = {}; // Reinicia a paginação a cada nova ordenação
  const selection = e.target.value;

  // --- LÓGICA CORRIGIDA ---

  // 1. Define o método de ordenação (A-Z ou Mais Recente)
  // Se o usuário escolher um método de ordenação principal, nós atualizamos o estado.
  if (selection === 'alphabetical' || selection === 'date') {
      currentSort = selection;
      
      // Ao trocar a ordenação principal, limpamos o filtro de data específico,
      // pois a intenção é ver todas as palavras novamente.
      if (selectedDateFilter) {
        selectedDateFilter = null;
        dateFilterInput.value = '';
        dateFilterContainer.classList.add('hidden');
      }
  }

  // 2. Controla a exibição do filtro de data
  // Se o usuário quiser filtrar por um dia, apenas mostramos o calendário.
  if (selection === 'by-date') {
      dateFilterContainer.classList.remove('hidden');
      // Define a data de hoje se nenhuma estiver selecionada
      if (!dateFilterInput.value) {
          const today = new Date().toISOString().split('T')[0];
          dateFilterInput.value = today;
          selectedDateFilter = today;
      }
  }
  
  // Finalmente, renderiza as palavras com a ordenação e/ou filtro corretos
  renderLearnedWords(searchLearnedInput.value);
});

// Adiciona o listener para quando o usuário escolhe uma data no calendário
dateFilterInput?.addEventListener('input', (e) => {
    selectedDateFilter = e.target.value;
    renderLearnedWords(searchLearnedInput.value);
});

// Adiciona o listener para o botão de limpar o filtro de data
clearDateFilter?.addEventListener('click', () => {
    dateFilterContainer.classList.add('hidden');
    selectedDateFilter = null;
    dateFilterInput.value = '';
    
    // Volta a ordenação para o padrão (A-Z)
    sortLearnedSelect.value = 'alphabetical';
    currentSort = 'alphabetical';

    renderLearnedWords(searchLearnedInput.value);
});
// ▲▲▲ FIM DO NOVO BLOCO ▲▲▲

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
//BACKcup
// ===============================================================
// 6. INICIALIZAÇÃO DA APLICAÇÃO
// ===============================================================
function initialize() {
  updateSidebarState();
  showPage('home');
}
initialize();