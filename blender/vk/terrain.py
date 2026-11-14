"""Analytic terrain: the three stage hills on a rolling meadow.  height(x, y) is the single source
of truth for the ground (mesh, grass placement, character marks, rocket launch points).

Contract (do not break): height(mark) == config.HILL_TOP_Z[...] exactly at the three marks, and
the hill tops are almost flat within ~0.5 m of the marks (feet stay planted without ground IK).
"""
import numpy as np

from . import config as C

S0 = -1.5            # meadow level around the stage hills (below the bottom frame edge)
_K = 1.25            # dome roundness


def _dome(u):
    """Rounded hill profile: 1 at the centre, 0 with zero slope at u >= 1."""
    u = np.clip(u, 0.0, 1.0)
    return np.cos(0.5 * np.pi * u) ** _K


def _hill_u(x, y, hx, hy, radius):
    # hills are a little deeper (in y) than wide so the crown reads round from the front
    return np.sqrt(((x - hx) / radius) ** 2 + ((y - hy) / (radius * 1.25)) ** 2)


# far rolling hills behind the stage: (x, y, sigma_x, sigma_y, height)
_RIDGES = [
    # mid-ground swells between / behind the stage hills (fill the bottom of the frame)
    (-10.5, 13.0, 5.5, 4.0, 0.75), (10.2, 12.0, 5.0, 4.0, 0.7), (-31.0, 15.0, 6.0, 4.5, 0.6),
    (30.0, 14.0, 6.0, 4.5, 0.65),
    # rolling hills
    (-34.0, 46.0, 15.0, 11.0, 2.3), (-12.0, 36.0, 12.0, 9.0, 1.9), (9.0, 44.0, 14.0, 10.0, 2.4),
    (31.0, 38.0, 13.0, 9.0, 2.0), (-52.0, 70.0, 16.0, 12.0, 2.9), (56.0, 64.0, 16.0, 12.0, 2.8),
    # far ridge line
    (-26.0, 96.0, 26.0, 16.0, 3.3), (4.0, 112.0, 30.0, 18.0, 3.9), (38.0, 100.0, 24.0, 16.0, 3.5),
]


def height(x, y):
    """Ground height z at world (x, y).  Accepts scalars or numpy arrays."""
    x = np.asarray(x, dtype=np.float64)
    y = np.asarray(y, dtype=np.float64)
    # gentle meadow undulation (deterministic), fades in away from the stage hills
    und = (0.16 * np.sin(0.21 * x + 0.9) * np.cos(0.17 * y - 0.4)
           + 0.09 * np.sin(0.53 * x - 1.3 + 0.31 * y)
           + 0.05 * np.sin(1.07 * x + 0.47 * y + 2.1))
    rise = 0.004 * np.clip(y - 6.0, 0.0, None) - 0.03 * np.clip(-y - 6.0, 0.0, None)
    for rx, ry, sx, sy, h in _RIDGES:
        rise = rise + h * np.exp(-0.5 * (((x - rx) / sx) ** 2 + ((y - ry) / sy) ** 2))
    mask = np.ones_like(x)
    hills = np.zeros_like(x)
    for _role, hx, hy, top, radius, _ in C.HILLS:
        u = _hill_u(x, y, hx, hy, radius)
        s = np.clip((u - 0.55) / 0.75, 0.0, 1.0)
        mask = mask * (s * s * (3 - 2 * s))
        hills = np.maximum(hills, (top - S0) * _dome(u))
    return S0 + mask * (und + rise) + hills


def height1(x, y):
    """Scalar convenience wrapper."""
    return float(height(x, y))


def normal(x, y, eps=0.05):
    """Unit surface normals (…, 3) by central differences."""
    x = np.asarray(x, dtype=np.float64)
    y = np.asarray(y, dtype=np.float64)
    dzdx = (height(x + eps, y) - height(x - eps, y)) / (2 * eps)
    dzdy = (height(x, y + eps) - height(x, y - eps)) / (2 * eps)
    n = np.stack([-dzdx, -dzdy, np.ones_like(dzdx)], axis=-1)
    return n / np.linalg.norm(n, axis=-1, keepdims=True)


def mark(name):
    """World position (x, y, z) of a character mark ('emo' | 'singer' | 'sax')."""
    x, y = C.MARKS[name]
    return (x, y, height1(x, y))
