/**
 * §11.3 純粋上下転（Tier1 で改善を確認）。
 * SR を外転23°に置くと、回旋≈0 かつ 水平成分が Tier0 より明確に減衰する。
 */
import { describe, it, expect } from "vitest";
import { gazeQuat } from "../kinematics/fick";
import { muscleAction } from "../model/action";
import { KinematicModel } from "../model/kinematic";
import { StringModel } from "../model/string";

describe("§11.3 純粋上下転 (SR 外転23°)", () => {
  const q = gazeQuat(-23, 0);
  const tier0 = muscleAction(new KinematicModel(), "SR", q);
  const tier1 = muscleAction(new StringModel(), "SR", q);

  it("Tier1 では回旋がほぼ0", () => {
    expect(Math.abs(tier1.tor)).toBeLessThan(0.05);
  });

  it("Tier1 の水平成分が Tier0 より減衰する", () => {
    expect(Math.abs(tier1.hor)).toBeLessThan(Math.abs(tier0.hor));
  });

  it("Tier1 では水平成分もほぼ消える（純粋上下転に近い）", () => {
    expect(Math.abs(tier1.hor)).toBeLessThan(0.05);
  });

  it("上下転成分は主作用として残る", () => {
    expect(Math.abs(tier1.ver)).toBeGreaterThan(0.9);
  });
});
