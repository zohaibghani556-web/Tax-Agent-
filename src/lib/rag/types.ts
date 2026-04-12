/**
 * TaxAgent.ai — RAG type definitions
 * Used by embed.ts and knowledge-base.ts to type knowledge entries and retrieved chunks.
 */

export interface KnowledgeEntry {
  content: string;
  source: string;
  category: string;
}

export interface KnowledgeChunk extends KnowledgeEntry {
  id: string;
  similarity: number;
}
