"""Popula o Redis com jogadores e partidas de exemplo.

Executar a partir da pasta raiz do projeto:  python -m scripts.popular_dados
"""
import random

from app import ranking
from app.db import obter_conexao

JOGADORES = [
    ("ana", "Brasil"), ("bruno", "Brasil"), ("carla", "Portugal"),
    ("diego", "Argentina"), ("eva", "Chile"), ("felipe", "Brasil"),
    ("gabi", "Uruguai"), ("hugo", "Portugal"), ("iris", "Brasil"),
    ("joao", "Brasil"), ("karen", "Peru"), ("lucas", "Brasil"),
    ("marina", "Colômbia"), ("nico", "Argentina"), ("olivia", "Brasil"),
]


def main():
    r = obter_conexao()
    r.ping()  # falha logo aqui se o Redis não estiver rodando

    # Limpa dados de execuções anteriores para começar do zero
    chaves = [ranking.CHAVE_GERAL, ranking.CHAVE_SEMANAL, *r.keys("jogador:*")]
    r.delete(*chaves)

    for nome, pais in JOGADORES:
        ranking.criar_jogador(r, nome, pais)
        for _ in range(random.randint(3, 10)):  # simula partidas
            ranking.adicionar_pontos(r, nome, random.randint(10, 200))

    print(f"{len(JOGADORES)} jogadores criados. Top 5:")
    for item in ranking.top(r, 5):
        print(f"  {item['posicao']}º {item['nome']:<8} {item['pontos']} pts")


if __name__ == "__main__":
    main()
