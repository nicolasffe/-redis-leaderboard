// Painel com os detalhes do jogador selecionado e como ele está guardado no Redis.

import { el, fmt, avatar, svg, icones } from '../util.js';

export function criarPainelJogador(raiz, { aoFechar, aoRemover }) {
  let chaveAtual = '';

  function vazio() {
    chaveAtual = '';
    raiz.replaceChildren(el('div', { class: 'painel-vazio' },
      svg(icones.cursor),
      el('strong', {}, 'Nenhum jogador selecionado'),
      el('p', {}, 'Clique em alguém no pódio ou na classificação para ver os detalhes e como os dados ficam no Redis.')));
  }

  function mostrar(dados, vizinhos) {
    const chave = JSON.stringify([dados, vizinhos]);
    if (chave === chaveAtual) return;
    chaveAtual = chave;

    const desde = new Date(dados.criado_em).toLocaleDateString('pt-BR');
    const botaoFechar = el('button', { class: 'botao-icone', type: 'button', title: 'Fechar', 'aria-label': 'Fechar', onclick: aoFechar },
      svg(icones.fechar));

    raiz.replaceChildren(
      el('div', { class: 'perfil' },
        avatar(dados.nome, 'avatar-lg'),
        el('div', { class: 'perfil-texto' },
          el('h3', { class: 'truncar' }, dados.nome),
          el('span', {}, `${dados.pais} · desde ${desde}`)),
        botaoFechar),

      el('div', { class: 'perfil-numeros' },
        numero('Posição', dados.posicao ? `${dados.posicao}º` : '—'),
        numero('Pontos', fmt(dados.pontos)),
        numero('Na semana', fmt(dados.pontos_semana)),
        numero('Partidas', fmt(dados.partidas))),

      el('h4', { class: 'subtitulo' }, 'Vizinhos no ranking'),
      el('ol', { class: 'vizinhos' }, vizinhos.map(v =>
        el('li', { class: v.nome === dados.nome ? 'eu' : null },
          el('span', { class: 'vizinho-pos' }, `${v.posicao}º`),
          avatar(v.nome, 'avatar-xs'),
          el('span', { class: 'truncar' }, v.nome),
          el('span', { class: 'vizinho-pts' }, fmt(v.pontos))))),

      el('h4', { class: 'subtitulo' }, 'Como está no Redis'),
      el('div', { class: 'redis-dados' },
        chaveRedis(`jogador:${dados.nome}`, 'Hash', [
          ['nome', dados.nome],
          ['pais', dados.pais],
          ['criado_em', dados.criado_em],
          ['partidas', dados.partidas],
        ]),
        chaveRedis('ranking:geral', 'Sorted Set', [
          ['membro', dados.nome],
          ['score', dados.pontos],
          ['rank', dados.posicao != null ? dados.posicao - 1 : 'nil'],
        ]),
        chaveRedis('ranking:semanal', 'Sorted Set', [
          ['membro', dados.nome],
          ['score', dados.pontos_semana],
        ])),

      el('button', { class: 'botao botao-perigo', type: 'button', onclick: () => aoRemover(dados.nome) },
        svg(icones.lixeira), 'Remover jogador'),
    );
  }

  return { vazio, mostrar };
}

function numero(rotulo, valor) {
  return el('div', { class: 'numero' }, el('span', {}, rotulo), el('strong', {}, valor));
}

function chaveRedis(nome, tipo, campos) {
  return el('div', { class: 'redis-chave' },
    el('div', { class: 'redis-chave-topo' }, el('code', {}, nome), el('span', { class: 'redis-tipo' }, tipo)),
    el('dl', {}, campos.map(([campo, valor]) => [el('dt', {}, campo), el('dd', {}, valor)])));
}
