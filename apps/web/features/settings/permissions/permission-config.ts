export const permissionGroups = [
  {
    key: "CUSTOMER_CHAT",
    label: "고객채팅",
    permissions: [
      {
        key: "CUSTOMER_CHAT_FULL_ACCESS",
        label: "고객채팅 최고 권한",
        description: "모든 상담 조회, 배정, 답변 및 상담 종료를 허용합니다.",
      },
    ],
  },
  {
    key: "CUSTOMER_RECORDS",
    label: "고객입력",
    permissions: [
      {
        key: "CUSTOMER_DEACTIVATE",
        label: "고객 이용중단",
        description: "고객 정보의 이용중단 처리를 허용합니다.",
      },
    ],
  },
  {
    key: "AUTOMATIONS",
    label: "자동화",
    permissions: [
      {
        key: "AUTOMATION_STATUS_ACCESS",
        label: "관리현황 접근",
        description: "자동화 적용 현황과 발송 상태를 조회할 수 있습니다.",
      },
      {
        key: "AUTOMATION_WRITE",
        label: "자동화 등록/변경",
        description: "상담자동화를 만들고 편집할 수 있습니다.",
      },
      {
        key: "AUTOMATION_DELETE",
        label: "자동화 삭제",
        description: "등록된 상담자동화를 삭제할 수 있습니다.",
      },
      {
        key: "AUTOMATION_EXPORT",
        label: "발송내역 내려받기",
        description: "자동화 발송내역을 파일로 내려받을 수 있습니다.",
      },
    ],
  },
  {
    key: "MARKETING",
    label: "재진 마케팅",
    permissions: [
      {
        key: "MARKETING_WRITE",
        label: "마케팅 등록/변경",
        description: "재진 마케팅 캠페인을 만들고 편집할 수 있습니다.",
      },
      {
        key: "MARKETING_DELETE",
        label: "마케팅 삭제",
        description: "마케팅 캠페인을 삭제할 수 있습니다.",
      },
      {
        key: "MARKETING_STATUS_ACCESS",
        label: "마케팅 현황",
        description: "캠페인 성과와 발송 현황을 조회할 수 있습니다.",
      },
      {
        key: "MARKETING_EXPORT",
        label: "발송내역 내려받기",
        description: "마케팅 발송내역을 파일로 내려받을 수 있습니다.",
      },
    ],
  },
  {
    key: "MANUALS",
    label: "원내매뉴얼",
    permissions: [
      {
        key: "MANUAL_SETTINGS",
        label: "매뉴얼 설정",
        description: "매뉴얼의 사용 여부와 분류를 관리할 수 있습니다.",
      },
      {
        key: "MANUAL_WRITE",
        label: "매뉴얼 작성",
        description: "원내매뉴얼을 등록하고 편집할 수 있습니다.",
      },
    ],
  },
  {
    key: "CONTENT",
    label: "콘텐츠",
    permissions: [
      {
        key: "CONTENT_WRITE",
        label: "콘텐츠 등록/변경",
        description: "이벤트와 콘텐츠를 등록하고 편집할 수 있습니다.",
      },
      {
        key: "CONTENT_DELETE",
        label: "콘텐츠 삭제",
        description: "등록된 콘텐츠를 삭제할 수 있습니다.",
      },
    ],
  },
  {
    key: "MEDIPAL_AI",
    label: "medipal AI",
    permissions: [
      {
        key: "AI_USAGE_ACCESS",
        label: "사용현황 접근",
        description: "AI 기능 사용량과 처리 현황을 조회할 수 있습니다.",
      },
      {
        key: "AI_TASK_ADJUST",
        label: "AI 업무 조정",
        description: "AI가 수행하는 업무의 범위와 설정을 변경할 수 있습니다.",
      },
      {
        key: "AI_APPOINTMENT_ACCESS",
        label: "AI 예약 접근",
        description: "AI 예약 업무와 결과를 조회할 수 있습니다.",
      },
      {
        key: "AI_CALL_ACCESS",
        label: "AI 콜 접근",
        description: "AI 콜 업무와 결과를 조회할 수 있습니다.",
      },
      {
        key: "AI_CHAT_FULL_ACCESS",
        label: "AI 콜 최고 권한",
        description: "AI 상담 설정과 결과를 모두 관리할 수 있습니다.",
      },
    ],
  },
  {
    key: "HOSPITAL_SETTINGS",
    label: "병원설정",
    permissions: [
      {
        key: "HOSPITAL_INFO_ACCESS",
        label: "병원정보 접근",
        description: "병원프로필과 운영시간을 조회하고 변경할 수 있습니다.",
      },
      {
        key: "SERVICE_SETTINGS_ACCESS",
        label: "서비스설정 접근",
        description: "채널연동과 고객태그 설정에 접근할 수 있습니다.",
      },
      {
        key: "ACCOUNT_MANAGEMENT_ACCESS",
        label: "계정관리 접근",
        description: "병원 계정과 권한 프로필을 관리할 수 있습니다.",
      },
      {
        key: "CARD_MANAGEMENT_ACCESS",
        label: "카드 결제관리 접근",
        description: "결제카드 정보를 조회하고 변경할 수 있습니다.",
      },
      {
        key: "PASS_HISTORY_ACCESS",
        label: "이용권 내역 접근",
        description: "병원 이용권과 결제 내역을 조회할 수 있습니다.",
      },
      {
        key: "PAYMENT_PERMISSION",
        label: "결제 권한",
        description: "이용권 결제와 유료 기능 신청을 허용합니다.",
      },
    ],
  },
] as const;

export type PermissionKey =
  (typeof permissionGroups)[number]["permissions"][number]["key"];

export const allPermissionKeys = permissionGroups.flatMap((group) =>
  group.permissions.map((permission) => permission.key),
) as PermissionKey[];

const staffPermissions = [
  "CUSTOMER_CHAT_FULL_ACCESS",
  "AUTOMATION_STATUS_ACCESS",
  "MANUAL_SETTINGS",
  "CONTENT_WRITE",
] satisfies PermissionKey[];

const adminExcludedPermissions = new Set<PermissionKey>([
  "CARD_MANAGEMENT_ACCESS",
  "PAYMENT_PERMISSION",
]);

export const defaultAccessProfiles = [
  {
    key: "MASTER",
    name: "마스터",
    description: "운영에 필요한 모든 기능에 접근할 수 있습니다.",
    permissions: allPermissionKeys,
    isLocked: true,
    sortOrder: 0,
  },
  {
    key: "ADMIN",
    name: "관리자",
    description: "운영 관리에 필요한 기능에 접근할 수 있습니다.",
    permissions: allPermissionKeys.filter(
      (permission) => !adminExcludedPermissions.has(permission),
    ),
    isLocked: false,
    sortOrder: 1,
  },
  {
    key: "STAFF",
    name: "직원",
    description: "아래 선택한 기능에만 접근할 수 있습니다.",
    permissions: staffPermissions,
    isLocked: false,
    sortOrder: 2,
  },
  {
    key: "STAFF_2",
    name: "직원 2",
    description: "아래 선택한 기능에만 접근할 수 있습니다.",
    permissions: staffPermissions,
    isLocked: false,
    sortOrder: 3,
  },
  {
    key: "STAFF_3",
    name: "직원 3",
    description: "아래 선택한 기능에만 접근할 수 있습니다.",
    permissions: staffPermissions,
    isLocked: false,
    sortOrder: 4,
  },
] as const;

export type AccessProfileRecord = {
  id: string;
  key: string;
  name: string;
  description: string;
  permissions: PermissionKey[];
  isLocked: boolean;
  sortOrder: number;
  userCount: number;
};

export function isPermissionKey(value: unknown): value is PermissionKey {
  return (
    typeof value === "string" &&
    allPermissionKeys.includes(value as PermissionKey)
  );
}
