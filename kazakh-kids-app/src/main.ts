/* Entry of web/qv-modules.js (esbuild IIFE). Loaded after web/app.js and web/topic-games.js. */
import { LessonEngine, ADVICE, markOf, nextStreak, comboMultiplier } from './engine/LessonEngine';
import { registerExercises } from './exercises';
import { renderDialogue, DialogueEngine } from './dialogue/BranchingDialogue';
import { runTilKeremeti, RiddleBoard } from './games/TilKeremeti3D';
import { runWorkshop } from './games/ArchitectWorkshop3D';
import { runRoom } from './games/GoodDeedsRoom3D';
import { ssml, elevenLabsRequest, voiceDesignPrompt, PERSONAS } from './voice/audioMap';
import type { GameApi } from './types/app';

(window as unknown as { QLE: unknown }).QLE = { LessonEngine, ADVICE, markOf, nextStreak, comboMultiplier };
registerExercises(window.Q);

const C = window.QCURRICULUM;
window.QGAMES = window.QGAMES || {};
Object.entries(C.topicGames).forEach(([id, g]) => {
  if (g.type === 'dialogue') window.QGAMES[id] = (api: GameApi) => renderDialogue(api, id, C.dialogues[g.dialogue]);
  if (g.type === '3d') {
    if (g.scene === 'wheel') window.QGAMES[id] = (api: GameApi) => runTilKeremeti(api, id, C.riddles);
    if (g.scene === 'workshop') window.QGAMES[id] = (api: GameApi) => runWorkshop(api, id, C.workshop);
    if (g.scene === 'room') window.QGAMES[id] = (api: GameApi) => runRoom(api, id, C.room);
  }
});

// For tests and for the studio re-voicing pipeline.
(window as unknown as { QVM: unknown }).QVM = { DialogueEngine, RiddleBoard, voice: { PERSONAS, ssml, elevenLabsRequest, voiceDesignPrompt } };
