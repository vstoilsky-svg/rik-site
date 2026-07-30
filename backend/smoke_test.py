# -*- coding: utf-8 -*-
# Smoke-тест бэкенда: embedding(OpenRouter) -> Supabase match_rag_chunks. Секреты НЕ печатаются.
import json, urllib.request, os

ENV="C:/Users/user2/rik-chatbot-backend/secrets/SERVER-SECRETS.env"
cfg={}
for line in open(ENV, encoding="utf-8"):
    line=line.strip()
    if line and not line.startswith("#") and "=" in line:
        k,v=line.split("=",1); cfg[k.strip()]=v.strip()

def post(url, headers, body):
    req=urllib.request.Request(url, data=json.dumps(body).encode(), headers={**headers,"Content-Type":"application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.load(r)

Q="Какие вентиляторы есть у РИК?"
# 1) embedding через OpenRouter
try:
    emb=post("https://openrouter.ai/api/v1/embeddings",
        {"Authorization":"Bearer "+cfg["OPENROUTER_API_KEY"],"HTTP-Referer":cfg.get("OPENROUTER_SITE_URL","")},
        {"model":cfg["RAG_EMBEDDING_MODEL"],"input":Q})
    vec=emb["data"][0]["embedding"]
    print(f"[1] EMBEDDING ok: dim={len(vec)} (ожидалось {cfg['RAG_EMBEDDING_DIMENSIONS']})")
except Exception as e:
    print("[1] EMBEDDING FAIL:", type(e).__name__, str(e)[:200]); raise SystemExit(1)

# 2) Supabase RPC match_rag_chunks
try:
    res=post(cfg["SUPABASE_URL"].rstrip("/")+"/rest/v1/rpc/match_rag_chunks",
        {"apikey":cfg["SUPABASE_SERVICE_ROLE_KEY"],"Authorization":"Bearer "+cfg["SUPABASE_SERVICE_ROLE_KEY"]},
        {"query_embedding":vec,"match_count":int(cfg.get("RAG_TOP_K",8)),
         "similarity_threshold":float(cfg.get("RAG_SIMILARITY_THRESHOLD",0.25)),
         "namespace_filter":cfg.get("RAG_NAMESPACE") or None})
    print(f"[2] SUPABASE match_rag_chunks ok: вернулось чанков = {len(res)}")
    for c in res[:3]:
        print(f"      · {c.get('source_title')}  sim={round(c.get('similarity',0),3)}  «{(c.get('content') or '')[:60].strip()}…»")
    print("\n>>> БЭКЕНД-ПЛИТА РАБОТАЕТ С .31: embedding + retrieval прошли" if res else "\n>>> retrieval вернул 0 — проверить namespace/threshold")
except Exception as e:
    print("[2] SUPABASE FAIL:", type(e).__name__, str(e)[:300])
