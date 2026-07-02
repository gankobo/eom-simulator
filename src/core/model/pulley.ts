/**
 * Tier 2 — Active pulley model（能動プーリー, §4.3; Clark 2000 / Kono 2002）。
 *
 * 結合組織プーリーが眼位とともに移動し、筋の「引っ張り方向（作用軸）」が
 * 眼回転の半分（half-angle 則）だけ回るように拘束する。これが眼球運動の
 * 可換性（commutativity）と Listing 則を運動学的に生む、能動プーリー系の核心。
 *
 * 実装（half-angle 則をそのまま定式化）:
 *   axisPrimary = 第一眼位の作用軸（= Tier1 string の primary = 教科書の作用分解）
 *   axis(q)     = R^(k)·axisPrimary,  R^(k)=slerpFromIdentity(q, k), k=0.5
 * → 第一眼位（q=I）では axis=axisPrimary なので §11.1 を厳密に保ち、
 *   偏心視では作用軸が偏心角の半分だけ傾く（half-angle）。
 *
 * 注（古典23°/51°との関係）: Tier0/Tier1 が示す「直筋 外転23°/斜筋 内転51° で
 * 純粋上下転」は第一眼位の筋平面に基づく近似。half-angle 則はこれを偏心視で
 * 精密化するため、Tier2 の回旋0交差はこの角とは一致しない（バグではない）。
 *
 * 単眼の筋作用は左右で臨床的に同一なので、physics は常に右眼正準系で計算する。
 */
import { normalize, cross, sub, length, type Vec3 } from "../kinematics/vec3";
import { apply as qapply, slerpFromIdentity, type Quat } from "../kinematics/quat";
import { canonicalAnatomy, HALF_ANGLE_K, type MuscleId } from "../data/anatomy";
import type { BiomechModel } from "./types";

/** 第一眼位（q=I）の作用軸 = string 幾何 normalize(P0 × Q)。§11.1 の教科書値に一致。 */
function primaryAxis(muscle: MuscleId): Vec3 {
  const a = canonicalAnatomy(muscle);
  return normalize(cross(a.insertion, a.origin));
}

export class PulleyModel implements BiomechModel {
  readonly tier = "pulley" as const;

  rotationAxis(muscle: MuscleId, eyeOrientation: Quat): Vec3 {
    // half-angle: 第一眼位の作用軸を眼回転の k(=0.5) 倍だけ回す。
    const half = slerpFromIdentity(eyeOrientation, HALF_ANGLE_K);
    return normalize(qapply(half, primaryAxis(muscle)));
  }

  muscleLength(muscle: MuscleId, eyeOrientation: Quat): number {
    const a = canonicalAnatomy(muscle);
    const P = qapply(eyeOrientation, a.insertion);
    const pulley = pulleyAt(muscle, eyeOrientation);
    // 経路長は「付着部 → プーリー → 眼窩起始(固定 apex)」の折れ線の総和。
    // 直筋は前方(付着部→プーリー)＋後方(プーリー→apex)の2区間。半角でプーリーが
    // 動くと前方区間が変わる。斜筋は a.pulley 未設定＝pulleyAt が機能的起始そのもの
    // なので後方区間は無く、Tier1 と同じ単区間（起点が半角で移動するだけ）。
    const anterior = length(sub(P, pulley));
    const posterior = a.pulley ? length(sub(pulley, a.origin)) : 0;
    return anterior + posterior;
  }
}

/**
 * プーリーの実効位置（3D 可視化用）。直筋は Clark 2000 実測プーリーが
 * 眼回転の半分だけ球中心まわりに移動する様子を示す。斜筋は origin を流用。
 * 眼位に依存しない基準位置は pulleyAt(muscle, IDENTITY)。
 */
export function pulleyAt(muscle: MuscleId, eyeOrientation: Quat): Vec3 {
  const a = canonicalAnatomy(muscle);
  const base = a.pulley ?? a.origin;
  const half = slerpFromIdentity(eyeOrientation, HALF_ANGLE_K);
  return qapply(half, base);
}

/** プーリー基準位置（第一眼位）。ゴースト表示に使う。 */
export function pulleyBase(muscle: MuscleId): Vec3 {
  const a = canonicalAnatomy(muscle);
  return [...(a.pulley ?? a.origin)] as Vec3;
}
