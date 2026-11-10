// Console no estilo do redis-cli, com os comandos de cada ação.

import { el } from '../util.js';

const MAXIMO_BLOCOS = 30;

export function criarConsole(corpo) {
  function limpar() {
    corpo.replaceChildren(el('p', { class: 'console-vazio' }, '# Os comandos executados no Redis aparecem aqui.'));
  }

  function registrar(titulo, linhas) {
    corpo.querySelector('.console-vazio')?.remove();
    const bloco = el('div', { class: 'console-bloco' },
      el('div', { class: 'console-comentario' },
        el('span', {}, `# ${titulo}`),
        el('time', {}, new Date().toLocaleTimeString('pt-BR'))),
      linhas.map(linha => {
        const [comando, ...argumentos] = linha.split(' ');
        return el('div', { class: 'console-linha' },
          el('span', { class: 'console-prompt' }, 'redis>'),
          el('span', { class: 'console-cmd' }, comando),
          argumentos.length ? ` ${argumentos.join(' ')}` : '');
      }));
    corpo.append(bloco);
    const blocos = corpo.querySelectorAll('.console-bloco');
    for (let i = 0; i < blocos.length - MAXIMO_BLOCOS; i++) blocos[i].remove();
    corpo.scrollTop = corpo.scrollHeight;
  }

  limpar();
  return { registrar, limpar };
}
