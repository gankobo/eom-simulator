/** core 公開 API（DOM/Three 非依存の数値核）。 */
export * from "./kinematics/vec3";
// quat の normalize は vec3 と名前衝突するため namespace で公開する。
export * as quat from "./kinematics/quat";
export { fromAxisAngle, mul, apply, conjugate, IDENTITY, type Quat } from "./kinematics/quat";
export * from "./kinematics/fick";
export * from "./kinematics/rotvec";
export * from "./kinematics/listing";
export * from "./data/anatomy";
export * from "./model/types";
export * from "./model/action";
export { KinematicModel } from "./model/kinematic";
export { StringModel } from "./model/string";
export { PulleyModel, pulleyAt, pulleyBase } from "./model/pulley";

import type { BiomechModel, Tier } from "./model/types";
import { KinematicModel } from "./model/kinematic";
import { StringModel } from "./model/string";
import { PulleyModel } from "./model/pulley";

/**
 * Tier 名から対応するモデルを生成。
 * eye は単眼 physics に影響しない（左右で作用は同一）。表示・両眼層が左眼を扱う。
 */
export function createModel(tier: Tier): BiomechModel {
  switch (tier) {
    case "kinematic":
      return new KinematicModel();
    case "pulley":
      return new PulleyModel();
    default:
      return new StringModel();
  }
}
