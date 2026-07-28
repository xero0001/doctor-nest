import type { Metadata } from "next";

import { DocumentSection, DocumentShell } from "../document-shell";

export const metadata: Metadata = {
  title: "이용약관 | 닥터네스트",
  description: "닥터네스트 서비스 이용약관",
};

export default function TermsOfServicePage() {
  return (
    <DocumentShell
      title="이용약관"
      description="본 약관은 주식회사 알오아이글로벌이 제공하는 닥터네스트 서비스의 이용 조건과 회사 및 이용자의 권리·의무를 정합니다."
      effectiveDate="2026년 7월 29일"
    >
      <DocumentSection title="제1조 (목적)">
        <p>
          이 약관은 주식회사 알오아이글로벌(이하 “회사”)이 제공하는 닥터네스트 및 관련
          서비스(이하 “서비스”)의 이용과 관련하여 회사와 이용자 사이의 권리, 의무 및 책임을
          정하는 것을 목적으로 합니다.
        </p>
      </DocumentSection>

      <DocumentSection title="제2조 (용어의 정의)">
        <ol>
          <li>“서비스”란 회사가 웹, 모바일 등으로 제공하는 병원 고객 상담 및 운영 지원 기능을 말합니다.</li>
          <li>“이용자”란 이 약관에 동의하고 서비스를 이용하는 개인 또는 법인을 말합니다.</li>
          <li>“회원”이란 계정을 생성하여 서비스를 지속적으로 이용하는 자를 말합니다.</li>
          <li>“조직”이란 회원이 소속된 병원, 의료기관 또는 사업자를 말합니다.</li>
        </ol>
      </DocumentSection>

      <DocumentSection title="제3조 (약관의 효력 및 변경)">
        <ol>
          <li>이 약관은 서비스 화면에 게시하거나 이용자에게 알린 때부터 효력이 발생합니다.</li>
          <li>
            회사는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 적용일과 변경
            사유를 사전에 안내합니다.
          </li>
          <li>
            이용자에게 불리한 중대한 변경은 적용일 30일 전부터 안내합니다. 이용자가 변경된
            약관에 동의하지 않는 경우 서비스 이용계약을 해지할 수 있습니다.
          </li>
        </ol>
      </DocumentSection>

      <DocumentSection title="제4조 (이용계약과 계정)">
        <ol>
          <li>이용계약은 이용자가 약관에 동의하고 회사가 가입 또는 이용 신청을 승인하면 성립합니다.</li>
          <li>이용자는 정확한 정보를 제공하고 변경사항이 생기면 이를 최신 상태로 유지해야 합니다.</li>
          <li>
            계정과 비밀번호의 관리 책임은 이용자에게 있으며, 도용 또는 무단 사용을 알게 된
            경우 즉시 회사에 알려야 합니다.
          </li>
          <li>
            회사는 허위 정보 제공, 타인 명의 사용, 서비스 운영 방해 등의 사유가 있는 경우
            신청을 거절하거나 이용을 제한할 수 있습니다.
          </li>
        </ol>
      </DocumentSection>

      <DocumentSection title="제5조 (서비스의 제공 및 변경)">
        <ol>
          <li>
            회사는 고객 상담 관리, 메시지 채널 연동, 업무 자동화, 콘텐츠 및 예약 관리 등
            닥터네스트가 정한 기능을 제공합니다.
          </li>
          <li>
            회사는 서비스 개선이나 운영상 필요에 따라 기능을 추가, 변경 또는 종료할 수
            있습니다. 이용자에게 중대한 영향을 주는 경우 사전에 안내합니다.
          </li>
          <li>
            설비 점검, 장애, 천재지변 또는 외부 플랫폼 사정으로 서비스가 일시 중단될 수
            있으며, 회사는 가능한 범위에서 신속히 복구하고 안내합니다.
          </li>
        </ol>
      </DocumentSection>

      <DocumentSection title="제6조 (이용자의 의무)">
        <p>이용자는 다음 행위를 해서는 안 됩니다.</p>
        <ul>
          <li>법령, 약관 또는 회사의 운영정책을 위반하는 행위</li>
          <li>타인의 정보나 계정을 도용하거나 권한 없이 접근하는 행위</li>
          <li>서비스의 정상 운영을 방해하거나 보안을 침해하는 행위</li>
          <li>불법·허위·기만적 정보 또는 제3자의 권리를 침해하는 내용을 전송하는 행위</li>
          <li>서비스를 역설계, 복제하거나 회사의 사전 동의 없이 재판매하는 행위</li>
        </ul>
      </DocumentSection>

      <DocumentSection title="제7조 (병원 및 고객 정보의 처리)">
        <ol>
          <li>
            이용자는 서비스에 입력하거나 연동하는 정보에 대해 적법한 처리 권한과 필요한
            동의를 갖추어야 합니다.
          </li>
          <li>
            회사는 이용자가 서비스 이용을 위해 맡긴 정보를 계약 이행과 서비스 제공 범위에서만
            처리합니다.
          </li>
          <li>
            의료 상담 내용은 의료인의 전문적인 판단을 대체하지 않으며, 진료와 의료행위에 대한
            최종 책임은 해당 의료기관과 의료인에게 있습니다.
          </li>
        </ol>
      </DocumentSection>

      <DocumentSection title="제8조 (요금 및 결제)">
        <ol>
          <li>유료 서비스의 요금, 결제 주기 및 이용 조건은 별도 계약이나 서비스 화면에 표시합니다.</li>
          <li>
            이용자는 정해진 기한까지 이용요금을 지급해야 하며, 연체 시 회사는 사전 안내 후
            유료 기능 이용을 제한할 수 있습니다.
          </li>
          <li>환불과 계약 해지는 관련 법령 및 별도로 합의한 계약 조건에 따릅니다.</li>
        </ol>
      </DocumentSection>

      <DocumentSection title="제9조 (지식재산권)">
        <p>
          서비스와 회사가 제작한 소프트웨어, 화면, 상표 및 콘텐츠에 관한 권리는 회사 또는
          정당한 권리자에게 있습니다. 이용자가 서비스에 입력한 자료의 권리는 이용자 또는 원
          권리자에게 있으며, 회사는 서비스 제공에 필요한 범위에서만 이를 이용합니다.
        </p>
      </DocumentSection>

      <DocumentSection title="제10조 (이용 제한 및 계약 해지)">
        <ol>
          <li>이용자는 서비스 내 기능 또는 회사에 대한 요청을 통해 이용계약을 해지할 수 있습니다.</li>
          <li>
            회사는 이용자가 약관이나 법령을 위반한 경우 시정을 요청하고, 위반이 계속되거나
            긴급한 위험이 있는 경우 서비스 이용을 제한하거나 계약을 해지할 수 있습니다.
          </li>
          <li>
            계약 종료 시 정보의 반환, 보관 및 삭제는 개인정보처리방침과 별도 계약에 따릅니다.
          </li>
        </ol>
      </DocumentSection>

      <DocumentSection title="제11조 (책임의 제한)">
        <ol>
          <li>
            회사는 천재지변, 통신망 장애, 외부 플랫폼의 정책 변경 등 합리적으로 통제하기
            어려운 사유로 서비스를 제공하지 못한 경우 책임을 지지 않습니다.
          </li>
          <li>
            회사는 고의 또는 중대한 과실이 없는 한 이용자의 귀책사유로 발생한 손해나 이용자가
            서비스를 통해 기대한 성과를 얻지 못한 것에 대해 책임을 지지 않습니다.
          </li>
          <li>관련 법령상 제한할 수 없는 책임에는 본 조가 적용되지 않습니다.</li>
        </ol>
      </DocumentSection>

      <DocumentSection title="제12조 (준거법 및 분쟁 해결)">
        <p>
          이 약관은 대한민국 법령에 따라 해석됩니다. 서비스 이용과 관련한 분쟁은 상호 협의를
          통해 해결하며, 해결되지 않는 경우 민사소송법상 관할 법원에 소를 제기할 수 있습니다.
        </p>
      </DocumentSection>

      <DocumentSection title="제13조 (문의)">
        <div className="rounded-2xl border border-[#e2e6ef] bg-white p-5 sm:p-6">
          <p>
            <strong>회사:</strong> 주식회사 알오아이글로벌
          </p>
          <p>
            <strong>대표자:</strong> 김록원
          </p>
          <p>
            <strong>이메일:</strong>{" "}
            <a href="mailto:doctornest.ai@gmail.com">doctornest.ai@gmail.com</a>
          </p>
          <p>
            <strong>주소:</strong> 서울특별시 강남구 학동로 342, 8층 821호
          </p>
        </div>
      </DocumentSection>
    </DocumentShell>
  );
}
