import { useEffect } from 'react';
import { KiizUi3D } from '../../../components/games/KiizUi3D';
import { currentLang } from '../../../lib/i18n';
import { navigate } from '../../router';
import { useGameStore } from '../../../store/useGameStore';

export default function KiizPage() {
  const setActive = useGameStore((s) => s.setActiveGame);
  useEffect(() => { setActive('kiiz'); return () => setActive(null); }, [setActive]);
  return <div className="fixed inset-0"><KiizUi3D lang={currentLang()} onExit={() => navigate('/')} /></div>;
}
