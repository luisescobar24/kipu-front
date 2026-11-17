export type Dataset = 'recientes' | 'historico';
export interface Filters {
  dataset: Dataset; q: string; entity: string; year: string; object: string;
  medical: 'all' | 'match' | 'review'; category: string; date_from: string; date_to: string;
  sort: 'newest' | 'oldest'; page: number; page_size: number;
}
export interface Procurement {
  id: string; dataset: Dataset; entity: string; nomenclature: string; description: string;
  year: number | null; published_at: string | null; object: string; amount: string | number | null;
  currency: string; medical_mask: number; review_mask: number; evidence: string[];
  source_url: string; source_id: string | null; version: string; first_seen: string | null;
}
export interface Page { items: Procurement[]; total: number; page: number; page_size: number; unit: string; }
export interface Summary {
  total: number; entities: number; medical: number; review: number;
  first_publication: string | null; last_publication: string | null;
  amounts: { currency: string; informed: number; amount: string | number }[];
  top_entities: { entity: string; total: number }[];
  series: { label: string | null; total: number }[]; dataset: Dataset; unit: string;
}
export interface Metadata {
  dictionary: { version: string; categorias: { id: string; nombre: string; grupo: string; revision: boolean }[]; nota: string };
  years: number[]; objects: string[];
  coverage: Record<string, { complete?: boolean; imported?: number; source_total?: number; cutoff?: string; note?: string; source?: string }>;
  notes: string[];
}
export interface CollectorStatus {
  worker_online: boolean;
  runtime: { heartbeat?: string; next_run?: string; running?: boolean };
  objects: Record<string, { ultima_exitosa?: string; ultimo_error?: string; desde_revisado?: string; hasta_revisado?: string; periodo_sin_recuperar?: { desde: string; hasta: string } }>;
  interval_seconds: number; mode: string; note: string;
}
