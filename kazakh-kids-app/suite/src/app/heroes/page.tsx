/**
 * Кейіпкерлер — gallery of the eight blocky heroes (BlockHeroBuilder) doing their signature moves; tap one to wave.
 * Wide screens: one arc of eight with name labels at alternating heights. Phone: one big hero at a time with ‹ › buttons
 * (eight heroes in a tall frame are too small and their names collide).
 */
import { useEffect, useState } from 'react';
import { Billboard } from '@react-three/drei';
import { CanvasLabel } from '../../components/3d/CanvasLabel';
import { StudioCanvas } from '../../components/3d/canvas/StudioCanvas';
import { SkyDiorama } from '../../components/3d/environment/SkyDiorama';
import { BlockHero } from '../../components/3d/heroes/BlockHero';
import { HERO_IDS, HEROES, type HeroId } from '../../components/3d/heroes/BlockHeroBuilder';
import { navigate } from '../router';

const arc = (i: number): [number, number, number] => [(i - 3.5) * 2.1, 0, -Math.abs(i - 3.5) * 0.7];
const isTall = () => window.innerWidth / Math.max(1, window.innerHeight) < 0.8;

export default function HeroesPage() {
  const [wave, setWave] = useState<HeroId | null>(null), [cur, setCur] = useState(0), [tall, setTall] = useState(isTall);
  useEffect(() => { const on = () => setTall(isTall()); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on); }, []);
  const id = HERO_IDS[cur], step = (d: number) => { setCur((c) => (c + d + HERO_IDS.length) % HERO_IDS.length); setWave(null); };
  return (
    <div className="fixed inset-0 bg-obsidian">
      <StudioCanvas key={String(tall)} camera={tall ? { position: [0, 2.2, 7.5], look: [0, 1.7, 0] } : { position: [0, 3.6, 13], look: [0, 1.7, -1] }} designAspect={tall ? 0.6 : 1.8}>
        <SkyDiorama quality="medium" />
        {tall ? (
          <group onPointerDown={() => setWave(id)}><BlockHero key={id} id={id} move={wave === id ? 'wave' : HEROES[id].signature} scale={0.8} /></group>
        ) : HERO_IDS.map((h, i) => (
          <group key={h} onPointerDown={() => setWave(h)}>
            <BlockHero id={h} move={wave === h ? 'wave' : HEROES[h].signature} position={arc(i)} scale={0.6} />
            <Billboard position={[arc(i)[0], arc(i)[1] + (i % 2 ? 3.45 : 2.85), arc(i)[2]]}><CanvasLabel text={HEROES[h].kk} height={0.42} glow={HEROES[h].face.glow ?? '#00AFCA'} /></Billboard>
          </group>
        ))}
      </StudioCanvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 pb-[max(16px,env(safe-area-inset-bottom))] text-center">
        {tall ? (
          <div className="pointer-events-auto mx-auto flex max-w-sm items-center justify-between gap-2">
            <button className="btn-ghost holo !min-h-[52px] !min-w-[52px] text-xl" aria-label="Алдыңғы" onClick={() => step(-1)}>‹</button>
            <p className="text-2xl font-black" data-hero={id}>{HEROES[id].kk}<span className="block text-sm font-normal text-mist-dim">{cur + 1} / {HERO_IDS.length}</span></p>
            <button className="btn-ghost holo !min-h-[52px] !min-w-[52px] text-xl" aria-label="Келесі" onClick={() => step(1)}>›</button>
          </div>
        ) : <p className="text-sm text-mist-dim">{HERO_IDS.map((h) => HEROES[h].kk).join(' · ')}</p>}
        <button className="btn-ghost holo pointer-events-auto mt-2 !min-h-[44px]" onClick={() => navigate('/')}>← Ойындар</button>
      </div>
    </div>
  );
}
