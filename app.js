const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1qRpptfpc-QhZnNK2NfjGxCFeRbpbWgeb-zFX7PRWLYJXnHIWIKnFKVTV71r5Voi7S2L2s1IEWBDe/pub?gid=0&single=true&output=csv";

function lerCSV(texto) {
  const linhas = [];
  let linha = [];
  let campo = "";
  let dentroAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const caractere = texto[i];
    const proximo = texto[i + 1];

    if (caractere === '"' && dentroAspas && proximo === '"') {
      campo += '"';
      i++;
    } else if (caractere === '"') {
      dentroAspas = !dentroAspas;
    } else if (caractere === "," && !dentroAspas) {
      linha.push(campo);
      campo = "";
    } else if ((caractere === "\n" || caractere === "\r") && !dentroAspas) {
      if (caractere === "\r" && proximo === "\n") i++;
      linha.push(campo);

      if (linha.some(valor => valor.trim() !== "")) {
        linhas.push(linha);
      }

      linha = [];
      campo = "";
    } else {
      campo += caractere;
    }
  }

  if (campo.length || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }

  return linhas;
}

function escaparHTML(valor) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function carregarProdutos() {
  const mensagem = document.getElementById("mensagem");
  const container = document.getElementById("produtos");

  try {
    const resposta = await fetch(CSV_URL, { cache: "no-store" });

    if (!resposta.ok) {
      throw new Error("Falha ao acessar a planilha.");
    }

    const texto = await resposta.text();
    const linhas = lerCSV(texto);

    const produtos = linhas.slice(1).filter(linha => {
      const ativo = (linha[6] || "").trim().toUpperCase();
      const pagina = (linha[7] || "").trim().toLowerCase();
      const subpagina = (linha[8] || "").trim().toLowerCase();

      return ativo === "SIM"
        && pagina === "perfumes"
        && (subpagina === "femininos" || subpagina === "feminino");
    });

    if (!produtos.length) {
      mensagem.textContent = "Nenhum perfume feminino encontrado.";
      return;
    }

    mensagem.style.display = "none";

    container.innerHTML = produtos.map(linha => {
      const nome = escaparHTML(linha[1]);
      const preco = escaparHTML(linha[2]);
      const imagem = escaparHTML(linha[3]);
      const link = escaparHTML(linha[4]);
      const descricao = escaparHTML(linha[5]);

      return `
        <article class="card">
          <img src="${imagem}" alt="${nome}" loading="lazy"
               onerror="this.style.display='none'">

          <div class="conteudo">
            <div class="nome">${nome}</div>
            ${descricao ? `<div class="descricao">${descricao}</div>` : ""}
            ${preco ? `<div class="preco">${preco}</div>` : ""}

            <a class="botao"
               href="${link}"
               target="_blank"
               rel="noopener noreferrer">
              Ver produto
            </a>
          </div>
        </article>
      `;
    }).join("");

  } catch (erro) {
    console.error(erro);
    mensagem.innerHTML =
      "Não foi possível carregar os produtos.<br>Confira se a planilha continua publicada na web.";
  }
}

carregarProdutos();
