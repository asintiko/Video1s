"""PLACEHOLDER choreography for 'singer' (simple groove) — to be replaced by the real routine."""
import math

from .. import propspec
from ..rig import Arm, Attach, Leg, Pose, arm_fk, HEAD
from .common import bounce, sway

NAME = "singer"


def pose(t):
    p = Pose()
    b = bounce(t)
    s = sway(t, 4.0)
    p.hips_pos = (0.03 * s, 0.0, -0.03 - 0.04 * b)
    p.hips_rot = (0.0, 0.10 * s, 0.05 * s)
    p.chest_rot = (0.04 * b, -0.15 * s, -0.06 * s)
    p.head_rot = (0.06 * b, 0.1 * s, 0.05 * s)
    p.arm_L = arm_fk("L", swing=0.5 + 0.4 * s, raise_=0.9 + 0.5 * sway(t, 2.0), elbow=1.2 + 0.5 * sway(t, 1.0), twist=0.4)
    p.arm_R = arm_fk("R", swing=0.5 - 0.4 * s, raise_=0.9 - 0.5 * sway(t, 2.0), elbow=1.2 - 0.5 * sway(t, 1.0), twist=0.4)
    p.leg_L.heel = 0.5 * max(0.0, sway(t, 2.0))
    p.leg_R.toe = 0.4 * max(0.0, -sway(t, 2.0))
    p.jaw = 0.5 + 0.5 * sway(t, 1.0)
    if NAME == "singer":
        mouth = HEAD["mouth"]
        p.arm_R = Arm(hand=(mouth[0] - 0.05, mouth[1] - 0.10, mouth[2] - 0.16), pole=(-0.8, 0.3, -0.6), space="head",
                      fingers=(0.5, 0.1, 0.85), palm=(0.6, 0.6, -0.5), curl=0.85)
        p.props["mic"] = Attach("hand.R", matrix=propspec.MIC_IN_HAND["R"])
    if NAME == "sax":
        mouth = HEAD["mouth"]
        p.props["sax"] = Attach("head", pos=(mouth[0], mouth[1] - 0.01, mouth[2]), rot=(-0.25, 0.0, 0.12))
        ug, lg = propspec.SAX["upper_grip"], propspec.SAX["lower_grip"]
        p.arm_L = Arm(hand=(ug[0] + 0.075, ug[1] + 0.03, ug[2] - 0.01), pole=(0.8, 0.5, -0.4), space="prop:sax",
                      fingers=(-1.0, -0.25, 0.1), palm=(-0.2, 0.0, 0.3), curl=0.55)
        p.arm_R = Arm(hand=(lg[0] - 0.075, lg[1] + 0.03, lg[2] - 0.01), pole=(-0.8, 0.5, -0.4), space="prop:sax",
                      fingers=(1.0, -0.25, 0.1), palm=(0.2, 0.0, 0.3), curl=0.55)
    return p
