import { useEffect } from 'react';
import { GravityRange3D } from '../../../components/games/GravityRange3D';
import { currentLang } from '../../../lib/i18n';
import { navigate } from '../../router';
import { useGameStore } from '../../../store/useGameStore';

export default function GravityPage() {
  const setActive = useGameStore((s) => s.setActiveGame);
  useEffect(() => { setActive('gravity'); return () => setActive(null); }, [setActive]);
  return <div className="fixed inset-0"><GravityRange3D lang={currentLang()} onExit={() => navigate('/')} /></div>;
}
