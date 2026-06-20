/** §11.1 第一眼位の作用分解。Tier0/Tier1 とも表に一致し、主作用が正しいこと。 */
import { describe, it, expect } from "vitest";
import { gazeQuat } from "../kinematics/fick";
import { muscleAction } from "../model/action";
import { KinematicModel } from "../model/kinematic";
import { StringModel } from "../model/string";
import type { MuscleId } from "../data/anatomy";

// 期待値（§11.1, 右眼）。tor=回旋(+外旋), ver=上下(+下転), hor=水平(+内転)。
const EXPECT: Record<MuscleId, [number, number, number]> = {
  SR: [-0.38, -0.9, 0.19],
  IR: [0.38, 0.9, 0.19],
  SO: [-0.72, 0.58, -0.39],
  IO: [0.72, -0.58, -0.39],
  MR: [0, 0, 1.0],
  LR: [0, 0, -1.0],
};

// 主作用（絶対値最大成分）の分類
const PRIMARY: Record<MuscleId, "tor" | "ver" | "hor"> = {
  SR: "ver",
  IR: "ver",
  SO: "tor",
  IO: "tor",
  MR: "hor",
  LR: "hor",
};

for (const Model of [KinematicModel, StringModel]) {
  const model = new Model();
  describe(`§11.1 第一眼位の作用分解 [${model.tier}]`, () => {
    const q0 = gazeQuat(0, 0);
    for (const m of Object.keys(EXPECT) as MuscleId[]) {
      it(`${m} の3成分が表に一致 (±0.05)`, () => {
        const a = muscleAction(model, m, q0);
        const [tor, ver, hor] = EXPECT[m];
        expect(a.tor).toBeCloseTo(tor, 1);
        expect(a.ver).toBeCloseTo(ver, 1);
        expect(a.hor).toBeCloseTo(hor, 1);
      });
      it(`${m} の主作用が ${PRIMARY[m]}`, () => {
        const a = muscleAction(model, m, q0);
        const mags = { tor: Math.abs(a.tor), ver: Math.abs(a.ver), hor: Math.abs(a.hor) };
        const top = (Object.keys(mags) as (keyof typeof mags)[]).reduce((x, y) =>
          mags[y] > mags[x] ? y : x,
        );
        expect(top).toBe(PRIMARY[m]);
      });
    }
  });
}
