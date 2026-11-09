# Roteiro do vídeo (5 minutos)

Antes de gravar: `docker compose up -d`, `python -m scripts.popular_dados`, `uvicorn app.main:app --reload`, e deixe abertas as abas do Swagger (localhost:8000/docs), do RedisInsight (localhost:5540) e um terminal com o `redis-cli`.

---

## 1. Abertura — 0:00 a 0:30
**Tela:** README no GitHub.

> "Olá, eu sou [nome]. Neste vídeo apresento minha implementação de um banco NoSQL diferente do usado no projeto API. Escolhi o Redis e construí um ranking de jogadores, comparando com como isso seria feito em um banco relacional."

## 2. O que é o Redis e por que escolhi — 0:30 a 1:30
**Tela:** tabela "Banco relacional x Redis" do README.

- O banco relacional usa tabelas com esquema fixo, disco e SQL; o Redis é chave-valor, sem esquema, e guarda tudo em memória.
- Ranking é o caso de uso clássico do Redis: o Sorted Set mantém os jogadores ordenados automaticamente.
- Comparar: em SQL, descobrir a posição de um jogador exige contar ou ordenar linhas (`COUNT` ou `RANK() OVER`); no Redis é um comando só, `ZREVRANK`.
- Ranking semanal: em SQL precisaria de uma rotina agendada para apagar os dados; no Redis basta um `EXPIRE`.

## 3. Modelo de dados — 1:30 a 2:00
**Tela:** RedisInsight mostrando as chaves.

- `ranking:geral` (Sorted Set), `ranking:semanal` (Sorted Set com TTL), `jogador:<nome>` (Hash).
- Em um banco relacional seria uma tabela `jogadores` com colunas fixas; aqui não há tabelas nem esquema: cada chave aponta para uma estrutura.

## 4. Demonstração — 2:00 a 3:30
**Tela:** Swagger e terminal.

1. `GET /ranking?top=5` — mostrar o top 5.
2. `POST /jogadores` — cadastrar um jogador novo.
3. `POST /jogadores/{nome}/pontos` — dar muitos pontos e mostrar que ele subiu no ranking na hora.
4. `GET /jogadores/{nome}/vizinhos` — quem está logo acima e abaixo.
5. No `redis-cli`: `ZREVRANGE ranking:geral 0 4 WITHSCORES` e `TTL ranking:semanal`, explicando que o ranking semanal zera sozinho.
6. Abrir `app/ranking.py` rapidamente para mostrar que cada operação é um ou dois comandos Redis.

## 5. Vantagens e desvantagens — 3:30 a 4:30
**Tela:** seções do README.

- **Vantagens:** velocidade (memória), estruturas prontas, operações atômicas, TTL nativo, simplicidade.
- **Desvantagens (em relação ao relacional):** limitado pela RAM, persistência menos robusta, sem SQL nem JOINs (exemplo: filtrar por país, que em SQL é um `WHERE`, exigiria outra estrutura), sem esquema nem integridade referencial, transações sem rollback.

## 6. Conclusão — 4:30 a 5:00
> "O Redis não substitui um banco relacional: ele brilha em dados rápidos e temporários, como rankings e cache, enquanto o relacional é melhor para dados com relacionamentos, integridade e transações. Na prática os dois costumam ser usados juntos. O código e a documentação estão no repositório. Obrigado!"

---

**Dica:** cronometre um ensaio antes de gravar. Se passar do tempo, encurte a demonstração (passo 4), que é a parte que mais costuma se estender.
