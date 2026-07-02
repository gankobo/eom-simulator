/** クォータニオン [x, y, z, w]。眼位姿勢の基本表現（gimbal lock 回避）。 */
import type { Vec3 } from "./vec3";
import { normalize as vnorm } from "./vec3";

export type Quat = readonly [number, number, number, number];

export const IDENTITY: Quat = [0, 0, 0, 1];

/** 単位軸まわり angle(rad) 回転のクォータニオン。 */
export function fromAxisAngle(axis: Vec3, angle: number): Quat {
  const [ax, ay, az] = vnorm(axis);
  const s = Math.sin(angle / 2);
  return [ax * s, ay * s, az * s, Math.cos(angle / 2)];
}

/**
 * クォータニオン積 a*b。ベクトル適用は v' = q * v なので、
 * q = qA * qB は「qB を先に適用 → qA を後に適用」（§3.3 の規約）。
 */
export function mul(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

/** クォータニオンでベクトルを回転。 */
export function apply(q: Quat, v: Vec3): Vec3 {
  const [x, y, z, w] = q;
  const [vx, vy, vz] = v;
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [
    vx + w * tx + (y * tz - z * ty),
    vy + w * ty + (z * tx - x * tz),
    vz + w * tz + (x * ty - y * tx),
  ];
}

export const conjugate = (q: Quat): Quat => [-q[0], -q[1], -q[2], q[3]];

/**
 * IDENTITY から q への球面線形補間（slerp）を割合 t で。
 * slerp(IDENTITY, q, 0.5) は「q の半分の回転」= half-angle 則の実装に使う。
 */
export function slerpFromIdentity(q: Quat, t: number): Quat {
  // 入力の正規化ズレ・非有限を吸収（NaN/長さ0 は IDENTITY に落として伝播を止める）。
  let [x, y, z, w] = normalize(q);
  if (w < 0) {
    x = -x;
    y = -y;
    z = -z;
    w = -w;
  } // 最短経路
  if (w > 0.9995) {
    // ほぼ無回転: 線形近似して正規化
    return normalize([x * t, y * t, z * t, 1 + (w - 1) * t]);
  }
  const th = Math.acos(w); // IDENTITY と q のなす半角
  const s = Math.sin(th);
  const a = Math.sin((1 - t) * th) / s;
  const b = Math.sin(t * th) / s;
  return [x * b, y * b, z * b, a + w * b];
}

export function normalize(q: Quat): Quat {
  const n = Math.hypot(q[0], q[1], q[2], q[3]);
  return n > 0 ? [q[0] / n, q[1] / n, q[2] / n, q[3] / n] : IDENTITY;
}
