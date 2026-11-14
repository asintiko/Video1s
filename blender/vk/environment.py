"""TEMPORARY debug environment (slice stitching test): terrain + coloured marker poles."""
import bpy
import numpy as np
from . import config as C, terrain, util


def build(ctx):
    col = ctx.collection("Env")
    xs = np.linspace(C.PANO_X0 - 20, C.PANO_X1 + 20, 500)
    ys = np.concatenate([np.linspace(-12, 30, 160), np.linspace(31, 220, 90)])
    g = util.grid_mesh("Ground", xs, ys, terrain.height, col)
    mat, nodes, links, bsdf, out = util.material("dbg_ground")
    chk = nodes.new("ShaderNodeTexChecker"); chk.inputs["Scale"].default_value = 1.0
    geo = nodes.new("ShaderNodeNewGeometry")
    links.new(geo.outputs["Position"], chk.inputs["Vector"])
    chk.inputs["Color1"].default_value = (0.05, 0.35, 0.05, 1); chk.inputs["Color2"].default_value = (0.1, 0.5, 0.1, 1)
    links.new(chk.outputs["Color"], bsdf.inputs["Base Color"])
    g.data.materials.append(mat)
    tn = util.time_node(nodes)
    # poles every 2 m on the stage plane, text box corners
    red = util.principled("dbg_red", (1, 0.1, 0.1), emission=(1, 0.1, 0.1), emission_strength=2.0)
    pm, pn, pl, pb, po = util.material("dbg_time")
    t = util.time_node(pn)
    hsv = pn.new("ShaderNodeHueSaturation"); hsv.inputs["Color"].default_value = (1, 0, 0, 1)
    pl.new(t.outputs["Phase"], hsv.inputs["Hue"])
    pl.new(hsv.outputs["Color"], pb.inputs["Emission Color"]); pb.inputs["Emission Strength"].default_value = 3
    for i, x in enumerate(np.arange(-28, 28, 1.0)):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=4.2, location=(x, 0, 1.1))
        o = bpy.context.object; util.link(o, col); o.data.materials.append(pm if i % 5 == 0 else red)
    for name, (mx, my) in C.MARKS.items():
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.775, location=(mx, my, terrain.height1(mx, my) + 0.775))
        o = bpy.context.object; util.link(o, col)
    # diagonal bar crossing both seams to verify continuity
    for sx in (C.px_to_x(6864), C.px_to_x(18616)):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(sx, 8, 1.5), rotation=(0, 0.6, 0), scale=(6, 0.1, 0.1))
        o = bpy.context.object; util.link(o, col); o.data.materials.append(red)
    w = bpy.data.worlds.new("dbg"); ctx.scene.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.02, 0.03, 0.12, 1)
    sun = bpy.data.lights.new("sun", "SUN"); sun.energy = 3
    so = bpy.data.objects.new("sun", sun); col.objects.link(so); so.rotation_euler = (0.9, 0.2, 0.5)
    return {}


def update(state, ctx, t):
    pass
