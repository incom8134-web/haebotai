import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReport } from "./index.ts";
import { fmt, PRINT_THEME, renderChart, textWidth } from "./charts.ts";
import { reportBlocks } from "../export/document.ts";
import { chartTable } from "../export/markdown.ts";
import type { Report } from "./types.ts";

const SAMPLES: Record<string, { output: Record<string, unknown>; input?: Record<string, unknown> }> = {
  "business-plan": {
    output: {
      title: "달빛 딸기공방",
      one_liner: "퇴근길 직장인에게 당일 딸기 디저트를 예약 픽업으로 판다",
      sections: { summary: "요약", problem: "문제", solution: "해결", product: "제품", business_model: "모델", team: "팀" },
      market_analysis: {
        tam: { value_krw: 3.2e12, basis: "국내 디저트" },
        sam: { value_krw: 4.8e11, basis: "서울 수제" },
        som: { value_krw: 1.2e9, basis: "성동구" },
        size: "3.2조원",
        growth: "연 6%",
        cagr_pct: 6.1,
        trends: ["픽업 증가"],
        sources: [{ url: "https://kosis.kr/x", title: "통계" }],
      },
      competitor_matrix: [["회사", "가격"], ["우리", "6,500원"], ["A", "5,000원"]],
      positioning: { x_axis: "특별함", y_axis: "신선함", players: [{ name: "우리", x: 8, y: 8, is_us: true }, { name: "A", x: 3, y: 4, is_us: false }] },
      swot: { strengths: ["당일 딸기"], weaknesses: ["공간"], opportunities: ["픽업"], threats: ["원가"] },
      revenue_streams: [{ name: "조각", share_pct: 70, pricing: "6,500원" }, { name: "홀", share_pct: 30, pricing: "42,000원" }],
      financials: {
        yearly: [
          { year: "1년 차", revenue_krw: 84e6, cost_krw: 96e6, customers: 5000 },
          { year: "2년 차", revenue_krw: 210e6, cost_krw: 160e6, customers: 12000 },
          { year: "3년 차", revenue_krw: 390e6, cost_krw: 250e6, customers: 21000 },
        ],
        monthly_revenue_krw: [2, 3, 4, 5, 6, 7, 7, 8, 9, 10, 11, 12].map((x) => x * 1e6),
        assumptions: ["단가 6,500원"],
        breakeven_month: 7,
      },
      funding: { total_krw: 4e7, uses: [{ item: "설비", amount_krw: 2.5e7 }, { item: "마케팅", amount_krw: 1.5e7 }] },
      milestones: [{ period: "1분기", goal: "오픈", kpi: "일 30개" }],
      risks: [{ risk: "딸기 원가 상승", likelihood: 4, impact: 4, mitigation: "계약 재배" }],
    },
  },
  trend: {
    output: {
      summary: "구독이 낫다",
      recommended: "디저트 구독",
      signals: [{ signal: "픽업 증가", direction: "up", evidence: "기사" }],
      ideas: ["디저트 구독", "베이킹 클래스"].map((name, i) => ({
        name,
        one_liner: "한 줄",
        scores: { market_size: 6, growth: 8 - i, entry_barrier: 4, competition: 5, margin: 7, execution_difficulty: 5, capital_need: 4, personal_fit: 9 },
        composite: 7.8 - i,
        demand_trend: ["24 Q1", "24 Q2", "24 Q3", "24 Q4"].map((period, k) => ({ period, index: 40 + k * 10 })),
        target_customer: "직장인",
        entry_cost_krw: 3e6,
        price_gap: { band: "2~3만원", evidence: "근거" },
        differentiation_angles: ["a", "b", "c"],
        verdict: "하라",
        risks: ["유행"],
        sources: [],
      })),
    },
  },
  calendar: {
    input: { start_date: "2026-10-05" },
    output: {
      goal: "첫 매출 100만 원",
      north_star: { metric: "월 매출", unit: "원", baseline: 0, target: 1e6 },
      phases: [{ name: "준비", week_from: 1, week_to: 4, focus: "세팅" }, { name: "실행", week_from: 5, week_to: 13, focus: "판매" }],
      checkpoints: [{ week: 4, target: 1e5, review: "첫 주문" }, { week: 13, target: 1e6, review: "목표" }],
      weeks: Array.from({ length: 13 }, (_, w) => ({
        week_no: w + 1,
        milestone: `마일스톤 ${w + 1}`,
        tasks: [
          { day: 1, title: "사진 찍기", category: "콘텐츠·홍보", est_minutes: 60, done_criteria: "20장" },
          { day: 3, title: "견적", category: "영업·판매", est_minutes: 90, done_criteria: "2곳" },
        ],
      })),
    },
  },
  money: {
    output: {
      summary: "요약",
      models: [1, 2, 3].map((rank) => ({
        rank,
        name: `모델 ${rank}`,
        tagline: "한 줄",
        fit_reason: "이유",
        fit_cites: ["엑셀"],
        first_30_days: [{ day: 1, title: "등록" }],
        startup_cost_krw: rank * 1e6,
        cost_breakdown: [{ item: "장비", amount_krw: rank * 1e6 }],
        monthly_cost_krw: 1e5,
        monthly_revenue_krw: Array.from({ length: 12 }, (_, m) => (m + 1) * 2e5 * rank),
        unit_economics: { price_krw: 19000, unit_cost_krw: 3000, monthly_units_target: 30 },
        weekly_hours: 8,
        breakeven_months: rank + 2,
        difficulty: rank,
        skill_gaps: ["촬영"],
      })),
    },
  },
  keyword: {
    input: { primary_keyword: "성수 디저트" },
    output: {
      summary: "롱테일로 간다",
      tiers: {
        mega: [{ term: "성수 디저트", volume_band: "1만~3만", monthly_volume: 22000, competition: "높음", competition_score: 85, intent: "방문", best_use: "제목", data_source: "estimated" }],
        mid: [{ term: "성수 딸기 타르트", volume_band: "1천~5천", monthly_volume: 2400, competition: "중간", competition_score: 40, intent: "구매", best_use: "플레이스", data_source: "estimated" }],
        micro: [{ term: "성수역 디저트 포장", volume_band: "100~500", monthly_volume: 320, competition: "낮음", competition_score: 15, intent: "방문", best_use: "블로그", data_source: "measured" }],
      },
      combinations: ["성수 퇴근길 디저트"],
      content_gaps: [{ gap: "포장 가능 여부", suggested_topic: "포장 가이드", target_keyword: "성수 디저트 포장", priority: 1 }],
      placement: [{ spot: "플레이스 소개", keywords: ["성수 디저트"], example: "예시" }],
    },
  },
  place: {
    input: { business_name: "달빛 딸기공방", region: "성수동" },
    output: {
      audit: [{ area: "대표 사진", score: 40, current: "3장", fix: "20장" }, { area: "소개글", score: 70, current: "짧음", fix: "키워드" }],
      business_name_suggestions: ["a", "b", "c"],
      description_optimized: "성수동 수제 딸기 디저트",
      primary_keywords: ["성수 디저트"],
      menu_recommendations: ["세트"],
      competitor_benchmark: [{ name: "A", what_works: "사진", our_move: "촬영" }],
      photo_checklist: [{ shot: "타르트 단면", why: "클릭", priority: 1 }],
      review_response_templates: [{ situation: "칭찬", template: "감사합니다" }],
      weekly_ops_checklist: [{ day: "월", task: "소식", minutes: 15 }],
    },
  },
  proposal: {
    output: {
      cover: "간식 납품 제안",
      executive_summary: "요약입니다. 두 번째 문장.",
      problem: "문제",
      solution: "해결",
      expected_outcomes: [{ metric: "간식비", current: "월 60만 원", target: "월 50만 원" }],
      scope: { included: ["납품"], excluded: ["행사"] },
      execution_plan: ["계약"],
      timeline: [{ phase: "파일럿", weeks: 2, deliverable: "시식" }, { phase: "정식", weeks: 10, deliverable: "주 2회" }],
      pricing_table: [{ item: "간식", amount_krw: 500000 }, { item: "배송", amount_krw: 0 }],
      why_us: ["당일 제조"],
      company_intro: "소개",
    },
  },
  strategy: {
    output: {
      summary: "요약",
      market_insights: [{ insight: "픽업", implication: "예약", sources: [] }],
      segments: [{ name: "직장인", share_pct: 60, situation: "퇴근", need: "보상", current_alternative: "편의점", message: "수고했어요" }],
      positioning_axes: { x_axis: "특별함", y_axis: "신선함", our_x: 8, our_y: 9 },
      competitor_map: [{ name: "A", x: 3, y: 4, position: "대중", strength: "매장", weakness: "공장", our_angle: "당일" }],
      core_tension: "긴장",
      positioning_statement: "포지셔닝",
      promise: "약속",
      reasons_to_believe: ["당일 딸기"],
      offers: [{ name: "퇴근 세트", what: "타르트", price_idea: "8,000원", why_it_works: "보상" }],
      territories: [{ name: "퇴근 보상", idea: "아이디어", example_line: "오늘 고생했어요", channels: ["인스타"], first_content: "릴스" }],
      recommended_territory: "퇴근 보상",
      action_plan: [{ phase: "30일", goal: "오픈", tasks: ["촬영"] }],
      kpis: [{ metric: "예약 수", baseline: "0", target: "일 20건", how_to_measure: "카톡" }],
      risks: [{ risk: "원가", likelihood: 3, impact: 4, mitigation: "계약" }],
    },
  },
  grant: {
    output: {
      matches: [
        {
          program_name: "신사업창업사관학교",
          agency: "소진공",
          deadline: "2026년 11월 30일",
          deadline_date: "2026-11-30",
          funding_scale: "최대 4천만 원",
          max_amount_krw: 4e7,
          eligibility: [{ requirement: "예비창업", user_meets: true, note: "" }, { requirement: "교육 이수", user_meets: false, note: "신청 후" }],
          document_checklist: ["사업계획서"],
          difficulty: 3,
          source_url: "https://www.sbiz.or.kr/x",
        },
      ],
      unmatched_reasons: [],
    },
  },
  "idea-radar": {
    output: {
      summary: "간호 경력을 살린 보호자 대상 서비스가 가장 빠릅니다.",
      lens: "기술에서 바깥으로",
      ideas: ["보호자 상담", "간호 전자책", "요양원 워크숍", "건강 유튜브"].map((name, i) => ({
        name,
        one_liner: `${name} 한 줄`,
        archetype: ["service", "content", "b2b", "content"][i],
        customer: { who: "보호자", situation: "퇴원 직후" },
        problem: "무엇을 챙길지 모름",
        value_proposition: "2주 체크리스트",
        why_you: "병동 8년",
        revenue: { model: "상담", price_hint: "3만 원", potential_note: "월 100만 원(추정)" },
        mvp: "카카오 상담",
        resources: ["상담 예약 폼"],
        first_validation: { action: "맘카페 체크리스트", success_signal: "7일 20건", days: 7 },
        scores: { fit: 9 - i, demand: 7, speed: 8 - i, capital: 9, edge: 6 + (i % 2) },
        risks: ["의료 행위 오해"],
      })),
      recommendation: { pick: "보호자 상담", reason: "가장 빠름", runner_up: "간호 전자책" },
    },
  },
  "revenue-mapper": {
    output: {
      business_summary: "소그룹 필라테스",
      segments: [{ id: "s1", name: "직장인", pays_for: "퇴근 후 운동", willingness: "high" }],
      streams: [
        { name: "정기권", type: "subscription", segment_ids: ["s1"], what_they_get: "월 8회", price_model: "월정액", price_low_krw: 160000, price_high_krw: 200000, frequency: "매월", role: "core", effort: 3, weeks_to_first_revenue: 4, margin_note: "강사비" },
        { name: "체험", type: "one_time", segment_ids: ["s1"], what_they_get: "1회", price_model: "단건", price_low_krw: 20000, price_high_krw: 20000, frequency: "1회", role: "experimental", effort: 1, weeks_to_first_revenue: 1, margin_note: "" },
        { name: "1:1", type: "service", segment_ids: ["s1"], what_they_get: "자세 교정", price_model: "회당", price_low_krw: 60000, price_high_krw: 80000, frequency: "월 1회", role: "upsell", effort: 2, weeks_to_first_revenue: 6, margin_note: "" },
      ],
      ladder: [
        { step: "첫 계단", offer: "체험", price_krw: 20000, purpose: "신뢰" },
        { step: "핵심", offer: "정기권", price_krw: 180000, purpose: "반복" },
        { step: "프리미엄", offer: "1:1", price_krw: 70000, purpose: "업셀" },
      ],
      unit_economics: { price_krw: 180000, variable_cost_krw: 60000, acquisition_cost_krw: 40000, purchases_per_year: 10, retention_years: 1.5, notes: ["추정"] },
      recommended_mix: { start_with: "정기권", add_next: "1:1", avoid_for_now: ["온라인 강의"], reason: "공간 활용" },
      assumptions: ["재등록 60%"],
    },
  },
  "offer-architect": {
    output: {
      offer_name: "4주 인스타 자립반",
      headline: "하루 15분",
      subheadline: "사장님이 직접",
      positioning_line: "대행 대신 자립",
      target: { who: "동네 가게 사장님", situation: "무엇을 올릴지 모름", desired_outcome: "주 5회 게시" },
      core_promise: "4주 뒤 주 5회",
      value_stack: [{ item: "주간 과제", what_it_does: "습관", why_it_matters: "지속" }],
      packages: [
        { tier: "entry", name: "녹화", price_krw: 190000, includes: ["강의"], best_for: "혼자" },
        { tier: "core", name: "소그룹", price_krw: 390000, includes: ["4주"], best_for: "대부분" },
        { tier: "premium", name: "1:1", price_krw: 590000, includes: ["코칭"], best_for: "바쁜 분" },
      ],
      bonuses: [{ name: "템플릿", why: "시간 절약" }],
      guarantee: { type: "추가 코칭", terms: "과제 4회 제출 시", caution: "제출 확인" },
      urgency: { mechanism: "기수당 4명", honest_note: "실제 정원" },
      objections: [{ objection: "시간 없음", answer: "하루 15분" }],
      cta: { button: "자리 확인", microcopy: "4명 한정" },
      sales_message: { short: "짧게", long: "길게" },
    },
  },
  "market-gap": {
    output: {
      market_summary: "노견 돌봄",
      needs: [
        { id: "n1", need: "투약", who: "보호자", intensity: 5, evidence: "후기", origin: "search" },
        { id: "n2", need: "기저귀", who: "보호자", intensity: 4, evidence: "입력", origin: "user" },
      ],
      solutions: [
        { name: "펫호텔", kind: "direct", note: "", coverage: [{ need_id: "n1", level: 0 }, { need_id: "n2", level: 1 }] },
        { name: "펫시터", kind: "indirect", note: "", coverage: [{ need_id: "n1", level: 1 }] },
      ],
      gaps: [{ title: "투약 방문 돌봄", need_ids: ["n1"], why_unserved: "책임", opportunity: "간호 교육", differentiation: "수의 테크니션", confidence: "medium", origin: "hypothesis" }],
      validation_questions: [{ question: "월 문의 수?", ask_whom: "동물병원", signal: "월 5건 이상" }],
      sources: [{ url: "https://example.com/a", title: "후기" }],
    },
  },
  "mvp-blueprint": {
    output: {
      product_one_liner: "PT 예약",
      target_user: "회원",
      core_job: "예약 변경",
      features: [
        { name: "예약", description: "", priority: "must", effort: "S", reason: "핵심" },
        { name: "알림", description: "", priority: "should", effort: "M", reason: "편의" },
        { name: "AI 식단", description: "", priority: "later", effort: "L", reason: "나중" },
      ],
      journey: [{ moment: "discover", user_action: "QR", product_response: "예약 폼" }],
      stack: [{ layer: "예약", choice: "네이버 폼", why: "무료", alternative: "구글 폼", cost_note: "0원" }],
      stages: [
        { name: "조립", weeks: 2, goal: "예약", deliverables: ["폼"], exit_criteria: "테스트 5건" },
        { name: "시범", weeks: 2, goal: "20명", deliverables: ["운영"], exit_criteria: "60% 사용" },
        { name: "결제", weeks: 2, goal: "결제", deliverables: ["PG"], exit_criteria: "첫 결제" },
      ],
      launch_checklist: [{ item: "개인정보 처리방침", category: "legal" }],
      validation: { hypothesis: "앱으로 바꾼다", metric: "변경률", target: "60%", method: "시트" },
      out_of_scope: ["리뷰"],
    },
  },
  "brand-dna": {
    input: { brand_name: "온샘소아과" },
    output: {
      summary: "요약",
      essence: { one_line: "서두르지 않는 동네 소아과", purpose: "안심", promise: "충분한 설명" },
      archetype: { name: "돌보는 사람", why: "부모의 불안" },
      dimensions: { warmth: 9, expertise: 7, boldness: 2, playfulness: 3, premium: 4 },
      traits: [{ trait: "다정함", means: "이름을 부른다", not: "과한 애교" }],
      values: [{ value: "설명", in_practice: "5분 더" }],
      positioning: { statement: "저녁에도 설명하는 소아과", for_whom: "맞벌이", category: "소아과", difference: "저녁 진료", reasons_to_believe: ["저녁 9시까지"] },
      voice: { tone_words: ["다정한", "차분한", "명확한"], do: ["쉬운 말"], dont: ["전문용어 남발"], samples: [{ context: "공지", line: "오늘은 9시까지 봐요" }] },
      palette: [
        { name: "새벽 하늘", hex: "#3B6E8F", role: "primary", usage: "간판" },
        { name: "크림", hex: "fff8ee", role: "background", usage: "배경" },
        { name: "살구", hex: "#F2A477", role: "accent", usage: "버튼" },
        { name: "잘못된 값", hex: "blue", role: "neutral", usage: "" },
      ],
      typography: { heading: { family: "Gowun Dodum", weight: "400", why: "둥근" }, body: { family: "Noto Sans KR", weight: "400", why: "가독성" } },
      visual: { mood_words: ["포근한"], imagery: "자연광", shapes: "둥근 모서리", avoid: ["차가운 파랑"] },
      messaging: { taglines: ["a", "b", "c"], elevator_pitch: "소개", key_messages: ["m1", "m2"] },
      touchpoints: [{ touchpoint: "간판", apply: "크림 바탕" }],
    },
  },
  "hook-lab": {
    output: {
      summary: "요약",
      audience_insight: "산책 줄 당김이 가장 큰 스트레스",
      families: [
        { family: "contrarian", why_it_works: "통념" },
        { family: "number", why_it_works: "구체성" },
      ],
      hooks: [
        { family: "contrarian", text: "오래 걷는 게 답이 아니에요", on_screen: "산책 오래 X", first_scene: "멈춘 발", follow_line: "3분이 중요", strength: 8, variants: [{ platform: "reels", text: "r" }] },
        { family: "number", text: "3분만 바꾸세요", on_screen: "3분", first_scene: "타이머", follow_line: "이렇게", strength: 7, variants: [] },
      ],
      best: { text: "오래 걷는 게 답이 아니에요", reason: "통념" },
      avoid: ["꿀팁 공개"],
    },
  },
  "content-transformer": {
    output: {
      core_message: "러닝화는 발에 맞는지가 먼저",
      key_points: ["쿠션", "발볼"],
      versions: [
        { platform: "instagram_carousel", angle: "a", title: "t", body: "", slides: [{ heading: "h", text: "본문입니다" }], script: [], posts: [], hashtags: ["#러닝"], cta: "예약", note: "" },
        { platform: "shorts_script", angle: "b", title: "", body: "", slides: [], script: [{ time: "0-3", visual: "신발장", voice: "어느 쪽이 맞을까요" }], posts: [], hashtags: [], cta: "", note: "" },
        { platform: "kakao", angle: "c", title: "", body: "매장에서 무료 보행 분석을 받아 보세요.", slides: [], script: [], posts: [], hashtags: [], cta: "", note: "" },
      ],
      dropped: ["통계"],
    },
  },
  "sop-builder": {
    output: {
      summary: "요약",
      purpose: "주문을 당일 발송",
      scope: { starts_when: "9시", ends_when: "4시 집하", not_covered: ["반품"] },
      roles: [{ role: "사장", responsibility: "CS" }, { role: "알바", responsibility: "포장" }],
      steps: [
        { id: "s1", title: "주문 확인", role: "사장", type: "task", action: "확인", tools: "스마트스토어", output: "목록", minutes: 10, if_no: "" },
        { id: "s2", title: "옵션 맞나?", role: "알바", type: "decision", action: "대조", tools: "", output: "", minutes: 5, if_no: "사장에게 카톡" },
      ],
      quality_checks: [{ step_id: "s2", check: "라벨", standard: "사진 1장" }],
      exceptions: [{ situation: "재고 없음", response: "고객 연락", escalate_to: "사장" }],
      kpis: [{ metric: "오배송", target: "0건", how: "주간 집계" }],
      training_tips: ["첫날은 옆에서"],
    },
  },
  "meeting-action": {
    output: {
      title: "주간 회의",
      summary: "요약",
      decisions: [{ decision: "목요일 촬영", rationale: "사진 없음", owner: "민지" }],
      actions: [
        { task: "작가 섭외", owner: "준호", due: "", due_note: "마감 정하기 필요", priority: "high", done_when: "확정", from_note: "준호가 섭외" },
        { task: "수수료 조사", owner: "소라", due: "2026-10-13", due_note: "", priority: "medium", done_when: "표", from_note: "화요일까지" },
      ],
      open_questions: [{ question: "배달앱?", who_answers: "소라" }],
      risks: [],
      next_agenda: ["배달앱 결정"],
      follow_up_message: "정리",
    },
  },
  "market-desk": {
    output: {
      summary: "요약",
      decision: "시범 운영할지",
      questions: [{ id: "q1", question: "수요?", why: "결정 근거" }],
      assumptions: [{ assumption: "투약 수요", status: "partly", risk_if_wrong: "수요 없음" }, { assumption: "가격", status: "verified", risk_if_wrong: "" }],
      evidence: [
        { question_id: "q1", finding: "펫시터 1회 3~5만 원", figure: "3~5만 원", origin: "search", confidence: "medium", source_title: "기사" },
        { question_id: "q1", finding: "투약 거절 사례", figure: "", origin: "hypothesis", confidence: "low", source_title: "" },
      ],
      market_size: { estimate: "연 300억 원", method: "가구 × 비율 × 지출", origin: "hypothesis" },
      implications: ["2개 구 시범"],
      next_checks: [{ check: "병원 문의", how: "전화", cost: "1일" }],
      sources: [{ url: "https://example.com/n", title: "기사" }],
    },
  },
  "competitor-lens": {
    output: {
      summary: "요약",
      axes: { x: "가격", y: "맞춤도" },
      us: { x: 5, y: 8, position: "중간 가격, 높은 맞춤도" },
      competitors: [
        { name: "A짐", positioning: "저가", price: "월 9만", strengths: ["싸다"], weaknesses: ["대형"], x: 2, y: 3, origin: "search" },
        { name: "B스튜디오", positioning: "고가", price: "월 30만", strengths: ["1:1"], weaknesses: ["비쌈"], x: 9, y: 9, origin: "user" },
      ],
      matrix: [{ criterion: "회당 가격", scores: [{ name: "우리", score: 4, note: "" }, { name: "A짐", score: 5, note: "" }, { name: "B스튜디오", score: 2, note: "" }] }],
      opportunities: [{ title: "21시 수업", gap: "없음", move: "개설", risk: "강사" }],
      sources: [],
    },
  },
  "persona-mapper": {
    output: {
      summary: "요약",
      personas: [{ name: "서윤 엄마", age_range: "30대 후반", situation: "맞벌이", quote: "퇴근하면 접수 끝", goals: ["빨리"], frustrations: ["대기"], triggers: ["열"], objections: ["멀다"], channels: ["맘카페"], decision_factors: [{ factor: "진료 시간", weight: 5 }] }],
      journey: [
        { stage: "aware", doing: "검색", thinking: "어디", feeling: 0, touchpoints: ["네이버"], opportunity: "지도" },
        { stage: "consider", doing: "비교", thinking: "대기?", feeling: -1, touchpoints: ["맘카페"], opportunity: "대기 안내" },
        { stage: "decide", doing: "예약", thinking: "다행", feeling: 1, touchpoints: ["전화"], opportunity: "앱 예약" },
      ],
      messaging: [{ stage: "consider", message: "저녁 9시까지" }],
      data_basis: "추론",
    },
  },
  "insight-miner": {
    output: {
      summary: "배송이 가장 큰 불만",
      items_read: 10,
      themes: [
        { name: "배송 지연", kind: "complaint", description: "늦음", mentions: 3, positive: 0, negative: 3, neutral: 0, quotes: ["주문하고 5일 걸렸어요"] },
        { name: "포장", kind: "praise", description: "고급", mentions: 2, positive: 2, negative: 0, neutral: 0, quotes: ["포장이 고급스러워서 선물용으로 딱이에요"] },
      ],
      opportunities: [{ title: "날짜 지정", based_on: "배송 지연", action: "옵션 추가", effort: "M" }],
      caveats: ["10건"],
    },
  },
};

function charts(report: Report) {
  return report.sections.flatMap((s) => s.blocks.flatMap((b) => (b.type === "chart" ? [b.chart] : [])));
}

for (const [tool, { output, input }] of Object.entries(SAMPLES)) {
  test(`${tool}: builds a report with its own charts, all drawable at phone and PC width`, () => {
    const report = buildReport(tool, output, input);
    assert.ok(report, "report");
    assert.ok(report.sections.length >= 2);
    assert.ok(report.hero.title);
    const specs = charts(report);
    assert.ok(specs.length >= 1, "at least one chart");
    for (const spec of specs) {
      for (const width of [340, 680]) {
        const svg = renderChart(spec, { width, palette: report.palette, theme: PRINT_THEME });
        assert.match(svg, /^<svg[^>]+viewBox/, `${tool} ${spec.kind} @${width}`);
        assert.doesNotMatch(svg, /NaN|undefined|Infinity/, `${tool} ${spec.kind} @${width}`);
      }
      assert.ok(chartTable(spec), `${tool} ${spec.kind} has a data table for markdown`);
    }
    const { blocks } = reportBlocks(report);
    assert.ok(blocks.some((b) => b.type === "chart" || b.type === "table"));
  });

  test(`${tool}: an empty or half-filled output never throws`, () => {
    assert.doesNotThrow(() => buildReport(tool, {}, {}));
    const partial = Object.fromEntries(Object.entries(output).slice(0, 2));
    assert.doesNotThrow(() => buildReport(tool, partial, input));
  });
}

test("each tool has its own look: different accent colors and chart kinds", () => {
  const reports = Object.entries(SAMPLES).map(([tool, s]) => buildReport(tool, s.output, s.input)!);
  assert.equal(new Set(reports.map((r) => r.palette[0])).size, reports.length);
  const kinds = reports.map((r) => charts(r).map((c) => c.kind).sort().join(","));
  assert.equal(new Set(kinds).size, kinds.length, `no two tools share the same chart mix: ${Object.keys(SAMPLES).map((t, i) => `${t}=${kinds[i]}`).join(" ")}`);
});

test("a business plan saved before the richer schema still renders its P&L", () => {
  const legacy = {
    sections: { summary: "요약", team: "팀", product: "제품" },
    market_analysis: { size: "1000억", growth: "10%", sources: [] },
    competitor_matrix: [["구분", "가격"], ["A사", "1만원"]],
    financials: { pl_3yr: [[1, 2, 3]], assumptions: ["a"], breakeven_month: 14 },
  };
  const report = buildReport("business-plan", legacy)!;
  const tables = report.sections.flatMap((s) => s.blocks.filter((b) => b.type === "table"));
  assert.ok(tables.length >= 2);
});

test("business plan profit is recomputed from revenue and cost, not trusted", () => {
  const report = buildReport("business-plan", SAMPLES["business-plan"].output)!;
  const pl = report.sections.flatMap((s) => s.blocks).find((b) => b.type === "table" && b.title === "추정 손익");
  assert.ok(pl && pl.type === "table");
  assert.deepEqual(pl.rows[2], ["영업이익", "-1,200만원", "5,000만원", "1.4억원"]);
});

test("labels from model output are escaped in the SVG", () => {
  const svg = renderChart({ kind: "bar", categories: ['<script>alert("x")</script>'], series: [{ name: "a", values: [1] }] }, { width: 680, palette: ["#000000"], theme: PRINT_THEME });
  assert.doesNotMatch(svg, /<script>/);
});

test("won amounts read in Korean units", () => {
  assert.equal(fmt(390_000_000, "원"), "3.9억원");
  assert.equal(fmt(12_000_000, "원"), "1,200만원");
  assert.equal(fmt(6500, "원"), "6,500원");
  assert.equal(fmt(-12_000_000, "원"), "-1,200만원");
  assert.equal(fmt(22000), "22,000");
  assert.ok(textWidth("가나다", 10) > textWidth("abc", 10));
});

test("deck slides carry their layout data into charts, tables and tiles", async () => {
  const { deckBlocks } = await import("../export/document.ts");
  const { deckChartSpec } = await import("./deck.ts");
  const bar = deckChartSpec({ kind: "bar", unit: "원", categories: ["평일", "주말"], series: [{ name: "매출", values: [120, 340] }] });
  assert.equal(bar?.kind, "bar");
  const donut = deckChartSpec({ kind: "donut", categories: ["A", "B"], series: [{ name: "비중", values: [70, 30] }] });
  assert.equal(donut?.kind, "donut");
  assert.equal(deckChartSpec({ kind: "bar", categories: [], series: [] }), null);
  const blocks = deckBlocks({
    title: "덱",
    slides: [
      { layout: "big_number", headline: "하루 4만 명", points: ["a"], stat: { value: "4만 명", label: "퇴근 인구", context: "성수역" } },
      { layout: "chart", headline: "주말에 몰린다", points: [], chart: { kind: "bar", unit: "%", categories: ["평일", "주말"], series: [{ name: "비중", values: [30, 70] }], source: "estimate", takeaway: "평일이 빈다" } },
      { layout: "table", headline: "비교", points: [], table: { header: ["항목", "우리"], rows: [["가격", "6,500원"]] } },
      { layout: "comparison", headline: "전후", points: [], compare: { left_title: "지금", left_points: ["대기"], right_title: "앞으로", right_points: ["예약"] } },
      { layout: "quote", headline: "고객", points: [], quote: { text: "늘 품절이에요", source: "단골" } },
    ],
    closing_ask: "3,000만 원",
  });
  const types = blocks.map((b) => b.type);
  assert.ok(types.includes("kpis") && types.includes("chart") && types.includes("table") && types.includes("callout"));
  const chart = blocks.find((b) => b.type === "chart");
  assert.ok(chart && chart.type === "chart" && chart.estimated);
});

test("a business plan with chapters follows them, with analysis placed where a chapter asked", () => {
  const plan = {
    title: "브런치 카페",
    one_liner: "요약",
    plan_type: "대출 심사용",
    chapters: [
      { title: "1. 사업 개요", purpose: "작성자용 메모", body: "개요 본문" },
      { title: "2. 자금 계획", purpose: "p", body: "자금 본문", data: "funding" },
      { title: "3. 상환 능력", purpose: "p", body: "상환 본문", data: "financials" },
    ],
    funding: { total_krw: 50_000_000, uses: [{ item: "보증금", amount_krw: 15_000_000 }, { item: "인테리어", amount_krw: 35_000_000 }] },
    financials: { yearly: [{ year: "1년 차", revenue_krw: 3e8, cost_krw: 2e8, customers: 0 }, { year: "2년 차", revenue_krw: 3.2e8, cost_krw: 2.1e8, customers: 0 }, { year: "3년 차", revenue_krw: 3.4e8, cost_krw: 2.2e8, customers: 0 }], monthly_revenue_krw: Array(12).fill(25e6), assumptions: ["a"], breakeven_month: 4 },
  };
  const ids = buildReport("business-plan", plan)!.sections.map((s) => s.id);
  assert.deepEqual(ids, ["one-liner", "chapter-1", "chapter-2", "funding", "chapter-3", "financials"]);
  const report = buildReport("business-plan", plan)!;
  const first = report.sections.find((s) => s.id === "chapter-1")!;
  assert.equal(first.title, "사업 개요", "readers see the chapter title, not the writer's purpose note");
  assert.ok(!report.sections.some((s) => s.id === "market" || s.id === "competition"), "analysis the plan left out stays out");
});

test("every chart carries a text alternative", () => {
  const svg = renderChart({ kind: "donut", slices: [{ label: "구독", value: 60 }, { label: "<워크숍>", value: 40 }], unit: "%" }, { width: 340, palette: ["#000"], theme: PRINT_THEME });
  assert.match(svg, /<svg[^>]*role="img"><title>비율 그래프: 구독 60%, &lt;워크숍&gt; 40%<\/title>/);
});
