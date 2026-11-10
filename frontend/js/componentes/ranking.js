// Tabela de classificação, com animação quando alguém muda de posição.

import { el, fmt, avatar, aoTeclar } from '../util.js';

const DURACAO_SETA_MS = 4000;

export function criarRanking(lista, avisoVazio) {
  let anteriores = new Map(); // nome -> { posicao, pontos } da última vez
  let mudancas = new Map();   // nome -> { delta, em } para as setas ▲ ▼
  let chaveAtual = '';

  function reset() {
    anteriores = new Map();
    mudancas = new Map();
    chaveAtual = '';
    lista.replaceChildren();
  }

  function render(itens, { selecionado, paises, aoSelecionar }) {
    const chave = JSON.stringify(itens.map(i => [i.nome, i.posicao, i.pontos, paises.get(i.nome)]));
    if (chave === chaveAtual) return;
    chaveAtual = chave;

    // Guarda onde cada linha estava, para animar até o novo lugar.
    const topoAntes = new Map([...lista.children].map(li => [li.dataset.nome, li.getBoundingClientRect().top]));
    const tinhaLinhas = topoAntes.size > 0;
    const agora = Date.now();
    const destacar = new Set();

    for (const item of itens) {
      const antes = anteriores.get(item.nome);
      if (!antes) {
        if (tinhaLinhas) destacar.add(item.nome);
        continue;
      }
      if (antes.pontos !== item.pontos) destacar.add(item.nome);
      if (antes.posicao != null && item.posicao != null && antes.posicao !== item.posicao) {
        mudancas.set(item.nome, { delta: antes.posicao - item.posicao, em: agora });
      }
    }
    anteriores = new Map(itens.map(i => [i.nome, { posicao: i.posicao, pontos: i.pontos }]));

    const maximo = Math.max(1, ...itens.map(i => i.pontos));
    lista.replaceChildren(...itens.map(item => linha(item, {
      maximo, agora, destacar, selecionado, paises, aoSelecionar,
    })));

    for (const li of lista.children) {
      const antes = topoAntes.get(li.dataset.nome);
      const depois = li.getBoundingClientRect().top;
      if (antes !== undefined && antes !== depois) {
        li.animate([{ transform: `translateY(${antes - depois}px)` }, { transform: 'none' }],
          { duration: 650, easing: 'cubic-bezier(.2, .8, .2, 1)' });
      } else if (antes === undefined && tinhaLinhas) {
        li.animate([{ opacity: 0, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'none' }], { duration: 350 });
      }
    }
    avisoVazio.hidden = itens.length > 0;
  }

  function linha(item, { maximo, agora, destacar, selecionado, paises, aoSelecionar }) {
    const classes = ['linha'];
    if (item.nome === selecionado) classes.push('selecionado');
    if (destacar.has(item.nome)) classes.push('destaque');
    const medalha = item.posicao >= 1 && item.posicao <= 3 ? ` p${item.posicao}` : '';
    const selecionar = () => aoSelecionar(item.nome);

    return el('li', {
      class: classes.join(' '),
      tabindex: '0',
      dataset: { nome: item.nome },
      onclick: selecionar,
      onkeydown: aoTeclar(selecionar),
    },
      el('span', { class: `posicao${medalha}` }, item.posicao ?? '–'),
      el('div', { class: 'jogador' },
        avatar(item.nome),
        el('div', { class: 'jogador-texto' },
          el('span', { class: 'jogador-nome' }, el('span', { class: 'truncar' }, item.nome), seta(item.nome, agora)),
          el('span', { class: 'jogador-pais' }, paises.get(item.nome) || ''))),
      el('div', { class: 'barra' },
        el('span', { style: { '--largura': `${(item.pontos / maximo * 100).toFixed(1)}%` } })),
      el('span', { class: 'pontos' }, fmt(item.pontos), el('small', {}, ' pts')));
  }

  function seta(nome, agora) {
    const mudanca = mudancas.get(nome);
    if (!mudanca || agora - mudanca.em > DURACAO_SETA_MS) return null;
    const sobe = mudanca.delta > 0;
    return el('span', {
      class: `seta ${sobe ? 'sobe' : 'desce'}`,
      style: { 'animation-delay': `-${agora - mudanca.em}ms` },
    }, `${sobe ? '▲' : '▼'} ${Math.abs(mudanca.delta)}`);
  }

  return { render, reset };
}
