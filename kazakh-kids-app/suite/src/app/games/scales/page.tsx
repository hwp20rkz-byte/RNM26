import { useEffect } from 'react';
import { Scales3D } from '../../../components/games/Scales3D';
import { currentLang } from '../../../lib/i18n';
import { navigate } from '../../router';
import { useGameStore } from '../../../store/useGameStore';

export default function ScalesPage() {
  const setActive = useGameStore((s) => s.setActiveGame);
  useEffect(() => { setActive('scales'); return () => setActive(null); }, [setActive]);
  return <div className="fixed inset-0"><Scales3D lang={currentLang()} onExit={() => navigate('/')} /></div>;
}
