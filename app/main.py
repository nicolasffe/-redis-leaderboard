"""API REST do ranking de jogadores.

Executar:  uvicorn app.main:app --reload
Página do ranking:        http://localhost:8000
Documentação interativa: http://localhost:8000/docs
"""
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app import ranking
from app.db import obter_conexao

PAGINA = Path(__file__).resolve().parent.parent / "frontend" / "index.html"

app = FastAPI(
    title="Ranking de Jogadores com Redis",
    description="Leaderboard usando Sorted Sets, Hashes e TTL do Redis.",
)
r = obter_conexao()


@app.get("/", include_in_schema=False)
def pagina_inicial():
    return FileResponse(PAGINA)


class NovoJogador(BaseModel):
    nome: str = Field(min_length=1, max_length=30, examples=["ana"])
    pais: str = Field(min_length=2, max_length=30, examples=["Brasil"])


class Pontuacao(BaseModel):
    pontos: int = Field(gt=0, examples=[150])


@app.post("/jogadores", status_code=201)
def criar_jogador(jogador: NovoJogador):
    if not ranking.criar_jogador(r, jogador.nome, jogador.pais):
        raise HTTPException(409, "Jogador já cadastrado")
    return {"mensagem": "Jogador criado", "nome": jogador.nome}


@app.get("/jogadores/{nome}")
def buscar_jogador(nome: str):
    dados = ranking.buscar_jogador(r, nome)
    if dados is None:
        raise HTTPException(404, "Jogador não encontrado")
    return dados


@app.post("/jogadores/{nome}/pontos")
def adicionar_pontos(nome: str, pontuacao: Pontuacao):
    total = ranking.adicionar_pontos(r, nome, pontuacao.pontos)
    if total is None:
        raise HTTPException(404, "Jogador não encontrado")
    return {"nome": nome, "pontos_totais": total}


@app.get("/jogadores/{nome}/vizinhos")
def vizinhos(nome: str, alcance: int = Query(2, ge=1, le=10)):
    lista = ranking.vizinhos(r, nome, alcance)
    if lista is None:
        raise HTTPException(404, "Jogador não encontrado")
    return lista


@app.delete("/jogadores/{nome}")
def remover_jogador(nome: str):
    if not ranking.remover_jogador(r, nome):
        raise HTTPException(404, "Jogador não encontrado")
    return {"mensagem": "Jogador removido"}


@app.get("/ranking")
def ranking_geral(top: int = Query(10, ge=1, le=100)):
    return ranking.top(r, top)


@app.get("/ranking/semanal")
def ranking_semanal(top: int = Query(10, ge=1, le=100)):
    return ranking.top(r, top, semanal=True)


@app.get("/ranking/faixa")
def ranking_por_faixa(minimo: int = 0, maximo: int = 1000):
    if minimo > maximo:
        raise HTTPException(400, "minimo não pode ser maior que maximo")
    return ranking.por_faixa(r, minimo, maximo)


@app.get("/estatisticas")
def estatisticas():
    return ranking.estatisticas(r)
