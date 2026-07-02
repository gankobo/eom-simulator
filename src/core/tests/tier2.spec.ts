/**
 * Tier 2 — Active pulley model（能動プーリー / half-angle 則）の受け入れ基準。
 *  - 第一眼位の作用分解が §11.1 の教科書値に一致（half-angle=0 のため厳密）。
 *  - half-angle 則: 作用軸が偏心の半分だけ傾く（軸⊥回転軸の MR 垂直偏心で厳密）。
 *  - 水平直筋は水平偏心で軸不変、上下直筋は水平偏心で ≈偏心/2 傾く。
 *  - tertiary（斜め眼位）で Tier2 は half-angle をよく保ち、Tier1（固定）より近い。
 */
import { describe, it, expect } from "vitest";
import { gazeQuat } from "../kinematics/fick";
import { eccentricity } from "../kinematics/listing";
import { dot } from "../kinematics/vec3";
import type { Vec3 } from "../kinematics/vec3";
import { muscleAction } from "../model/action";
import { PulleyModel } from "../model/pulley";
import { StringModel } from "../model/string";
import type { MuscleId } from "../data/anatomy";

const pulley = new PulleyModel();
const string = new StringModel();
const PRIMARY = gazeQuat(0, 0);

/** 2つの単位ベクトルのなす角（度）。 */
function angleDeg(a: Vec3, b: Vec3): number {
  return (Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * 180) / Math.PI;
}
/** モデルの作用軸が第一眼位から眼位 (h,v) でどれだけ傾くか（度）。 */
function axisTilt(model: PulleyModel | StringModel, m: MuscleId, h: number, v: number): number {
  return angleDeg(model.rotationAxis(m, PRIMARY), model.rotationAxis(m, gazeQuat(h, v)));
}

describe("Tier2 §11.1 第一眼位の作用分解（教科書一致）", () => {
  // [tor(+外旋), ver(+下転), hor(+内転)]（§11.1）
  const target: Record<MuscleId, Vec3> = {
    SR: [-0.384, -0.904, 0.187],
    IR: [0.384, 0.904, 0.187],
    SO: [-0.717, 0.58, -0.387],
    IO: [0.717, -0.58, -0.387],
    MR: [0, 0, 1],
    LR: [0, 0, -1],
  };
  for (const m of Object.keys(target) as MuscleId[]) {
    it(`${m}: 3作用成分が教科書値 ±0.05`, () => {
      const a = muscleAction(pulley, m, PRIMARY);
      const [t, v, h] = target[m];
      expect(Math.abs(a.tor - t)).toBeLessThan(0.05);
      expect(Math.abs(a.ver - v)).toBeLessThan(0.05);
      expect(Math.abs(a.hor - h)).toBeLessThan(0.05);
    });
  }
});

describe("Tier2 half-angle 則（作用軸の傾き）", () => {
  // MR の作用軸[0,0,1]は垂直偏心の回転軸(Y)と直交 → 傾き = 偏心/2 が厳密に成立。
  for (const V of [10, 20, 30, 40]) {
    it(`MR: 垂直偏心${V}°で作用軸が ≈${V / 2}° 傾く（厳密）`, () => {
      const tilt = axisTilt(pulley, "MR", 0, V);
      expect(Math.abs(tilt - V / 2)).toBeLessThan(0.5);
    });
  }

  it("MR/LR: 水平偏心では作用軸が傾かない（水平作用のまま）", () => {
    for (const H of [10, 20, 30]) {
      expect(axisTilt(pulley, "MR", -H, 0)).toBeLessThan(0.5);
      expect(axisTilt(pulley, "LR", -H, 0)).toBeLessThan(0.5);
    }
  });

  // 上下直筋は水平偏心で作用軸が ≈偏心/2 傾く（軸に Z 成分があるため厳密には僅かに小）。
  for (const H of [20, 30, 40]) {
    it(`SR: 外転${H}°で作用軸が ≈偏心/2 傾く`, () => {
      const tilt = axisTilt(pulley, "SR", -H, 0);
      expect(Math.abs(tilt - eccentricity(-H, 0) / 2)).toBeLessThan(1.5);
    });
  }
});

describe("Tier2 tertiary 可換性（斜め眼位で half-angle を保つ）", () => {
  for (const [h, v] of [
    [-20, 15],
    [-30, 20],
    [20, 20],
  ]) {
    it(`SR (${h},${v}): Tier2 の軸傾きが Tier1 より偏心/2 に近い`, () => {
      const half = eccentricity(h, v) / 2;
      const t2 = axisTilt(pulley, "SR", h, v);
      const t1 = axisTilt(string, "SR", h, v);
      expect(Math.abs(t2 - half)).toBeLessThan(Math.abs(t1 - half));
    });
  }
});

describe("Tier2 第一眼位は Tier1(string) と一致（同じ幾何が起点）", () => {
  it("全筋で作用軸が一致（第一眼位）", () => {
    for (const m of ["SR", "IR", "SO", "IO", "MR", "LR"] as MuscleId[]) {
      expect(angleDeg(pulley.rotationAxis(m, PRIMARY), string.rotationAxis(m, PRIMARY))).toBeLessThan(
        0.5,
      );
    }
  });
});
