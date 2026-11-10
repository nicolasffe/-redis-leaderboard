// Chamadas à API REST (app/main.py).

async function requisitar(caminho, opcoes = {}) {
  const resposta = await fetch(caminho, { headers: { 'Content-Type': 'application/json' }, ...opcoes });
  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    let mensagem = corpo && corpo.detail;
    if (Array.isArray(mensagem)) mensagem = mensagem.map(erro => erro.msg).join('; ');
    const erro = new Error(mensagem || `Erro ${resposta.status}`);
    erro.status = resposta.status;
    throw erro;
  }
  return corpo;
}

const enc = encodeURIComponent;
const comCorpo = (method, dados) => ({ method, body: JSON.stringify(dados) });

export const api = {
  ranking: top => requisitar(`/ranking?top=${top}`),
  rankingSemanal: top => requisitar(`/ranking/semanal?top=${top}`),
  faixa: (minimo, maximo) => requisitar(`/ranking/faixa?minimo=${minimo}&maximo=${maximo}`),
  estatisticas: () => requisitar('/estatisticas'),
  jogador: nome => requisitar(`/jogadores/${enc(nome)}`),
  vizinhos: (nome, alcance = 2) => requisitar(`/jogadores/${enc(nome)}/vizinhos?alcance=${alcance}`),
  criarJogador: (nome, pais) => requisitar('/jogadores', comCorpo('POST', { nome, pais })),
  somarPontos: (nome, pontos) => requisitar(`/jogadores/${enc(nome)}/pontos`, comCorpo('POST', { pontos })),
  removerJogador: nome => requisitar(`/jogadores/${enc(nome)}`, { method: 'DELETE' }),
};
