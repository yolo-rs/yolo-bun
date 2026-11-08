# Copyright 2026 Google LLC
# SPDX-License-Identifier: Apache-2.0

import json
import re
from typing import Any
from urllib.parse import urlencode

from carbon_core import get_native_engine_version

STREAM_GENERATE_URL = (
    "https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate"
)
ROTATE_COOKIES_URL = "https://accounts.google.com/RotateCookies"
SAVED_INFO_URL = "https://gemini.google.com/saved-info"
OPENAI_GATEWAY_URL = "http://127.0.0.1:4040/v1/chat/completions"


def extract_wiz_tokens(html: str) -> dict[str, str | None]:
    snlm0e = re.search(r'"SNlM0e"\s*:\s*"([^"]+)"', html)
    cfb2h = re.search(r'"cfb2h"\s*:\s*"([^"]+)"', html)
    fdrfje = re.search(r'"FdrFJe"\s*:\s*"([^"]+)"', html)
    return {
        "snlm0e": snlm0e.group(1) if snlm0e else None,
        "cfb2h": cfb2h.group(1) if cfb2h else None,
        "fdrfje": fdrfje.group(1) if fdrfje else None,
    }


def build_cookie_header(secure_1psid: str, secure_1psidts: str | None = None) -> str:
    parts = [f"__Secure-1PSID={secure_1psid}"]
    if secure_1psidts:
        parts.append(f"__Secure-1PSIDTS={secure_1psidts}")
    return "; ".join(parts)


def build_stream_generate_payload(
    prompt: str, snlm0e_token: str, tool_prefix: str | None = None
) -> dict[str, Any]:
    effective_prompt = (
        f"{tool_prefix} {prompt}" if tool_prefix and not prompt.startswith(tool_prefix) else prompt
    )
    inner_req = json.dumps(
        [[effective_prompt, 0, None, [], None, None, 0], ["en"], ["", "", "", None, None, []]]
    )
    outer_req = json.dumps([None, inner_req])
    body = urlencode({"f.req": outer_req, "at": snlm0e_token})
    return {
        "url": f"{STREAM_GENERATE_URL}?bl=boq_assistant-bard-web-server_20261105.08_p0&rt=c",
        "body": body,
    }


def print_gemini_web_summary() -> None:
    print("=== GOOGLE DEEPMIND CARBON // PYTHON GEMINI WEB & GATEWAY CLIENT ===")
    print(f"Native Rust Kernel:  {get_native_engine_version()}")
    print(f"StreamGenerate RPC:  {STREAM_GENERATE_URL}")
    print(f"RotateCookies URL:   {ROTATE_COOKIES_URL}")
    print(f"Saved Info Memory:   {SAVED_INFO_URL}")
    print(f"OpenAI Gateway URL:  {OPENAI_GATEWAY_URL}")
    print(
        "Supported Auth:      __Secure-1PSID + __Secure-1PSIDTS + SNlM0e | Gemini.exe :8789 | Vertex AI ADC"
    )


__all__ = [
    "OPENAI_GATEWAY_URL",
    "ROTATE_COOKIES_URL",
    "SAVED_INFO_URL",
    "STREAM_GENERATE_URL",
    "build_cookie_header",
    "build_stream_generate_payload",
    "extract_wiz_tokens",
    "print_gemini_web_summary",
]
