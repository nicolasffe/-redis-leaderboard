// Funções auxiliares usadas por toda a página.

export const fmt = numero => Number(numero).toLocaleString('pt-BR');

// Coloca aspas em valores com espaço, como o redis-cli exige.
export const q = valor => (/[\s"']/.test(valor) ? JSON.stringify(valor) : valor);

// Cria um elemento: el('li', { class: 'linha', onclick: fn }, 'texto', outroElemento)
export function el(tag, props = {}, ...filhos) {
  const no = document.createElement(tag);
  for (const [chave, valor] of Object.entries(props)) {
    if (valor == null || valor === false) continue;
    if (chave === 'class') no.className = valor;
    else if (chave === 'dataset') Object.assign(no.dataset, valor);
    else if (chave === 'style') for (const [prop, v] of Object.entries(valor)) no.style.setProperty(prop, v);
    else if (chave.startsWith('on')) no.addEventListener(chave.slice(2), valor);
    else no.setAttribute(chave, valor === true ? '' : valor);
  }
  for (const filho of filhos.flat(Infinity)) {
    if (filho == null || filho === false || filho === '') continue;
    no.append(filho instanceof Node ? filho : String(filho));
  }
  return no;
}

export function svg(marcacao) {
  const modelo = document.createElement('template');
  modelo.innerHTML = marcacao.trim();
  return modelo.content.firstElementChild;
}

const icone = desenho => `<svg class="icone" viewBox="0 0 24 24" aria-hidden="true">${desenho}</svg>`;
export const icones = {
  coroa: icone('<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>'),
  fechar: icone('<path d="M18 6 6 18M6 6l12 12"/>'),
  lixeira: icone('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
  cursor: icone('<path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>'),
};

// Ativa com Enter ou espaço, para elementos clicáveis que não são <button>.
export const aoTeclar = acao => evento => {
  if (evento.key === 'Enter' || evento.key === ' ') {
    evento.preventDefault();
    acao();
  }
};

export function iniciais(nome) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const texto = partes.length > 1 ? partes[0][0] + partes[1][0] : nome.trim().slice(0, 2);
  return texto.toUpperCase();
}

// Cor fixa por nome, para cada jogador ter sempre o mesmo avatar.
export function corDoNome(nome) {
  let tom = 0;
  for (const letra of nome) tom = (tom * 31 + letra.codePointAt(0)) % 360;
  return `hsl(${tom} 58% 46%)`;
}

export function avatar(nome, tamanho = '') {
  return el('span', {
    class: `avatar ${tamanho}`.trim(),
    style: { '--cor': corDoNome(nome) },
    'aria-hidden': 'true',
  }, iniciais(nome));
}

export function duracao(segundos) {
  let s = Math.max(0, Math.round(segundos));
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60); s %= 60;
  const dois = n => String(n).padStart(2, '0');
  return `${d}d ${dois(h)}h ${dois(m)}m ${dois(s)}s`;
}
