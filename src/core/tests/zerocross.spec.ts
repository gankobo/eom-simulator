/**
 * §11.2 回旋成分の0交差（眼位依存の核心, Tier1）。
 *  直筋 SR/IR: 水平走査で回旋=0 が 外転≈23°（規約上 h≈-23°）。
 *  斜筋 SO/IO: 回旋=0 が 内転≈51°（h≈+51°）。
 */
import { describe, it, expect } from "vitest";
import { gazeQuat } from "../kinematics/fick";
import { muscleAction } from "../model/action";
import { StringModel } from "../model/string";
import type { MuscleId } from "../data/anatomy";

const model = new StringModel();

/** h を lo..hi で走査し、回旋(tor) が0になる水平角を返す（最初の交差）。 */
function torsionZeroCross(m: MuscleId, lo: number, hi: number): number | null {
  const n = 4000;
  let prev: [number, number] | null = null;
  for (let i = 0; i <= n; i++) {
    const h = lo + ((hi - lo) * i) / n;
    const tor = muscleAction(model, m, gazeQuat(h, 0)).tor;
    if (prev && prev[1] * tor < 0) {
      const [h0, t0] = prev;
      return h0 + ((h - h0) * (0 - t0)) / (tor - t0);
    }
    prev = [h, tor];
  }
  return null;
}

describe("§11.2 回旋0交差 [string]", () => {
  it("SR は外転≈23°(h≈-23) で回旋0", () => {
    const z = torsionZeroCross("SR", -60, 60);
    expect(z).not.toBeNull();
    expect(Math.abs(z! - -23)).toBeLessThan(3); // §11 許容 ±3°
  });
  it("IR は外転≈23°(h≈-23) で回旋0", () => {
    const z = torsionZeroCross("IR", -60, 60);
    expect(Math.abs(z! - -23)).toBeLessThan(3);
  });
  it("SO は内転≈51°(h≈+51) で回旋0", () => {
    const z = torsionZeroCross("SO", 0, 90);
    expect(Math.abs(z! - 51)).toBeLessThan(3);
  });
  it("IO は内転≈51°(h≈+51) で回旋0", () => {
    const z = torsionZeroCross("IO", 0, 90);
    expect(Math.abs(z! - 51)).toBeLessThan(3);
  });
});
