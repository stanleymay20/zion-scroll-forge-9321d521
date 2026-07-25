/**
 * Skill Evidence Emitter — Sprint D3.6
 *
 * Contract-only stub for the AI tutor / avatar layer to append
 * inferred (or demonstrated) skill evidence into student_skill_events
 * via the append-only `record_skill_evidence` RPC.
 *
 * Implementation intentionally minimal in D3.6; consumers (avatar
 * lecturer, assessment engine, endorsement flow) can integrate now
 * without waiting on further schema.
 */
import { supabase } from '@/integrations/supabase/client';

export interface SkillEvidencePayload {
  studentId: string;
  skillId: string;
  evidenceKind: 'demonstrated' | 'inferred';
  sourceType: 'module_progress' | 'assessment' | 'endorsement' | 'ai_tutor' | 'manual';
  sourceId?: string | null;
  masteryScore: number;
  confidence?: number;
  occurredAt?: string;
}

export async function emitSkillEvidence(p: SkillEvidencePayload): Promise<string | null> {
  const { data, error } = await supabase.rpc('record_skill_evidence', {
    _student: p.studentId,
    _skill: p.skillId,
    _evidence_kind: p.evidenceKind,
    _source_type: p.sourceType,
    _source_id: p.sourceId ?? null,
    _mastery: p.masteryScore,
    _confidence: p.confidence ?? 0.5,
    _occurred_at: p.occurredAt ?? new Date().toISOString(),
  } as never);
  if (error) {
    console.warn('[skillEvidence] emit failed', error.message);
    return null;
  }
  return (data as string) ?? null;
}
