import { useEffect } from 'react';
import { HyperloopBuilder3D } from '../../../components/games/HyperloopBuilder3D';
import { currentLang } from '../../../lib/i18n';
import { navigate } from '../../router';
import { useGameStore } from '../../../store/useGameStore';

export default function HyperloopPage() {
  const setActive = useGameStore((s) => s.setActiveGame);
  useEffect(() => { setActive('hyperloop'); return () => setActive(null); }, [setActive]);
  return <div className="fixed inset-0"><HyperloopBuilder3D lang={currentLang()} onExit={() => navigate('/')} /></div>;
}
