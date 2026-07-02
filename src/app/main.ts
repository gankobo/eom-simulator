import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  createModel,
  muscleAction,
  gazeQuat,
  canonicalAnatomy,
  apply as qapply,
  pulleyAt,
  pulleyBase,
  GLOBE_RADIUS as R,
  MUSCLE_IDS,
  MUSCLE_NAMES_JA,
  type MuscleId,
  type Tier,
} from "../core";
import type { Quat } from "../core";

/** モデルの機能的起始（弦の起点）。Tier2 は眼位依存プーリー。 */
function funcOrigin(tier: Tier, m: MuscleId, q: Quat): number[] {
  return tier === "pulley" ? [...pulleyAt(m, q)] : [...canonicalAnatomy(m).origin];
}

const TIER_DESC: Record<Tier, string> = {
  kinematic: "Tier0: 回旋軸を眼窩に固定した簡易近似。眼位で作用は変わらない（比較用ベースライン）。",
  string:
    "Tier1: 付着部が眼位で動く string model。第三作用の眼位依存が出る。古典23°/51°で純粋上下転。",
  pulley:
    "Tier2: 能動プーリー（Clark 2000/Kono 2002）。作用軸が眼回転の半分だけ回る（half-angle 則）＝可換性・Listing 則の基盤。",
};

const LABEL: Record<Tier, string> = {
  kinematic: "Tier0",
  string: "Tier1",
  pulley: "Tier2",
};

const COLOR: Record<MuscleId, number> = {
  MR: 0xe8453c, // 内直筋 赤
  LR: 0x3b7be8, // 外直筋 青
  SR: 0x35b552, // 上直筋 緑
  IR: 0xe8902f, // 下直筋 橙
  SO: 0x9b51e0, // 上斜筋 紫
  IO: 0x1fb6c4, // 下斜筋 シアン
};

// ---- 状態 ----
const state = {
  eye: "OD" as "OD" | "OS",
  tier: "pulley" as Tier,
  compare: false,
  h: 0,
  v: 0,
  visible: new Set<MuscleId>(MUSCLE_IDS),
};

// ---- Three.js セットアップ ----
const wrap = document.getElementById("canvas-wrap")!;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
camera.up.set(0, 0, 1); // +Z 上
camera.position.set(42, 30, 26);

const renderer = new THREE.WebGLRenderer({ antialias: true });
wrap.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const dir = new THREE.DirectionalLight(0xffffff, 0.7);
dir.position.set(40, 30, 50);
scene.add(dir);

// 眼窩固定の参照軸（薄く）。これは鏡映しない（世界基準）。
scene.add(new THREE.AxesHelper(R * 1.6));

// 眼の表示ルート。左眼(OS)はここを Y 鏡映して左右を表現する（physics は鏡映しない）。
const eyeRoot = new THREE.Group();
scene.add(eyeRoot);

// 眼球グループ（眼位で回転）
const globe = new THREE.Group();
eyeRoot.add(globe);
const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(R, 48, 32),
  new THREE.MeshPhongMaterial({ color: 0xdfe6f0, transparent: true, opacity: 0.25 }),
);
globe.add(sphere);
// 角膜（前極 +X）
const cornea = new THREE.Mesh(
  new THREE.SphereGeometry(R * 0.42, 24, 16),
  new THREE.MeshPhongMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.5 }),
);
cornea.position.set(R * 0.93, 0, 0);
globe.add(cornea);
// 12時マーカー（回旋の可視化）: 角膜上端へ伸びる棒
const topMark = new THREE.Mesh(
  new THREE.CylinderGeometry(0.3, 0.3, R * 0.5),
  new THREE.MeshBasicMaterial({ color: 0xffd166 }),
);
topMark.position.set(R * 0.85, 0, R * 0.55);
topMark.rotation.x = Math.PI / 2;
globe.add(topMark);
// 視軸
globe.add(makeLine([0, 0, 0], [R * 1.5, 0, 0], 0xffffff));

// 筋の描画を入れる動的グループ（眼と一緒に鏡映する）
const muscleGroup = new THREE.Group();
eyeRoot.add(muscleGroup);

/** group の子の geometry/material を解放してから空にする（GPUリーク防止）。 */
function disposeChildren(group: THREE.Group): void {
  for (const child of group.children) {
    const obj = child as THREE.Mesh | THREE.Line;
    obj.geometry?.dispose();
    const mat = obj.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  }
  group.clear();
}

function makeLine(a: number[], b: number[], color: number, width = 1): THREE.Line {
  const g = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(a[0], a[1], a[2]),
    new THREE.Vector3(b[0], b[1], b[2]),
  ]);
  return new THREE.Line(g, new THREE.LineBasicMaterial({ color, linewidth: width }));
}
function makeDot(p: number[], color: number, r = 0.6): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 12, 8),
    new THREE.MeshBasicMaterial({ color }),
  );
  m.position.set(p[0], p[1], p[2]);
  return m;
}

type LineStyle = "solid" | "dashed" | "dotted";
/** 線種つきの線分。Tier の区別に使う（点線=Tier0 / 破線=Tier1 / 実線=Tier2）。 */
function makeStyledLine(a: number[], b: number[], color: number, style: LineStyle): THREE.Line {
  const g = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(a[0], a[1], a[2]),
    new THREE.Vector3(b[0], b[1], b[2]),
  ]);
  if (style === "solid") {
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color }));
  }
  const dashSize = style === "dotted" ? 0.5 : 1.6;
  const gapSize = style === "dotted" ? 0.7 : 1.1;
  const line = new THREE.Line(g, new THREE.LineDashedMaterial({ color, dashSize, gapSize }));
  line.computeLineDistances();
  return line;
}
const TIER_STYLE: Record<Tier, LineStyle> = {
  kinematic: "dotted",
  string: "dashed",
  pulley: "solid",
};
/** 作用軸を中心を通す線分にする（±R*1.4）。 */
function axisSegment(axis: readonly number[]): [number[], number[]] {
  const s = R * 1.4;
  return [
    [-axis[0] * s, -axis[1] * s, -axis[2] * s],
    [axis[0] * s, axis[1] * s, axis[2] * s],
  ];
}

// ---- 更新 ----
function toThreeQuat(q: Quat): THREE.Quaternion {
  return new THREE.Quaternion(q[0], q[1], q[2], q[3]);
}

const TIERS: Tier[] = ["kinematic", "string", "pulley"];

function update() {
  const model = createModel(state.tier);
  const q = gazeQuat(state.h, state.v);
  globe.quaternion.copy(toThreeQuat(q));

  // 左眼(OS)は表示のみ Y 鏡映（physics は右眼正準のまま）。
  eyeRoot.scale.set(1, state.eye === "OS" ? -1 : 1, 1);

  document.getElementById("tier-desc")!.textContent = TIER_DESC[state.tier];

  // 筋の再描画（古いオブジェクトの GPU リソースを解放してから作り直す）
  disposeChildren(muscleGroup);
  for (const m of MUSCLE_IDS) {
    if (!state.visible.has(m)) continue;
    const c = COLOR[m];
    const P = qapply(q, canonicalAnatomy(m).insertion); // 付着部（眼位で移動）
    const Q = funcOrigin(state.tier, m, q); // 機能的起始（Tier2 は眼位依存プーリー）

    // 筋の「弦」: 機能的起始→付着部
    muscleGroup.add(makeLine(Q, [...P], c));
    muscleGroup.add(makeDot([...P], c));
    muscleGroup.add(makeDot(Q, c, 0.5));

    // Tier2: プーリーが第一眼位から動く様子（基準=ゴースト＋移動線）
    if (state.tier === "pulley" && canonicalAnatomy(m).pulley) {
      const base = [...pulleyBase(m)];
      muscleGroup.add(makeDot(base, c, 0.35));
      muscleGroup.add(makeStyledLine(base, Q, c, "dotted"));
    }

    if (state.compare) {
      // 3モデルの作用軸を線種で重ね描き（点線Tier0/破線Tier1/実線Tier2）。
      for (const t of TIERS) {
        const axis = createModel(t).rotationAxis(m, q);
        const [pa, pb] = axisSegment(axis);
        muscleGroup.add(makeStyledLine(pa, pb, c, TIER_STYLE[t]));
      }
    } else {
      // 単一モデルの作用軸（実線）。
      const [pa, pb] = axisSegment(model.rotationAxis(m, q));
      muscleGroup.add(makeStyledLine(pa, pb, c, "solid"));
    }
  }

  updateActionTable(model, q);
  updateCompareTable(q);
}

function updateActionTable(model: ReturnType<typeof createModel>, q: Quat) {
  const tbody = document.querySelector("#action-table tbody")!;
  tbody.innerHTML = "";
  for (const m of MUSCLE_IDS) {
    const act = muscleAction(model, m, q);
    const len = model.muscleLength(m, q);
    const tr = document.createElement("tr");
    const dim = state.visible.has(m) ? "" : ' style="opacity:.4"';
    tr.innerHTML =
      `<td class="muscle" style="color:#${COLOR[m].toString(16)}"${dim}>${m} ${MUSCLE_NAMES_JA[m]}</td>` +
      `<td>${fmt(act.tor, "外旋", "内旋")}</td>` +
      `<td>${fmt(act.ver, "下転", "上転")}</td>` +
      `<td>${fmt(act.hor, "内転", "外転")}</td>` +
      `<td>${len.toFixed(1)}</td>`;
    tbody.appendChild(tr);
  }
}

/** 3モデル比較表（表示中の筋のみ、筋×Tier で作用3成分を並置）。 */
function updateCompareTable(q: Quat) {
  const section = document.getElementById("compare-section")!;
  section.style.display = state.compare ? "" : "none";
  if (!state.compare) return;
  const tbody = document.querySelector("#compare-table tbody")!;
  tbody.innerHTML = "";
  const shown = MUSCLE_IDS.filter((m) => state.visible.has(m));
  for (const m of shown) {
    TIERS.forEach((t, i) => {
      const act = muscleAction(createModel(t), m, q);
      const tr = document.createElement("tr");
      const name =
        i === 0
          ? `<td class="muscle" rowspan="3" style="color:#${COLOR[m].toString(16)}">${m} ${MUSCLE_NAMES_JA[m]}</td>`
          : "";
      tr.innerHTML =
        name +
        `<td>${LABEL[t]}</td>` +
        `<td>${fmt(act.tor, "外旋", "内旋")}</td>` +
        `<td>${fmt(act.ver, "下転", "上転")}</td>` +
        `<td>${fmt(act.hor, "内転", "外転")}</td>`;
      tbody.appendChild(tr);
    });
  }
}

function fmt(x: number, pos: string, neg: string): string {
  const label = x >= 0 ? pos : neg;
  const v = Math.abs(x);
  if (v < 0.02) return "—";
  return `${v.toFixed(2)} ${label}`;
}

// ---- UI 配線 ----
const hEl = document.getElementById("h") as HTMLInputElement;
const vEl = document.getElementById("v") as HTMLInputElement;
const hval = document.getElementById("hval")!;
const vval = document.getElementById("vval")!;
hEl.addEventListener("input", () => {
  state.h = +hEl.value;
  hval.textContent = hEl.value;
  update();
});
vEl.addEventListener("input", () => {
  state.v = +vEl.value;
  vval.textContent = vEl.value;
  update();
});
(document.getElementById("eye") as HTMLSelectElement).addEventListener("change", (e) => {
  state.eye = (e.target as HTMLSelectElement).value as "OD" | "OS";
  update();
});
const tierEl = document.getElementById("tier") as HTMLSelectElement;
tierEl.value = state.tier;
tierEl.addEventListener("change", (e) => {
  state.tier = (e.target as HTMLSelectElement).value as Tier;
  update();
});
(document.getElementById("compare") as HTMLInputElement).addEventListener("change", (e) => {
  state.compare = (e.target as HTMLInputElement).checked;
  update();
});
document.querySelectorAll<HTMLButtonElement>("[data-gaze]").forEach((b) => {
  b.addEventListener("click", () => {
    const [h, v] = b.dataset.gaze!.split(",").map(Number);
    state.h = h;
    state.v = v;
    hEl.value = String(h);
    vEl.value = String(v);
    hval.textContent = String(h);
    vval.textContent = String(v);
    update();
  });
});

// 筋トグル
const togWrap = document.getElementById("muscle-toggles")!;
for (const m of MUSCLE_IDS) {
  const b = document.createElement("button");
  b.textContent = `${m}`;
  b.className = "on";
  b.style.background = `#${COLOR[m].toString(16)}`;
  b.addEventListener("click", () => {
    if (state.visible.has(m)) {
      state.visible.delete(m);
      b.classList.remove("on");
      b.style.background = "#fff";
      b.style.color = `#${COLOR[m].toString(16)}`;
    } else {
      state.visible.add(m);
      b.classList.add("on");
      b.style.background = `#${COLOR[m].toString(16)}`;
      b.style.color = "#fff";
    }
    update();
  });
  togWrap.appendChild(b);
}

// ---- リサイズ・描画ループ ----
function resize() {
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();
update();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
