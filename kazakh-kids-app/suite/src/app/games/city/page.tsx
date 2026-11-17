import { useEffect } from 'react';
import { CityQuest3D } from '../../../components/games/CityQuest3D';
import { currentLang } from '../../../lib/i18n';
import { navigate } from '../../router';
import { useGameStore } from '../../../store/useGameStore';

export default function CityPage() {
  const setActive = useGameStore((s) => s.setActiveGame);
  useEffect(() => { setActive('city'); return () => setActive(null); }, [setActive]);
  return <div className="fixed inset-0"><CityQuest3D lang={currentLang()} onExit={() => navigate('/')} /></div>;
}
