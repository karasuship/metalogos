export type CategoryId =
  | "travel"        // 旅費交通費
  | "communication" // 通信費
  | "supplies"      // 消耗品費
  | "outsourcing"   // 外注費
  | "rent"          // 地代家賃
  | "entertainment" // 接待交際費
  | "books"         // 新聞図書費
  | "advertising"   // 広告宣伝費
  | "utilities"     // 水道光熱費
  | "equipment"     // 工具器具備品（減価償却対象）
  | "insurance"     // 損害保険料
  | "tax_dues"      // 租税公課
  | "welfare"       // 福利厚生費
  | "wages"         // 給料賃金
  | "miscellaneous" // 雑費
  | "income"        // 売上・収入
  | "unknown";      // 未分類

export const CATEGORIES: Record<CategoryId, { label: string; description: string; deductible: boolean }> = {
  travel:        { label: "旅費交通費",   description: "電車・バス・タクシー・高速・駐車場",    deductible: true },
  communication: { label: "通信費",       description: "携帯・インターネット・切手・宅配",        deductible: true },
  supplies:      { label: "消耗品費",     description: "文具・梱包材・10万円未満のPC周辺機器",   deductible: true },
  outsourcing:   { label: "外注費",       description: "フリーランスへの業務委託・デザイン費",    deductible: true },
  rent:          { label: "地代家賃",     description: "事務所家賃・コワーキングスペース",        deductible: true },
  entertainment: { label: "接待交際費",   description: "取引先との飲食・贈答品",                 deductible: true },
  books:         { label: "新聞図書費",   description: "書籍・雑誌・サブスクリプション（学習系）", deductible: true },
  advertising:   { label: "広告宣伝費",   description: "SNS広告・チラシ・サーバー費・ドメイン", deductible: true },
  utilities:     { label: "水道光熱費",   description: "電気・ガス・水道（按分が必要）",          deductible: true },
  equipment:     { label: "工具器具備品", description: "10万円以上のPC・カメラ（減価償却対象）",  deductible: true },
  insurance:     { label: "損害保険料",   description: "事業用の火災保険・賠償保険",              deductible: true },
  tax_dues:      { label: "租税公課",     description: "事業税・固定資産税・印紙税",              deductible: true },
  welfare:       { label: "福利厚生費",   description: "従業員向けの費用",                       deductible: true },
  wages:         { label: "給料賃金",     description: "従業員・アルバイトへの給与",              deductible: true },
  miscellaneous: { label: "雑費",         description: "上記に当てはまらない事業経費",             deductible: true },
  income:        { label: "売上・収入",   description: "事業収入・報酬",                          deductible: false },
  unknown:       { label: "未分類",       description: "自動判定できなかった項目",                 deductible: false },
};

// キーワードベースの自動判定ルール
const RULES: Array<{ category: CategoryId; keywords: string[]; amountRange?: [number, number] }> = [
  // 旅費交通費
  { category: "travel", keywords: ["スイカ", "suica", "pasmo", "パスモ", "電車", "バス", "タクシー", "新幹線", "jr", "東京メトロ", "都営", "高速", "etcマイレージ", "駐車", "駐輪"] },
  // 通信費
  { category: "communication", keywords: ["docomo", "au", "softbank", "楽天モバイル", "iij", "nuro", "ntt", "インターネット", "wi-fi", "光", "通信", "切手", "郵便", "ヤマト", "佐川", "fedex", "dhl", "クロネコ"] },
  // 消耗品費
  { category: "supplies", keywords: ["文具", "コクヨ", "ロフト", "東急ハンズ", "ハンズ", "100均", "ダイソー", "セリア", "ヨドバシ", "ビックカメラ", "ヨドバシカメラ", "amazon", "アマゾン", "梱包"] },
  // 地代家賃
  { category: "rent", keywords: ["家賃", "賃料", "コワーキング", "テレワーク", "シェアオフィス", "ウィーワーク", "wework", "リージャス"] },
  // 接待交際費
  { category: "entertainment", keywords: ["接待", "会食", "居酒屋", "レストラン", "ランチ", "ディナー", "贈答", "お中元", "お歳暮"] },
  // 新聞図書費
  { category: "books", keywords: ["書籍", "本", "amazon kindle", "kindle", "udemy", "coursera", "日経", "朝日", "nikkei", "本屋", "書店", "図書", "雑誌", "マガジン"] },
  // 広告宣伝費
  { category: "advertising", keywords: ["広告", "google ads", "meta ads", "facebook広告", "twitter広告", "x広告", "チラシ", "名刺", "さくら", "xserver", "conoha", "vercel", "netlify", "ドメイン", "cloudflare"] },
  // 水道光熱費
  { category: "utilities", keywords: ["東京電力", "関西電力", "中部電力", "電力", "ガス", "水道", "東京ガス", "大阪ガス"] },
  // 外注費
  { category: "outsourcing", keywords: ["外注", "業務委託", "制作費", "デザイン", "ランサーズ", "クラウドワークス"] },
  // 損害保険
  { category: "insurance", keywords: ["保険料", "損害保険", "火災保険", "賠償保険"] },
  // 租税公課
  { category: "tax_dues", keywords: ["事業税", "固定資産税", "印紙", "登録免許税", "収入印紙"] },
  // 収入
  { category: "income", keywords: ["売上", "報酬", "収入", "請求書", "入金"] },
];

export function detectCategory(text: string, amount?: number): CategoryId {
  const lower = text.toLowerCase();

  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        if (rule.amountRange && amount !== undefined) {
          const [min, max] = rule.amountRange;
          if (amount < min || amount > max) continue;
        }
        return rule.category;
      }
    }
  }

  // 金額で補助判定（10万円以上は備品候補）
  if (amount !== undefined && amount >= 100000) {
    return "equipment";
  }

  return "unknown";
}
