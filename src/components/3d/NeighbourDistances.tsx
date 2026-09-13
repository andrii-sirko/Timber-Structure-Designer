import { useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import type { Member, NeighbourLink, Vec3 } from '@/types';
import { useProjectStore } from '@/store';
import { memberObb } from '@/engine/neighbours';
import { MM } from './materials';

type V = [number, number, number];

const toM = (v: Vec3): V => [v.x * MM, v.y * MM, v.z * MM];
const CONTACT_MM = 1;

/** Label anchor: for touching members nudge the tag towards the neighbour so tags at one joint spread out. */
function labelPosition(link: NeighbourLink, neighbour: Member | undefined): V {
  if (link.gap > CONTACT_MM) {
    return [((link.a.x + link.b.x) / 2) * MM, ((link.a.y + link.b.y) / 2) * MM, ((link.a.z + link.b.z) / 2) * MM];
  }
  const centre = neighbour ? memberObb(neighbour).centre : link.b;
  const dx = centre.x - link.b.x;
  const dy = centre.y - link.b.y;
  const dz = centre.z - link.b.z;
  const l = Math.hypot(dx, dy, dz) || 1;
  const reach = Math.min(220, l);
  return [(link.b.x + (dx / l) * reach) * MM, (link.b.y + (dy / l) * reach) * MM, (link.b.z + (dz / l) * reach) * MM];
}

export function NeighbourDistances({ subject, links, members }: { subject: Member | null; links: NeighbourLink[]; members: Member[] }) {
  const focusedId = useProjectStore((s) => s.focusedNeighbourId);
  const setFocused = useProjectStore((s) => s.setFocusedNeighbour);
  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  if (!subject) return null;
  const origin = memberObb(subject).centre;

  return (
    <group>
      <mesh position={toM(origin)}>
        <sphereGeometry args={[0.03, 14, 14]} />
        <meshBasicMaterial color="#22d3ee" />
      </mesh>

      {links.map((link) => {
        const focused = focusedId === link.memberId;
        const touching = link.gap <= CONTACT_MM;
        const color = focused ? '#fbbf24' : touching ? '#34d399' : '#22d3ee';
        return (
          <group key={link.memberId}>
            {!touching && <Line points={[toM(link.a), toM(link.b)]} color={color} lineWidth={focused ? 3 : 1.8} />}
            <mesh position={toM(link.b)}>
              <sphereGeometry args={[touching ? 0.022 : 0.018, 12, 12]} />
              <meshBasicMaterial color={color} />
            </mesh>
            <Html position={labelPosition(link, byId.get(link.memberId))} center zIndexRange={[9, 0]}>
              <button
                type="button"
                onPointerOver={() => setFocused(link.memberId)}
                onPointerOut={() => setFocused(null)}
                className={[
                  'cursor-default rounded border px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap shadow',
                  focused
                    ? 'border-amber-300/70 bg-amber-500/25 text-amber-50'
                    : touching
                      ? 'border-emerald-400/50 bg-slate-900/90 text-emerald-100'
                      : 'border-cyan-400/50 bg-slate-900/90 text-cyan-100',
                ].join(' ')}
              >
                {touching ? 'contact' : `${link.gap} mm`}
                {link.parallel && <span className="ml-1 opacity-70">c/c {link.axisDistance}</span>}
              </button>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
