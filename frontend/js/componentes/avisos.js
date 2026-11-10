// Notificações rápidas no canto da tela.

import { el } from '../util.js';

const DURACAO_MS = 3200;

export function avisar(texto, tipo = 'sucesso') {
  const aviso = el('div', { class: `aviso aviso-${tipo}`, role: 'status' }, texto);
  document.getElementById('avisos').append(aviso);
  requestAnimationFrame(() => aviso.classList.add('visivel'));
  setTimeout(() => {
    aviso.classList.remove('visivel');
    setTimeout(() => aviso.remove(), 300);
  }, DURACAO_MS);
}
