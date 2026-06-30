-- ============================================================
-- Adwen — Migration 001: Enable Extensions
-- ============================================================

-- Enable pgvector for content unit embeddings
create extension if not exists vector;

-- Enable pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;
