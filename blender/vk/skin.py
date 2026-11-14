"""Mesh + skin-weight helpers for building characters procedurally (numpy, no bpy)."""
import numpy as np


def catmull(points, per_seg=6):
    """Resample a polyline with a centripetal-ish Catmull-Rom spline.  Returns (M, 3)."""
    p = np.asarray(points, dtype=np.float64)
    if len(p) < 3 or per_seg <= 1:
        return p
    out = []
    n = len(p)
    for i in range(n - 1):
        p0, p1, p2, p3 = p[max(i - 1, 0)], p[i], p[i + 1], p[min(i + 2, n - 1)]
        for k in range(per_seg):
            u = k / per_seg
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    out.append(p[-1])
    return np.array(out)


def _interp_radii(points, radii, path):
    """Interpolate per-control-point radii (scalar or (rx, rz) pairs) onto a resampled path."""
    p = np.asarray(points, dtype=np.float64)
    r = np.asarray(radii, dtype=np.float64)
    if r.ndim == 1:
        r = np.stack([r, r], axis=1)
    s_ctrl = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(p, axis=0), axis=1))])
    s_path = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))])
    s_path = s_path / s_path[-1] * s_ctrl[-1]
    return np.stack([np.interp(s_path, s_ctrl, r[:, 0]), np.interp(s_path, s_ctrl, r[:, 1])], axis=1)


def tube(points, radii, sides=16, per_seg=5, cap_start="round", cap_end="round", ref=(0.0, -1.0, 0.0)):
    """Sweep an elliptical ring along a smoothed path.

    points: control points (K, 3); radii: K scalars or K (r_side, r_ref) pairs, where r_ref is
    the radius along the `ref` direction (kept as constant as possible along the path) and
    r_side the radius across it.  cap_*: 'round' | 'flat' | None.
    Returns (verts (N,3) float64, faces list of tuples).
    """
    path = catmull(points, per_seg)
    rad = _interp_radii(points, radii, path)
    n = len(path)
    tang = np.gradient(path, axis=0)
    tang /= np.linalg.norm(tang, axis=1, keepdims=True)
    ref = np.asarray(ref, dtype=np.float64)
    rings = []
    b_prev = None
    for i in range(n):
        t = tang[i]
        b = ref - t * np.dot(ref, t)
        if np.linalg.norm(b) < 1e-4:
            b = b_prev if b_prev is not None else np.cross(t, [1.0, 0.0, 0.0])
        b = b / np.linalg.norm(b)
        b_prev = b
        a = np.cross(t, b)
        ang = np.linspace(0, 2 * np.pi, sides, endpoint=False)
        rings.append(path[i] + np.outer(np.cos(ang), a) * rad[i, 0] + np.outer(np.sin(ang), b) * rad[i, 1])
    verts = [np.concatenate(rings)]
    faces = []
    for i in range(n - 1):
        for k in range(sides):
            k2 = (k + 1) % sides
            faces.append((i * sides + k, i * sides + k2, (i + 1) * sides + k2, (i + 1) * sides + k))
    count = n * sides

    def cap(idx, direction, mode, flip):
        nonlocal count
        base = idx * sides
        if mode is None:
            return
        steps = 4 if mode == "round" else 0
        prev = base
        r0 = rad[idx]
        for s in range(1, steps + 1):
            ang = (s / (steps + 1)) * np.pi / 2
            ring = path[idx] + (rings[idx] - path[idx]) * np.cos(ang) + direction * (np.sin(ang) * float(min(r0)))
            verts.append(ring)
            cur = count
            count += sides
            for k in range(sides):
                k2 = (k + 1) % sides
                f = (prev + k, prev + k2, cur + k2, cur + k)
                faces.append(f[::-1] if flip else f)
            prev = cur
        tip = path[idx] + direction * (float(min(r0)) if mode == "round" else 0.0)
        verts.append(tip[None, :])
        ti = count
        count += 1
        for k in range(sides):
            k2 = (k + 1) % sides
            f = (prev + k, prev + k2, ti)
            faces.append(f[::-1] if flip else f)

    cap(0, -tang[0], cap_start, True)
    cap(n - 1, tang[-1], cap_end, False)
    return np.concatenate(verts), faces


def ellipsoid(center, radii, segments=24, rings=16):
    """UV ellipsoid.  Returns (verts, faces)."""
    c = np.asarray(center, dtype=np.float64)
    r = np.asarray(radii, dtype=np.float64)
    verts = [c + r * [0, 0, 1]]
    for i in range(1, rings):
        th = np.pi * i / rings
        ph = np.linspace(0, 2 * np.pi, segments, endpoint=False)
        verts.extend(c + r * np.stack([np.sin(th) * np.cos(ph), np.sin(th) * np.sin(ph), np.full_like(ph, np.cos(th))], axis=1))
    verts.append(c + r * [0, 0, -1])
    verts = np.array(verts)
    faces = []
    for k in range(segments):
        faces.append((0, 1 + k, 1 + (k + 1) % segments))
    for i in range(rings - 2):
        a, b = 1 + i * segments, 1 + (i + 1) * segments
        for k in range(segments):
            k2 = (k + 1) % segments
            faces.append((a + k, b + k, b + k2, a + k2))
    last = len(verts) - 1
    a = 1 + (rings - 2) * segments
    for k in range(segments):
        faces.append((last, a + (k + 1) % segments, a + k))
    return verts, faces


def smoothstep(a, b, x):
    u = np.clip((x - a) / (b - a), 0.0, 1.0)
    return u * u * (3 - 2 * u)


def chain_weights(verts, joints, bones, blend=0.05):
    """Skin weights for vertices around a bone chain.

    joints: K+1 rest joint positions (start of bone 0 … end of bone K-1); bones: K bone names.
    Around each interior joint the weight passes from one bone to the next over ±blend metres
    (measured along the bisecting direction), which gives a smooth elbow / knee.
    Returns {bone: weights (N,)}.
    """
    v = np.asarray(verts, dtype=np.float64)
    j = np.asarray(joints, dtype=np.float64)
    k = len(bones)
    assert len(j) == k + 1
    w_next = []
    for i in range(1, k):
        d0 = j[i] - j[i - 1]
        d1 = j[i + 1] - j[i]
        axis = d0 / np.linalg.norm(d0) + d1 / np.linalg.norm(d1)
        axis /= np.linalg.norm(axis)
        w_next.append(smoothstep(-blend, blend, (v - j[i]) @ axis))
    out = {}
    for i, b in enumerate(bones):
        w = np.ones(len(v))
        if i > 0:
            w = w * w_next[i - 1]
        if i < k - 1:
            w = w * (1 - w_next[i])
        out[b] = out.get(b, 0) + w
    return out


def blend_weights(*parts):
    """Normalise a sum of weight dicts: blend_weights((mask, weights), ...) with per-vertex masks."""
    total = {}
    for mask, w in parts:
        for b, arr in w.items():
            total[b] = total.get(b, 0) + np.asarray(arr) * mask
    s = sum(total.values())
    s = np.where(s > 1e-9, s, 1.0)
    return {b: a / s for b, a in total.items()}


def merge(*meshes):
    """Concatenate (verts, faces) meshes."""
    verts, faces, off = [], [], 0
    for v, f in meshes:
        verts.append(np.asarray(v, dtype=np.float64))
        faces.extend(tuple(i + off for i in face) for face in f)
        off += len(v)
    return np.concatenate(verts), faces
