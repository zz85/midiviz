# #031 · RoboPianist vs #029

[RoboPianist](https://kzakka.com/robopianist/) (Zakka et al., CoRL 2023) trains two simulated Shadow Dexterous Hands to play the piano in MuJoCo with deep RL. #029 picks fingers with rules and plans the motion. This experiment runs both on the same physics and scores them the same way.

## What is compared

|                | RoboPianist                                                         | Ours (#029 + this folder)                                                                 |
|----------------|---------------------------------------------------------------------|-------------------------------------------------------------------------------------------|
| Fingering      | human labels from PIG / Rousseau, used as a **reward** during training | chosen by `fingering/fingering.js` (with Shadow Hand spans, see below)                     |
| Motion         | learned policy, 20 Hz, 38 joint targets                             | `fingering/motion.js` fingertip plan → damped-least-squares IK at 100 Hz → 38 joint targets |
| Per song       | 5 M training steps (hours on a GPU)                                  | nothing: fingering 20–200 ms, then plays at real time                                        |
| New MIDI       | needs a new policy                                                   | any file                                                                                    |
| Physics        | MuJoCo, 200 Hz, Shadow Hands                                         | the **same** scene, loaded from their browser demo                                          |

The RL side is RoboPianist's own browser demo data: the 20 Hz actions its authors recorded from their trained policies, replayed open loop through the same MuJoCo 2.3.1 wasm build.

## Results (`node robopianist/eval.js --human`)

RoboPianist's metric (`wrappers/evaluation.py`): a 20 Hz piano roll, the keys pressed after each 50 ms step, and precision, recall and F1 averaged over the frames.

| Clip (the two RoboPianist ships MIDI for) | RL policy F1    | Ours F1 | Ours with the human fingering |
|-------------------------------------------|-----------------|---------|-------------------------------|
| Twinkle Twinkle (Rousseau, 7.9 s)         | **89.1**        | 86.5    | 71.2                          |
| Chopin Nocturne Op. 9/2 (Rousseau, 26 s)  | **84.0**        | 57.1    | 58.4                          |

Our precision is as high as the RL policy's (92–99 %): we rarely press a wrong key. Our recall is lower: we miss notes. The shortfall comes from the robot, not from the fingering:

- The forearm slide is a stiff, heavily damped servo (τ ≈ 0.22 s), so wide left-hand leaps arrive late.
- The forearms collide when their centres are less than 14.7 cm apart. The RoboPianist paper reports the same failure.
- A Shadow Hand spans about two-thirds of a pianist's hand, and its thumb cannot pass under the fingers.

The RL policy learned to work around these limits for each song. We only model them, in the fingering span table and the IK.

Our fingering agrees with the human labels on hand 94–100 % and on hand plus finger about 48 % of the time. On this hand, though, the human fingering plays worse than ours on Twinkle and about the same on the Nocturne.

Pieces with no policy, for scale: Für Elise (full, 165 s) scores F1 60.6 and Bach's C major Prelude 63.1. RoboPianist reports an average F1 of 0.79 on its Etude-12 set, but each of those songs was trained separately.

## How our side drives the hands (`sim.js`)

1. **Fingering**: `fingerPiece` runs with `SHADOW_FINGERING`, a span table measured with this IK (calibration on white keys) and a high cost for thumb crossings.
2. **Timing**: notes are re-timed to the metric's 50 ms frames (`framedNotes`), so a re-struck key gets the one-frame gap the score requires. Held keys that the hand cannot keep are let go (`releaseOutOfReach`).
3. **Fingertip plan**: `buildMotion` (#029). Here `glide` is on and the approach is longer, because the robot arm is slower than a pianist's.
4. **IK**: on a second, kinematics-only MuJoCo data, a damped-least-squares solve over 19 actuated variables per hand:
   - targets are the five fingertips plus each last knuckle, which keeps fingers curved rather than clawed;
   - the Jacobian comes from grouped finite differences (8 `kinematics()` calls per iteration for both hands);
   - joint limits are handled with an active set.
5. **Servos**: each servo is close to first order, so its target is `q + τ·q̇`.
6. **Closed loop**: a finger presses only once its real fingertip is within 8 mm of the key. Otherwise it hovers, so it does not land on a neighbour on the way.

## Files

- `mujoco/` holds `mujoco_wasm` (MuJoCo 2.3.1), from [kevinzakka/robopianist-demo](https://github.com/kevinzakka/robopianist-demo), Apache-2.0, built on [zalo/mujoco_wasm](https://github.com/zalo/mujoco_wasm) (MIT).
- `scene/` holds their piano and two Shadow Hands scene, the meshes (MuJoCo Menagerie, Apache-2.0) and the recorded policy actions (`*_actions.npy`). The licence is in `LICENSE`.
- `midi/` holds RoboPianist's two Rousseau clips, used with the artist's permission per their README. The other three demo songs come from PIG, which may not be redistributed, so only their RL replay is shown.
- `sim.js` contains the world, scoring, the replay controller and the planner. `render.js` draws MuJoCo bodies in three.js. `eval.js` is the headless comparison:
  - `--human` adds runs with the human labels;
  - `--human-hand` uses pianist spans instead of Shadow Hand spans;
  - `--opts='{…}'` overrides planner settings;
  - `--tune` runs a coordinate search;
  - `file.mid …` plays any MIDI.
