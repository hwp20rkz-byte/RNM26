import { useEffect } from 'react';
import { TotemCases3D } from '../../../components/games/TotemCases3D';
import { currentLang } from '../../../lib/i18n';
import { navigate } from '../../router';
import { useGameStore } from '../../../store/useGameStore';

export default function TotemCasesPage() {
  const setActive = useGameStore((s) => s.setActiveGame);
  useEffect(() => { setActive('totem-cases'); return () => setActive(null); }, [setActive]);
  return <div className="fixed inset-0"><TotemCases3D lang={currentLang()} onExit={() => navigate('/')} /></div>;
}
