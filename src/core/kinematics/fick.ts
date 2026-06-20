/**
 * Fick 座標 ↔ クォータニオン。
 * 規約（§3）: 水平=Z軸まわり(+内転/−外転), 垂直=Y軸まわり, 回旋=X軸まわり(+外旋/−内旋)。
 * Fick の合成順序: 水平Z → 垂直Y → 回旋X（intrinsic）。
 * 垂直は up-gaze を正にとるため qY(-v) を用いる（§14.3）。
 */
import { fromAxisAngle, mul, apply, type Quat } from "./quat";

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export interface Fick {
  /** 水平（度）。+ 内転 / − 外転 */
  h: number;
  /** 垂直（度）。+ 上転 / − 下転 */
  v: number;
  /** 回旋（度）。+ 外旋 / − 内旋 */
  torsion: number;
}

/** Fick 角からクォータニオンを作る。q = qZ(h) * qY(-v) * qX(torsion)。 */
export function gazeQuat(hDeg: number, vDeg: number, torsionDeg = 0): Quat {
  const qz = fromAxisAngle([0, 0, 1], hDeg * D2R);
  const qy = fromAxisAngle([0, 1, 0], -vDeg * D2R);
  const qx = fromAxisAngle([1, 0, 0], torsionDeg * D2R);
  return mul(mul(qz, qy), qx);
}

/**
 * クォータニオンから Fick 角を取り出す（gazeQuat の逆）。
 * 視軸 l = q·x̂ の向きで h,v を、横軸 q·ŷ の傾きで回旋を求める。
 */
export function fickFromQuat(q: Quat): Fick {
  const l = apply(q, [1, 0, 0]); // 視軸
  const h = Math.atan2(l[1], l[0]) * R2D; // +Y(鼻側)へ振れる = 内転
  const v = Math.asin(Math.max(-1, Math.min(1, l[2]))) * R2D; // +Z(上)= 上転
  // 回旋: 水平・垂直を打ち消した姿勢で残る X 軸まわりの回転
  const base = gazeQuat(h, v, 0);
  // residual = base^{-1} * q（base の共役を左から）
  const bc: Quat = [-base[0], -base[1], -base[2], base[3]];
  const resT = apply(bc, apply(q, [0, 1, 0])); // 横軸を base 系へ戻す
  const torsion = Math.atan2(resT[2], resT[1]) * R2D; // +Z 成分 = 外旋
  return { h, v, torsion };
}
