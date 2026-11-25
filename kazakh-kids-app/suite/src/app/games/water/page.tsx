import { useEffect } from 'react';
import { Water3D } from '../../../components/games/Water3D';
import { currentLang } from '../../../lib/i18n';
import { navigate } from '../../router';
import { useGameStore } from '../../../store/useGameStore';

export default function WaterPage() {
  const setActive = useGameStore((s) => s.setActiveGame);
  useEffect(() => { setActive('water'); return () => setActive(null); }, [setActive]);
  return <div className="fixed inset-0"><Water3D lang={currentLang()} onExit={() => navigate('/')} /></div>;
}
