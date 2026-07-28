import type { Metadata } from "next";

import { DocumentSection, DocumentShell } from "../document-shell";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 닥터네스트",
  description: "닥터네스트 개인정보처리방침",
};

export default function PrivacyPolicyPage() {
  return (
    <DocumentShell
      title="개인정보처리방침"
      description="주식회사 알오아이글로벌은 닥터네스트 이용자의 개인정보를 소중히 여기며, 개인정보 보호법 등 관련 법령을 준수합니다."
      effectiveDate="2026년 7월 29일"
    >
      <DocumentSection title="1. 개인정보의 처리 목적">
        <p>회사는 다음 목적을 위해 필요한 범위에서 개인정보를 처리합니다.</p>
        <ul>
          <li>회원 가입, 본인 확인, 계정 및 조직 관리</li>
          <li>닥터네스트 서비스 제공, 상담 연결 및 고객 문의 처리</li>
          <li>서비스 이용 현황 분석, 장애 대응 및 보안 강화</li>
          <li>요금 결제, 계약 이행 및 관련 법령상 의무 준수</li>
        </ul>
      </DocumentSection>

      <DocumentSection title="2. 처리하는 개인정보 항목">
        <ul>
          <li>
            <strong>회원 가입 및 계정 관리:</strong> 이름, 이메일 주소, 소속 병원 또는 기관명,
            로그인 인증정보
          </li>
          <li>
            <strong>도입 및 고객 문의:</strong> 이름, 연락처, 이메일 주소, 소속, 문의 내용
          </li>
          <li>
            <strong>서비스 이용 과정:</strong> IP 주소, 접속 일시, 브라우저 및 기기 정보,
            쿠키, 서비스 이용 기록, 오류 기록
          </li>
          <li>
            <strong>유료 서비스 이용 시:</strong> 결제 및 계약에 필요한 정보
          </li>
        </ul>
        <p>
          회사는 원칙적으로 주민등록번호 등 고유식별정보를 수집하지 않습니다. 병원이
          닥터네스트를 통해 환자 상담 정보를 처리하는 경우, 회사는 해당 병원의 지시에 따라
          위탁받은 범위에서만 정보를 처리합니다.
        </p>
      </DocumentSection>

      <DocumentSection title="3. 개인정보의 처리 및 보유 기간">
        <p>
          개인정보는 처리 목적이 달성되거나 회원이 탈퇴하면 지체 없이 파기합니다. 다만, 관련
          법령에 따라 보존할 필요가 있는 경우 해당 기간 동안 안전하게 분리 보관합니다.
        </p>
        <ul>
          <li>계약 또는 청약철회 등에 관한 기록: 5년</li>
          <li>대금결제 및 재화·서비스 공급에 관한 기록: 5년</li>
          <li>소비자 불만 또는 분쟁처리에 관한 기록: 3년</li>
          <li>서비스 접속 기록: 관련 법령에서 정한 기간</li>
        </ul>
      </DocumentSection>

      <DocumentSection title="4. 개인정보의 제3자 제공">
        <p>
          회사는 이용자의 개인정보를 본래의 처리 목적 범위에서만 처리하며, 이용자의 동의가
          있거나 법령에 근거한 경우를 제외하고 제3자에게 제공하지 않습니다. 제3자 제공이
          필요한 경우 제공받는 자, 목적, 항목 및 보유기간을 사전에 안내하고 동의를 받습니다.
        </p>
      </DocumentSection>

      <DocumentSection title="5. 개인정보 처리업무의 위탁">
        <p>
          회사는 안정적인 서비스 제공을 위해 클라우드 인프라, 본인 인증, 결제, 메시지 발송
          등의 업무를 외부 전문업체에 위탁할 수 있습니다. 위탁이 발생하는 경우 관련 법령에
          따라 개인정보가 안전하게 처리되도록 관리·감독하며, 구체적인 수탁자와 업무 내용은
          이 방침 또는 서비스 내 공지를 통해 공개합니다.
        </p>
      </DocumentSection>

      <DocumentSection title="6. 개인정보의 국외 이전">
        <p>
          국외 사업자의 서비스를 이용하여 개인정보가 국외로 이전되는 경우, 회사는 이전되는
          항목, 국가, 일시와 방법, 이전받는 자, 이용 목적 및 보유기간을 관련 법령에서 정한
          방법으로 사전에 알리고 필요한 동의를 받거나 적법한 보호조치를 이행합니다.
        </p>
      </DocumentSection>

      <DocumentSection title="7. 개인정보의 파기">
        <p>
          보유기간이 지나거나 처리 목적이 달성된 개인정보는 복구 또는 재생되지 않도록
          파기합니다. 전자적 파일은 복구가 어려운 기술적 방법으로 삭제하고, 종이 문서는
          분쇄하거나 소각합니다.
        </p>
      </DocumentSection>

      <DocumentSection title="8. 이용자와 법정대리인의 권리">
        <p>
          이용자는 언제든지 개인정보 열람, 정정·삭제, 처리정지 및 동의 철회를 요청할 수
          있습니다. 요청은 아래 이메일로 접수할 수 있으며, 회사는 관련 법령에 따라 지체 없이
          처리합니다. 법정대리인이나 위임받은 사람을 통해서도 권리를 행사할 수 있습니다.
        </p>
      </DocumentSection>

      <DocumentSection title="9. 개인정보의 안전성 확보조치">
        <ul>
          <li>개인정보 접근 권한의 최소화 및 접근 기록 관리</li>
          <li>전송 구간 암호화와 중요 정보의 안전한 저장</li>
          <li>보안 업데이트, 취약점 점검 및 침해사고 대응 절차 운영</li>
          <li>개인정보 취급자에 대한 정기적인 교육과 관리</li>
        </ul>
      </DocumentSection>

      <DocumentSection title="10. 쿠키의 사용">
        <p>
          회사는 로그인 상태 유지와 서비스 개선을 위해 쿠키를 사용할 수 있습니다. 이용자는
          브라우저 설정에서 쿠키 저장을 거부하거나 삭제할 수 있으나, 이 경우 일부 기능 이용이
          제한될 수 있습니다.
        </p>
      </DocumentSection>

      <DocumentSection title="11. 개인정보 보호책임자 및 문의">
        <div className="rounded-2xl border border-[#e2e6ef] bg-white p-5 sm:p-6">
          <p>
            <strong>개인정보 보호책임자:</strong> 김록원
          </p>
          <p>
            <strong>이메일:</strong>{" "}
            <a href="mailto:doctornest.ai@gmail.com">doctornest.ai@gmail.com</a>
          </p>
          <p>
            <strong>주소:</strong> 서울특별시 강남구 학동로 342, 8층 821호
          </p>
        </div>
        <p>
          개인정보 침해에 대한 상담이 필요한 경우 개인정보침해 신고센터(국번 없이 118),
          개인정보 분쟁조정위원회, 경찰청 또는 대검찰청 등 관계 기관에 문의할 수 있습니다.
        </p>
      </DocumentSection>

      <DocumentSection title="12. 개인정보처리방침의 변경">
        <p>
          법령 또는 서비스 변경에 따라 이 방침이 수정되는 경우 시행일 전에 서비스 화면을
          통해 안내합니다. 이용자 권리에 중대한 변경이 있는 경우에는 충분한 기간을 두고
          알립니다.
        </p>
      </DocumentSection>
    </DocumentShell>
  );
}
