import type { Vec3 } from "../kinematics/vec3";
import type { Quat } from "../kinematics/quat";
import type { MuscleId } from "../data/anatomy";

/**
 * 筋の3作用成分（眼の動座標系へ投影した回旋軸の各軸成分）。
 * 符号規約（§3.2）:
 *  tor  視軸まわり : + 外旋 / − 内旋
 *  ver  横軸まわり : + 下転 / − 上転
 *  hor  垂直軸まわり: + 内転 / − 外転
 */
export interface Action {
  tor: number;
  ver: number;
  hor: number;
}

/** モデル忠実度の階層（UI で切替えて比較できる）。 */
export type Tier = "kinematic" | "string" | "pulley";

/** すべてのモデル実装が満たすインターフェース（§4）。 */
export interface BiomechModel {
  readonly tier: Tier;
  /** 眼窩系での単位回旋軸（眼位依存）。 */
  rotationAxis(muscle: MuscleId, eyeOrientation: Quat): Vec3;
  /** 筋の現在長（path length, mm）。length-tension に用いる。 */
  muscleLength(muscle: MuscleId, eyeOrientation: Quat): number;
}
