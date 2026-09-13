import { useMemo } from 'react';
import type { Member, NeighbourLink } from '@/types';
import { findNeighbours } from '@/engine/neighbours';
import { useProjectStore } from './projectStore';

export interface NeighbourAnalysis {
  subject: Member | null;
  links: NeighbourLink[];
}

const EMPTY: NeighbourAnalysis = { subject: null, links: [] };

/** Distances from the inspected member to the members around it. */
export function useNeighbours(members: Member[]): NeighbourAnalysis {
  const selectedMemberId = useProjectStore((s) => s.selectedMemberId);
  const enabled = useProjectStore((s) => s.view.neighbourMode);
  const radius = useProjectStore((s) => s.view.neighbourRadius);
  const limit = useProjectStore((s) => s.view.neighbourLimit);

  return useMemo(() => {
    if (!enabled || !selectedMemberId) return EMPTY;
    const subject = members.find((m) => m.id === selectedMemberId);
    if (!subject) return EMPTY;
    return { subject, links: findNeighbours(members, selectedMemberId, { radius, limit }) };
  }, [members, selectedMemberId, enabled, radius, limit]);
}
