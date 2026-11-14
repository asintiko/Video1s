# Blender 3D pipeline

The show is a real 3D scene that Blender 4.5 LTS builds from Python on every run. There are no `.blend`
files in the repository: geometry, materials, rig, animation and effects are code, so every frame is a
pure function of its loop time `t` (0 … 15 s). This gives three properties the project needs:

* **Exact loop.** Everything is built from functions with a 15 s period; `t = 15` is `t = 0`.
* **One panorama on three screens.** The three screens are three windows of the same camera
  (lens shift), so the pictures continue across the seams pixel for pixel.
* **Resumable, parallel rendering.** Any frame can be rendered alone, in any order.

## Layout of the wall

```
|      left      |            center            |     right     |
|  6864 x 1872   |        11752 x 1872          |  6240 x 1872  |      panorama 24856 x 1872
     emo dancer             lead singer             saxophonist
```

World axes: +X to the right of the picture, +Z up, +Y away from the camera. The stage plane is `y = 0`,
`x = 0` is the middle of the centre screen, `z = 0` is the top of the centre hill. One metre is 445.7 px
on the stage plane (`vk/config.py`).

## Files

| File | Purpose |
| --- | --- |
| `render.py` | Command-line render driver (stills, frame ranges, resume, parallel parts). |
| `vk/config.py` | Wall layout, world scale, camera, marks of the characters, firework timing and colours. |
| `vk/camera.py` | Panorama camera and the slices (screens, close-ups) cut from it by lens shift. |
| `vk/show.py` | Scene assembly. Each scene module has `build(ctx) -> state` and `update(state, ctx, t)`. |
| `vk/terrain.py` | Height field of the meadow and the three hills. |
| `vk/environment.py` | Meadow, grass, sky, stars, moon, background hills. |
| `vk/lighting.py` | Night key light, rim lights, fill. |
| `vk/rig.py` | Mole skeleton, pose description, analytic IK solver, Blender armature. |
| `vk/skin.py` | Mesh and skin-weight helpers for procedural characters. |
| `vk/mole.py` (+ helper modules) | Character model, outfits, props, face controls. |
| `vk/propspec.py` | Geometry contract of the props (microphone, saxophone) for modelling and choreography. |
| `vk/choreo/` | The three routines: `pose(t) -> Pose` for singer, saxophonist and emo dancer. |
| `vk/characters.py` | Puts the cast on the marks, applies poses, adds follow-through to hair and coat tails. |
| `vk/fireworks.py` | Rockets, bursts, the VANKING word made of sparks, dynamic coloured light. |
| `vk/score.py`, `data/score.json` | The music as data (vocal syllables, sax notes, drums) for lip-sync and accents. |
| `data/vanking_text.json` | Sample points of the word VANKING for the spark typography. |
| `dev/` | Development tools: pose sheets, choreography checker, frame comparison. |

`data/*.json` come from the soundtrack sources: `node scripts/export-blender-data.mjs`.

## Why limbs cannot detach

`vk/rig.py` solves every pose in closed form. Bone lengths are constants; each limb starts exactly at the
joint of its parent (shoulder on the chest, hip on the pelvis), elbows and knees come from two-bone IK.
Sleeves and trouser legs are single skinned meshes with blended weights through the joints. Props are
attached to bone frames (`Attach`), and hands can be solved in the space of a prop, so both hands stay on
the saxophone while the head moves it.

## Rendering rules that keep the seams invisible

* No compositor, bloom, screen-space reflections or volumetrics: such effects depend on the borders of
  the rendered picture and would differ between neighbouring screens. Glow is geometry (additive sprites).
* The camera has the same position for all slices; only lens shift and resolution change.
* Time-dependent shaders read the `VK_Time` node group (`Seconds`, `Phase`), which the driver sets per frame.

## Commands

The normal entry point is `scripts/show.sh` (see the main README). Direct use of the driver:

```bash
# one still of the centre screen at t = 2.5 s, quarter resolution
blender -b --factory-startup --python blender/render.py -- --slice center --scale 0.25 --time 2.5 --out out/test/center

# close-up slices for checks: emo | singer | sax | text, or any pixel range X0:X1 of the panorama
blender -b --factory-startup --python blender/render.py -- --slice singer --scale 0.5 --time 0,1,2

# frames 0-449 of the right screen, two workers in two terminals
blender -b --factory-startup --python blender/render.py -- --slice right --part 1/2
blender -b --factory-startup --python blender/render.py -- --slice right --part 2/2

# save the built scene to look at it in the Blender UI
blender -b --factory-startup --python blender/render.py -- --save-blend out/show.blend
```

Development tools:

```bash
# pose sheet of one character (named test poses or choreography times)
blender -b --factory-startup --python blender/dev/pose_sheet.py -- singer out/poses rest,up,squat,mic front,three,side
blender -b --factory-startup --python blender/dev/pose_sheet.py -- emo out/poses choreo:0,0.25,0.5 front
blender/dev/contact_sheet.sh out/poses out/poses.png 6
```
