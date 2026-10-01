import type { StageContext } from "../types.ts";

// What the strategist is told about the shape of this tool's deliverable
// (moved from the v1 agent specs unchanged). The blueprint's parts mean
// different things per tool: chapters, slides, site sections, shots.

export function strategyNote(ctx: StageContext): string | undefined {
  switch (ctx.manifest.id) {
    case "presentation":
      return `[덱 조건] 슬라이드 수: ${String(ctx.input.slide_count ?? "도구 기본")}. 설계도의 각 부분은 슬라이드 한 장(또는 몇 장)이며, 장마다 주장 하나와 그 근거의 형식(사진, 차트, 표, 큰 숫자, 비교, 절차)을 notes에 적으세요.`;
    case "business-plan":
      return "[계획서 조건] 설계도의 각 부분은 계획서의 장(chapter)입니다. 이 심사자에게 필요 없는 분석(시장 규모 원, SWOT, 포지셔닝 맵 등)은 omit에 적으세요. 재무는 항상 포함하되 숫자는 서버가 가정으로 계산합니다.";
    case "homepage":
      return "[사이트 조건] 설계도의 각 부분은 사이트의 섹션이며, 순서는 방문자의 의사결정 순서입니다. notes에 그 섹션이 보여 줄 구체 내용과 형식(사진, 카드, 표, 지도, 폼, 3D 장면)을 적으세요. 첫 화면이 먼저 증명할 것과 3D·모션의 양(없음 포함)을 rubric에 넣으세요.";
    case "image":
    case "brand-model":
      return "[촬영 조건] 설계도의 각 부분은 사진 한 컷입니다. 컷마다 그 사진이 파는 것, 앵글·거리·빛·배경·소품·색감을 notes에 적으세요. 톤에 맞는 빛과 분위기(예: 격식이면 절제된 스튜디오광, 활기면 강한 색과 역동적 앵글)를 고르세요.";
    case "logo":
      return "[로고 조건] 설계도는 서로 확실히 다른 로고 방향 4개입니다(조형 방식이 달라야 함: 예 워드마크, 상징 심볼, 모노그램, 엠블럼, 캐릭터 중 이 브랜드에 맞는 것). 부분마다 상징의 출처(이름의 뜻, 제품, 장소, 이야기), 업종 관습을 따르는지 깨는지, 32px 파비콘과 단색에서 읽히는 이유를 notes에 적으세요. rubric에는 브랜드 성격 형용사와 피할 인상을 넣으세요.";
    default:
      return undefined;
  }
}
