/**
 * Listing 則 と half-angle 則（§6）。
 *
 * 規約: 第一眼位の視軸 = +X。Listing 面 = YZ 平面
 *   （= 固視眼位の回転ベクトルが X 成分=0 を持つ＝偽の回旋がない平面）。
 *
 * Listing 則: 固視眼位は「第一眼位から目標視線方向への最短弧回転」で表され、
 *   その回転軸は YZ 面内にある（→ 回転ベクトルが Listing 面に乗る）。
 * half-angle 則: 固視→固視運動の角速度軸は、眼位の偏心角 E の「半分」だけ
 *   Listing 面から傾く。本ファイルの velocityAxisTilt() がこれを数値で返す。
 */
import { normalize, cross, dot, type Vec3 } from "./vec3";
import { fromAxisAngle, mul, conjugate, apply, type Quat } from "./quat";
import { gazeQuat } from "./fick";
import { rotationVector } from "./rotvec";

/** Fick 角の視線方向（単位ベクトル）。 */
export function gazeDirection(hDeg: number, vDeg: number): Vec3 {
  return apply(gazeQuat(hDeg, vDeg), [1, 0, 0]);
}

/** ベクトル a を b へ最短回転で重ねるクォータニオン。 */
export function shortestArc(a: Vec3, b: Vec3): Quat {
  const an = normalize(a);
  const bn = normalize(b);
  const d = Math.max(-1, Math.min(1, dot(an, bn)));
  if (d > 0.999999) return [0, 0, 0, 1];
  if (d < -0.999999) {
    // 反対向き: 任意の直交軸で180°
    const axis = Math.abs(an[0]) < 0.9 ? cross(an, [1, 0, 0]) : cross(an, [0, 1, 0]);
    return fromAxisAngle(axis, Math.PI);
  }
  return fromAxisAngle(cross(an, bn), Math.acos(d));
}

/**
 * Listing 則に従う固視眼位（第一眼位 +X からの最短弧回転）。
 * 回転軸が YZ 面内 → 回転ベクトルの X 成分 = 0（Listing 面上）。
 */
export function listingQuat(hDeg: number, vDeg: number): Quat {
  return shortestArc([1, 0, 0], gazeDirection(hDeg, vDeg));
}

/** 2眼位間の運動の角速度軸（固定系）。ω ∝ vec(q2 ⊗ q1⁻¹)。 */
export function velocityAxis(q1: Quat, q2: Quat): Vec3 {
  const dq = mul(q2, conjugate(q1));
  return normalize([dq[0], dq[1], dq[2]]);
}

/** 偏心角（第一眼位 +X と現在視線のなす角, 度）。 */
export function eccentricity(hDeg: number, vDeg: number): number {
  const d = Math.max(-1, Math.min(1, dot([1, 0, 0], gazeDirection(hDeg, vDeg))));
  return (Math.acos(d) * 180) / Math.PI;
}

/**
 * half-angle 則の数値検証用。
 * 偏心位置 (h,v) で、運動方向 dir（"h" or "v"）に微小固視運動したときの
 * 角速度軸が Listing 面（法線 +X）から傾く角度（度）を返す。
 * 期待: tilt ≈ eccentricity/2。
 */
export function velocityAxisTilt(hDeg: number, vDeg: number, dir: "h" | "v"): number {
  const eps = 0.5;
  const q1 = listingQuat(hDeg, vDeg);
  const q2 =
    dir === "h" ? listingQuat(hDeg + eps, vDeg) : listingQuat(hDeg, vDeg + eps);
  const w = velocityAxis(q1, q2);
  // Listing 面(YZ)からの傾き = X 成分の asin
  return (Math.asin(Math.max(-1, Math.min(1, Math.abs(w[0])))) * 180) / Math.PI;
}

/** 回転ベクトルの X 成分（Listing 面からの逸脱; 固視則なら ≈0）。 */
export function listingResidual(q: Quat): number {
  return Math.abs(rotationVector(q)[0]);
}
