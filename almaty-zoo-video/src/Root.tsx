import { Composition } from 'remotion';
import timing from './timing.json';
import { ZooVideo, type Mode } from './Video';

// 1080×1920 design space at 60 fps; render with --scale=2 for the 4K master (2160×3840).
const comp = (id: string, mode: Mode, look: 'flat' | 'story' = 'flat', kzOnly = false) => (
  <Composition id={id} component={ZooVideo} defaultProps={{ mode, look, kzOnly }} width={1080} height={1920} fps={timing.fps}
    durationInFrames={Math.round((timing as unknown as Record<Mode, { total: number }>)[mode].total * timing.fps)} />
);
export const RemotionRoot = () => (<>{comp('ZooBilingual', 'bilingual')}{comp('ZooKZ', 'kz')}{comp('ZooPL', 'pl')}{comp('ZooStoryKZ', 'kz', 'story', true)}</>);
