import { useEffect } from 'react';
import { SandarQalasy3D } from '../../../components/games/SandarQalasy3D';
import { currentLang } from '../../../lib/i18n';
import { navigate } from '../../router';
import { useGameStore } from '../../../store/useGameStore';

export default function SandarPage() {
  const setActive = useGameStore((s) => s.setActiveGame);
  useEffect(() => { setActive('sandar'); return () => setActive(null); }, [setActive]);
  return <div className="fixed inset-0"><SandarQalasy3D lang={currentLang()} onExit={() => navigate('/')} /></div>;
}
