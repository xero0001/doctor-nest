import ExcelJS from "exceljs";

import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DoctorNest";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("고객정보 입력", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  worksheet.columns = [
    { header: "고객명*", key: "name", width: 22 },
    { header: "휴대폰번호*", key: "phone", width: 22 },
    { header: "치료태그", key: "treatmentTags", width: 38 },
    { header: "차트번호(선택)", key: "chartNumber", width: 24 },
  ];
  worksheet.addRow({
    name: "홍길동",
    phone: "010-1234-5678",
    treatmentTags: "도수치료, 리프팅",
    chartNumber: "",
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
  worksheet.getColumn("chartNumber").numFmt = "@";
  worksheet.autoFilter = "A1:D1";

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
