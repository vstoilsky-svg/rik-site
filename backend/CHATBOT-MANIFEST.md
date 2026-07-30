# RIK Chatbot Backend RAG Package

Created: 2026-07-09 17:07:02
Created by: Codex Георгия

## Purpose

Backend code for RIK website chatbot. Prepared for SITE-CLAUDE / Viktor agents.

## Contract

Endpoint: POST /api/chat
Request: { "message": string, "sessionId"?: string, "history"?: [{role, content}], "pageUrl"?: string, "metadata"?: {} }
Response: { "answer": string, "sessionId": string, "model": string, "sources": [...] }

## RAG

- Embedding provider: OpenRouter
- Embedding model: openai/text-embedding-3-small
- Dimensions: 1536
- Retrieval: Supabase RPC match_rag_chunks
- Namespace: site

## Chat fallback models

Configured by env OPENROUTER_MODELS, current recommended chain:
poolside/laguna-m.1:free,tencent/hy3:free,google/gemma-4-31b-it:free,google/gemma-4-26b-a4b-it:free

## Secrets

This package does NOT include secrets.
Use existing backend-only file from previous handoff:
$bridge\code-drop\rag-chatbot-supabase-handoff-20260709-1446\SERVER-SECRETS.env

## Verification on Codex side

- Python compile: OK.
- Supabase retriever smoke-test: OK.
- Query: Какие вентиляторы есть у РИК?
- Top source: РИК: текущие страницы сайта / Вентиляторы РИК — KRV, KRV-V, RR
- Similarity: 0.719

## Files

- ackend/app/*.py
- ackend/API-CONTRACT.md
- ackend/RAG-BACKEND-HANDOFF.md
- ackend/env.rag.example
- equirements.txt
- prompts/system.md
- knowledge/*.md fallback/starter knowledge
