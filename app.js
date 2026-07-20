const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1qRpptfpc-QhZnNK2NfjGxCFeRBpbWgeb-zFX7PRWLYJXnHIWIKnFKVTV71r5Voj7S2L2s1lFWBDe/pub?gid=0&single=true&output=csv";

/* =====================================================
   NORMALIZAÇÃO DE TEXTOS
===================================================== */

function normalizar(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizarSubpagina(valor) {
  const nome = normalizar(valor);

  const equivalencias = {
    feminino: "femininos",
    femininos: "femininos",

    masculino: "masculinos",
    masculinos: "masculinos",

    "kit presente": "kits presente",
    "kit presentes": "kits presente",
    "kits presente": "kits presente",
    "kits presentes": "kits presente"
  };

  return equivalencias[nome] || nome;
}

/* =====================================================
   SEGURANÇA DO HTML
===================================================== */

function escaparHTML(valor) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =====================================================
   TRATAMENTO DOS LINKS DOS PRODUTOS
===================================================== */

function prepararLink(valor) {
  let link = String(valor || "")
    .trim()
    .replace(/^'+/, "")
    .replace(/\s+/g, "");

  if (!link) {
    return "";
  }

  if (
    !link.startsWith("https://") &&
    !link.startsWith("http://")
  ) {
    link = `https://${link}`;
  }

  try {
    const endereco = new URL(link);

    if (
      endereco.protocol !== "https:" &&
      endereco.protocol !== "http:"
    ) {
      return "";
    }

    return endereco.href;
  } catch (erro) {
    console.warn("Link inválido encontrado:", valor);
    return "";
  }
}

/* =====================================================
   LEITURA DO CSV
===================================================== */

function lerCSV(texto) {
  const linhas = [];
  let linha = [];
  let campo = "";
  let dentroAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const caractere = texto[i];
    const proximo = texto[i + 1];

    if (
      caractere === '"' &&
      dentroAspas &&
      proximo === '"'
    ) {
      campo += '"';
      i++;
    } else if (caractere === '"') {
      dentroAspas = !dentroAspas;
    } else if (
      caractere === "," &&
      !dentroAspas
    ) {
      linha.push(campo);
      campo = "";
    } else if (
      (caractere === "\n" ||
        caractere === "\r") &&
      !dentroAspas
    ) {
      if (
        caractere === "\r" &&
        proximo === "\n"
      ) {
        i++;
      }

      linha.push(campo);

      if (
        linha.some(
          item => String(item).trim() !== ""
        )
      ) {
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

    if (
      linha.some(
        item => String(item).trim() !== ""
      )
    ) {
      linhas.push(linha);
    }
  }

  return linhas;
}

/* =====================================================
   CRIAÇÃO DOS CARDS
===================================================== */

function criarCard(linha) {
  const nome = escaparHTML(linha[1]);
  const preco = escaparHTML(linha[2]);
  const imagem = escaparHTML(linha[3]);
  const descricao = escaparHTML(linha[5]);

  const linkProduto =
    prepararLink(linha[4]);

  const linkSeguro =
    escaparHTML(linkProduto);

  return `
    <article class="card">

      ${
        imagem
          ? `
            <img
              src="${imagem}"
              alt="${nome}"
              loading="lazy"
              referrerpolicy="no-referrer"
              onerror="this.style.display='none'"
            >
          `
          : ""
      }

      <div class="conteudo">

        <div class="nome">
          ${nome}
        </div>

        ${
          descricao
            ? `
              <div class="descricao">
                ${descricao}
              </div>
            `
            : ""
        }

        ${
          preco
            ? `
              <div class="preco">
                ${preco}
              </div>
            `
            : ""
        }

        ${
          linkSeguro
            ? `
              <a
                class="botao"
                href="${linkSeguro}"
                target="_blank"
                rel="noopener noreferrer sponsored"
                aria-label="Ver produto ${nome}"
              >
                Ver produto
              </a>
            `
            : `
              <div class="botao indisponivel">
                Link indisponível
              </div>
            `
        }

      </div>
    </article>
  `;
}

/* =====================================================
   PARÂMETROS DA URL
===================================================== */

const parametros =
  new URLSearchParams(
    window.location.search
  );

const paginaInformada =
  parametros.get("pagina") || "";

const subpaginaInformada =
  parametros.get("subpagina") || "";

const PAGINA =
  normalizar(paginaInformada);

const SUBPAGINA =
  normalizarSubpagina(
    subpaginaInformada
  );

/* =====================================================
   CARREGAMENTO DOS PRODUTOS
===================================================== */

async function carregarProdutos() {
  const mensagem =
    document.getElementById("mensagem");

  const container =
    document.getElementById("produtos");

  if (!mensagem || !container) {
    console.error(
      'Os elementos com id="mensagem" e id="produtos" não foram encontrados.'
    );
    return;
  }

  if (!PAGINA || !SUBPAGINA) {
    mensagem.textContent =
      "Página ou subpágina não informada no endereço.";
    return;
  }

  try {
    const resposta = await fetch(
      `${CSV_URL}&v=${Date.now()}`,
      {
        cache: "no-store"
      }
    );

    if (!resposta.ok) {
      throw new Error(
        `Erro HTTP ${resposta.status}`
      );
    }

    const texto =
      await resposta.text();

    const linhas =
      lerCSV(texto);

    if (linhas.length < 2) {
      throw new Error(
        "A planilha não retornou produtos."
      );
    }

    const produtos =
      linhas
        .slice(1)
        .filter(linha => {
          const ativo =
            normalizar(linha[6]);

          const pagina =
            normalizar(linha[7]);

          const subpagina =
            normalizarSubpagina(
              linha[8]
            );

          return (
            ativo === "sim" &&
            pagina === PAGINA &&
            subpagina === SUBPAGINA
          );
        });

    if (!produtos.length) {
      mensagem.textContent =
        `Nenhum produto encontrado em ${paginaInformada} / ${subpaginaInformada}.`;

      container.innerHTML = "";
      return;
    }

    container.innerHTML =
      produtos
        .map(criarCard)
        .join("");

    mensagem.style.display = "none";
  } catch (erro) {
    console.error(erro);

    mensagem.innerHTML =
      "Não foi possível carregar os produtos.<br>" +
      "Confira se a aba Produtos continua publicada na web em formato CSV.";
  }
}

carregarProdutos();
