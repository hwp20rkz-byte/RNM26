import { useEffect } from 'react';
import { BaiterekDefense3D } from '../../../components/games/BaiterekDefense3D';
import { currentLang } from '../../../lib/i18n';
import { navigate } from '../../router';
import { useGameStore } from '../../../store/useGameStore';

export default function BaiterekPage() {
  const setActive = useGameStore((s) => s.setActiveGame);
  useEffect(() => { setActive('baiterek'); return () => setActive(null); }, [setActive]);
  return <div className="fixed inset-0"><BaiterekDefense3D lang={currentLang()} onExit={() => navigate('/')} /></div>;
}
