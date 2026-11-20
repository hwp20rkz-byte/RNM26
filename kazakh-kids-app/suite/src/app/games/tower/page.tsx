import { useEffect } from 'react';
import { MathTower3D } from '../../../components/games/MathTower3D';
import { currentLang } from '../../../lib/i18n';
import { navigate } from '../../router';
import { useGameStore } from '../../../store/useGameStore';

export default function TowerPage() {
  const setActive = useGameStore((s) => s.setActiveGame);
  useEffect(() => { setActive('tower'); return () => setActive(null); }, [setActive]);
  return <div className="fixed inset-0"><MathTower3D lang={currentLang()} onExit={() => navigate('/')} /></div>;
}
