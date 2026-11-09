"""Regras do ranking de jogadores usando estruturas nativas do Redis.

Chaves utilizadas:
  ranking:geral    -> Sorted Set (membro = nome do jogador, score = pontos totais)
  ranking:semanal  -> Sorted Set com expiração (TTL) de 7 dias
  jogador:<nome>   -> Hash com os dados cadastrais do jogador
"""
from datetime import datetime, timezone

import redis

CHAVE_GERAL = "ranking:geral"
CHAVE_SEMANAL = "ranking:semanal"
TTL_SEMANAL = 7 * 24 * 60 * 60  # 7 dias em segundos


def _chave_jogador(nome: str) -> str:
    return f"jogador:{nome}"


def _formatar(itens, posicao_inicial: int = 1) -> list[dict]:
    """Converte a lista [(nome, score), ...] do Redis em uma lista de dicionários."""
    return [
        {"posicao": posicao_inicial + i, "nome": nome, "pontos": int(score)}
        for i, (nome, score) in enumerate(itens)
    ]


def criar_jogador(r: redis.Redis, nome: str, pais: str) -> bool:
    """Cadastra um jogador. Retorna False se ele já existir."""
    if r.exists(_chave_jogador(nome)):
        return False

    # pipeline com transaction=True envia os comandos juntos (MULTI/EXEC):
    # ou todos são executados, ou nenhum
    with r.pipeline(transaction=True) as pipe:
        pipe.hset(_chave_jogador(nome), mapping={
            "nome": nome,
            "pais": pais,
            "criado_em": datetime.now(timezone.utc).isoformat(),
            "partidas": 0,
        })
        pipe.zadd(CHAVE_GERAL, {nome: 0}, nx=True)
        pipe.execute()
    return True


def adicionar_pontos(r: redis.Redis, nome: str, pontos: int) -> int | None:
    """Soma pontos ao jogador (ZINCRBY). Retorna o novo total ou None se não existir."""
    if not r.exists(_chave_jogador(nome)):
        return None

    with r.pipeline(transaction=True) as pipe:
        pipe.zincrby(CHAVE_GERAL, pontos, nome)
        pipe.zincrby(CHAVE_SEMANAL, pontos, nome)
        # Define a expiração só se a chave ainda não tiver uma (opção NX, Redis 7+).
        # Assim o ranking semanal "zera sozinho" 7 dias após o primeiro ponto.
        pipe.expire(CHAVE_SEMANAL, TTL_SEMANAL, nx=True)
        pipe.hincrby(_chave_jogador(nome), "partidas", 1)
        total, *_ = pipe.execute()
    return int(total)


def buscar_jogador(r: redis.Redis, nome: str) -> dict | None:
    """Dados do jogador + pontuação e posição atual no ranking geral."""
    dados = r.hgetall(_chave_jogador(nome))
    if not dados:
        return None

    pontos = r.zscore(CHAVE_GERAL, nome) or 0
    posicao = r.zrevrank(CHAVE_GERAL, nome)  # 0 = primeiro lugar
    pontos_semana = r.zscore(CHAVE_SEMANAL, nome) or 0

    dados["partidas"] = int(dados.get("partidas", 0))
    dados["pontos"] = int(pontos)
    dados["posicao"] = posicao + 1 if posicao is not None else None
    dados["pontos_semana"] = int(pontos_semana)
    return dados


def top(r: redis.Redis, quantidade: int = 10, semanal: bool = False) -> list[dict]:
    """Os N melhores jogadores (ZREVRANGE: maior pontuação primeiro)."""
    chave = CHAVE_SEMANAL if semanal else CHAVE_GERAL
    itens = r.zrevrange(chave, 0, quantidade - 1, withscores=True)
    return _formatar(itens)


def vizinhos(r: redis.Redis, nome: str, alcance: int = 2) -> list[dict] | None:
    """Jogadores logo acima e logo abaixo de um jogador no ranking."""
    posicao = r.zrevrank(CHAVE_GERAL, nome)
    if posicao is None:
        return None
    inicio = max(posicao - alcance, 0)
    itens = r.zrevrange(CHAVE_GERAL, inicio, posicao + alcance, withscores=True)
    return _formatar(itens, posicao_inicial=inicio + 1)


def por_faixa(r: redis.Redis, minimo: int, maximo: int) -> list[dict]:
    """Jogadores com pontuação entre minimo e maximo (ZREVRANGEBYSCORE)."""
    itens = r.zrevrangebyscore(CHAVE_GERAL, maximo, minimo, withscores=True)
    return [{"nome": nome, "pontos": int(score)} for nome, score in itens]


def remover_jogador(r: redis.Redis, nome: str) -> bool:
    """Remove o jogador do cadastro e dos dois rankings."""
    with r.pipeline(transaction=True) as pipe:
        pipe.delete(_chave_jogador(nome))
        pipe.zrem(CHAVE_GERAL, nome)
        pipe.zrem(CHAVE_SEMANAL, nome)
        apagados, *_ = pipe.execute()
    return apagados == 1


def estatisticas(r: redis.Redis) -> dict:
    """Resumo geral do ranking."""
    lider = r.zrevrange(CHAVE_GERAL, 0, 0, withscores=True)
    ttl = r.ttl(CHAVE_SEMANAL)  # -2 = chave não existe, -1 = sem expiração
    return {
        "total_jogadores": r.zcard(CHAVE_GERAL),
        "lider": _formatar(lider)[0] if lider else None,
        "ranking_semanal_expira_em_segundos": ttl if ttl > 0 else None,
    }
