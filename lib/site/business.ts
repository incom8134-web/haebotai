// The operator's legal details, shown in the footer and the legal pages
// (/legal/terms, /legal/privacy, /legal/refund). Korean e-commerce law
// (전자상거래법 §10) and Toss Payments' merchant review require them on
// the site. Every empty value renders as "(등록 예정)" — fill them in
// here once and every page picks them up.

export const BUSINESS = {
  serviceName: "AI 해바",
  /** 상호 (법인명) */
  companyName: "지니에듀테크 주식회사",
  /** 대표자 */
  representative: "이성웅",
  representativeEn: "Lee Sung-woong",
  /** 사업자등록번호 (000-00-00000) */
  registrationNumber: "528-88-00923",
  /** 통신판매업 신고번호 (제0000-서울00-0000호) */
  mailOrderNumber: "",
  /** 사업장 주소 */
  address: "부산광역시 부산진구 엄광로 176, 317호 (가야동, 동의대학교 제1효민생활관)",
  /** 고객센터 전화 */
  phone: "051-331-0110",
  /** 고객센터·개인정보 문의 이메일 */
  email: "incom2794@naver.com",
  /** 개인정보 보호책임자 */
  privacyOfficer: { name: "이성웅", title: "대표이사", email: "incom2794@naver.com" },
  /** Supabase 프로젝트 리전 (데이터베이스·파일이 저장되는 곳), 예: "대한민국 서울 (ap-northeast-2)" */
  dataRegion: "대한민국 서울 (AWS ap-northeast-2)",
  /** 호스팅 서비스 제공자 (전자상거래법상 표시 사항) */
  hostingProvider: "Vercel Inc.",
  /** 약관·방침 시행일 */
  effectiveDate: "2026년 9월 29일",
} as const;

export const PENDING = "(등록 예정)";

/** A business field, or the pending marker when it hasn't been filled in. */
export const biz = (value: string) => value.trim() || PENDING;
