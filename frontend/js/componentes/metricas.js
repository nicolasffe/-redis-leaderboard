// Cartões de números no topo da página.

import { el, fmt, avatar, duracao } from '../util.js';

const $ = id => document.getElementById(id);

// O TTL chega a cada 2 s; entre uma resposta e outra a contagem segue no navegador.
let ttl = null;
let recebidoEm = 0;

export function renderMetricas(estatisticas) {
  $('m-total').textContent = fmt(estatisticas.total_jogadores);
  $('m-semana').textContent = fmt(estatisticas.jogadores_na_semana ?? 0);

  const { lider } = estatisticas;
  $('m-lider').replaceChildren(...(lider
    ? [avatar(lider.nome, 'avatar-sm'), el('span', { class: 'truncar' }, lider.nome), el('small', {}, `${fmt(lider.pontos)} pts`)]
    : ['—']));

  ttl = estatisticas.ranking_semanal_expira_em_segundos;
  recebidoEm = Date.now();
  renderTTL();
}

function renderTTL() {
  $('m-ttl').textContent = ttl == null ? '—' : duracao(ttl - (Date.now() - recebidoEm) / 1000);
}

export function iniciarRelogioTTL() {
  setInterval(renderTTL, 1000);
}
