# TFT 증강체 티어 정리 에이전트

TFT(전략적 팀 전투) 증강체를 2-1 / 3-2 / 4-2 스테이지별로 직접 드래그앤드롭으로
티어 분류하고, 증강체마다 개인 메모(텍스트+이미지)를 남길 수 있는 개인용 웹 앱입니다.
Supabase에 데이터를 저장해 PC/모바일 등 여러 기기에서 같은 데이터를 보고 수정할 수
있습니다.

설정 및 배포 방법은 [SETUP.md](./SETUP.md)를 참고하세요.

## 기술 스택

- Next.js 16 (App Router, Server Actions) + TypeScript + Tailwind CSS
- dnd-kit (드래그앤드롭 티어보드)
- Supabase (Postgres + Storage, 이미지 업로드)
- 단일 비밀번호 기반 세션 인증

## 주요 스크립트

```bash
npm run dev            # 로컬 개발 서버
npm run build           # 프로덕션 빌드
npm run fetch:augments  # Community Dragon에서 최신 증강체 데이터 수집 → DB upsert
npm run seed:sample     # (오프라인 테스트용) 더미 증강체 데이터 시딩
```
