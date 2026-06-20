/**
 * §6 Listing 則 / half-angle 則 の数値検証。
 *  - 固視眼位の回転ベクトルが Listing 面に乗る（X成分≈0）。
 *  - 偏心位置での角速度軸が偏心角の半分だけ Listing 面から傾く（half-angle）。
 */
import { describe, it, expect } from "vitest";
import {
  listingQuat,
  listingResidual,
  velocityAxisTilt,
  eccentricity,
} from "../kinematics/listing";

describe("§6 Listing 則", () => {
  it("固視眼位の回転ベクトルが Listing 面に乗る（X成分≈0）", () => {
    for (const [h, v] of [
      [20, 0],
      [0, 20],
      [25, -15],
      [-30, 20],
    ]) {
      expect(listingResidual(listingQuat(h, v))).toBeLessThan(1e-6);
    }
  });
});

describe("§6 half-angle 則", () => {
  // 水平偏心 E の位置で、垂直方向の固視運動の角速度軸が E/2 傾く。
  for (const E of [10, 20, 30, 40]) {
    it(`水平偏心${E}°: 垂直運動の角速度軸が ≈${E / 2}° 傾く`, () => {
      const tilt = velocityAxisTilt(E, 0, "v");
      expect(tilt).toBeCloseTo(E / 2, 0); // ±0.5°
    });
  }

  it("同一方向（水平偏心での水平運動）は傾かない", () => {
    expect(velocityAxisTilt(30, 0, "h")).toBeLessThan(1);
  });

  it("偏心角は視線のなす角に一致", () => {
    expect(eccentricity(30, 0)).toBeCloseTo(30, 1);
  });
});
