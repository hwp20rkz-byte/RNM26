import { useEffect } from 'react';
import { FloatingMonoliths3D } from '../../../components/games/FloatingMonoliths3D';
import { currentLang } from '../../../lib/i18n';
import { navigate } from '../../router';
import { useGameStore } from '../../../store/useGameStore';

export default function MonolithsPage() {
  const setActive = useGameStore((s) => s.setActiveGame);
  useEffect(() => { setActive('monoliths'); return () => setActive(null); }, [setActive]);
  return <div className="fixed inset-0"><FloatingMonoliths3D lang={currentLang()} onExit={() => navigate('/')} /></div>;
}
