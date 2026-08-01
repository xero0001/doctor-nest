import ExcelJS from "exceljs";

import { getCurrentUser } from "@/lib/auth";
import {
  MAX_PATIENT_IMPORT_ROWS,
  type PatientUpsertInput,
  upsertPatients,
} from "@/lib/patients";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function cellText(cell: ExcelJS.Cell) {
  if (cell.value === null || cell.value === undefined) return "";
  if (typeof cell.value === "object" && "text" in cell.value) {
    return String(cell.value.text).trim();
  }
  return cell.text.trim();
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return Response.json(
      { error: "업로드할 엑셀 파일을 선택해 주세요." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return Response.json(
      { error: "엑셀 파일은 5MB 이하만 업로드할 수 있습니다." },
      { status: 400 },
    );
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return Response.json(
      { error: "DoctorNest 엑셀 양식(.xlsx)을 업로드해 주세요." },
      { status: 400 },
    );
  }

  try {
    const workbook = new ExcelJS.Workbook();
    const fileBuffer = Buffer.from(
      await file.arrayBuffer(),
    ) as unknown as Parameters<typeof workbook.xlsx.load>[0];
    await workbook.xlsx.load(fileBuffer);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new Error("엑셀 파일에서 고객정보 시트를 찾을 수 없습니다.");
    }

    const headers = new Map<string, number>();
    worksheet.getRow(1).eachCell((cell, columnNumber) => {
      headers.set(cellText(cell).replace(/\s|\*/g, ""), columnNumber);
    });

    const nameColumn = headers.get("고객명");
    const phoneColumn = headers.get("휴대폰번호");
    const countryCodeColumn = headers.get("국가번호");
    const tagsColumn = headers.get("치료태그");
    const chartNumberColumn =
      headers.get("차트번호") ?? headers.get("차트번호(선택)");
    const visitTypeColumn = headers.get("초진/재진");
    const birthDateColumn = headers.get("생년월일");
    const genderColumn = headers.get("성별");
    const nationalityColumn = headers.get("국적");
    const marketingColumn = headers.get("광고성메시지수신여부");

    if (!nameColumn || !phoneColumn) {
      throw new Error("엑셀 첫 행에 ‘고객명*’, ‘휴대폰번호*’ 열이 필요합니다.");
    }

    const patients: PatientUpsertInput[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const name = cellText(row.getCell(nameColumn));
      const phone = cellText(row.getCell(phoneColumn));
      const phoneCountryCode = countryCodeColumn
        ? cellText(row.getCell(countryCodeColumn))
        : "+82";
      const treatmentTags = tagsColumn
        ? cellText(row.getCell(tagsColumn)).split(/[,，]/)
        : [];
      const chartNumber = chartNumberColumn
        ? cellText(row.getCell(chartNumberColumn))
        : "";
      const visitTypeText = visitTypeColumn
        ? cellText(row.getCell(visitTypeColumn))
        : "";
      const genderText = genderColumn
        ? cellText(row.getCell(genderColumn))
        : "";
      const marketingText = marketingColumn
        ? cellText(row.getCell(marketingColumn)).toLowerCase()
        : "";

      if (!name && !phone && treatmentTags.every((tag) => !tag.trim())) return;
      patients.push({
        name,
        phone,
        phoneCountryCode:
          phoneCountryCode as PatientUpsertInput["phoneCountryCode"],
        treatmentTags,
        chartNumber,
        visitType:
          visitTypeText === "초진"
            ? "NEW"
            : visitTypeText === "재진"
              ? "RETURNING"
              : "",
        birthDate: birthDateColumn
          ? cellText(row.getCell(birthDateColumn))
          : "",
        gender:
          genderText === "남성"
            ? "MALE"
            : genderText === "여성"
              ? "FEMALE"
              : genderText === "기타"
                ? "OTHER"
                : "",
        nationality: nationalityColumn
          ? cellText(row.getCell(nationalityColumn))
          : "",
        marketingConsent: ["수신", "동의", "yes", "y", "true", "1"].includes(
          marketingText,
        ),
      });
    });

    if (patients.length > MAX_PATIENT_IMPORT_ROWS) {
      throw new Error(
        `한 번에 최대 ${MAX_PATIENT_IMPORT_ROWS.toLocaleString("ko-KR")}명까지 업로드할 수 있습니다.`,
      );
    }

    const savedPatients = await upsertPatients(user.hospitalId, patients, {
      modifiedById: user.id,
      modifiedByName: user.name,
      historySource: "EXCEL_IMPORT",
    });

    return Response.json({ savedCount: savedPatients.length });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "엑셀 고객정보를 불러오지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
