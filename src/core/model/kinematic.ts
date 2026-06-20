/**
 * Tier 0 — Kinematic model（教育用ベースライン, §4.1）。
 * 各筋に眼窩固定の単位回旋軸を与える。眼位非依存。
 * Tier1 との比較用に温存する。
 *
 * 単眼の筋作用は左右で臨床的に同一なので、physics は常に右眼正準系で計算する
 * （左眼固有の処理は表示・両眼層が担当）。
 */
import { normalize, sub, length, type Vec3 } from "../kinematics/vec3";
import { apply as qapply, type Quat } from "../kinematics/quat";
import { canonicalAnatomy, type MuscleId } from "../data/anatomy";
import type { BiomechModel } from "./types";

export class KinematicModel implements BiomechModel {
  readonly tier = "kinematic" as const;

  rotationAxis(muscle: MuscleId, _eyeOrientation: Quat): Vec3 {
    return normalize(canonicalAnatomy(muscle).fixedAxis);
  }

  /** Tier0 は力学を持たないが、参考に付着部→起始の直線長を返す。 */
  muscleLength(muscle: MuscleId, eyeOrientation: Quat): number {
    const a = canonicalAnatomy(muscle);
    const P = qapply(eyeOrientation, a.insertion);
    return length(sub(P, a.origin));
  }
}
