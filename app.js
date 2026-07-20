const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1qRpptfpc-QhZnNK2NfjGxCFeRbpbWgeb-zFX7PRWLYJXnHIWIKnFKVTV71r5Voi7S2L2s1IEWBDe/pub?gid=0&single=true&output=csv";

function normalizar(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escaparHTML(valor) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function lerCSV(texto) {
  const linhas = [];
  let linha = [];
  let campo = "";
  let dentroAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    const prox = texto[i + 1];

    if (c === '"' && dentroAspas && prox === '"') {
      campo += '"';
      i++;
    } else if (c === '"') {
      dentroAspas = !dentroAspas;
    } else if (c === "," && !dentroAspas) {
      linha.push(campo);
      campo = "";
    } else if ((c === "\n" || c === "\r") && !dentroAspas) {
      if (c === "\r" && prox === "\n") i++;
      linha.push(campo);

      if (linha.some(item => String(item).trim() !== "")) {
        linhas.push(linha);
      }

      linha = [];
      campo = "";
    } else {
      campo += c;
    }
  }

  if (campo.length || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }

  return linhas;
}

function criarCard(linha) {
  const nome = escaparHTML(linha[1]);
  const preco = escaparHTML(linha[2]);
  const imagem = escaparHTML(linha[3]);
  const link = escaparHTML(linha[4]);
  const descricao = escaparHTML(linha[5]);

  return `
    <article class="card">
      ${imagem ? `
        <img
          src="${imagem}"
          alt="${nome}"
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="this.style.display='none'"
        >
      ` : ""}

      <div class="conteudo">
        <div class="nome">${nome}</div>
        ${descricao ? `<div class="descricao">${descricao}</div>` : ""}
        ${preco ? `<div class="preco">${preco}</div>` : ""}

        <a
          class="botao"
          href="${link}"
          target="_blank"
          rel="noopener noreferrer"
        >
          Ver produto
        </a>
      </div>
    </article>
  `;
}

async function carregarProdutos() {
  const mensagem = document.getElementById("mensagem");
  const container = document.getElementById("produtos");

  try {
    const resposta = await fetch(`${CSV_URL}&v=${Date.now()}`, {
      cache: "no-store"
    });

    if (!resposta.ok) {
      throw new Error(`Erro HTTP ${resposta.status}`);
    }

    const texto = await resposta.text();
    const linhas = lerCSV(texto);

    if (linhas.length < 2) {
      throw new Error("A planilha não retornou produtos.");
    }

    const produtos = linhas.slice(1).filter(linha => {
      const ativo = normalizar(linha[6]);
      const pagina = normalizar(linha[7]);
      const subpagina = normalizar(linha[8]);

      return ativo === "sim"
        && pagina === "perfumes"
        && (subpagina === "femininos" || subpagina === "feminino");
    });

    if (!produtos.length) {
      mensagem.textContent = "Nenhum perfume feminino encontrado.";
      return;
    }

    container.innerHTML = produtos.map(criarCard).join("");
    mensagem.style.display = "none";

  } catch (erro) {
    console.error(erro);
    mensagem.innerHTML =
      "Não foi possível carregar os produtos.<br>" +
      "Confira se a aba Produtos continua publicada na web em formato CSV.";
  }
}

carregarProdutos();
