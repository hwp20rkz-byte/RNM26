import { Config } from '@remotion/cli/config';
// 4K master: the 1080×1920 SVG design is rendered at deviceScaleFactor 2 → 2160×3840, H.264 high quality, 60 fps.
Config.setScale(2);
Config.setVideoImageFormat('png');
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setConcurrency(4);
// this container has no network for Remotion's own headless shell: use the pre-installed Chromium
Config.setBrowserExecutable(process.env.REMOTION_BROWSER ?? '/opt/pw-browsers/chromium');
