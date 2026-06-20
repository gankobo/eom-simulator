/**
 * §3 規約の固定テスト。回旋の符号やクォータニオン合成順序の取り違えを防ぐ。
 * これが最初の防波堤（§3.3 の注記）。
 */
import { describe, it, expect } from "vitest";
import { gazeQuat, fickFromQuat } from "../kinematics/fick";
import { apply, mul } from "../kinematics/quat";

describe("座標・運動学の規約 (§3)", () => {
  it("Fick 角の往復変換が一致する", () => {
    for (const [h, v, t] of [
      [0, 0, 0],
      [20, 0, 0],
      [-15, 10, 0],
      [25, -20, 5],
      [-30, -10, -7],
    ]) {
      const f = fickFromQuat(gazeQuat(h, v, t));
      expect(f.h).toBeCloseTo(h, 1);
      expect(f.v).toBeCloseTo(v, 1);
      expect(f.torsion).toBeCloseTo(t, 1);
    }
  });

  it("+Z回転(水平+)は視軸を鼻側(+Y)へ振る=内転", () => {
    const l = apply(gazeQuat(20, 0), [1, 0, 0]);
    expect(l[1]).toBeGreaterThan(0); // +Y 成分
  });

  it("垂直+ は視軸を上(+Z)へ振る=上転", () => {
    const l = apply(gazeQuat(0, 20), [1, 0, 0]);
    expect(l[2]).toBeGreaterThan(0); // +Z 成分
  });

  it("回旋+ は外旋(横軸が+Z側へ傾く)", () => {
    const t = apply(gazeQuat(0, 0, 15), [0, 1, 0]); // 横軸ŷ
    expect(t[2]).toBeGreaterThan(0);
  });

  it("回転は非可換（順序依存）", () => {
    const qA = mul(gazeQuat(30, 0), gazeQuat(0, 30));
    const qB = mul(gazeQuat(0, 30), gazeQuat(30, 0));
    const diff =
      Math.abs(qA[0] - qB[0]) +
      Math.abs(qA[1] - qB[1]) +
      Math.abs(qA[2] - qB[2]) +
      Math.abs(qA[3] - qB[3]);
    expect(diff).toBeGreaterThan(0.05);
  });
});
