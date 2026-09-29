import { test } from "node:test";
import assert from "node:assert/strict";
import { checkImitation } from "./imitation-guard.ts";

const blocked = (toolId: string, input: Record<string, unknown>) => assert.notEqual(checkImitation(toolId, input), null, JSON.stringify(input));
const allowed = (toolId: string, input: Record<string, unknown>) => assert.equal(checkImitation(toolId, input), null, JSON.stringify(input));

test("blocks copying a real brand's mark", () => {
  blocked("logo", { brand_name: "별다방", keywords: ["스타벅스 로고 그대로"] });
  blocked("logo", { brand_name: "Swoosh", keywords: ["나이키 로고 똑같이"] });
  blocked("image", { description: "copy the Apple logo onto my product" });
  blocked("sangsepage", { product_name: "샤넬 디자인 베낀 가방" });
});

test("blocks counterfeits and deepfakes", () => {
  blocked("image", { description: "구찌 짝퉁 가방 광고 이미지" });
  blocked("copy", { offer: "replica Rolex watches at low prices" });
  blocked("image", { description: "내 사진에 연예인 얼굴 합성" });
  blocked("brand-model", { note: "deepfake of a singer" });
});

test("blocks real people's likeness and fake endorsements", () => {
  blocked("image", { description: "아이유 닮은 모델이 들고 있는 컷" });
  blocked("image", { description: "a celebrity lookalike holding the bottle" });
  blocked("copy", { offer: "손흥민이 추천하는 단백질 쉐이크" });
  blocked("copy", { offer: "Recommended by Elon Musk: our new battery pack" });
});

test("allows ordinary briefs that merely mention brands or people", () => {
  allowed("logo", { brand_name: "애플나무 과수원", keywords: ["사과", "자연", "따뜻함"] });
  allowed("logo", { brand_name: "카페 온도", keywords: ["미니멀", "고급스러운"] });
  allowed("sangsepage", { product_name: "무선 이어폰", competitor: "삼성 갤럭시 버즈" });
  allowed("copy", { offer: "BTS 팬을 위한 굿즈 보관함 출시", audience: "20대 여성" });
  allowed("image", { description: "30대 여성 모델이 카페에서 커피를 마시는 장면" });
  allowed("homepage", { business: "부산 해운대 네일샵, 인스타그램 링크 포함" });
});

test("only guards the design and ad tools", () => {
  allowed("strategy", { market: "나이키 로고 그대로 분석" });
  allowed("blog", { topic: "딥페이크 범죄 예방 방법" });
});

test("everyday words that contain a name don't trip the guard", () => {
  allowed("image", { description: "premium 모델로 촬영한 느낌의 제품 사진" });
  allowed("image", { description: "로제 파스타 사진, 따뜻한 조명" });
  allowed("image", { description: "요리 배우기 클래스 홍보 사진" });
  allowed("copy", { offer: "갓 구운 토스트를 그대로 담았어요" });
  allowed("copy", { offer: "애플망고 원물을 그대로 담은 주스" });
  allowed("copy", { offer: "Nike-style punchy ad copy for our running socks" });
  allowed("sangsepage", { product_name: "리사이클 소재 에코백", features: ["지수 높은 만족도"] });
});
