# 설정 가이드

TFT 증강체 개인 맞춤형 티어 정리 도구를 실행하기 위한 설정 순서입니다.

## 0. 먼저 알아둘 점 (중요)

이 프로젝트는 네트워크가 제한된 샌드박스 환경에서 작성되어, Community Dragon
파싱 로직 상당 부분은 실제 사용자가 직접 실행한 결과를 보고서야 고쳤습니다.
실측 결과 확인된 것:

- `raw.communitydragon.org/latest/cdragon/tft/ko_kr.json`의 `setData[i].augments`는
  객체가 아니라 **apiName 문자열 배열**이고, 실제 이름/설명/아이콘은 최상위
  `data.items` 배열에서 apiName으로 대조해서 찾아야 합니다.
- 이 목록에는 **다른 세트 전용 증강체**(`TFT6_Augment_*` 등)가 섞여 있어, apiName에
  명시된 세트 번호가 다르면 제외합니다.
- **증강체 등급(실버/골드/프리즘) 정보는 이 데이터에 아예 없습니다.** 그래서
  `data/rarity-overrides.json`으로 사람이 직접 채우는 방식을 씁니다 (4-1번 참고).

여전히 이상하게 동작하면 `npm run fetch:augments` 콘솔 출력(특히 `--- 진단 정보 ---`
블록)을 보여주시면 계속 고칠 수 있습니다.

그 전까지 앱 골격을 확인하려면 `npm run seed:sample` 로 더미 데이터(실제 패치
데이터 아님, 이름이 전부 "샘플 ○○ 증강체 N" 형태)를 넣어 UI를 테스트할 수
있습니다.

## 1. Supabase 프로젝트 만들기

1. https://supabase.com 에서 새 프로젝트를 생성합니다 (무료 플랜으로 충분).
2. 프로젝트의 **SQL Editor**를 열고 `supabase/schema.sql` 파일의 전체 내용을
   붙여넣어 실행합니다. 이 스크립트가 테이블 4개(`augments`, `tier_placements`,
   `augment_notes`, `augment_images`)와 이미지 업로드용 Storage 버킷
   (`augment-images`, public)을 만듭니다.
   그 다음 `supabase/migrations/` 폴더 안의 파일들도 번호 순서대로 SQL
   Editor에서 실행하세요 (`002_description_override.sql` — 게임 설명을 직접
   수정할 수 있게 하는 컬럼, `003_extra_stages.sql` — 증강체가 여러 스테이지에
   동시에 등장할 수 있게 하는 컬럼). 이후 이 프로젝트를 업데이트하면서 새
   마이그레이션 파일이 추가되면 그때마다 한 번씩 실행하면 됩니다.
3. 프로젝트 설정 > API 에서 다음 값을 확인합니다.
   - `Project URL` → `SUPABASE_URL`
   - `service_role` 비밀 키 → `SUPABASE_SERVICE_ROLE_KEY` (절대 브라우저에 노출되면
     안 되는 키입니다. 이 앱은 서버 코드에서만 사용하도록 만들어져 있습니다.)

## 2. 환경변수 설정

`.env.example`을 복사해 `.env.local`을 만들고 값을 채웁니다.

```bash
cp .env.example .env.local
```

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: 위에서 확인한 값

## 3. 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 접속 → 바로 2-1 티어보드로 이동합니다.
로그인 기능은 없습니다 (아래 8번 참고).

## 4. 증강체 데이터 채우기

**실제 패치 데이터 (권장, 네트워크 제한이 없는 환경에서):**

```bash
npm run fetch:augments
```

Community Dragon(`ko_kr.json`)에서 Set 18 증강체를 가져와 등급(실버/골드/프리즘)에
따라 2-1/3-2/4-2 스테이지로 분류해 DB에 upsert합니다. 아이콘 URL은 여러 후보 경로를
HEAD 요청으로 검증합니다. 완료 후 콘솔에 총 개수와 경고 목록이 출력됩니다.

**4-1. 등급(실버/골드/프리즘) 직접 채우기 — `data/rarity-overrides.json`**

Community Dragon 데이터에는 증강체 등급 정보가 없습니다. `npm run fetch:augments`를
실행하면 등급을 못 찾은 증강체가 이 파일의 `entries`에 자동으로 추가됩니다
(`"rarity": null`). 파일을 열어 아는 증강체부터 `"silver"` / `"gold"` / `"prism"`
중 하나로 채운 뒤 다시 `npm run fetch:augments`를 실행하면 그 값이 반영됩니다.
이미 채운 값은 다음 실행에서도 그대로 유지되고, 새로 발견된 증강체만 추가됩니다.
이 파일은 커밋해서 저장소에 함께 보관하는 걸 권장합니다 (매번 다시 채우지 않도록).

**더미 데이터 (Community Dragon 접근이 막힌 환경에서 골격만 확인할 때):**

```bash
npm run seed:sample
```

## 5. 앱 안의 "패치 데이터 새로고침" 버튼

로그인 후 상단 네비게이션의 "패치 데이터 새로고침" 버튼은 `npm run fetch:augments`와
동일한 로직을 서버 액션으로 실행합니다. 매번 외부 API를 호출하지 않고, 이 버튼을
누를 때만 최신 데이터를 가져와 DB에 캐싱합니다. Vercel에 배포한 뒤 새 패치가
나오면 이 버튼만 누르면 됩니다.

## 6. Vercel 배포

1. GitHub 저장소를 Vercel에 연결합니다.
2. 프로젝트 설정 > Environment Variables 에 `.env.local`과 동일한 2개 값
   (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)을 등록합니다.
3. 배포 후 발급된 URL로 PC/모바일 어디서든 접속해 같은 데이터를 보고 수정할 수
   있습니다.

> **주의**: 로그인 기능을 뺐기 때문에 이 URL을 아는 사람은 누구나 데이터를 보고
> 수정할 수 있습니다. Vercel 배포 시 프로젝트 설정의 **Deployment Protection**
> (Vercel Authentication)을 켜서 접근을 제한하는 것을 권장합니다.

이미지 업로드는 Supabase Storage(`augment-images` 버킷)를 사용하므로 별도 설정
없이 Vercel에서도 그대로 동작합니다.

## 7. 폴더 구조 요약

- `src/app/[stage]/page.tsx`: 2-1 / 3-2 / 4-2 티어보드 페이지
- `src/components/`: 드래그앤드롭 보드, 검색, 상세 모달 등 UI
- `src/lib/actions/`: 티어 배치·메모·이미지·데이터 새로고침 서버 액션
- `src/lib/ingest.ts`: Community Dragon 파싱/DB upsert 공통 로직
- `scripts/fetch-augments.ts`, `scripts/seed-sample.ts`: CLI 데이터 수집/시딩 스크립트
- `supabase/schema.sql`: DB 스키마 + Storage 버킷

## 8. 게임 내 설명 직접 수정하기

증강체 상세 모달의 "게임 내 설명"은 Community Dragon 원문 그대로라 `@Gold@` 같은
치환 안 된 변수가 섞여 있을 수 있습니다. 그 텍스트를 직접 고쳐서 저장할 수 있고,
한 번 고친 증강체는 이후 `npm run fetch:augments` / "패치 데이터 새로고침"을
실행해도 그 수정 내용이 덮어써지지 않습니다 (모달에 "(직접 수정됨)" 표시).

## 9. 한 증강체가 여러 스테이지에 등장하게 하기

Community Dragon 데이터에는 "이 증강체가 2-1/3-2/4-2 중 정확히 어디서
등장하는지"에 대한 정보가 없어서, 기본적으로는 등급(실버→2-1, 골드→3-2,
프리즘→4-2)만 보고 스테이지 하나를 자동으로 배정합니다. 실제 게임에서는
조건부로 다른 스테이지에도 같은 증강체가 나올 수 있는데, 이건 metatft나
롤체지지 같은 외부 사이트를 매번 안정적으로 긁어오기엔(구조가 언제 바뀔지
모르고, 이번 프로젝트에서 CDragon 파싱만도 여러 라운드가 걸렸습니다) 신뢰성이
떨어질 것 같아 **사람이 직접 지정하는 방식**으로 만들었습니다.

증강체 상세 모달을 열면 맨 위에 "등장 스테이지" 체크박스 3개(2-1/3-2/4-2)가
있습니다. 등급 기준으로 자동 배정된 스테이지는 "(기본)" 표시와 함께 항상
체크되어 있고 끌 수 없습니다. 나머지 체크박스를 켜면 그 스테이지의 "미분류"
목록에도 같은 증강체가 나타나서, 그 스테이지에서 독립적으로 티어를 매길 수
있습니다 (같은 증강체도 스테이지마다 다른 티어에 둘 수 있습니다 — 원래
스테이지별 티어 배치는 서로 독립적으로 저장되도록 설계되어 있습니다). 체크
표시는 저장되고, 패치 데이터를 새로고침해도 유지됩니다.

## 10. 알려진 제한사항 / 향후 조정 여지

- **로그인/비밀번호 기능이 없습니다.** URL만 알면 누구나 접속해 데이터를 보고
  수정할 수 있습니다. 개인 로컬 사용이나, 위 6번의 Vercel Deployment Protection
  같은 별도 접근 제어와 함께 쓰는 걸 전제로 합니다. 다시 비밀번호를 붙이고
  싶으시면 말씀해주세요.
- 티어 내 세부 순서(드래그로 같은 티어 안에서 순서 바꾸기)는 구현하지 않았습니다.
  현재는 어떤 티어에 속하는지만 저장하고, 같은 티어 안에서는 등록 순서대로 표시됩니다.
  필요하시면 `@dnd-kit/sortable`을 추가해 세부 정렬을 구현할 수 있습니다.
- `DA_*` / `TFT_Augment_*`처럼 세트 번호가 없는 범용 증강체 이름은 "이번 패치에
  실제로 활성화된 것"인지 걸러낼 확실한 신호가 없어 전부 남겨둡니다. 실제로
  없는 증강체가 보이면 `data/rarity-overrides.json`에서 그 항목의 rarity를
  다시 `null`로 바꾸는 대신, 직접 요청해주시면 이름 목록 기반으로 필터링을
  추가하겠습니다.
