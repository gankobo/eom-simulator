/**
 * 回転ベクトル（Rodrigues）表現: rotvec = tan(θ/2)·n̂。
 * Listing 則の検証に使う（固視眼位の rotvec が1平面=Listing面に乗るか）。
 */
import type { Vec3 } from "./vec3";
import type { Quat } from "./quat";

/** クォータニオン [x,y,z,w] → 回転ベクトル (x/w, y/w, z/w)。 */
export function rotationVector(q: Quat): Vec3 {
  const w = q[3] === 0 ? 1e-12 : q[3];
  return [q[0] / w, q[1] / w, q[2] / w];
}
