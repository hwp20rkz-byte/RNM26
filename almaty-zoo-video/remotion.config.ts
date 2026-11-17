import { Config } from '@remotion/cli/config';
// The 1080×1920 SVG design is rendered at deviceScaleFactor SCALE: 2/3 → 720×1280 (default, owner's choice 17.11),
// 2 → 4K 2160×3840 (SCALE=2 npm run render:all). Vector art, so every scale is sharp. 60 fps, H.264.
Config.setScale(Number(process.env.SCALE ?? 2 / 3));
Config.setVideoImageFormat('png');
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setConcurrency(4);
// this container has no network for Remotion's own headless shell: use the pre-installed Chromium
Config.setBrowserExecutable(process.env.REMOTION_BROWSER ?? '/opt/pw-browsers/chromium');
