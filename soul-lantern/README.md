# 彩潮 · CHROMA TIDE

**3D 手绘感割草肉鸽 · 竖屏 · 单局 6 分钟**

> 世界被「褪色潮」洗成灰白。你提着笔锋走进荒原，收割墨兽，把颜色还给大地。

- 网页版：`https://chris21349.github.io/chris/soul-lantern/`（已部署）
- Android：`彩潮-Android-v1-release.apk`（release 签名，包名 `com.chris.chromatide`）
- 版本：v1.0.0 / versionCode 1
- 技术：Three.js r149（本地内置）+ 原生 JS，零构建、纯静态

本作是原创设计：角色、敌人、Logo、构图、UI 均为程序化/手绘生成，不使用任何现成游戏的角色、图标或素材。

---

## 玩法

| 操作 | 手机 | 电脑 |
|---|---|---|
| 移动 | 屏幕任意处拖动（浮动摇杆） | WASD / 方向键 |
| 自动攻击 | 笔锋自动环绕 | 自动 |
| 闪身 | 右下「闪身」 | 空格 |
| 大招「万彩归一」 | 右下「万彩」 | Q |
| 暂停 | 左上暂停 | Esc / P |
| 升级选择 | 点卡牌 | 1 / 2 / 3 |

- **6 分钟一局**：3:00 潮心 Boss，6:00 终焉 Boss。击杀终焉 Boss 即胜利。
- **4 种武器**：笔锋回旋、墨爆、雷链、墨雨；**5 种被动**：疾行、厚涂、引彩、锋锐、疾攻。
- **4 种敌人**：墨蚜（群）、疾笔（快）、砚龟（坦）、泼墨者（远程）；Boss 会砸地、召唤、暴怒。
- 击杀掉落颜料（经验），靠近自动吸取；每 37 杀掉落一次治疗；连斩累积、能量满可放大招。
- 受伤有短暂无敌帧、震屏与边缘反馈；低血量时屏幕边缘会呼吸发红。

## 美术方向

完整规范见 [ART-BIBLE.md](ART-BIBLE.md)：锁定调色板、剪影与比例、材质语言、光照层级、UI/图标、动效与验收清单。

- 核心：**低模 + 手绘感体块 + 明确色阶**，不是给写实模型套滤镜。
- 暖金主光 / 冷紫墨影；明暗交界用低频噪声轻微打散；无 PBR 高光、无阴影贴图、无环境反射。
- 角色/敌人走顶点色 + 自定义三阶着色器；地面是程序化画布笔触；特效最多三色。
- UI：墨底、纸字、金强调；触控目标 ≥ 48 dp，正文 ≥ 13 px。

## 文件结构

```
index.html            入口 / HUD / 各界面
css/style.css         UI 样式（无外部字体、无图片纹理）
js/three.min.js       Three.js r149（本地内置，离线可用）
js/art.js             调色板 / 着色器 / 程序化几何 / 画布贴图
js/audio.js           WebAudio 合成音效（无音频文件）
js/fx.js              粒子 / 地面颜料 / 冲击环 / 雷链 / 伤害数字
js/ui.js              HUD / 升级卡 / 摇杆 / 暂停 / 结算 / 存档
js/game.js            世界 / 战斗 / 敌人 / Boss / 升级 / 主循环
icons/                PWA 与 APK 图标（gen_icons.py 生成）
manifest.webmanifest  PWA 清单
sw.js                 离线缓存（GitHub Pages 生效；本机与 APK 内跳过）
serve.py              本地预览服务器（禁用缓存）
native/               Android WebView 壳 + release 构建脚本 + keystore（不部署到网页）
ART-BIBLE.md          美术圣经
```

## 本地运行

```bash
cd chroma-tide
python3 serve.py 8321
# 打开 http://localhost:8321
```

也可以直接双击 `index.html`，但本地文件模式下不允许 Service Worker / 安装。

## 存档

- 使用 `localStorage`，键名 `chromatide.save.v1`；保存最佳收割、最长生存、最高连斩、总场次与音效开关。
- 设置/暂停/标题页可导出 JSON（`chroma-tide-save.json`）与导入。
- **没有云端、没有账号**。换浏览器、换设备、清缓存会丢档；换设备前请先导出。
- 导入时取新旧记录的最大值，不会把旧档覆盖成更差的记录。

## Android

- 包名：`com.chris.chromatide`；versionCode 1 / versionName 1.0.0。
- release 签名（独立 keystore，不与其他游戏共用）；可直接覆盖安装同包名后续版本并保留 localStorage。
- 壳：`native/`，WebView 加载 APK 内置本地 HTTP 服务（固定 127.0.0.1 端口以稳定存档 origin）。
- 构建（需要 JDK 17 + Android SDK platform-34 / build-tools 34.0.0）：

```bash
cd native
ANDROID_HOME=/tmp/android-sdk ./build_apk.sh 1 1.0.0
```

> keystore 已生成：`native/keystore/chroma-tide-release.jks`，口令与 alias 只记录在私密文件里。keystore 与密码不进入网页部署包，也不进入 Git。

## 部署（GitHub Pages）

仓库：`Chris21349/chris`，分支 `main`，子目录 `soul-lantern/`；站点 `https://chris21349.github.io/chris/soul-lantern/`。

1. 网页文件放在 `soul-lantern/`，不动仓库根目录 `index.html` 与其他游戏目录。
2. 只提交 `index.html`、`css/`、`js/`、`icons/`、`manifest.webmanifest`、`sw.js`、`README.md`、`ART-BIBLE.md`。
3. Pages 已开启（Deploy from branch → main → /(root)），推送后等待构建。
4. 部署后实际打开线上地址，验证画面、音效、摇杆、升级、存档与离线缓存。

## 性能与兼容

- 目标：中端手机 45–60 fps；桌面浏览器流畅。当前同屏上限 150 敌人、粒子池 500、draw call < 40。
- 需要 WebGL（Android WebView 8+ / 现代浏览器）。无 WebGL 时加载页会给出提示。
- 无联机、无云存档、无排行榜、无付费点。

## 素材与许可

- 代码与程序化美术：本项目原创。
- Three.js：MIT License（`js/three.min.js` 保留版权头）。
- 音效：WebAudio 实时合成，无外部音频文件。
