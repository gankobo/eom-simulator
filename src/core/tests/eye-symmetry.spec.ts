/**
 * 左右眼の対称性（Codex レビュー [high] の回帰防止）。
 *
 * 単眼の筋作用は左右で臨床的に同一（教科書の作用表は両眼共通）。
 * physics は右眼正準系で計算し、左眼は表示のみ鏡映する設計を固定する。
 *
 * 過去のバグ: 解剖を世界座標で Y 反転して同じ cross(P,Q) に通すと、外積は
 * 擬ベクトルのため符号が反転し、左 MR が「内転」でなく「外転」になっていた。
 */
import { describe, it, expect } from "vitest";
import { gazeQuat } from "../kinematics/fick";
import { muscleAction } from "../model/action";
import { createModel } from "../index";
import { cross, type Vec3 } from "../kinematics/vec3";
import { canonicalAnatomy, mirrorYVec, MUSCLE_IDS } from "../data/anatomy";

const model = createModel("string");

describe("左右眼の対称性 / 反転バグ回帰防止", () => {
  it("MR は第一眼位で内転(+hor)（外転に反転していない）", () => {
    expect(muscleAction(model, "MR", gazeQuat(0, 0)).hor).toBeGreaterThan(0.9);
  });
  it("LR は第一眼位で外転(−hor)", () => {
    expect(muscleAction(model, "LR", gazeQuat(0, 0)).hor).toBeLessThan(-0.9);
  });

  it("単眼作用は眼選択に依存しない（左右で同一）", () => {
    // physics は右眼正準で計算。eye は createModel に渡さない設計を固定。
    const m2 = createModel("string");
    for (const m of MUSCLE_IDS) {
      const a = muscleAction(model, m, gazeQuat(20, -10));
      const b = muscleAction(m2, m, gazeQuat(20, -10));
      expect(a.tor).toBeCloseTo(b.tor, 6);
      expect(a.ver).toBeCloseTo(b.ver, 6);
      expect(a.hor).toBeCloseTo(b.hor, 6);
    }
  });

  it("【設計の根拠】解剖を世界Y反転して cross すると軸が反転する（だから physics で鏡映しない）", () => {
    const a = canonicalAnatomy("MR");
    const axis: Vec3 = cross(a.insertion, a.origin); // ≈ +Z（内転）
    const axisMirrored: Vec3 = cross(mirrorYVec(a.insertion), mirrorYVec(a.origin));
    expect(axis[2]).toBeGreaterThan(0); // 内転
    expect(axisMirrored[2]).toBeCloseTo(-axis[2], 6); // 反転して外転になってしまう
  });
});
