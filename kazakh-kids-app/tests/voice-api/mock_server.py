"""Mock of the QazaqVerse Voice HTTPS API (contract from the integration guide), for client tests.
Key in the path (/k/<key>/...) or in X-Api-Key. Control: GET /_mode?m=ok|silence|down|429, GET /_log."""
import json, struct, sys, urllib.parse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

KEY, MP3 = 'testkey', sys.argv[1]
state = {'mode': 'ok', 'log': []}


class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def send(self, code, body, ctype='application/json', extra=None):
        b = body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', ctype); self.send_header('Content-Length', str(len(b)))
        self.send_header('Access-Control-Allow-Origin', '*')
        for k, v in (extra or {}).items(): self.send_header(k, v)
        self.end_headers(); self.wfile.write(b)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key')
        self.end_headers()

    def route(self):
        u = urllib.parse.urlparse(self.path); q = dict(urllib.parse.parse_qsl(u.query)); path = u.path
        if path.startswith('/_'): return path, q, True
        key = self.headers.get('X-Api-Key')
        if path.startswith('/k/'):
            parts = path.split('/', 3); key = parts[2]; path = '/' + (parts[3] if len(parts) > 3 else '')
        return path, q, key == KEY

    def do_GET(self):
        path, q, ok = self.route()
        if path == '/_mode': state['mode'] = q.get('m', 'ok'); return self.send(200, {'mode': state['mode']})
        if path == '/_log': return self.send(200, state['log'])
        state['log'].append({'m': 'GET', 'path': path, 'q': q, 'auth': ok})
        if not ok: return self.send(401, {'error': 'unauthorized'})
        if state['mode'] == '429': return self.send(429, {'error': 'rate_limited'})
        if path == '/health':
            return self.send(200, {'ok': True, 'model': 'mlx:kazakh-whisper-large-v3-turbo', 'vad': 'silero-vad', 'stt': state['mode'] != 'down', 'voices': ['issai', 'iseke', 'raya'], 'version': '0.1.0'})
        if path == '/tts':
            if not q.get('text') or len(q['text']) > 400: return self.send(400, {'error': 'bad_text'})
            return self.send(200, open(MP3, 'rb').read(), 'audio/mpeg', {'Cache-Control': 'public, max-age=31536000, immutable'})
        self.send(404, {'error': 'not_found'})

    def do_POST(self):
        path, q, ok = self.route()
        body = self.rfile.read(int(self.headers.get('Content-Length') or 0))
        rec = {'m': 'POST', 'path': path, 'q': q, 'auth': ok, 'ctype': self.headers.get('Content-Type'), 'bytes': len(body)}
        state['log'].append(rec)
        if not ok: return self.send(401, {'error': 'unauthorized'})
        if state['mode'] == '429': return self.send(429, {'error': 'rate_limited'})
        if state['mode'] == 'down': return self.send(503, {'error': 'stt_unavailable'})
        if path != '/assess': return self.send(404, {'error': 'not_found'})
        if not q.get('target') or len(q['target']) > 300: return self.send(400, {'error': 'bad_target'})
        if len(body) < 44 or body[:4] != b'RIFF' or body[8:12] != b'WAVE': return self.send(400, {'error': 'bad_audio'})
        fmt, ch, rate = struct.unpack('<HHI', body[20:28]); bits = struct.unpack('<H', body[34:36])[0]
        rec.update(fmt=fmt, ch=ch, rate=rate, bits=bits, seconds=round((len(body) - 44) / (rate * 2), 2))
        if fmt != 1 or bits != 16: return self.send(400, {'error': 'bad_audio'})
        if state['mode'] == 'silence': return self.send(200, {'error': 'silence', 'model': 'mock'})
        t = q['target'].lower().replace(',', '').replace('!', '').strip()
        hyp = t.replace('қ', 'х', 1)
        self.send(200, {'target': t, 'hypothesis': hyp, 'accuracy': 94.0, 'confidence': 0.91, 'score': 85.5, 'passed': True, 'missed': ['қ'] if hyp != t else [],
                        'feedback': {'kk': 'Назар аудар! Мына дыбыстарды анығырақ айт: Қ', 'ru': 'Обрати внимание! Произнеси чётче звуки: Қ', 'en': 'Listen closely! Say these sounds more clearly: Қ'},
                        'model': 'mlx:kazakh-whisper-large-v3-turbo', 'vad': 'silero-vad', 'speech_seconds': 1.89, 'ms': 980})


ThreadingHTTPServer(('127.0.0.1', 8765), H).serve_forever()
