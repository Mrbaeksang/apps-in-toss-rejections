<div align="center">

# apps-in-toss-rejections

**앱인토스 검수, 반려되기 전에 잡자.**

실제 반려 사례집 · 공식 점검이 못 잡는 항목 · 의존성 0개 번들 스캐너 · AI 에이전트 스킬

[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![node >= 20](https://img.shields.io/badge/node-%3E%3D20-339933)
![dependencies: 0](https://img.shields.io/badge/dependencies-0-brightgreen)
[![PRs welcome](https://img.shields.io/badge/반려%20사례-환영-ff69b4)](CONTRIBUTING.md)

[English summary](#english)

</div>

---

## 왜 만들었나요

앱인토스(Apps in Toss) 미니앱을 올리면서 이렇게 반려됐어요.

| 반려 문구 | 걸린 시간 |
|---|---|
| 번들에 다른 결제 SDK(portone.io)가 들어 있어요. | **요청 1초 만에 자동 반려** |
| 서비스 설명 없이 즉시 토스 로그인을 유도하고 있어 인트로 페이지 추가가 필요해요. | 사람 검토 후 반려 |

첫 번째는 **화면에서 절대 실행되지 않는 코드**였어요. 같은 웹 코드를 브라우저·앱·미니앱에서 같이 쓰다 보니, 브라우저 전용 결제 코드의 URL 문자열이 미니앱 번들에 딸려 들어갔어요. 소스를 아무리 봐도 안 보이고, **빌드 결과물**을 봐야 보여요.

토스는 공식 에이전트 도구 [`toss/apps-in-toss-harness`](https://github.com/toss/apps-in-toss-harness)를 제공하고, 그 안의 `launch` 스킬이 출시 전 점검을 해 줘요. 아주 좋아요. **먼저 그걸 쓰세요.** 다만 그 자동 스캔은 확대 허용·다크 테마·CORS·AI 키·디버그 산출물을 보고, 위 두 반려 원인은 보지 않아요.

이 레포는 그 빈틈을 메워요.

## 들어 있는 것

| 파일 | 내용 |
|---|---|
| [`cases/`](cases/README.md) | 실제 반려 문구 → 원인 → 고친 방법 |
| [`GAPS.md`](GAPS.md) | 공식 자동 점검에 없는 14개 항목과 확인 방법 (인트로, 플로팅 탭바, 결제 내역, 자사 링크…) |
| [`scripts/scan.mjs`](scripts/scan.mjs) | 빌드 산출물을 읽기 전용으로 검사하는 스캐너. 의존성 0개 |
| [`skills/apps-in-toss-rejections/`](skills/apps-in-toss-rejections/SKILL.md) | Claude Code · Codex 등 AI 에이전트용 스킬 |

## 30초 사용법

```bash
# 1) 미니앱 웹 산출물을 만들고 (ait build가 묶기 전 폴더)
npm run build

# 2) 검사 (npm 12부터 GitHub 패키지는 --allow-git이 필요해요)
npx -y --allow-git=all github:Mrbaeksang/apps-in-toss-rejections dist

# 또는 받아서 실행 (Node 20+, 의존성 없음)
git clone https://github.com/Mrbaeksang/apps-in-toss-rejections
node apps-in-toss-rejections/scripts/scan.mjs ../my-miniapp/dist
```

```text
[blocking] third-party-payment — Mini-apps may only use Toss Pay and in-app purchase (IAP)...
  assets/index-3f2a.js:1  cdn.portone.io
    … const sdkUrl='https://cdn.portone.io/v2/browser-sdk.js' …

External https hosts in scripts/HTML (check each is needed and is not your own site to navigate to):
  api.my-app.example (3)

scan: blocking=1 review=0 files=9
```

`blocking`이 1개라도 있으면 종료 코드 1이라 CI에 바로 넣을 수 있어요.

### 검사 규칙

| 규칙 | 수준 | 찾는 것 |
|---|---|---|
| `third-party-payment` | 차단 | PortOne·아임포트·토스페이먼츠 위젯·이니시스·Stripe·PayPal 등 결제 SDK |
| `third-party-ads` | 차단 | Google Ad Manager·AdSense·카카오 AdFit 등 광고 태그 |
| `other-login` | 차단 | Google·카카오·Apple·네이버 로그인 SDK |
| `iframe` | 차단 | iframe 생성 (지도·유튜브 예외는 직접 판단) |
| `eval` | 차단 | `eval`, `new Function` |
| `intoss-private-share` | 차단 | 공유에 테스트용 `intoss-private://` 사용 |
| `leave-toss-domain` | 확인 | `location.replace/assign/href`로 자사 사이트 이동 |
| `app-install-link` | 확인 | Play 스토어·App Store 링크 (자사 앱 설치 유도) |
| `dark-theme` | 확인 | 다크 모드 스타일 |

마지막에 번들 안의 **외부 https 호스트 목록**도 보여 줘요. API·CDN은 괜찮고, 사용자를 보내는 자사 웹 페이지가 있는지 보세요.

## AI 에이전트에게 맡기기

### Claude Code

```bash
# 프로젝트 스킬로
mkdir -p .claude/skills && cp -r path/to/apps-in-toss-rejections/skills/apps-in-toss-rejections .claude/skills/
```

그다음 이렇게 말하면 돼요.

> 앱인토스 검수 넣기 전에 반려될 만한 거 찾아줘

> 검수 반려됐어: "서비스 설명 없이 즉시 토스 로그인을 유도하고 있어…"

### Codex · 그 밖의 에이전트

[`AGENTS.md`](AGENTS.md)를 읽게 하세요. 스킬과 같은 순서를 안내해요. [`llms.txt`](llms.txt)도 있어요.

### 공식 harness와 같이 쓰기

1. 공식 `/ait:launch`로 체크리스트 원문 대조와 기본 스캔
2. 이 레포의 스캔과 `GAPS.md` 수동 항목
3. 화면은 공식 `/ait:design`, 문구는 `/ait:ux-writing`, 폰 확인은 `/ait:test-on-device`

## 반려 사례를 보태 주세요

반려 문구 하나가 다른 팀의 일주일을 아껴 줘요. [CONTRIBUTING.md](CONTRIBUTING.md)의 형식으로 이슈나 PR을 열어 주세요. 앱 이름·내부 코드는 빼도 돼요.

## 주의

- **비공식**이에요. 비바리퍼블리카(토스)와 관계없어요.
- 기준의 정본은 [앱인토스 개발자센터](https://developers-apps-in-toss.toss.im/)의 [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame)와 [UI/UX 가이드](https://developers-apps-in-toss.toss.im/design/consumer-ux-guide)예요. 이 레포는 그 내용을 복제하지 않고, 우리 말로 요약하고 링크해요. 가이드가 바뀌면 가이드를 따르세요.
- 스캔 결과는 **후보**예요. 파일을 열어 판단하세요. 0건이 승인을 보장하지 않아요.

---

## English

**Catch Apps in Toss review rejections before you submit.**

Apps in Toss is Toss's mini-app platform in Korea. Its review rejected our web mini-app twice: once **within a second** because the built bundle contained another payment SDK's URL (from code the mini-app never ran), and once because the first screen asked for Toss login without introducing the service.

Toss's official [`toss/apps-in-toss-harness`](https://github.com/toss/apps-in-toss-harness) `launch` skill is the place to start. Its scan checks zoom, dark theme, CORS, client AI keys and debug artifacts. This repo adds what it does not check:

- [`cases/`](cases/README.md): real rejection messages, causes and fixes
- [`GAPS.md`](GAPS.md): 14 review items the official scan does not automate, with how to verify each
- [`scripts/scan.mjs`](scripts/scan.mjs): a zero-dependency, read-only scan of the **built** bundle for third-party payment/ad/login SDKs, iframes, eval, `intoss-private://` share links, leaving the Toss domain and store install links. Exit code 1 on any blocking candidate.
- [`skills/apps-in-toss-rejections/`](skills/apps-in-toss-rejections/SKILL.md): an agent skill for Claude Code, Codex and others

```bash
npx -y --allow-git=all github:Mrbaeksang/apps-in-toss-rejections dist
# or: git clone … && node apps-in-toss-rejections/scripts/scan.mjs dist
```

Unofficial and not affiliated with Viva Republica (Toss). The official guides are the source of truth.

## License

[MIT](LICENSE)
