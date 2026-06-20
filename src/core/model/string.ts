/**
 * Tier 1 — String model（Robinson 1975 / SQUINT, §4.2）。
 * 付着部 P = R·P0 と機能的起始 Q から、眼位ごとに回旋軸を再計算する:
 *   axis(eyeOrientation) = normalize( P × Q )
 * これにより第三作用の眼位依存（外転位での SR 水平成分の減衰など）が正しくなる。
 *
 * MVP は付着点近似（接触弧補正なし）。筋長は Q→P の直線長を用いる。
 * 接触弧補正・接点 T での力作用は後続 Phase で追加（§4.2 の注記）。
 *
 * 単眼の筋作用は左右で臨床的に同一なので、physics は常に右眼正準系で計算する。
 */
import { normalize, cross, sub, length, type Vec3 } from "../kinematics/vec3";
import { apply as qapply, type Quat } from "../kinematics/quat";
import { canonicalAnatomy, type MuscleId } from "../data/anatomy";
import type { BiomechModel } from "./types";

export class StringModel implements BiomechModel {
  readonly tier = "string" as const;

  rotationAxis(muscle: MuscleId, eyeOrientation: Quat): Vec3 {
    const a = canonicalAnatomy(muscle);
    const P = qapply(eyeOrientation, a.insertion);
    return normalize(cross(P, a.origin));
  }

  muscleLength(muscle: MuscleId, eyeOrientation: Quat): number {
    const a = canonicalAnatomy(muscle);
    const P = qapply(eyeOrientation, a.insertion);
    return length(sub(P, a.origin));
  }
}
