import { useEffect } from 'react';
import { RiverOfTime3D } from '../../../components/games/RiverOfTime3D';
import { currentLang } from '../../../lib/i18n';
import { navigate } from '../../router';
import { useGameStore } from '../../../store/useGameStore';

export default function RiverPage() {
  const setActive = useGameStore((s) => s.setActiveGame);
  useEffect(() => { setActive('river'); return () => setActive(null); }, [setActive]);
  return <div className="fixed inset-0"><RiverOfTime3D lang={currentLang()} onExit={() => navigate('/')} /></div>;
}
