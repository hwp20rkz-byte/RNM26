import { useEffect } from 'react';
import { NatureLab3D } from '../../../components/games/NatureLab3D';
import { currentLang } from '../../../lib/i18n';
import { navigate } from '../../router';
import { useGameStore } from '../../../store/useGameStore';

export default function LabPage() {
  const setActive = useGameStore((s) => s.setActiveGame);
  useEffect(() => { setActive('lab'); return () => setActive(null); }, [setActive]);
  return <div className="fixed inset-0"><NatureLab3D lang={currentLang()} onExit={() => navigate('/')} /></div>;
}
