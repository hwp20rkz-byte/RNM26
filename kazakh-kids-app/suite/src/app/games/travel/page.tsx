import { useEffect } from 'react';
import { Travel3D } from '../../../components/games/Travel3D';
import { currentLang } from '../../../lib/i18n';
import { navigate } from '../../router';
import { useGameStore } from '../../../store/useGameStore';

export default function TravelPage() {
  const setActive = useGameStore((s) => s.setActiveGame);
  useEffect(() => { setActive('travel'); return () => setActive(null); }, [setActive]);
  return <div className="fixed inset-0"><Travel3D lang={currentLang()} onExit={() => navigate('/')} /></div>;
}
