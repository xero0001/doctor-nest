# DoctorNest

병·의원의 진료 후 환자관리 자동화를 위한 신규 서비스 모노레포입니다.

## Stack

- pnpm workspace + Turborepo
- Next.js App Router + React
- Tailwind CSS v4
- shared UI package based on shadcn/ui conventions
- PostgreSQL + Prisma

## Packages

- `apps/web`: 신규 DoctorNest 웹 애플리케이션
- `packages/ui`: 서비스 공통 UI 컴포넌트
- `packages/database`: Prisma schema와 지연 초기화 DB client
- `packages/eslint-config`: 공통 ESLint flat config
- `packages/typescript-config`: 공통 TypeScript config

## Start

```bash
cp .env.example .env
pnpm install
pnpm db:generate
pnpm dev
```

데이터베이스가 준비되면 `pnpm db:migrate:dev`로 최초 마이그레이션을 생성합니다.
