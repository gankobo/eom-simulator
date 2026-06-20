import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  listingQuat,
  gazeQuat,
  fickFromQuat,
  velocityAxis,
  eccentricity,
  listingResidual,
  GLOBE_RADIUS as R,
} from "../core";
import { rotationVector } from "../core/kinematics/rotvec";
import type { Quat } from "../core";

type PathId = "1" | "2" | "3" | "reset";
const state = {
  h: 25,
  v: 0,
  amp: 30,
  anim: true,
  dir: "v" as "h" | "v",
  t: 0,
  // 「到達のしかた比べ」再生
  playMode: null as null | "run" | "hold",
  path: "1" as PathId,
  s: 0,
};

// ---- Three.js ----
const wrap = document.getElementById("canvas-wrap")!;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
camera.up.set(0, 0, 1);
camera.position.set(40, 28, 24);
const renderer = new THREE.WebGLRenderer({ antialias: true });
wrap.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const dl = new THREE.DirectionalLight(0xffffff, 0.6);
dl.position.set(40, 30, 50);
scene.add(dl);
scene.add(new THREE.AxesHelper(R * 1.6));

// Listing 面（YZ平面, 法線 +X）
const plane = new THREE.Mesh(
  new THREE.CircleGeometry(R * 1.5, 48),
  new THREE.MeshBasicMaterial({
    color: 0x1fb6c4,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
  }),
);
plane.rotation.y = Math.PI / 2; // 法線を +X に
scene.add(plane);

// 眼球
const globe = new THREE.Group();
scene.add(globe);
globe.add(
  new THREE.Mesh(
    new THREE.SphereGeometry(R, 40, 28),
    new THREE.MeshPhongMaterial({ color: 0xdfe6f0, transparent: true, opacity: 0.22 }),
  ),
);
const cornea = new THREE.Mesh(
  new THREE.SphereGeometry(R * 0.42, 20, 14),
  new THREE.MeshPhongMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.4 }),
);
cornea.position.set(R * 0.93, 0, 0);
globe.add(cornea);
globe.add(line([0, 0, 0], [R * 1.4, 0, 0], 0xffffff));

// ---- 回旋インジケータ: 角膜前面の時計（12時の指針で回旋を読む）----
// 局所 XY 平面に時計を作り、軸を巡回置換(X→Y→Z→X)する回転で
// 法線を +X・12時(+Y)を上(+Z)に向ける。眼球姿勢が掛かると 12時が回旋する。
const CYCLIC = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(1, 1, 1).normalize(),
  (2 * Math.PI) / 3,
);

function makeClock(handColor: number, ghost: boolean): THREE.Group {
  const g = new THREE.Group();
  g.position.set(R * 0.95, 0, 0);
  g.quaternion.copy(CYCLIC);
  const faceOp = ghost ? 0.1 : 0.22;
  const handOp = ghost ? 0.5 : 1;
  const mat = (color: number, opacity: number) =>
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
    });

  // 文字盤
  const disc = new THREE.Mesh(new THREE.CircleGeometry(R * 0.5, 40), mat(0x0b1020, faceOp));
  disc.position.z = -0.08;
  g.add(disc);
  // 外周リング
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(R * 0.5, 0.12, 8, 48),
    mat(ghost ? 0x9fb0d0 : 0xcfd8e6, handOp),
  );
  g.add(ring);
  // 3/6/9 の目盛り（12 は指針があるので省く）
  const tickGeo = new THREE.BoxGeometry(0.7, 0.7, 0.4);
  for (const [tx, ty] of [
    [R * 0.42, 0],
    [-R * 0.42, 0],
    [0, -R * 0.42],
  ]) {
    const tk = new THREE.Mesh(tickGeo, mat(ghost ? 0x9fb0d0 : 0xcfd8e6, handOp));
    tk.position.set(tx, ty, 0);
    g.add(tk);
  }
  // 12時の指針
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.6, R * 0.46, 0.6), mat(handColor, handOp));
  hand.position.set(0, R * 0.23, 0.12);
  g.add(hand);
  // 中心ハブ
  const hub = new THREE.Mesh(new THREE.CircleGeometry(0.9, 16), mat(handColor, handOp));
  hub.position.z = 0.12;
  g.add(hub);
  return g;
}

globe.add(makeClock(0xff4d6d, false)); // 実体（赤）= 眼球と一緒に回る

// 正解（目標 Listing 姿勢）のゴースト時計。pivot に目標姿勢を掛ける。
const ghostPivot = new THREE.Group();
const ghostClock = makeClock(0x9fb0d0, true);
ghostClock.scale.multiplyScalar(1.12);
ghostPivot.add(ghostClock);
ghostPivot.visible = false;
scene.add(ghostPivot);

// 矢印（位置の回転ベクトル / 角速度軸）
const posArrow = new THREE.ArrowHelper(
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, 0),
  R * 1.3,
  0x35e07a,
  3,
  2,
);
const velArrow = new THREE.ArrowHelper(
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, 0),
  R * 1.3,
  0xe8902f,
  3,
  2,
);
scene.add(posArrow, velArrow);

// 各回転段階の「回転軸」を示す矢印（再生中のみ表示）。
// 紫=第1段の軸 / 金=第2段の軸。進行中の段を明るく、他段は淡く併表示する。
const AXIS_COLORS = [0xb066ff, 0xffd23f];
const axisArrows = [0, 1].map((i) => {
  const a = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, 0),
    R * 1.5,
    AXIS_COLORS[i],
    3,
    2,
  );
  // 半透明の眼球に柄が隠れて先端しか見えないのを防ぐ：常に手前に描く。
  for (const m of [a.line.material, a.cone.material] as THREE.Material[]) {
    m.depthTest = false;
  }
  a.renderOrder = 5;
  a.visible = false;
  scene.add(a);
  return a;
});

function line(a: number[], b: number[], color: number): THREE.Line {
  const g = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(a[0], a[1], a[2]),
    new THREE.Vector3(b[0], b[1], b[2]),
  ]);
  return new THREE.Line(g, new THREE.LineBasicMaterial({ color }));
}
function v3(v: readonly number[]): THREE.Vector3 {
  return new THREE.Vector3(v[0], v[1], v[2]).normalize();
}
function toThree(q: Quat): THREE.Quaternion {
  return new THREE.Quaternion(q[0], q[1], q[2], q[3]);
}
function fromThree(q: THREE.Quaternion): Quat {
  return [q.x, q.y, q.z, q.w];
}

// 2姿勢のなす角（度）。0 なら完全一致。
function quatAngleDeg(a: Quat, b: Quat): number {
  const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return (2 * Math.acos(Math.min(1, d)) * 180) / Math.PI;
}

// 回旋角を臨床語に翻訳（符号は fick.ts: +外旋 / −内旋）。
function cycloWord(t: number): string {
  if (Math.abs(t) < 0.3) return "ほぼ0";
  return t > 0 ? "外旋(excyclo)" : "内旋(incyclo)";
}
function torsionText(t: number): string {
  return `${t.toFixed(1)}°（${cycloWord(t)}）`;
}

// ---- 3通りの到達パス: 進捗 s∈[0,1] → 眼球姿勢 ----
const QI = new THREE.Quaternion(0, 0, 0, 1);
function pathQuat(path: PathId, s: number, h: number, v: number): THREE.Quaternion {
  if (path === "reset") return QI.clone();
  if (path === "1") {
    // ① 1回転: 第一眼位→目標 Listing 姿勢を最短弧で補間（1本の軸）
    return new THREE.Quaternion().slerpQuaternions(QI, toThree(listingQuat(h, v)), s);
  }
  // 2段階（横→縦）
  if (s < 0.5) {
    const t = s / 0.5;
    return path === "2" ? toThree(listingQuat(h * t, 0)) : toThree(gazeQuat(h * t, 0));
  }
  const t = (s - 0.5) / 0.5;
  // ② 各段で Listing 則を保つ（角速度軸が半角だけ傾く＝正解に着地）
  // ③ 頭部固定軸の素朴な合成（Fick）＝半角補正なし＝偽の回旋
  return path === "2" ? toThree(listingQuat(h, v * t)) : toThree(gazeQuat(h, v * t));
}

// 各パスを構成する回転段階（from→to の姿勢ペア）。
function pathStages(
  path: PathId,
  h: number,
  v: number,
): { from: THREE.Quaternion; to: THREE.Quaternion }[] {
  if (path === "1") return [{ from: QI, to: toThree(listingQuat(h, v)) }];
  if (path === "2")
    return [
      { from: QI, to: toThree(listingQuat(h, 0)) },
      { from: toThree(listingQuat(h, 0)), to: toThree(listingQuat(h, v)) },
    ];
  if (path === "3")
    return [
      { from: QI, to: toThree(gazeQuat(h, 0)) },
      { from: toThree(gazeQuat(h, 0)), to: toThree(gazeQuat(h, v)) },
    ];
  return [];
}

// from→to の相対回転（世界座標）の回転軸。回転がほぼ無いと null。
function segAxis(from: THREE.Quaternion, to: THREE.Quaternion): THREE.Vector3 | null {
  const rel = to.clone().multiply(from.clone().invert()).normalize();
  const w = Math.min(1, Math.max(-1, rel.w));
  const sn = Math.sqrt(1 - w * w);
  if (sn < 1e-6) return null;
  return new THREE.Vector3(rel.x / sn, rel.y / sn, rel.z / sn).normalize();
}

// 再生中、進行中の段の回転軸だけを矢印で表示（他段は非表示）。
function showAxisArrows(path: PathId, h: number, v: number, cur: number) {
  const stages = pathStages(path, h, v);
  for (let i = 0; i < axisArrows.length; i++) {
    const a = axisArrows[i];
    const ax = i === cur && i < stages.length ? segAxis(stages[i].from, stages[i].to) : null;
    if (!ax) {
      a.visible = false;
      continue;
    }
    a.setDirection(ax);
    a.setLength(R * 1.6, 3, 2);
    a.visible = true;
  }
}

function hideAxisArrows() {
  for (const a of axisArrows) a.visible = false;
}

// 再生中の実況キャプション（いまどの段で何が起きているか）。
function narrate(path: PathId, s: number): string {
  if (path === "1")
    return "① 1本の軸でひと息に到達。軸は Listing 面内（緑の位置ベクトルと同じ向き）。余計な回旋は残りません。";
  if (path === "2")
    return s < 0.5
      ? "② 第1段：まず水平へ。回転軸（紫）は Listing 面の中にあります。"
      : "② 第2段：次に垂直へ。回転軸（金）が面から E/2 だけ傾く＝half-angle 則。だから最後まで回旋が残りません。";
  if (path === "3")
    return s < 0.5
      ? "③ 第1段：まず水平へ（頭部に固定した軸で素朴に回します）。"
      : "③ 第2段：次に垂直へ。回転軸（金）は傾きません＝半角補正なし。これが“偽の回旋”を生みます。";
  return "";
}

// 3パスの成績表に着地の回旋とズレを記録する。
function recordResult(path: PathId) {
  if (path !== "1" && path !== "2" && path !== "3") return;
  const q = fromThree(pathQuat(path, 1, state.h, state.v));
  const tors = fickFromQuat(q).torsion;
  const gap = quatAngleDeg(q, listingQuat(state.h, state.v));
  setText(`r${path}tors`, torsionText(tors));
  setText(`r${path}gap`, gap.toFixed(1) + "°");
}
function clearResults() {
  for (const p of ["1", "2", "3"]) {
    setText(`r${p}tors`, "—");
    setText(`r${p}gap`, "—");
  }
}

// ---- 更新 ----
function update() {
  let q: Quat;

  if (state.playMode) {
    // 「到達のしかた比べ」再生中／保持中
    const qt = pathQuat(state.path, state.s, state.h, state.v);
    globe.quaternion.copy(qt);
    q = fromThree(qt);

    const showGhost = state.path !== "reset";
    ghostPivot.visible = showGhost;
    if (showGhost) ghostPivot.quaternion.copy(toThree(listingQuat(state.h, state.v)));
    posArrow.visible = false;
    velArrow.visible = false;

    // 各回転段階の回転軸を併表示＋実況キャプション
    const cur = state.path === "1" ? 0 : state.s < 0.5 ? 0 : 1;
    if (state.path === "reset") {
      hideAxisArrows();
      setText("cmpnarr", "第一眼位（正面）。スライダーで目標を変え、①②③を再生して見比べてください。");
    } else {
      showAxisArrows(state.path, state.h, state.v, cur);
      setText("cmpnarr", narrate(state.path, state.s));
    }

    // 数値: 偏心と半角は固視デモ用なので再生中は「—」
    setText("tilt", "—");
    setText("half", "—");
    const E = eccentricity(state.h, state.v);
    setText("ecc", E.toFixed(1) + "°");
  } else {
    // 固視運動デモ（矢印）
    const swing = state.anim ? state.amp * Math.sin(state.t) : 0;
    const h = state.dir === "h" ? state.h + swing : state.h;
    const v = state.dir === "v" ? state.v + swing : state.v;
    q = listingQuat(h, v);
    globe.quaternion.copy(toThree(q));
    ghostPivot.visible = false;
    hideAxisArrows();

    // 位置の回転ベクトル（Listing 面内）
    const r = rotationVector(q);
    if (r[0] * r[0] + r[1] * r[1] + r[2] * r[2] > 1e-9) {
      posArrow.setDirection(v3(r));
      posArrow.visible = true;
    } else {
      posArrow.visible = false;
    }
    // 角速度軸（微小運動の差分）
    const eps = 0.5;
    const q2 = state.dir === "h" ? listingQuat(h + eps, v) : listingQuat(h, v + eps);
    const w = velocityAxis(q, q2);
    velArrow.setDirection(v3(w));
    velArrow.visible = true;

    const E = eccentricity(h, v);
    const tilt = (Math.asin(Math.min(1, Math.abs(w[0]))) * 180) / Math.PI;
    setText("ecc", E.toFixed(1) + "°");
    setText("half", (E / 2).toFixed(1) + "°");
    setText("tilt", tilt.toFixed(1) + "°");
  }

  // 共通の数値
  setText("resid", (listingResidual(q) * 100).toFixed(3) + " ×10⁻²");
  setText("tors", torsionText(fickFromQuat(q).torsion));
  if (state.playMode) {
    const gap = quatAngleDeg(q, listingQuat(state.h, state.v));
    setText("cmp", gap.toFixed(1) + "°");
  } else {
    setText("cmp", "—");
  }
}

function setText(id: string, s: string) {
  document.getElementById(id)!.textContent = s;
}

// ---- 再生制御 ----
function setPlayingButton(active: string | null) {
  for (const id of ["play1", "play2", "play3"]) {
    document.getElementById(id)!.classList.toggle("playing", id === active);
  }
}

function startPath(path: PathId, btnId: string | null) {
  state.path = path;
  state.s = 0;
  state.playMode = "run";
  setPlayingButton(btnId);
  updatePauseLabel();
}

function stopPlay() {
  state.playMode = null;
  setPlayingButton(null);
  ghostPivot.visible = false;
  updatePauseLabel();
}

function finishStatus() {
  const qf = fromThree(pathQuat(state.path, 1, state.h, state.v));
  const gap = quatAngleDeg(qf, listingQuat(state.h, state.v));
  const tors = fickFromQuat(qf).torsion;
  const el = document.getElementById("cmpstat")!;
  if (state.path === "1")
    el.textContent = `① 1回転：正解にピタリ一致（ズレ ${gap.toFixed(1)}°）。回旋は残りません。`;
  else if (state.path === "2")
    el.textContent = `② half-angle 2段階：正解に一致（ズレ ${gap.toFixed(1)}°）。各段で軸が半角だけ傾き、回旋を保ちます。`;
  else if (state.path === "3")
    el.textContent = `③ 半角なし：12時が ${gap.toFixed(1)}° ズレて着地＝偽の回旋（${cycloWord(tors)}）。実際の眼では脳と眼窩プーリーが half-angle を実装するため、このズレは生じません。`;
  else el.textContent = "第一眼位（正面）に戻しました。";
  recordResult(state.path);
}

// ---- UI ----
const hEl = document.getElementById("h") as HTMLInputElement;
const vEl = document.getElementById("v") as HTMLInputElement;
hEl.addEventListener("input", () => {
  state.h = +hEl.value;
  document.getElementById("hval")!.textContent = hEl.value;
  stopPlay(); // スライダー操作で固視デモに戻る
  clearResults(); // 目標が変わったので成績はリセット
});
vEl.addEventListener("input", () => {
  state.v = +vEl.value;
  document.getElementById("vval")!.textContent = vEl.value;
  stopPlay();
  clearResults();
});
const ampEl = document.getElementById("amp") as HTMLInputElement;
ampEl.addEventListener("input", () => {
  state.amp = +ampEl.value;
  document.getElementById("ampval")!.textContent = ampEl.value;
});
(document.getElementById("anim") as HTMLInputElement).addEventListener("change", (e) => {
  state.anim = (e.target as HTMLInputElement).checked;
});
(document.getElementById("dir") as HTMLSelectElement).addEventListener("change", (e) => {
  state.dir = (e.target as HTMLSelectElement).value as "h" | "v";
});

document.getElementById("play1")!.addEventListener("click", () => startPath("1", "play1"));
document.getElementById("play2")!.addEventListener("click", () => startPath("2", "play2"));
document.getElementById("play3")!.addEventListener("click", () => startPath("3", "play3"));
document.getElementById("playReset")!.addEventListener("click", () => {
  state.path = "reset";
  state.s = 0;
  state.playMode = "hold";
  setPlayingButton(null);
  updatePauseLabel();
  finishStatus();
});

// 一時停止 / 再生（コマ送りの基点）。
const pauseEl = document.getElementById("playPause") as HTMLButtonElement;
const scrubEl = document.getElementById("scrub") as HTMLInputElement;
function updatePauseLabel() {
  pauseEl.textContent = state.playMode === "run" ? "⏸ 一時停止" : "▶ 再生";
}
pauseEl.addEventListener("click", () => {
  if (state.playMode === "run") {
    state.playMode = "hold"; // 一時停止
  } else {
    // 再生 / 再開。終端や未再生なら頭から、reset 中なら①に。
    if (state.path === "reset") state.path = "1";
    if (state.s >= 1 || state.playMode === null) state.s = 0;
    state.playMode = "run";
    setPlayingButton(state.path === "1" ? "play1" : state.path === "2" ? "play2" : "play3");
  }
  updatePauseLabel();
});

// コマ送り: スライダーを手で動かすと、その位置で一時停止して観察できる。
scrubEl.addEventListener("input", () => {
  if (state.path === "reset") state.path = "1";
  state.s = +scrubEl.value / 1000;
  state.playMode = "hold";
  setPlayingButton(state.path === "1" ? "play1" : state.path === "2" ? "play2" : "play3");
  updatePauseLabel();
});

// 患者正面（+X から見る）。回旋が読みやすい視点へ。
document.getElementById("frontView")!.addEventListener("click", () => {
  camera.position.set(R * 5, 0, 0);
  controls.target.set(0, 0, 0);
  controls.update();
});
updatePauseLabel(); // 起動時のボタン表記を状態に合わせる

// ---- ループ ----
function resize() {
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);
  camera.aspect = wrap.clientWidth / wrap.clientHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

function animate() {
  requestAnimationFrame(animate);
  state.t += 0.03;
  if (state.playMode === "run") {
    state.s += 0.012;
    if (state.s >= 1) {
      state.s = 1;
      state.playMode = "hold";
      updatePauseLabel();
      finishStatus();
    }
    scrubEl.value = String(Math.round(state.s * 1000)); // コマ送りバーを同期
  }
  update();
  controls.update();
  renderer.render(scene, camera);
}
animate();
