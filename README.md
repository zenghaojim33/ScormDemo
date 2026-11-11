# ScormDemo — scorm-again SCORM 播放 POC

用 npm [`scorm-again`](https://jcputney.github.io/scorm-again/) (v3.4.4) 在 React Native WebView 里跑真实 SCORM 1.2 内容的验证 demo。

**架构**:RN 0.72.10 + `react-native-webview@13.16.1`。scorm-again 的 `scorm12.min.js` 被 inline 进 bootstrap 脚本,通过 `injectedJavaScriptBeforeContentLoaded` 注入 WebView JS 上下文,在内容加载前挂好 `window.API`。课程列表来自 `src/data/courses.json`(由 10 个包的 imsmanifest.xml 解析生成)。

## 前置要求

- Node(建议 ≥18)、Xcode(项目用 Xcode 26.3 构建过)、CocoaPods(系统安装即可,项目用 1.17,不需要走 bundle)
- iOS 模拟器(建议 iPhone 17 / 17 Pro)

## 课程内容包(需单独获取)

App 本体不含课程内容。需要 10 个 SCORM 1.2 课程包(財務教育課程,繁體中文),从 OneDrive 分享链接下载后**解压到同一个文件夹**(每个包解出一个课程文件夹,如 `什麼是通貨膨脹 2026-27/`)。

⚠️ `src/data/courses.json` 里的 `folder` 字段必须和解压出来的文件夹名完全一致。如果换了课程包,重新解析 manifest 更新这个文件。

内容包由本地 HTTP server 提供(模拟生产环境 LMS 的内容托管,生产上换成 HTTPS 内容域名即可,播放器代码不用改):

```bash
python3 -m http.server 8088 --directory /path/to/解压后的课程文件夹
```

RN 模板的 ATS 已有 localhost 豁免,iOS 可直接加载 `http://localhost:8088`。

## 安装 & 运行

```bash
npm install

# 不要走 bundle install(公司网络会被断),直接 pod install:
cd ios && NO_FLIPPER=1 pod install && cd ..

# 终端 1:Metro(确保 8081 端口没被其他 RN 项目的 Metro 占用,否则会加载错 bundle)
npm start

# 终端 2:装到模拟器
npm run ios   # 或 Xcode 打开 ios/ScormDemo.xcworkspace 跑
```

先启动 8088 的内容 server,再在模拟器里点课程进播放器。

## 代码导读

- `src/player/bootstrap.ts` — 注入 WebView 的 bootstrap:`Scorm12API` 实例化(`lmsCommitUrl`/`autocommit`/`xhrHeaders`)、`loadFromJSON` 恢复进度(决定 entry:resume/ab-initio)、`window.API` 挂载、cmi 事件桥接(`postMessage` → RN)
- `src/screens/PlayerScreen.tsx` — WebView 播放器 + 进度持久化(entry 计算、suspend_data 恢复)
- `src/screens/ScormConsole.tsx` — 底部 SCORM 调试控制台:Set/Get/Commit 计数、事件流(可合并降噪)、点按 cmi element 显示解释
- `src/player/elementDocs.ts` — SCORM 1.2 cmi element 字典(解释面板数据)
- `src/player/scorm12Source.ts` / `lzStringSource.ts` — codegen 出来的 inline 库源码(勿手改)
- `src/data/courses.json` — 课程清单(从 manifest 解析)

## 已知行为/坑(实机验证过)

- 内容(新紀元/iSpring 系)每秒写 `session_time`、约 15s commit 一次;`suspend_data` = LZString base64 的 JSON,真实恢复点是其中 `p.lastViewedSlide`,可用 demo 的 console 解码查看
- SCORM 1.2 的 `session_time`/`exit` 在 scorm-again 的 cmi model 里是 write-only,直接读属性会 throw;要从 SetValue 事件流取
- bootstrap 是运行时 JS 字符串,里面不能写 TypeScript 注解(会静默杀死整个注入)
- 进度目前存内存(`progressStore.ts`),重启即清;接后端时换成 AsyncStorage/commit 接口
- App 退后台没有可靠 unload,生产实现要在 `AppState` → background 时通过 bridge flush 一次 commit

## 后端最小契约(生产接入参考)

- 最少 1 个接口:idempotent `POST .../commit`(scorm-again 的 `lmsCommitUrl`),收到整份 CMI JSON 快照,按 (user, package) 一行 upsert;响应 `{"result":"true"}`
- `suspend_data` 是唯一 blob(不透明整串替换),其余 cmi 字段存成可查询的列
- 建议加:GET 运行时状态(启动时 `loadFromJSON` 种子)、开启 `includeCommitSequence: true` 拒绝过期 commit
