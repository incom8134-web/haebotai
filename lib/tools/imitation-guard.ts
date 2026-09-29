// Pre-flight guard for the design and ad tools: refuse requests to copy a
// real brand's mark, make counterfeits, deepfake someone, depict a real
// public figure, or fake an endorsement (상표법·부정경쟁방지법, 초상권·
// 퍼블리시티권, 표시광고법). Naming a brand or person is fine on its own —
// a competitor field or "a clean, minimal logo" style note must pass —
// so each rule needs an intent word next to the name. This is a
// keyword layer in front of the model's own refusals, not a classifier.

export const IMITATION_GUARDED_TOOLS = new Set(["logo", "image", "brand-model", "copy", "sangsepage", "homepage"]);

const BRANDS = [
  "nike", "나이키", "adidas", "아디다스", "apple", "애플", "samsung", "삼성", "starbucks", "스타벅스", "coca-?cola", "코카콜라", "pepsi", "펩시",
  "mcdonald'?s", "맥도날드", "chanel", "샤넬", "gucci", "구찌", "louis vuitton", "루이비통", "hermes", "hermès", "에르메스", "prada", "프라다",
  "dior", "디올", "rolex", "롤렉스", "tiffany", "티파니", "supreme", "슈프림", "balenciaga", "발렌시아가", "disney", "디즈니", "marvel", "마블",
  "pixar", "픽사", "pok[eé]mon", "포켓몬", "hello kitty", "헬로키티", "sanrio", "산리오", "카카오프렌즈", "kakao friends", "춘식이",
  "naver", "네이버", "kakao", "카카오", "line friends", "라인프렌즈", "tosspayments", "토스뱅크", "배달의민족", "coupang", "쿠팡", "hyundai", "현대자동차",
  "lg전자", "올리브영", "olive young", "메가커피", "이디야", "파리바게뜨", "투썸플레이스", "ferrari", "페라리", "bmw", "mercedes", "벤츠",
  "tesla", "테슬라", "google", "구글", "microsoft", "마이크로소프트", "amazon", "아마존", "netflix", "넷플릭스", "youtube", "유튜브", "instagram",
  "인스타그램", "lego", "레고", "ikea", "이케아", "muji", "무인양품", "uniqlo", "유니클로", "zara", "h&m",
];

// Only names that don't double as everyday words (no 리사/지수/로제/제니).
const PEOPLE = [
  "bts", "방탄소년단", "blackpink", "블랙핑크", "뉴진스", "newjeans", "아이유", "iu", "손흥민", "김연아", "유재석",
  "이정재", "송강호", "마동석", "차은우", "카리나", "장원영", "임영웅", "taylor swift", "테일러 스위프트", "elon musk", "일론 머스크", "trump",
  "트럼프", "이재명", "윤석열", "문재인", "bill gates", "빌 게이츠", "mark zuckerberg", "저커버그", "beyonc[eé]", "비욘세",
];

// English terms match as whole words ("iu" must not hit "premium"); JS \b
// doesn't work for Hangul, which is why the Korean lists avoid short
// everyday words instead.
const term = (w: string) => {
  const body = w.replace(/\s+/g, "\\s*");
  return /^[a-z]/i.test(w) ? `\\b${body}\\b` : body;
};
const alt = (words: string[]) => words.map(term).join("|");
const BRAND = `(?:${alt(BRANDS)})`;
const PERSON = `(?:${alt(PEOPLE)})`;
const GENERIC_CELEB = `(?:연예인|유명인|아이돌|셀럽|정치인|${alt(["celebrity", "celeb", "famous person", "famous actor", "famous actress", "famous singer", "idol", "politician"])})`;

const DESIGN = `(?:로고|심볼|캐릭터|마스코트|디자인|패키지|포장|간판|브랜딩|${alt(["logo", "symbol", "emblem", "mascot", "character", "packaging", "trade ?dress", "branding"])})`;
const COPY_KO = "(?:똑같이|똑같은|그대로|복제|카피|베껴|베낀|모방|위조|도용|따라\\s*(?:만들|그려))";
const COPY_EN = alt(["copy", "clone", "replicate", "duplicate", "imitate", "imitation", "rip ?off", "trace"]);
const LIKENESS_KO = "(?:얼굴|닮은|닮게|처럼\\s*생긴|같이\\s*생긴|사진|초상|모델로|등장|합성)";
const LIKENESS_EN = alt(["face", "lookalike", "look-?alike", "looks? like", "portrait", "photo of", "featuring", "as (?:the )?model"]);
const ENDORSE_KO = "(?:추천|애용|사용하는|쓰는|광고\\s*모델|협찬|보증|인증한)";
const ENDORSE_EN = alt(["recommends?", "recommended", "endorsed?", "endorsement", "approved by", "uses", "used by", "favorite of"]);

const NEAR = "[^.!?\\n]{0,24}";

const RULES: { pattern: RegExp; reason: string }[] = [
  {
    pattern: new RegExp(`딥\\s*페이크|얼굴\\s*(?:합성|바꿔|교체)|${alt(["deep ?fake", "face ?swap"])}`, "i"),
    reason: "실존 인물의 얼굴을 합성하는 요청(딥페이크)은 지원하지 않습니다.",
  },
  {
    pattern: new RegExp(`짝퉁|레플리카|가품|이미테이션|${alt(["replica", "counterfeit", "knock-?off"])}|\\bfake\\s+${BRAND}`, "i"),
    reason: "가품·모조품을 위한 디자인은 지원하지 않습니다.",
  },
  {
    // Brand + design word + copy intent, in either language and order.
    pattern: new RegExp(`${BRAND}${NEAR}${DESIGN}${NEAR}(?:${COPY_KO}|${COPY_EN})|(?:${COPY_EN})${NEAR}${BRAND}${NEAR}${DESIGN}|(?:${COPY_KO}|${COPY_EN})${NEAR}${BRAND}${NEAR}${DESIGN}`, "i"),
    reason: "다른 브랜드의 로고·디자인을 그대로 따라 만드는 요청은 상표권 침해 우려가 있어 지원하지 않습니다. 원하는 느낌(예: 미니멀, 고급스러운)으로 설명해 주세요.",
  },
  {
    pattern: new RegExp(`(?:${PERSON}|${GENERIC_CELEB})[^.!?\\n]{0,16}(?:${LIKENESS_KO}|${LIKENESS_EN})|(?:${LIKENESS_EN})[^.!?\\n]{0,16}(?:${PERSON}|${GENERIC_CELEB})`, "i"),
    reason: "실존 인물(연예인·유명인 등)의 얼굴이나 닮은 모습은 초상권 문제로 만들 수 없습니다. 가상의 모델로 만들어 드려요.",
  },
  {
    pattern: new RegExp(`${PERSON}[^.!?\\n]{0,12}(?:${ENDORSE_KO}|${ENDORSE_EN})|(?:${ENDORSE_EN})[^.!?\\n]{0,8}${PERSON}`, "i"),
    reason: "실존 인물이 추천하거나 사용하는 것처럼 보이는 광고는 허위·과장 광고가 될 수 있어 지원하지 않습니다.",
  },
];

function inputText(input: Record<string, unknown>): string {
  return Object.values(input)
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .filter((v): v is string => typeof v === "string")
    .join("\n");
}

/** null when the request passes; otherwise the user-facing reason it was refused. */
export function checkImitation(toolId: string, input: Record<string, unknown>): string | null {
  if (!IMITATION_GUARDED_TOOLS.has(toolId)) return null;
  const text = inputText(input);
  if (!text) return null;
  for (const rule of RULES) if (rule.pattern.test(text)) return rule.reason;
  return null;
}
