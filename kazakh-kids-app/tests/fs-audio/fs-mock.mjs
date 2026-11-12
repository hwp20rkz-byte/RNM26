// Local stand-in for api.freedomspeech.kz with the contract the SDK speaks (freedomspeech 0.1.1):
//   POST /v1/audio/speech        X-API-Key, JSON {input|text, voice, language, emotion} → WAV
//   POST /v1/audio/transcriptions  multipart → {"text"}
//   WS   /ws/tts?apiKey=          synthesize → audio_chunk(base64 PCM16 24 kHz)… → audio_end
//   GET  /api/voices             catalog
// Failure injection: the first request whose text contains «429» answers 429 once; «boom» fails on WS once.
import http from 'node:http';
import { WebSocketServer } from 'ws';

export const KEY = 'test-key';
function tone(ms = 400, hz = 440, rate = 24000) {
  const n = Math.round(rate * ms / 1000), b = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(2 * Math.PI * hz * i / rate) * 8000), i * 2);
  return b;
}
function wav(pcm, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

export async function startMock() {
  const log = { speak: [], ws: [], asr: 0, keys: new Set(), failed: new Set() };
  const server = http.createServer((req, res) => {
    const body = []; req.on('data', (c) => body.push(c));
    req.on('end', () => {
      const u = new URL(req.url, 'http://x'), raw = Buffer.concat(body);
      if (u.pathname === '/api/voices') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify([{ id: 'tomiris', name: 'Tomiris', type: 'builtin' }, { id: 'taymas', name: 'Taymas', type: 'builtin' }])); }
      log.keys.add(req.headers['x-api-key']);
      if (req.headers['x-api-key'] !== KEY) { res.statusCode = 401; return res.end('{"detail":"bad key"}'); }
      if (u.pathname === '/v1/audio/speech') {
        const j = JSON.parse(raw.toString());
        const text = j.input ?? j.text;
        if (/429/.test(text) && !log.failed.has(text)) { log.failed.add(text); res.statusCode = 429; return res.end('{"detail":"slow down"}'); }
        log.speak.push(j); res.setHeader('content-type', 'audio/wav'); return res.end(wav(tone()));
      }
      if (u.pathname === '/v1/audio/transcriptions') {
        log.asr++; res.setHeader('content-type', 'application/json');
        return res.end(JSON.stringify({ text: 'сәлем', duration: 0.4 }));
      }
      res.statusCode = 404; res.end('{}');
    });
  });
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, sock, head) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname !== '/ws/tts' || u.searchParams.get('apiKey') !== KEY) { sock.write('HTTP/1.1 403 Forbidden\r\n\r\n'); return sock.destroy(); }
    wss.handleUpgrade(req, sock, head, (ws) => {
      ws.on('message', (m) => {
        const j = JSON.parse(String(m));
        if (j.type !== 'synthesize') return;
        log.ws.push(j);
        if (/boom/.test(j.text) && !log.failed.has(j.text)) { log.failed.add(j.text); return ws.send(JSON.stringify({ type: 'error', code: 'upstream_failed', message: 'upstream failed', requestId: j.requestId })); }
        const pcm = tone(300 + j.text.length * 10);
        for (let i = 0; i < 3; i++) {
          const part = pcm.subarray(Math.floor(pcm.length / 3 / 2) * 2 * i, i === 2 ? pcm.length : Math.floor(pcm.length / 3 / 2) * 2 * (i + 1));
          ws.send(JSON.stringify({ type: 'audio_chunk', audio: part.toString('base64'), chunkIndex: i, sampleRate: 24000, format: 'pcm_s16le', requestId: j.requestId }));
        }
        ws.send(JSON.stringify({ type: 'audio_end', totalChunks: 3, sampleRate: 24000, requestId: j.requestId }));
      });
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: 'http://127.0.0.1:' + server.address().port, log, close: () => new Promise((r) => { wss.close(); server.close(r); }) };
}
