# 🏆 Ranking de Jogadores com Redis

Implementação de um **leaderboard** (ranking de jogadores) usando o **Redis**, banco NoSQL do tipo **chave-valor em memória**, com uma API REST em Python (FastAPI).

O projeto foi feito como trabalho individual de um banco NoSQL diferente do adotado no projeto API (MongoDB).

> 🎥 **Vídeo de apresentação:** _[cole aqui o link do vídeo]_

---

## Por que Redis?

Em um **banco relacional** (PostgreSQL, MySQL etc.), os dados ficam em tabelas com esquema fixo, gravados em disco e consultados com SQL. Isso é ótimo para dados com relacionamentos e regras de integridade, mas um ranking que muda o tempo todo exige ordenar ou contar linhas a cada consulta.

O Redis guarda os dados **em memória** e oferece **estruturas de dados prontas** (strings, hashes, listas, conjuntos, conjuntos ordenados). Um ranking é o caso de uso clássico dele, porque o **Sorted Set** já mantém os jogadores ordenados pela pontuação a cada atualização.

| Aspecto | Banco relacional (SQL) | Redis |
|---|---|---|
| Estrutura | Tabela `jogadores` com colunas definidas (`CREATE TABLE`) | Chaves com estruturas prontas, sem esquema |
| Somar pontos | `UPDATE jogadores SET pontos = pontos + 150 WHERE nome = 'ana'` | `ZINCRBY ranking:geral 150 ana` |
| Top 10 | `SELECT ... ORDER BY pontos DESC LIMIT 10` (precisa de índice) | `ZREVRANGE ranking:geral 0 9` — já está ordenado |
| Posição de um jogador | `COUNT(*)` de quem tem mais pontos ou `RANK() OVER (...)`, percorrendo várias linhas | `ZREVRANK` — O(log N) |
| Ranking semanal que zera | Rotina agendada com `DELETE` ou uma tabela por semana | `EXPIRE` na própria chave |
| Onde ficam os dados | Disco (com cache em memória) | Memória (com persistência opcional em disco) |

---

## Modelo de dados

No Redis não existem tabelas nem coleções: tudo é uma **chave** apontando para uma estrutura.

| Chave | Tipo | Conteúdo |
|---|---|---|
| `ranking:geral` | Sorted Set | membro = nome do jogador, score = pontos totais |
| `ranking:semanal` | Sorted Set + TTL | pontos da semana; a chave expira 7 dias após o primeiro ponto |
| `jogador:<nome>` | Hash | `nome`, `pais`, `criado_em`, `partidas` |

As escritas que mexem em mais de uma chave usam **pipeline transacional** (`MULTI`/`EXEC`), para que todos os comandos sejam executados juntos.

---

## Estrutura do projeto

```
├── app/
│   ├── db.py            # conexão com o Redis
│   ├── ranking.py       # regras do ranking (todos os comandos Redis ficam aqui)
│   └── main.py          # API REST (FastAPI)
├── scripts/
│   └── popular_dados.py # cria jogadores e partidas de exemplo
├── docs/
│   └── roteiro-video.md # roteiro do vídeo de apresentação
├── docker-compose.yml   # Redis + RedisInsight
└── requirements.txt
```

---

## Como executar

**Pré-requisitos:** [Python 3.10+](https://www.python.org/downloads/) e [Docker Desktop](https://www.docker.com/products/docker-desktop/).

Os comandos abaixo são para o **Windows PowerShell**, executados na pasta raiz do projeto.

**1. Subir o Redis**
```powershell
docker compose up -d
docker ps   # confira se os containers redis-leaderboard e redisinsight aparecem como "Up"
```

**2. Criar o ambiente virtual e instalar as dependências**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```
> No Linux/macOS ou Git Bash, ative com `source .venv/bin/activate` (Linux/macOS) ou `source .venv/Scripts/activate` (Git Bash).

**3. Popular com dados de exemplo**
```powershell
python -m scripts.popular_dados
```

**4. Iniciar a API**
```powershell
uvicorn app.main:app --reload
```

Acesse **http://localhost:8000/docs** para testar todos os endpoints pelo navegador (Swagger).

---

## Endpoints

| Método | Rota | Descrição | Comandos Redis |
|---|---|---|---|
| POST | `/jogadores` | Cadastra jogador | `HSET`, `ZADD NX` |
| GET | `/jogadores/{nome}` | Dados, pontos e posição | `HGETALL`, `ZSCORE`, `ZREVRANK` |
| POST | `/jogadores/{nome}/pontos` | Soma pontos de uma partida | `ZINCRBY`, `EXPIRE NX`, `HINCRBY` |
| GET | `/jogadores/{nome}/vizinhos` | Quem está logo acima e abaixo | `ZREVRANK`, `ZREVRANGE` |
| DELETE | `/jogadores/{nome}` | Remove jogador | `DEL`, `ZREM` |
| GET | `/ranking?top=10` | Top N geral | `ZREVRANGE` |
| GET | `/ranking/semanal?top=10` | Top N da semana | `ZREVRANGE` |
| GET | `/ranking/faixa?minimo=0&maximo=1000` | Jogadores numa faixa de pontos | `ZREVRANGEBYSCORE` |
| GET | `/estatisticas` | Total, líder e tempo até o ranking semanal zerar | `ZCARD`, `TTL` |

**Exemplo:** somar 150 pontos para a jogadora `ana`
```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8000/jogadores/ana/pontos `
  -ContentType "application/json" -Body '{"pontos": 150}'
```
Resposta:
```json
{ "nome": "ana", "pontos_totais": 705 }
```

---

## Explorando os dados direto no Redis

**Pelo terminal (redis-cli):**
```powershell
docker exec -it redis-leaderboard redis-cli
```
```
ZREVRANGE ranking:geral 0 4 WITHSCORES   # top 5
ZREVRANK ranking:geral ana               # posição da ana (começa em 0)
HGETALL jogador:ana                      # dados da ana
TTL ranking:semanal                      # segundos até o ranking semanal expirar
```

**Pela interface gráfica (RedisInsight):** acesse http://localhost:5540 e adicione um banco com host `redis` e porta `6379` (o nome `redis` funciona porque os dois containers estão na mesma rede do Docker Compose).

---

## Vantagens do Redis

- **Velocidade:** os dados ficam em memória, com respostas na casa dos microssegundos a poucos milissegundos.
- **Estruturas de dados prontas:** o Sorted Set resolve o ranking sem consultas de ordenação; inserir, atualizar e consultar posição custam O(log N).
- **Operações atômicas:** `ZINCRBY` soma pontos sem risco de dois acessos simultâneos sobrescreverem um ao outro.
- **Expiração nativa (TTL):** o ranking semanal some sozinho, sem rotina de limpeza.
- **Simplicidade:** fácil de instalar e de usar; comandos curtos e bem documentados.
- **Escalabilidade:** suporta replicação, Redis Sentinel (alta disponibilidade) e Redis Cluster (particionamento).

## Desvantagens do Redis

- **Limitado pela memória RAM:** todo o conjunto de dados precisa caber na memória, o que encarece grandes volumes.
- **Persistência menos robusta:** com snapshots (RDB) pode-se perder o que foi gravado desde o último snapshot; o AOF (usado neste projeto) reduz a perda, mas aumenta o uso de disco.
- **Consultas limitadas:** não há SQL, `JOIN` nem índices secundários. Exemplo neste projeto: em SQL, listar "jogadores do Brasil" seria um simples `WHERE pais = 'Brasil'`; no Redis exigiria criar e manter um conjunto extra só para isso.
- **Sem esquema nem integridade referencial:** o banco não valida tipos, campos obrigatórios ou chaves estrangeiras; essa responsabilidade fica com a aplicação.
- **Modelagem guiada pelas consultas:** é preciso saber de antemão como os dados serão lidos e montar as chaves para isso.
- **Transações simples:** `MULTI`/`EXEC` executa os comandos em bloco, mas não tem *rollback* se um deles falhar, diferente das transações ACID de um banco relacional.
- **Licença:** em 2024 o Redis mudou para licenças não open source, o que deu origem ao fork **Valkey**; o Redis 8 voltou a oferecer uma opção open source (AGPLv3).

## Quando usar cada um

- **Redis:** rankings, cache, sessões, contadores, filas e dados temporários, em que velocidade importa mais que consultas complexas.
- **Banco relacional:** dados principais com relacionamentos, regras de integridade e transações (cadastros, pedidos, dados financeiros), além de relatórios com consultas complexas.

Na prática, os dois costumam ser usados **juntos**: o banco relacional como fonte principal dos dados e o Redis como cache ou para recursos de tempo real, como este ranking.

---

## Tecnologias

Python 3 · FastAPI · redis-py · Redis 7.4 · Docker Compose · RedisInsight
