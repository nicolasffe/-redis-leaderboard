// Ponto de entrada da página: estado, atualização automática e eventos.

import { api } from './api.js';
import { comandos } from './comandos.js';
import { el, fmt } from './util.js';
import { avisar } from './componentes/avisos.js';
import { criarConsole } from './componentes/console.js';
import { renderMetricas, iniciarRelogioTTL } from './componentes/metricas.js';
import { renderPodio } from './componentes/podio.js';
import { criarRanking } from './componentes/ranking.js';
import { criarPainelJogador } from './componentes/jogador.js';

const INTERVALO_MS = 2000;
const $ = seletor => document.querySelector(seletor);

const DESCRICOES = {
  geral: 'Pontuação acumulada de todos os tempos',
  semanal: 'Pontos da semana · a chave expira sozinha após 7 dias',
  faixa: 'Jogadores dentro de uma faixa de pontos',
};

const estado = {
  visao: 'geral',
  top: 10,
  faixa: { min: 0, max: 1000 },
  selecionado: null,
  paises: new Map(), // nome -> país, lido do Hash jogador:<nome>
  versao: 0,         // descarta respostas antigas quando já existe uma mais nova
};

const consoleRedis = criarConsole($('#console'));
const ranking = criarRanking($('#lista'), $('#lista-vazia'));
const painel = criarPainelJogador($('#painel-jogador'), { aoFechar: fecharJogador, aoRemover: removerJogador });

/* ---------- Atualização dos dados ---------- */

async function atualizar() {
  const versao = ++estado.versao;
  try {
    const [geral, estatisticas] = await Promise.all([api.ranking(100), api.estatisticas()]);
    const itens = await itensDaVisao(geral);
    await carregarPaises([...geral.slice(0, 3), ...itens].map(item => item.nome));
    if (versao !== estado.versao) return;

    const contexto = { selecionado: estado.selecionado, paises: estado.paises, aoSelecionar: selecionar };
    definirConexao(true);
    renderMetricas(estatisticas);
    renderPodio($('#podio'), geral.slice(0, 3), contexto);
    ranking.render(itens, contexto);
    atualizarSugestoes(geral);
  } catch {
    if (versao === estado.versao) definirConexao(false);
  }
}

async function itensDaVisao(geral) {
  if (estado.visao === 'geral') return geral.slice(0, estado.top);
  if (estado.visao === 'semanal') return api.rankingSemanal(estado.top);
  const posicoes = new Map(geral.map(g => [g.nome, g.posicao]));
  const lista = await api.faixa(estado.faixa.min, estado.faixa.max);
  return lista.map(item => ({ ...item, posicao: posicoes.get(item.nome) ?? null }));
}

// O país fica no Hash de cada jogador; busca só os que ainda não conhecemos.
async function carregarPaises(nomes) {
  const faltando = [...new Set(nomes)].filter(nome => !estado.paises.has(nome));
  await Promise.all(faltando.map(async nome => {
    try {
      estado.paises.set(nome, (await api.jogador(nome)).pais);
    } catch {
      // jogador removido entre uma chamada e outra
    }
  }));
}

function definirConexao(online) {
  $('#status').className = `status ${online ? 'online' : 'offline'}`;
  $('#status-texto').textContent = online ? 'Redis conectado' : 'API ou Redis fora do ar';
}

let chaveSugestoes = '';
function atualizarSugestoes(geral) {
  const nomes = geral.map(g => g.nome).sort((a, b) => a.localeCompare(b));
  const chave = nomes.join('|');
  if (chave === chaveSugestoes) return;
  chaveSugestoes = chave;
  $('#sugestoes').replaceChildren(...nomes.map(nome => el('option', { value: nome })));
}

/* ---------- Jogador selecionado ---------- */

function marcarSelecionado() {
  document.querySelectorAll('.linha[data-nome], .degrau[data-nome]')
    .forEach(no => no.classList.toggle('selecionado', no.dataset.nome === estado.selecionado));
}

function selecionar(nome, { registrar = true } = {}) {
  estado.selecionado = nome;
  $('#partida-nome').value = nome;
  mostrarAcao('partida');
  marcarSelecionado();
  atualizarJogador(registrar);
}

function fecharJogador() {
  estado.selecionado = null;
  marcarSelecionado();
  painel.vazio();
}

async function atualizarJogador(registrar = false) {
  const nome = estado.selecionado;
  if (!nome) return;
  try {
    const [dados, vizinhos] = await Promise.all([api.jogador(nome), api.vizinhos(nome)]);
    if (estado.selecionado !== nome) return;
    estado.paises.set(nome, dados.pais);
    painel.mostrar(dados, vizinhos);
    if (registrar) consoleRedis.registrar(`Consultar ${nome}`, comandos.consultar(nome, dados.posicao));
  } catch (erro) {
    if (erro.status === 404 && estado.selecionado === nome) fecharJogador();
  }
}

async function removerJogador(nome) {
  if (!confirm(`Remover ${nome} do ranking? O jogador será apagado do Redis.`)) return;
  try {
    await api.removerJogador(nome);
    consoleRedis.registrar(`Remover ${nome}`, comandos.remover(nome));
    avisar(`${nome} foi removido do ranking`);
    estado.paises.delete(nome);
    fecharJogador();
    if ($('#partida-nome').value === nome) $('#partida-nome').value = '';
    atualizar();
  } catch (erro) {
    avisar(erro.message, 'erro');
  }
}

/* ---------- Visões do ranking ---------- */

function aplicarVisao({ registrar }) {
  document.querySelectorAll('[data-visao]')
    .forEach(botao => botao.classList.toggle('ativo', botao.dataset.visao === estado.visao));
  $('#descricao-visao').textContent = DESCRICOES[estado.visao];
  $('#filtro-top').hidden = estado.visao === 'faixa';
  $('#form-faixa').hidden = estado.visao !== 'faixa';

  const comando = comandos.visao(estado.visao, estado.top, estado.faixa);
  $('#comando-visao').textContent = comando;
  if (registrar) consoleRedis.registrar(rotuloVisao(), [comando]);

  ranking.reset();
  atualizar();
}

function rotuloVisao() {
  if (estado.visao === 'faixa') return `Jogadores entre ${fmt(estado.faixa.min)} e ${fmt(estado.faixa.max)} pts`;
  return `Top ${estado.top} ${estado.visao === 'semanal' ? 'da semana' : 'geral'}`;
}

/* ---------- Ações ---------- */

function mostrarAcao(acao) {
  document.querySelectorAll('[data-acao]').forEach(botao => botao.classList.toggle('ativo', botao.dataset.acao === acao));
  document.querySelectorAll('[data-painel]').forEach(form => { form.hidden = form.dataset.painel !== acao; });
}

async function enviar(form, tarefa) {
  const botao = form.querySelector('[type=submit]');
  botao.disabled = true;
  try {
    await tarefa();
  } catch (erro) {
    avisar(erro.message, 'erro');
  } finally {
    botao.disabled = false;
  }
}

/* ---------- Eventos ---------- */

document.querySelectorAll('[data-visao]').forEach(botao => botao.addEventListener('click', () => {
  if (estado.visao === botao.dataset.visao) return;
  estado.visao = botao.dataset.visao;
  aplicarVisao({ registrar: true });
}));

$('#top').addEventListener('change', evento => {
  estado.top = Number(evento.target.value);
  aplicarVisao({ registrar: true });
});

$('#form-faixa').addEventListener('submit', evento => {
  evento.preventDefault();
  const min = Number($('#faixa-min').value || 0);
  const max = Number($('#faixa-max').value || 0);
  if (min > max) {
    avisar('O mínimo não pode ser maior que o máximo', 'erro');
    return;
  }
  estado.faixa = { min, max };
  aplicarVisao({ registrar: true });
});

document.querySelectorAll('[data-acao]').forEach(botao =>
  botao.addEventListener('click', () => mostrarAcao(botao.dataset.acao)));

$('#form-partida').addEventListener('submit', evento => {
  evento.preventDefault();
  const nome = $('#partida-nome').value.trim();
  const pontos = parseInt($('#partida-pontos').value, 10);
  if (!nome || !(pontos > 0)) {
    avisar('Informe o jogador e pontos maiores que zero', 'erro');
    return;
  }
  enviar(evento.currentTarget, async () => {
    const resposta = await api.somarPontos(nome, pontos);
    consoleRedis.registrar(`+${fmt(pontos)} pontos para ${nome}`, comandos.somarPontos(nome, pontos));
    avisar(`${nome} agora tem ${fmt(resposta.pontos_totais)} pontos`);
    estado.selecionado = nome;
    marcarSelecionado();
    await atualizar();
    atualizarJogador();
  });
});

document.querySelectorAll('.chip').forEach(chip => chip.addEventListener('click', () => {
  $('#partida-pontos').value = chip.dataset.pontos;
  $('#form-partida').requestSubmit();
}));

$('#form-jogador').addEventListener('submit', evento => {
  evento.preventDefault();
  const form = evento.currentTarget;
  const nome = $('#novo-nome').value.trim();
  const pais = $('#novo-pais').value.trim();
  enviar(form, async () => {
    await api.criarJogador(nome, pais);
    consoleRedis.registrar(`Cadastrar ${nome}`, comandos.criar(nome, pais));
    avisar(`${nome} entrou no ranking. Registre a primeira partida!`);
    form.reset();
    estado.paises.set(nome, pais);
    selecionar(nome, { registrar: false });
    atualizar();
  });
});

$('#limpar-console').addEventListener('click', () => consoleRedis.limpar());

/* ---------- Início ---------- */

painel.vazio();
aplicarVisao({ registrar: false });
iniciarRelogioTTL();
setInterval(() => {
  atualizar();
  atualizarJogador();
}, INTERVALO_MS);
