"""The only file that talks to the model API.

Every call asks for JSON matching a schema, then validates it with Pydantic, so a
malformed answer becomes an error we handle instead of bad data downstream.
"""

import json
import time
from typing import Tuple, Type, TypeVar

import anthropic
from pydantic import BaseModel, ValidationError

from triage import config
from triage.schemas import Usage

T = TypeVar("T", bound=BaseModel)

_client = None


class LLMError(Exception):
    """Any failure that means we can't trust this model call."""


def client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        # Reads ANTHROPIC_API_KEY from the environment. 1 automatic retry on
        # rate limits, 5xx and network errors; 20s timeout per attempt. After that the
        # pipeline's fail-safe sends the ticket to a person instead of making the agent wait.
        _client = anthropic.Anthropic(timeout=20.0, max_retries=1)
    return _client


def cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    price_in, price_out = config.PRICES.get(model, (0.0, 0.0))
    return (input_tokens * price_in + output_tokens * price_out) / 1_000_000


def call_json(model: str, system: str, user: str, schema: dict,
              output_type: Type[T], max_tokens: int = 4000) -> Tuple[T, Usage]:
    output_config = {"format": {"type": "json_schema", "schema": schema}}
    if model in config.MODELS_WITH_EFFORT:
        output_config["effort"] = config.EFFORT

    started = time.perf_counter()
    try:
        response = client().messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
            output_config=output_config,
        )
    except anthropic.APIError as e:
        raise LLMError(f"{type(e).__name__}: {e}") from e
    latency = time.perf_counter() - started

    if response.stop_reason == "refusal":
        raise LLMError("model declined the request")
    if response.stop_reason == "max_tokens":
        raise LLMError("model output was cut off (max_tokens)")

    text = next((b.text for b in response.content if b.type == "text"), "")
    try:
        parsed = output_type.model_validate(json.loads(text))
    except (json.JSONDecodeError, ValidationError) as e:
        raise LLMError(f"invalid model output: {e}") from e

    usage = Usage(
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
        cost_usd=cost_usd(model, response.usage.input_tokens, response.usage.output_tokens),
        latency_s=latency,
    )
    return parsed, usage
