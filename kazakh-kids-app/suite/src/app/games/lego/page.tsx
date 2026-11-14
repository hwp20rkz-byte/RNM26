import { useEffect } from 'react';
import { LegoSoz3D } from '../../../components/games/LegoSoz3D';
import { currentLang } from '../../../lib/i18n';
import { navigate } from '../../router';
import { useGameStore } from '../../../store/useGameStore';

export default function LegoPage() {
  const setActive = useGameStore((s) => s.setActiveGame);
  useEffect(() => { setActive('lego'); return () => setActive(null); }, [setActive]);
  return <div className="fixed inset-0"><LegoSoz3D lang={currentLang()} onExit={() => navigate('/')} /></div>;
}
