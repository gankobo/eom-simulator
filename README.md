# 外眼筋作用シミュレータ (eom-simulator)

眼位依存の6筋（外眼筋）作用を計算・3D可視化する教育/研究用シミュレータ。
`HANDOFF_eom_simulator.md` の設計に基づき、**計算の核(core)と描画(viz/app)を分離**し、
受け入れ基準(§11)を単体テスト化してから 3D を構築している。

## 何ができるか（現状: Phase 1）

- **筋作用シミュレータ** (`index.html`): 6筋それぞれの作用（回旋/上下転/水平）を
  眼位ごとに数値＋3Dで表示。モデル忠実度を切替え可能。
  - Tier0 (kinematic): 眼窩固定の回旋軸（教育用ベースライン）
  - Tier1 (string model): 付着部 P と機能的起始 Q から `axis = normalize(P×Q)` を
    眼位ごとに再計算（Robinson 1975）。第三作用の眼位依存が正しくなる。
- **Listing 則 / half-angle 則の3D解説** (`listing.html`): 角速度軸が偏心角の
  半分だけ Listing 面から傾く様子を、数式（E/2）と動きを対応させて可視化。

## 検証済みの受け入れ基準（§11 = 仕様の真実源）

`npm test` で 44 件すべて緑。主なもの:

- §11.1 第一眼位の作用分解（6筋, 表に ±0.05 一致, 主作用が正しい）
- §11.2 回旋成分の0交差: 直筋 外転≈23°, 斜筋 内転≈51°
- §11.3 SR 外転23° で純粋上下転（回旋≈0 かつ水平成分減衰）
- §6 Listing 則（回転ベクトルが Listing 面上）と half-angle 則（傾き = E/2）

## 開発

```bash
npm install          # 依存をローカルに導入（初回のみ）
npm run dev          # 開発プレビュー（ブラウザで開く）
npm test             # §11 受け入れテスト
npm run build        # GitHub Pages 用の静的サイトを dist/ に生成
```

## 構成

```
src/core/            # DOM/Three 非依存の数値核（心臓部）
  kinematics/        # vec3, quat, fick, rotvec, listing
  data/anatomy.ts    # 解剖パラメータ（右眼正準＋左眼アダプタ, source 付き）
  model/             # BiomechModel: kinematic(Tier0) | string(Tier1)
  tests/             # 受け入れ基準(§11) = 仕様
src/app/             # UI + Three.js 描画
tasks/               # 計画(todo.md)・学び(lessons.md)・Python先行検証
```

## 公開（GitHub Pages）

`main` ブランチへ push すると `.github/workflows/deploy.yml` が
テスト→ビルド→Pages 公開まで自動実行する。GitHub リポジトリの
Settings → Pages で「Source: GitHub Actions」を選ぶこと。

## 解剖パラメータについて

`src/core/data/anatomy.ts` の P0/Q は §11 を満たすよう構成した**暫定スターター**。
Phase 3 以降で Clark 2000 (IOVS 41:3787-97) Table 2 等の一次文献の実測値へ
差し替える前提（各値に `source` を付記）。

## ロードマップ

`tasks/todo.md` を参照。P2 平衡ソルバ → P3 active pulley → P4 両眼 →
P5 臨床（麻痺/手術/Hess/Bielschowsky）。
