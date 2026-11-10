// Pódio com os três primeiros do ranking geral.

import { el, fmt, avatar, svg, icones, aoTeclar } from '../util.js';

const ORDEM_NA_TELA = [2, 1, 3]; // 2º à esquerda, 1º no centro, 3º à direita

let chaveAtual = '';
let nomesAnteriores = [];

export function renderPodio(raiz, top3, { selecionado, paises, aoSelecionar }) {
  const chave = JSON.stringify(top3.map(j => [j.nome, j.pontos, paises.get(j.nome)]));
  if (chave === chaveAtual) return;
  chaveAtual = chave;

  const antes = nomesAnteriores;
  nomesAnteriores = top3.map(j => j.nome);

  raiz.replaceChildren(...ORDEM_NA_TELA.map(posicao => {
    const jogador = top3[posicao - 1];
    const base = el('div', { class: 'degrau-base' }, `${posicao}º`);

    if (!jogador) {
      return el('div', { class: `degrau degrau-${posicao} vazio` },
        el('div', { class: 'degrau-topo' },
          el('span', { class: 'avatar avatar-lg avatar-vazio' }, '?'),
          el('strong', { class: 'degrau-nome' }, 'Vago')),
        base);
    }

    const classes = ['degrau', `degrau-${posicao}`];
    if (jogador.nome === selecionado) classes.push('selecionado');
    if (antes.length && antes[posicao - 1] !== jogador.nome) classes.push('entrou');

    let coroa = null;
    if (posicao === 1) {
      coroa = svg(icones.coroa);
      coroa.classList.add('coroa');
    }
    const selecionar = () => aoSelecionar(jogador.nome);

    return el('div', {
      class: classes.join(' '),
      role: 'button',
      tabindex: '0',
      'aria-label': `${posicao}º lugar: ${jogador.nome}`,
      dataset: { nome: jogador.nome },
      onclick: selecionar,
      onkeydown: aoTeclar(selecionar),
    },
      el('div', { class: 'degrau-topo' },
        coroa,
        avatar(jogador.nome, 'avatar-lg'),
        el('strong', { class: 'degrau-nome truncar' }, jogador.nome),
        el('span', { class: 'degrau-pais' }, paises.get(jogador.nome) || ''),
        el('span', { class: 'degrau-pontos' }, fmt(jogador.pontos), el('small', {}, ' pts'))),
      base);
  }));
}
