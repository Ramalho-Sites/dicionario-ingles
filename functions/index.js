// ════════════════════════════════════════════════════════════════
// Firebase Cloud Functions — Proxy seguro para Gemini e Pexels
// Projeto: dicionario-ingles
// ════════════════════════════════════════════════════════════════

const functions = require("firebase-functions");
const fetch     = require("node-fetch");

// ── Lê as chaves do ambiente seguro do Firebase ──────────────────
// Para configurar, rode no terminal:
//   firebase functions:config:set gemini.key="SUA_CHAVE"
//   firebase functions:config:set pexels.key="SUA_CHAVE"
const GEMINI_KEY = functions.config().gemini?.key;
const PEXELS_KEY = functions.config().pexels?.key;

// ── Helper: cabeçalhos CORS ──────────────────────────────────────
// Permite chamadas apenas do seu domínio GitHub Pages.
// Ajuste a origem se mudar de domínio.
const ALLOWED_ORIGIN = "https://ramalho-sites.github.io";

function setCors(res) {
  res.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// ── Helper: verifica Firebase Auth token ────────────────────────
// Garante que apenas usuários autenticados usem as funções.
const admin = require("firebase-admin");
admin.initializeApp();

async function verifyToken(req, res) {
  const authHeader = req.headers.authorization || "";
  const idToken    = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) {
    res.status(401).json({ error: "Token ausente." });
    return null;
  }
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded;
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado." });
    return null;
  }
}

// ════════════════════════════════════════════════════════════════
// FUNÇÃO 1 — geminiContext
// Recebe: { word: "resilience" }
// Retorna: { meaning, translation, context, category }
// ════════════════════════════════════════════════════════════════
exports.geminiContext = functions
  .region("us-central1")
  .https.onRequest(async (req, res) => {

    setCors(res);

    // Responde ao preflight CORS (OPTIONS)
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Método não permitido." });
      return;
    }

    // Verifica autenticação
    const user = await verifyToken(req, res);
    if (!user) return;

    const { word } = req.body;
    if (!word || typeof word !== "string" || word.trim().length === 0) {
      res.status(400).json({ error: "Campo 'word' é obrigatório." });
      return;
    }

    if (!GEMINI_KEY) {
      res.status(500).json({ error: "Chave Gemini não configurada no servidor." });
      return;
    }

    const prompt = `Você é um especialista em ensino de inglês para brasileiros.

Para a palavra em inglês "${word.trim()}", forneça:

1. Significado em português: objetivo e claro, máximo 2 linhas. Comece com o tipo gramatical entre parênteses — ex: "(substantivo)" ou "(verbo)". Se a palavra tiver múltiplos significados comuns, liste até 3 dos mais usados, numerados.

2. Tradução direta: apenas a(s) palavra(s) em português mais usadas para traduzir "${word.trim()}". Ex: "escuro, sombrio" ou "correr, fluir". Máximo 5 palavras.

3. Exemplos de uso: crie até 3 exemplos (um por significado principal). O campo "context" deve ser UMA ÚNICA STRING com os exemplos separados por \\n\\n. Cada exemplo ocupa duas linhas:
🇺🇸 frase em inglês de 10 a 18 palavras, concreta e do cotidiano real
🇧🇷 tradução em português da frase acima

4. Categoria em português: escolha a mais específica — Substantivo, Verbo, Adjetivo, Advérbio, Phrasal Verb, Expressão Idiomática, Negócios, Tecnologia, Cotidiano, Acadêmico, Gíria, Viagens, Saúde, Finanças.

Responda SOMENTE com JSON puro, sem markdown, sem texto extra. O campo context DEVE ser uma string, nunca um array:
{"meaning":"...","translation":"...","context":"🇺🇸 exemplo1 em inglês\\n🇧🇷 tradução1\\n\\n🇺🇸 exemplo2 em inglês\\n🇧🇷 tradução2","category":"..."}`;

    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
          })
        }
      );

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.error("Gemini API error:", errText);
        res.status(502).json({ error: `Erro na Gemini API: ${geminiRes.status}` });
        return;
      }

      const data = await geminiRes.json();
      const raw  = data.candidates[0].content.parts[0].text
        .replace(/```json|```/g, "")
        .trim();

      const parsed = JSON.parse(raw);
      res.status(200).json(parsed);

    } catch (err) {
      console.error("geminiContext error:", err);
      res.status(500).json({ error: "Erro interno ao chamar Gemini." });
    }
  });

// ════════════════════════════════════════════════════════════════
// FUNÇÃO 2 — pexelsImage
// Recebe: { word: "resilience" }
// Retorna: { photos: ["url1", "url2", ...] }
// ════════════════════════════════════════════════════════════════
exports.pexelsImage = functions
  .region("us-central1")
  .https.onRequest(async (req, res) => {

    setCors(res);

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Método não permitido." });
      return;
    }

    // Verifica autenticação
    const user = await verifyToken(req, res);
    if (!user) return;

    const { word } = req.body;
    if (!word || typeof word !== "string" || word.trim().length === 0) {
      res.status(400).json({ error: "Campo 'word' é obrigatório." });
      return;
    }

    if (!PEXELS_KEY) {
      res.status(500).json({ error: "Chave Pexels não configurada no servidor." });
      return;
    }

    try {
      const pexelsRes = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(word.trim())}&per_page=5&orientation=landscape`,
        { headers: { Authorization: PEXELS_KEY } }
      );

      if (!pexelsRes.ok) {
        console.error("Pexels API error:", pexelsRes.status);
        res.status(502).json({ error: `Erro na Pexels API: ${pexelsRes.status}` });
        return;
      }

      const data   = await pexelsRes.json();
      const photos = (data.photos || []).map(p => p.src.large);
      res.status(200).json({ photos });

    } catch (err) {
      console.error("pexelsImage error:", err);
      res.status(500).json({ error: "Erro interno ao chamar Pexels." });
    }
  });