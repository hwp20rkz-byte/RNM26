import { useEffect } from 'react';
import { VoxelAnagram3D } from '../../../components/games/VoxelAnagram3D';
import { currentLang } from '../../../lib/i18n';
import { navigate } from '../../router';
import { useGameStore } from '../../../store/useGameStore';

export default function AnagramPage() {
  const setActive = useGameStore((s) => s.setActiveGame);
  useEffect(() => { setActive('anagram'); return () => setActive(null); }, [setActive]);
  return <div className="fixed inset-0"><VoxelAnagram3D lang={currentLang()} onExit={() => navigate('/')} /></div>;
}
