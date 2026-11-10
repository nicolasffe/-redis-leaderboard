// Comandos que app/ranking.py executa no Redis em cada ação.
// Servem só para exibir no console da página; quem executa é a API.

import { q } from './util.js';

const TTL_SEMANAL = 7 * 24 * 60 * 60;
const chaveJogador = nome => q(`jogador:${nome}`);

export const comandos = {
  visao(visao, top, faixa) {
    if (visao === 'faixa') return `ZREVRANGEBYSCORE ranking:geral ${faixa.max} ${faixa.min} WITHSCORES`;
    const chave = visao === 'semanal' ? 'ranking:semanal' : 'ranking:geral';
    return `ZREVRANGE ${chave} 0 ${top - 1} WITHSCORES`;
  },

  consultar(nome, posicao) {
    const indice = (posicao ?? 1) - 1;
    return [
      `HGETALL ${chaveJogador(nome)}`,
      `ZSCORE ranking:geral ${q(nome)}`,
      `ZREVRANK ranking:geral ${q(nome)}`,
      `ZSCORE ranking:semanal ${q(nome)}`,
      `ZREVRANGE ranking:geral ${Math.max(indice - 2, 0)} ${indice + 2} WITHSCORES`,
    ];
  },

  somarPontos(nome, pontos) {
    return [
      `EXISTS ${chaveJogador(nome)}`,
      'MULTI',
      `ZINCRBY ranking:geral ${pontos} ${q(nome)}`,
      `ZINCRBY ranking:semanal ${pontos} ${q(nome)}`,
      `EXPIRE ranking:semanal ${TTL_SEMANAL} NX`,
      `HINCRBY ${chaveJogador(nome)} partidas 1`,
      'EXEC',
    ];
  },

  criar(nome, pais) {
    return [
      `EXISTS ${chaveJogador(nome)}`,
      'MULTI',
      `HSET ${chaveJogador(nome)} nome ${q(nome)} pais ${q(pais)} criado_em <agora> partidas 0`,
      `ZADD ranking:geral NX 0 ${q(nome)}`,
      'EXEC',
    ];
  },

  remover(nome) {
    return [
      'MULTI',
      `DEL ${chaveJogador(nome)}`,
      `ZREM ranking:geral ${q(nome)}`,
      `ZREM ranking:semanal ${q(nome)}`,
      'EXEC',
    ];
  },
};
