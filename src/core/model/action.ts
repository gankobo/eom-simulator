/** 回旋軸 → 3作用成分への共通投影（Tier0/Tier1 で共用, §14.3）。 */
import { apply, type Quat } from "../kinematics/quat";
import { dot, type Vec3 } from "../kinematics/vec3";
import type { Action, BiomechModel } from "./types";
import type { MuscleId } from "../data/anatomy";

/** 眼窩系の回旋軸 axis を、眼位 q の動座標系(視軸l/横軸t/垂直軸v)へ投影。 */
export function actionFromAxis(axis: Vec3, eyeOrientation: Quat): Action {
  const l = apply(eyeOrientation, [1, 0, 0]); // 視軸
  const t = apply(eyeOrientation, [0, 1, 0]); // 横軸
  const v = apply(eyeOrientation, [0, 0, 1]); // 垂直軸
  return { tor: dot(axis, l), ver: dot(axis, t), hor: dot(axis, v) };
}

/** モデルから、指定眼位での筋作用を計算。 */
export function muscleAction(
  model: BiomechModel,
  muscle: MuscleId,
  eyeOrientation: Quat,
): Action {
  return actionFromAxis(model.rotationAxis(muscle, eyeOrientation), eyeOrientation);
}
