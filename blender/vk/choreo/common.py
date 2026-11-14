"""Shared choreography helpers."""
import math

from ..config import BEAT, LOOP
from ..mathx import TAU


def beat_phase(t, beats=1.0, offset=0.0):
    """Phase 0..1 of a cycle lasting `beats` beats (LOOP must contain an integer number of them)."""
    return ((t / BEAT - offset) / beats) % 1.0


def bounce(t, beats=1.0, offset=0.0, sharp=2.0):
    """Down-on-the-beat groove curve in 0..1: 1 exactly on the beat, eases to 0 in between."""
    ph = beat_phase(t, beats, offset)
    return (0.5 + 0.5 * math.cos(TAU * ph)) ** sharp


def sway(t, beats=2.0, offset=0.0):
    """Sine in -1..1 with a period of `beats` beats."""
    return math.sin(TAU * beat_phase(t, beats, offset))


assert abs((LOOP / BEAT) - round(LOOP / BEAT)) < 1e-9
