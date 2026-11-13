"""Voice engines of the studio. Every engine offers the same two calls:

    design(text, hero, language) -> (audio, sr)      a new timbre from a description
    clone(text, ref_wav, ref_text, language, speed) -> (audio, sr)   any line in a reference voice

Free / open (no payment):
  omnivoice-space  public Hugging Face Space k2-fsa/OmniVoice through gradio_client (ZeroGPU; a free HF_TOKEN
                   raises the daily GPU quota). Kazakh is one of its 600+ languages (1537 h of training data).
  omnivoice-local  the same model on your GPU (pip install omnivoice; weights from the Hub, Apache-2.0 code).
  qwen-space       public Space Qwen/Qwen3-TTS, VoiceDesign from a free-text brief (10 languages, Russian
                   included, no Kazakh) — used only to invent the timbre; OmniVoice then speaks Kazakh with it.
Paid / key:
  freedomspeech    api.freedomspeech.kz /api/voice-design and /api/voice-clone (FS_API_KEY).

Public Spaces change without notice: endpoints are discovered from the Space's own API description and can
be pinned with --api-design / --api-clone; `voice-studio.py probe` prints what a Space exposes.
"""
from __future__ import annotations

import base64
import json
import os
import tempfile
import urllib.request
import uuid
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from .audio import SR, read_audio, read_bytes, to_float

# OmniVoice voice-design vocabulary (omnivoice/utils/voice_design.py) and the Space's dropdown labels.
CATEGORIES = [
    ("Gender / 性别", {"male": "Male / 男", "female": "Female / 女"}),
    ("Age / 年龄", {"child": "Child / 儿童", "teenager": "Teenager / 少年", "young adult": "Young Adult / 青年",
                    "middle-aged": "Middle-aged / 中年", "elderly": "Elderly / 老年"}),
    ("Pitch / 音调", {"very low pitch": "Very Low Pitch / 极低音调", "low pitch": "Low Pitch / 低音调",
                      "moderate pitch": "Moderate Pitch / 中音调", "high pitch": "High Pitch / 高音调",
                      "very high pitch": "Very High Pitch / 极高音调"}),
    ("Style / 风格", {"whisper": "Whisper / 耳语"}),
]
VALID_ATTRS = {a for _, m in CATEGORIES for a in m}
LANG_NAME = {"kk": "Kazakh", "ru": "Russian", "en": "English"}


class EngineError(RuntimeError):
    pass


class QuotaError(EngineError):
    """Free GPU quota of a public Space is used up — wait, or set HF_TOKEN, then resume."""


def check_instruct(instruct: str) -> List[str]:
    """Attributes outside OmniVoice's vocabulary (empty list = valid); one value per category."""
    parts = [p.strip().lower() for p in instruct.split(",") if p.strip()]
    bad = [p for p in parts if p not in VALID_ATTRS]
    for _, m in CATEGORIES:
        if sum(p in m for p in parts) > 1:
            bad.append("two values of one category: " + ", ".join(p for p in parts if p in m))
    return bad


def _audio_from_result(res: Any) -> Tuple[np.ndarray, int]:
    """gradio_client returns (filepath | {'path': …} | (sr, array), status) for an Audio output."""
    status = ""
    if isinstance(res, (list, tuple)) and len(res) == 2 and isinstance(res[1], str) and not isinstance(res[0], (int, float)):
        res, status = res
    if status and status.strip().lower().startswith("error"):
        raise EngineError(status.strip())
    if isinstance(res, dict):
        res = res.get("path") or res.get("name") or res.get("url")
    if isinstance(res, (list, tuple)) and len(res) == 2 and isinstance(res[0], (int, float)):
        return to_float(np.asarray(res[1])), int(res[0])
    if isinstance(res, str) and os.path.exists(res):
        return read_audio(res)
    raise EngineError(f"unexpected Space output: {str(res)[:200]} {status}")


def _quota(e: Exception) -> bool:
    s = str(e).lower()
    return any(k in s for k in ("quota", "zerogpu", "exceeded your gpu", "too many requests", "429"))


class GradioSpace:
    """Thin wrapper over gradio_client with endpoint discovery and quota detection."""

    def __init__(self, space: str, token: Optional[str] = None, client: Any = None):
        self.space = space
        if client is None:
            try:
                from gradio_client import Client
            except ImportError as e:  # pragma: no cover - environment dependent
                raise EngineError("pip install gradio_client  (free public Spaces are called through it)") from e
            tok = token or os.environ.get("HF_TOKEN")
            try:                                   # gradio_client ≥ 2 renamed hf_token → token
                client = Client(space, token=tok, verbose=False)
            except TypeError:
                client = Client(space, hf_token=tok, verbose=False)
        self.client = client
        self._api = None

    def api(self) -> Dict[str, Any]:
        if self._api is None:
            self._api = self.client.view_api(return_format="dict", print_info=False) or {}
        return self._api

    def endpoints(self) -> Dict[str, Any]:
        a = self.api()
        return dict(a.get("named_endpoints", {}))

    def find(self, word: str, pinned: Optional[str] = None) -> Tuple[str, List[Dict[str, Any]]]:
        eps = self.endpoints()
        if pinned:
            if pinned not in eps:
                raise EngineError(f"{self.space}: endpoint {pinned} not found; has {sorted(eps)}")
            return pinned, eps[pinned].get("parameters", [])
        hits = [k for k in eps if word in k.lower()]
        if not hits:
            raise EngineError(f"{self.space}: no endpoint with «{word}» — run `voice-studio.py probe` and pin it; has {sorted(eps)}")
        hits.sort(key=len)
        return hits[0], eps[hits[0]].get("parameters", [])

    def call(self, api_name: str, *args, **kwargs):
        try:
            return self.client.predict(*args, api_name=api_name, **kwargs)
        except Exception as e:  # gradio_client raises AppError / ValueError / httpx errors
            if _quota(e):
                raise QuotaError(f"{self.space}: free GPU quota used up ({e}). Set HF_TOKEN (free account) or wait; rerun resumes.") from e
            raise EngineError(f"{self.space}{api_name}: {e}") from e


class OmniVoiceSpace:
    name = "omnivoice-space"
    # parameter order of omnivoice/cli/demo.py (_clone_fn / _design_fn); settings: steps, cfg, denoise, speed, duration, pre, post
    def __init__(self, space: str = "k2-fsa/OmniVoice", api_design: Optional[str] = None, api_clone: Optional[str] = None,
                 steps: int = 32, client: Any = None):
        self.sp = GradioSpace(space, client=client)
        self.api_design, self.api_clone, self.steps = api_design, api_clone, steps

    def _settings(self, speed: float):
        return [self.steps, 2.0, True, float(speed), None, True, True]

    def design(self, text: str, hero: Dict[str, Any], language: str = "kk") -> Tuple[np.ndarray, int]:
        api, params = self.sp.find("design", self.api_design)
        attrs = [a.strip().lower() for a in hero["instruct"].split(",")]
        groups = []
        for _, m in CATEGORIES:
            groups.append(next((m[a] for a in attrs if a in m), "Auto"))
        groups += ["Auto"] * max(0, len(params) - 9 - len(groups))     # accent / dialect dropdowns
        args = [text, LANG_NAME.get(language, "Auto")] + self._settings(hero.get("speed", 1.0)) + groups
        if params and len(params) != len(args):
            raise EngineError(f"{api} takes {len(params)} inputs, expected {len(args)}; pin another endpoint with --api-design")
        return _audio_from_result(self.sp.call(api, *args))

    def clone(self, text: str, ref_wav: str, ref_text: str, language: str = "kk", speed: float = 1.0) -> Tuple[np.ndarray, int]:
        from_file = _handle_file(ref_wav)
        api, params = self.sp.find("clone", self.api_clone)
        args = [text, LANG_NAME.get(language, "Auto"), from_file, ref_text, ""] + self._settings(speed)
        if params and len(params) != len(args):
            raise EngineError(f"{api} takes {len(params)} inputs, expected {len(args)}; pin another endpoint with --api-clone")
        return _audio_from_result(self.sp.call(api, *args))


def _handle_file(path: str):
    try:
        from gradio_client import handle_file
        return handle_file(path)
    except ImportError:
        return {"path": path, "meta": {"_type": "gradio.FileData"}}


class QwenDesignSpace:
    """Qwen3-TTS VoiceDesign through its public Space: free-text timbre brief, Russian/English text only."""
    name = "qwen-space"

    def __init__(self, space: str = "Qwen/Qwen3-TTS", api_design: Optional[str] = None, client: Any = None):
        self.sp = GradioSpace(space, client=client)
        self.api_design = api_design

    def _map(self, params, text, hero, language) -> Optional[Dict[str, Any]]:
        kw: Dict[str, Any] = {}
        for p in params:
            key = p.get("parameter_name") or p.get("label") or ""
            label = (str(p.get("label", "")) + " " + key).lower()
            if any(w in label for w in ("instruct", "description", "voice desc", "prompt", "style")):
                kw[key] = hero["design"]
            elif "lang" in label:
                kw[key] = LANG_NAME.get(language, "Auto")
            elif "text" in label:
                kw[key] = text
        ok = any(v == hero["design"] for v in kw.values()) and any(v == text for v in kw.values())
        return kw if ok else None

    def design(self, text: str, hero: Dict[str, Any], language: str = "ru") -> Tuple[np.ndarray, int]:
        eps = self.sp.endpoints()
        names = [self.api_design] if self.api_design else sorted((k for k in eps if "design" in k.lower()), key=len)
        if self.api_design and self.api_design not in eps:
            raise EngineError(f"{self.sp.space}: endpoint {self.api_design} not found; has {sorted(eps)}")
        for api in names:                      # the first design endpoint whose inputs map to text + description
            kw = self._map(eps[api].get("parameters", []), text, hero, language)
            if kw:
                return _audio_from_result(self.sp.call(api, **kw))
        raise EngineError(f"{self.sp.space}: no design endpoint with text + description inputs among {names}; run probe and pin with --api-design-via")

    def clone(self, *a, **k):
        raise EngineError("qwen-space is used for timbre design only; Kazakh lines are spoken by OmniVoice")


class OmniVoiceLocal:
    name = "omnivoice-local"

    def __init__(self, model: str = "k2-fsa/OmniVoice", device: Optional[str] = None, steps: int = 32):
        try:
            import torch
            from omnivoice import OmniVoice, OmniVoiceGenerationConfig
        except ImportError as e:  # pragma: no cover
            raise EngineError("pip install torch omnivoice  (GPU recommended)") from e
        if device is None:
            device = "cuda:0" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu")
        self.m = OmniVoice.from_pretrained(model, device_map=device, dtype=torch.float16 if device.startswith("cuda") else torch.float32)
        self.cfg = OmniVoiceGenerationConfig(num_step=steps)
        self._prompts: Dict[str, Any] = {}

    def design(self, text, hero, language="kk"):
        a = self.m.generate(text=text, language=language, instruct=hero["instruct"], speed=hero.get("speed", 1.0), generation_config=self.cfg)[0]
        return to_float(a), self.m.sampling_rate

    def clone(self, text, ref_wav, ref_text, language="kk", speed=1.0):
        if ref_wav not in self._prompts:
            self._prompts[ref_wav] = self.m.create_voice_clone_prompt(ref_audio=ref_wav, ref_text=ref_text)
        a = self.m.generate(text=text, language=language, voice_clone_prompt=self._prompts[ref_wav], speed=speed, generation_config=self.cfg)[0]
        return to_float(a), self.m.sampling_rate


class FreedomSpeechCloud:
    """Paid cloud: POST /api/voice-design {text, instruct, language} and multipart /api/voice-clone."""
    name = "freedomspeech"

    def __init__(self, base_url: Optional[str] = None, key: Optional[str] = None, opener=urllib.request.urlopen):
        self.base = (base_url or os.environ.get("FS_BASE_URL") or "https://api.freedomspeech.kz").rstrip("/")
        self.key = key or os.environ.get("FS_API_KEY")
        if not self.key:
            raise EngineError("FS_API_KEY is not set")
        self.open = opener

    def _req(self, path, data: bytes, ctype: str):
        r = urllib.request.Request(self.base + path, data=data, method="POST", headers={"X-API-Key": self.key, "Content-Type": ctype, "User-Agent": "qazaqverse-voice-studio"})
        try:
            with self.open(r, timeout=180) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            if e.code == 429:
                raise QuotaError("freedomspeech: 429 too many requests") from e
            raise EngineError(f"freedomspeech {path}: HTTP {e.code} {e.read()[:200]!r}") from e

    def design(self, text, hero, language="kk"):
        d = json.loads(self._req("/api/voice-design", json.dumps({"text": text, "instruct": hero["design"], "language": language}).encode(), "application/json"))
        b64 = d.get("voice_clone_wav_base64") or d.get("reference_wav_base64")
        if not b64:
            raise EngineError("freedomspeech voice-design: no audio in response")
        return read_bytes(base64.b64decode(b64))

    def clone(self, text, ref_wav, ref_text, language="kk", speed=1.0):
        bnd = uuid.uuid4().hex
        parts = []
        for k, v in (("text", text), ("language", language), ("speed", str(speed))):
            parts.append(f"--{bnd}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode())
        with open(ref_wav, "rb") as fh:
            parts.append(f"--{bnd}\r\nContent-Disposition: form-data; name=\"audio\"; filename=\"reference.wav\"\r\nContent-Type: audio/wav\r\n\r\n".encode() + fh.read() + b"\r\n")
        parts.append(f"--{bnd}--\r\n".encode())
        return read_bytes(self._req("/api/voice-clone", b"".join(parts), "multipart/form-data; boundary=" + bnd))


def make_engine(name: str, **kw):
    if name == "omnivoice-space":
        return OmniVoiceSpace(api_design=kw.get("api_design"), api_clone=kw.get("api_clone"), steps=kw.get("steps", 32))
    if name == "qwen-space":
        return QwenDesignSpace(api_design=kw.get("api_design"))
    if name == "omnivoice-local":
        return OmniVoiceLocal(steps=kw.get("steps", 32))
    if name == "freedomspeech":
        return FreedomSpeechCloud(base_url=kw.get("base_url"))
    raise EngineError("unknown engine " + name)
