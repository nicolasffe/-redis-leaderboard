"""Conexão com o Redis.

Os dados de conexão podem ser alterados por variáveis de ambiente,
sem mexer no código (útil para rodar em outra máquina ou na nuvem).
"""
import os

import redis

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))


def obter_conexao() -> redis.Redis:
    # decode_responses=True faz o Redis devolver str em vez de bytes
    return redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
