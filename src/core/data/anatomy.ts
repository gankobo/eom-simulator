/**
 * 解剖パラメータ（右眼正準系 +X前方/+Y鼻側/+Z上方, 単位 mm）。
 *
 * 重要: insertion/origin は §11 受け入れ基準（第一眼位の作用分解, 回旋0交差 直筋外転23°・
 * 斜筋内転51°, 純粋上下転）を満たすよう構成した暫定スターター（Tier0/Tier1 が使用）。
 * pulley は直筋のみ Clark 2000 (IOVS 41:3787-97) Table 2 の実測値（Tier2 の可視化・機序説明用）。
 * 各値の出自は source に記す。検証: tasks/verify_final.py（§11）, tasks/verify_tier2.py（Tier2）。
 */
import type { Vec3 } from "../kinematics/vec3";

export type MuscleId = "MR" | "LR" | "SR" | "IR" | "SO" | "IO";

export const MUSCLE_IDS: readonly MuscleId[] = ["MR", "LR", "SR", "IR", "SO", "IO"];

export const MUSCLE_NAMES_JA: Record<MuscleId, string> = {
  MR: "内直筋",
  LR: "外直筋",
  SR: "上直筋",
  IR: "下直筋",
  SO: "上斜筋",
  IO: "下斜筋",
};

export interface MuscleAnatomy {
  /** 第一眼位の付着部（強膜上, 球中心基準, mm）。眼の回転とともに動く。 */
  insertion: Vec3;
  /** 機能的起始（Tier1 では眼窩固定。直筋=apex/pulley, 斜筋=滑車/眼窩底, mm）。 */
  origin: Vec3;
  /** Tier0 用の眼窩固定回旋軸（単位ベクトル, §14.2）。比較ベースライン。 */
  fixedAxis: Vec3;
  /**
   * 結合組織プーリーの位置（球中心基準, mm）。直筋のみ Clark 2000 (IOVS 41:3787-97)
   * Table 2 の実測値。斜筋（滑車/眼窩底）は Clark 非対象のため未設定（origin を流用）。
   * Tier2 の 3D 可視化と half-angle 機序の説明に用いる（作用軸計算は half-angle 則で行う）。
   */
  pulley?: Vec3;
  source: string;
}

/** 眼球半径（mm）。軸長 ~24mm。 */
export const GLOBE_RADIUS = 12.0;

/** 偏位角(度) → プリズムジオプター換算係数（§5.3）。 */
export const DEG_TO_PRISM = 1.75;

/**
 * half-angle 則の結合係数（Tier2 能動プーリー）。
 * 筋の作用軸は眼回転の半分（k=0.5）だけ回る＝Listing 則・眼球運動の可換性を生む
 * 能動プーリー系の運動学的帰結（Clark 2000 / Kono 2002）。
 */
export const HALF_ANGLE_K = 0.5;

/**
 * 右眼の解剖（tasks/verify_final.py で §11 を満たすことを確認済み）。
 * insertion/origin は付着部距離(§7.2)・筋平面角(§7.3 直筋23°/斜筋51°)・
 * 滑車/起始の象限から構成し、§11 の作用と0交差に一致するよう同定した。
 */
export const RIGHT_EYE_ANATOMY: Record<MuscleId, MuscleAnatomy> = {
  MR: {
    insertion: [6.88, 9.83, 0.0],
    origin: [-26.82, 8.05, 0.0],
    fixedAxis: [0, 0, 1],
    pulley: [-3.0, 14.2, -0.3],
    source:
      "§7.2 輪部5.5mm + §14.2 純内転軸; verify_final.py で §11 確認。" +
      "pulley: Clark 2000 IOVS 41:3787-97 Table 2 (3後方/14.2鼻側/0.3下方)",
  },
  LR: {
    insertion: [5.63, -10.6, 0.0],
    origin: [-27.46, 5.49, 0.0],
    fixedAxis: [0, 0, -1],
    pulley: [-9.0, -10.1, -0.3],
    source:
      "§7.2 輪部6.9mm + §14.2 純外転軸; verify_final.py で §11 確認。" +
      "pulley: Clark 2000 Table 2 (9後方/10.1耳側/0.3下方)",
  },
  SR: {
    insertion: [4.95, 0.16, 10.93],
    origin: [-25.58, 11.24, 1.84],
    fixedAxis: [-0.384, -0.904, 0.187],
    pulley: [-7.0, 1.7, 11.8],
    source:
      "§7.2 輪部7.7mm + §7.3 筋平面23° + §14.2; 外転23°で回旋0。" +
      "pulley: Clark 2000 Table 2 (7後方/1.7鼻側/11.8上方)",
  },
  IR: {
    insertion: [5.86, -0.33, -10.46],
    origin: [-25.58, 11.24, -1.84],
    fixedAxis: [0.384, 0.904, 0.187],
    pulley: [-6.0, 4.3, -12.9],
    source:
      "§7.2 輪部6.5mm + §7.3 筋平面23° + §14.2; 外転23°で回旋0。" +
      "pulley: Clark 2000 Table 2 (6後方/4.3鼻側/12.9下方)",
  },
  SO: {
    insertion: [-8.08, -5.18, 7.2],
    origin: [11.32, 13.99, 0.0],
    fixedAxis: [-0.717, 0.58, -0.387],
    source: "§7.5 後上耳側付着 + 滑車(前上鼻側)起始 + §14.2; 内転51°で回旋0",
  },
  IO: {
    insertion: [-8.08, -5.18, -7.2],
    origin: [11.32, 13.99, 0.0],
    fixedAxis: [0.717, -0.58, -0.387],
    source: "§7.5 後下耳側付着 + 前下鼻側起始 + §14.2; 内転51°で回旋0",
  },
};

/**
 * 単眼の筋作用は左右で臨床的に同一（教科書の作用表は両眼共通）。
 * 各眼を「自分の正準系（鼻側=+Y, 上=+Z）」で見れば解剖は右眼と同一だから、
 * core は常に右眼正準系で計算し、同じ臨床ラベル（内転/外旋など）で報告すれば
 * 左眼でも正しい。左眼に固有なのは (1) 3D 表示の鏡映、(2) 将来の両眼での
 * 注視フレーム配置 だけで、これらは app/binocular 層で扱う。
 *
 * 注意（過去のバグ）: 解剖を世界座標で Y 反転して同じ `cross(P,Q)` に通すと、
 * 外積は擬ベクトルのため符号が反転し、左 MR が「内転」でなく「外転」になる。
 * よって physics では鏡映しない。
 */
export function canonicalAnatomy(muscle: MuscleId): MuscleAnatomy {
  return RIGHT_EYE_ANATOMY[muscle];
}

/** Y（鼻側方向）反転ユーティリティ。将来の両眼配置・表示鏡映に使う。 */
export function mirrorYVec(v: Vec3): Vec3 {
  return [v[0], -v[1], v[2]];
}
