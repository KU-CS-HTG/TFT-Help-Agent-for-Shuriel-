# 설정 가이드

TFT 증강체 개인 맞춤형 티어 정리 도구를 실행하기 위한 설정 순서입니다.

## 0. 먼저 알아둘 점 (중요)

이 프로젝트는 네트워크가 제한된 샌드박스 환경에서 작성되었습니다. 그 환경에서는
조직 네트워크 정책 때문에 `raw.communitydragon.org` 접근이 막혀 있어(403), 아래
두 가지를 **실제 데이터로 검증하지 못했습니다**:

1. `npm run fetch:augments` (Community Dragon → DB 데이터 수집)
2. 앱 안의 "패치 데이터 새로고침" 버튼 (내부적으로 같은 로직 사용)

`src/lib/ingest.ts`는 CDragon JSON 필드명이 버전에 따라 달라질 수 있다는 점을
감안해 여러 후보 필드명을 순서대로 시도하도록 방어적으로 작성했지만, 실제 응답
구조와 다르면 동작하지 않을 수 있습니다. 로컬 PC나 Vercel처럼 네트워크 제한이
없는 곳에서 실행한 뒤 콘솔에 출력되는 경고(warnings)를 확인해 주세요. 문제가
있다면 경고 메시지를 알려주시면 `src/lib/ingest.ts`의 `guessRarity` /
`fetchAndParseAugments` 파싱 부분을 조정하겠습니다.

그 전까지 앱 골격을 확인하려면 `npm run seed:sample` 로 더미 데이터(실제 패치
데이터 아님, 이름이 전부 "샘플 ○○ 증강체 N" 형태)를 넣어 UI를 테스트할 수
있습니다.

## 1. Supabase 프로젝트 만들기

1. https://supabase.com 에서 새 프로젝트를 생성합니다 (무료 플랜으로 충분).
2. 프로젝트의 **SQL Editor**를 열고 `supabase/schema.sql` 파일의 전체 내용을
   붙여넣어 실행합니다. 이 스크립트가 테이블 4개(`augments`, `tier_placements`,
   `augment_notes`, `augment_images`)와 이미지 업로드용 Storage 버킷
   (`augment-images`, public)을 만듭니다.
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

## 8. 알려진 제한사항 / 향후 조정 여지

- **로그인/비밀번호 기능이 없습니다.** URL만 알면 누구나 접속해 데이터를 보고
  수정할 수 있습니다. 개인 로컬 사용이나, 위 6번의 Vercel Deployment Protection
  같은 별도 접근 제어와 함께 쓰는 걸 전제로 합니다. 다시 비밀번호를 붙이고
  싶으시면 말씀해주세요.
- 티어 내 세부 순서(드래그로 같은 티어 안에서 순서 바꾸기)는 구현하지 않았습니다.
  현재는 어떤 티어에 속하는지만 저장하고, 같은 티어 안에서는 등록 순서대로 표시됩니다.
  필요하시면 `@dnd-kit/sortable`을 추가해 세부 정렬을 구현할 수 있습니다.
- `fetch:augments` 파싱 로직은 실제 CDragon 응답으로 검증되지 않았습니다 (위 0번 참고).
