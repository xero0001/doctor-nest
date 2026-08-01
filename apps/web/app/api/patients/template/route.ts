import ExcelJS from "exceljs";
import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const hospital = await getDatabase().hospital.findUniqueOrThrow({
    where: { id: user.hospitalId },
    select: {
      customerInputChartNumberEnabled: true,
      customerInputVisitTypeEnabled: true,
      customerInputCountryCodeEnabled: true,
      customerInputBirthDateEnabled: true,
      customerInputGenderEnabled: true,
      customerInputTreatmentTagEnabled: true,
      customerInputNationalityEnabled: true,
      customerInputMarketingEnabled: true,
    },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DoctorNest";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("고객정보 입력", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  const columns: Array<{ header: string; key: string; width: number }> = [
    { header: "고객명*", key: "name", width: 22 },
    { header: "휴대폰번호*", key: "phone", width: 22 },
  ];
  if (hospital.customerInputCountryCodeEnabled) {
    columns.splice(1, 0, { header: "국가번호", key: "countryCode", width: 14 });
  }
  if (hospital.customerInputChartNumberEnabled) {
    columns.push({ header: "차트번호", key: "chartNumber", width: 24 });
  }
  if (hospital.customerInputVisitTypeEnabled) {
    columns.push({ header: "초진/재진", key: "visitType", width: 16 });
  }
  if (hospital.customerInputBirthDateEnabled) {
    columns.push({ header: "생년월일", key: "birthDate", width: 18 });
  }
  if (hospital.customerInputGenderEnabled) {
    columns.push({ header: "성별", key: "gender", width: 12 });
  }
  if (hospital.customerInputTreatmentTagEnabled) {
    columns.push({ header: "치료태그", key: "treatmentTags", width: 38 });
  }
  if (hospital.customerInputNationalityEnabled) {
    columns.push({ header: "국적", key: "nationality", width: 18 });
  }
  if (hospital.customerInputMarketingEnabled) {
    columns.push({
      header: "광고성메시지 수신여부",
      key: "marketingConsent",
      width: 24,
    });
  }
  worksheet.columns = columns;
  worksheet.addRow({
    name: "홍길동",
    countryCode: "+82",
    phone: "010-1234-5678",
    chartNumber: "",
    visitType: "초진",
    birthDate: "1990-01-01",
    gender: "남성",
    treatmentTags: "도수치료, 리프팅",
    nationality: "대한민국",
    marketingConsent: "미수신",
  });

  const headerRow = worksheet.getRow(1);
  headerRow.height = 24;
  headerRow.font = { bold: true, color: { argb: "FF30364B" } };
  headerRow.alignment = { vertical: "middle" };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF0F3FF" },
  };
  headerRow.eachCell((cell) => {
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFBFC9F6" } },
    };
  });

  worksheet.getColumn("phone").numFmt = "@";
  if (hospital.customerInputChartNumberEnabled) {
    worksheet.getColumn("chartNumber").numFmt = "@";
  }
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: worksheet.columnCount },
  };

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        "attachment; filename*=UTF-8''DoctorNest_%EA%B3%A0%EA%B0%9D%EC%A0%95%EB%B3%B4_%EC%96%91%EC%8B%9D.xlsx",
      "Cache-Control": "no-store",
    },
  });
}
