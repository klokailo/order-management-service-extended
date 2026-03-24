# Phase 1 Benchmark Package

## What's in here

```
docs/integration/        ← 7 markdown files to add to the order-management-service repo
  auth.md                   JWT auth, Bearer header, token claims, 401 vs 403
  orders-api.md             POST /api/orders request/response shape
  order-statuses.md         4 status values, transition triggers, eventual consistency
  webhooks.md               Stripe webhook, raw body requirement, stripe-signature, orderId metadata
  events.md                 RabbitMQ exchange/routing key, fire-and-forget publishing
  error-handling.md         HTTP codes, response shapes, floating point pricing, MongoDB caveat
  pagination.md             Cursor pagination, limit/cursor/status/customerId params, role restriction

eval/
  gold_eval_set.md          20 questions with gold answers, gold files, hop count, leakage risk

graph/
  seed.json                 All nodes + edges to manually ingest into your graph store
```

---

## How this relates to LongMemEval

LongMemEval is a benchmark for memory systems. It works like this:

1. Feed a system a large corpus of multi-session conversations (~115k tokens total) — far too much to fit in a single LLM context window.
2. Ask questions whose answers are buried somewhere inside that corpus.
3. Measure whether the system can retrieve the right slice of context and answer correctly, without needing to pass the whole corpus into the model.

The key finding is that a graph-based retrieval system dramatically outperforms just dumping everything into context — not only on accuracy (~64–71% vs ~55–60%) but also on tokens consumed (~1.6k vs ~115k) and latency (~2.5s vs ~30s). The graph wins because it retrieves a precise, relevant slice rather than flooding the model with noise.

**This benchmark is the same idea applied to a software repository instead of conversations.**

| LongMemEval | This benchmark |
|---|---|
| Long multi-session conversations (~115k tokens) | The full order-management-service repo (source code + docs) |
| Facts buried across many conversation turns | Integration facts buried across 7 markdown files |
| Questions that require recalling specific past statements | Questions a frontend developer needs answered to integrate with the backend |
| System ingests conversations into a graph, retrieves relevant nodes | Your system ingests the repo into a graph, retrieves relevant doc nodes |
| Baseline: dump all conversations into context | Baseline: dump all backend docs into context, or answer with no context at all |
| Graph retrieval: find the right 1–2 nodes from thousands | Graph retrieval: find the right 1–2 docs from 7+, guided by `DEPENDS_ON` and `REFERENCES` edges |

The structural challenge is identical: the answer exists somewhere in a large corpus, the model cannot see all of it at once, and naive search (just embedding similarity) fails on questions that require combining two pieces of information from different places. Graph traversal solves this because the edges encode *relationships between documents* — not just their content.

The multi-hop questions in this benchmark (Q4, Q10, Q15, Q18) are the direct equivalent of LongMemEval's hardest cases: questions where the answer requires linking two facts that live in separate documents connected by a `REFERENCES` edge.

---

## Step 1 — Add the integration docs to the backend repo

Copy the entire `docs/integration/` folder into the root of the `order-management-service` repository. These files contain real integration facts extracted directly from the source code, deliberately scattered so that no single file answers everything. The scattering is intentional — it mirrors what happens in real codebases where knowledge about auth lives in one place, error handling in another, and webhook gotchas in a third.

Commit them to the repo so they're versioned alongside the code.

---

## Step 2 — Seed the graph

Use `graph/seed.json` to create nodes and edges in your graph store (Neptune or equivalent). The file contains the complete node and edge definitions. The structure is:

```
repo:frontend-app  --DEPENDS_ON-->  repo:order-management-service
                                            |
                              --CONTAINS--> doc:auth
                              --CONTAINS--> doc:orders-api
                              --CONTAINS--> doc:order-statuses
                              --CONTAINS--> doc:webhooks
                              --CONTAINS--> doc:events
                              --CONTAINS--> doc:error-handling
                              --CONTAINS--> doc:pagination

doc:pagination        --REFERENCES-->  doc:orders-api
doc:pagination        --REFERENCES-->  doc:auth
doc:error-handling    --REFERENCES-->  doc:auth
doc:orders-api        --REFERENCES-->  doc:order-statuses
doc:orders-api        --REFERENCES-->  doc:pagination
doc:orders-api        --REFERENCES-->  doc:error-handling
doc:order-statuses    --REFERENCES-->  doc:webhooks
doc:order-statuses    --REFERENCES-->  doc:events
doc:events            --REFERENCES-->  doc:adr-002
doc:error-handling    --REFERENCES-->  doc:adr-001
```

The `REFERENCES` edges are what make multi-hop retrieval possible. When the agent starts at `repo:frontend-app` and traverses `DEPENDS_ON` to the backend repo, then `CONTAINS` to a doc node, the `REFERENCES` edges allow it to follow the chain to related docs — even if those related docs weren't directly matched by embedding similarity.

---

## Step 3 — Run the three evaluation conditions

Each condition represents a different level of retrieval capability. Run all 20 questions from `eval/gold_eval_set.md` under each condition. Record every answer and every retrieved file set.

---

### Condition A — No retrieval (baseline floor)

**What it simulates:** A developer asking an LLM to help integrate with a backend it has never seen.

**How to run it:**

Give the agent a system prompt that describes the frontend app and its dependency on the order-management-service, but provide no backend documentation. Ask each question cold.

```
System: You are a developer working on a frontend application that integrates
with an order-management-service backend. You do not have access to the backend
source code or documentation.

User: <question from gold_eval_set.md>
```

**What to expect:** The model will answer many questions using general knowledge about REST APIs, JWT, Stripe, and RabbitMQ. This is your leakage problem — it will get some questions right for the wrong reasons. The questions it should reliably fail on are the ones with LOW leakage risk in the eval set (e.g. the exact exchange name `order_events`, the `metadata.orderId` requirement, the plain-text webhook error format).

**Why this condition matters:** If Condition A already achieves high fact hit rate, your hidden facts aren't hidden enough. Check the leakage checklist at the bottom of this file.

---

### Condition B — Naive embedding search (baseline ceiling)

**What it simulates:** A simple RAG system with no graph structure — just embed-and-retrieve.

**How to run it:**

1. Embed each of the 7 integration docs using the same embedding model your system uses (e.g. `text-embedding-3-small`). Store doc ID + embedding.
2. For each question, embed the question and compute cosine similarity against all 7 doc embeddings.
3. Retrieve the top-3 docs by similarity score. Pass their full text to the agent as context.
4. Ask the question.

```
System: You are a developer working on a frontend application. Use the following
backend documentation to answer the question.

<contents of top-3 retrieved docs>

User: <question>
```

**What to expect:** Single-hop questions (Hops: 1 in the eval set) should do reasonably well here — if `auth.md` is the most semantically similar doc to "what header do I use", it will be retrieved. Multi-hop questions will fail when the embedding similarity pulls the wrong top-3 — for example, Q10 ("paginated list with auth restrictions") might retrieve `orders-api.md` by similarity but miss `auth.md` entirely because `pagination.md` was ranked higher and `auth.md` was fourth.

**Why this condition matters:** It isolates the value of graph structure specifically. The gap between Condition B and Condition C on multi-hop questions is the clearest evidence that edges matter.

---

### Condition C — Graph retrieval (your system)

**What it simulates:** Your Trail system in actual use.

**How to run it:**

The agent is given access to your MCP retrieval tool and is told to use it before answering. It calls `get_context_for_task` with the question and the project context.

```
System: You are a developer working on a frontend application that uses the
order-management-service backend. Before answering any integration question,
call the get_context_for_task tool to retrieve relevant documentation.

User: <question>
```

The tool should:
1. Embed the question.
2. Start at `repo:frontend-app`, traverse `DEPENDS_ON` to `repo:order-management-service`.
3. From the backend repo node, traverse `CONTAINS` to all doc nodes.
4. Rank doc nodes by embedding similarity to the question.
5. Follow `REFERENCES` edges from the top-ranked docs to pull in related docs (this is the multi-hop step).
6. Apply the token budget — return the top-ranked docs up to the budget.

**What to record for each question:**
- Which doc IDs were returned by the tool
- The full answer the agent gave

**Why this condition matters:** This is what you're trying to prove works. The graph traversal following `REFERENCES` edges should pull in both `auth.md` and `error-handling.md` for Q4, both `pagination.md` and `auth.md` for Q10, etc. — even when one of those docs wasn't in the top embedding similarity results.

---

### Optional: Condition D — Retrieval oracle

This is not a fair comparison condition — it's a diagnostic tool. For each question, give the agent exactly the gold files from the eval set (and only those files), then ask the question.

This measures the ceiling: if the model can't answer correctly even when given exactly the right docs, the problem is in generation (the docs are unclear), not retrieval. If Condition C scores close to the oracle, your retrieval is working well. If there's a big gap, the retrieval is still missing the right docs.

---

## Step 4 — Score each answer

Run scoring after you've collected all answers. Don't score while running to avoid anchoring bias.

---

### Metric 1: File Hit Rate

Measures whether retrieval found the right documents. Only applies to Conditions B and C (Condition A has no retrieval).

For each question, check whether every gold file listed in the eval set appears in the retrieved set. This is strict — all gold files must be present for a hit.

```
hit(q) = 1  if all gold files for question q are in the retrieved set
         0  otherwise

file_hit_rate = sum(hit(q) for all q) / 20
```

Also compute separately for single-hop questions and multi-hop questions:

```
file_hit_rate_1hop  = results for Q1–Q3, Q5–Q9, Q11–Q14, Q16–Q17, Q19–Q20  (15 questions)
file_hit_rate_2hop  = results for Q4, Q10, Q15, Q18  (5 questions)
```

The gap between `file_hit_rate_1hop` and `file_hit_rate_2hop` in Condition B is your evidence for why graph structure matters.

---

### Metric 2: Fact Hit Rate

Measures whether the final answer contains the correct information, regardless of how it was retrieved (or not). Applies to all three conditions.

Use an LLM judge. For each question, send this prompt to Claude (or another judge model):

```
You are evaluating whether a model's answer contains a specific required fact.

Required fact: <gold answer from eval set>

Model answer: <the answer you recorded>

Does the model answer contain the key information from the required fact?
Consider it a hit if the core factual claim is present, even if worded differently.
Consider it a miss if the model answer is vague, incorrect, or omits the key detail.

Reply with one word only: HIT or MISS
```

```
fact_hit_rate = count(HIT) / 20
```

Compute this separately per condition so you can compare A vs B vs C directly.

---

### Metric 3: Unsupported Guess Rate

Only applies to Condition A. Measures how often the model invents a confident but wrong answer when it has no documentation to rely on.

After scoring fact hit rate for Condition A, manually review each MISS. Classify each as:

- **Abstained**: Model said it didn't know or couldn't answer without documentation. *(Good behaviour.)*
- **Guessed wrong**: Model gave a confident but incorrect answer. *(Bad behaviour — this is what you're measuring.)*

```
unsupported_guess_rate = count(guessed wrong) / count(MISS in Condition A)
```

A high unsupported guess rate in Condition A is evidence for why retrieval matters — the model is confidently giving developers wrong information about how to integrate with your service.

---

### Metric 4: Tokens consumed

For Conditions B and C, record the total number of tokens passed to the LLM for each question (system prompt + retrieved docs + question). Average across all 20 questions.

This is the LongMemEval efficiency metric. Your graph retrieval should consume dramatically fewer tokens than Condition B because it retrieves 1–3 targeted docs instead of a fixed top-k from the full corpus.

If you implement a token budget in your MCP tool, you can also measure what percentage of questions are still answered correctly when the budget is constrained to 2k, 4k, or 8k tokens.

---

## Step 5 — Interpret the results

### What you're hoping to see

| Metric | Condition A | Condition B | Condition C (target) |
|--------|-------------|-------------|----------------------|
| File hit rate (all) | n/a | ~50–65% | >80% |
| File hit rate (2-hop) | n/a | ~20–35% | >70% |
| Fact hit rate | ~30–45% | ~55–70% | >75% |
| Unsupported guess rate | HIGH | n/a | n/a |
| Avg tokens consumed | ~0 | ~3–5k | ~1–3k |

### The key story to tell

The most compelling result is the **multi-hop file hit rate gap** between Condition B and Condition C. If Condition B gets ~30% on 2-hop questions and Condition C gets ~70%, that's the concrete demonstration that graph edges carry information that embedding similarity alone cannot.

If Condition B and Condition C perform similarly on 2-hop questions, your `REFERENCES` edges aren't being used effectively in traversal — debug the retrieval path.

If Condition A already achieves high fact hit rate, your hidden facts are too general and the model already knows them from training data — add more service-specific gotchas from the actual codebase.

### How this mirrors LongMemEval's findings

LongMemEval showed:

- Full-context baseline (dump everything in): ~55–60% accuracy, ~115k tokens, ~30s
- Graph retrieval: ~64–71% accuracy, ~1.6k tokens, ~2.5s

The graph retrieval *beats* full-context on accuracy while using 70x fewer tokens. This happens because full-context buries the relevant information in noise — the model attends to irrelevant conversations and loses the signal. Graph retrieval removes the noise before the model ever sees it.

Your benchmark should show the same pattern at a smaller scale: graph retrieval should match or beat dumping all 7 docs in context (Condition B with k=7), while consuming far fewer tokens. The signal-to-noise advantage is less dramatic with only 7 docs, but it becomes very clear on multi-hop questions where the wrong docs actively mislead the model.

---

## Key Hidden Facts — Leakage Checklist

Before running evals, verify these facts are **not** present anywhere in your frontend repo. If they appear there, Condition A will be artificially inflated and you won't be able to trust your results.

- [ ] `Authorization: Bearer` — exact header format and scheme name
- [ ] JWT claims `sub` and `role` — the specific claim names this service reads
- [ ] `POST /api/webhooks/stripe` — the exact webhook URL path
- [ ] Raw body requirement for webhooks — the reason and consequence
- [ ] `stripe-signature` — the exact header name Stripe uses
- [ ] `metadata.orderId` — the requirement to link a PaymentIntent to an order
- [ ] `order_events` — the RabbitMQ exchange name
- [ ] `order.created` — the routing key
- [ ] `limit` max of 100 — the pagination cap
- [ ] `customerId` filter requires `admin` role or matching `sub` — the role restriction
- [ ] Webhook errors return plain text, not JSON — the format difference
- [ ] `totalAmount` is server-calculated — don't send it in the request body

If any of these appear in the frontend repo, remove them before running the benchmark. The goal is that Condition A fails on these and Condition C succeeds on them — that gap is your proof that the system works.
