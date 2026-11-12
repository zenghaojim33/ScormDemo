/**
 * 開發用「直達最終 Quiz」種子：偽造 iSpring 格式的 suspend_data
 * （LZString base64 JSON，lastViewedSlide = 課程最後一個 quiz slide）。
 * 注意：slide index 1 的 quiz 是課程開頭的 Declaration 合規聲明環節（提交後進入正課），
 * 真正的知識測驗是每門課最後一個 quiz（帶 grading 標記、passingScore 適用）。
 *
 * 由各課程包 res/index.html 內嵌 presInfo（zlib base64）解析生成：
 * - l  = 最後一個 quiz 的 slide 索引
 * - V  = 該課程全部 quiz slide 索引
 * - vh = 標記 l 之前的全部 slide 已看過（避免任何前置瀏覽限制）
 * iSpring 11.15 專用格式，換課程包/版本需重新解析生成。
 */
export const QUIZ_JUMP_SEEDS: Record<string, {firstQuizIndex: number; suspendData: string}> = {
  "什麼是通貨膨脹": {
    firstQuizIndex: 79,
    suspendData: "N4IgJiBcBsAMsBoQBsoHYCcSBuUDaAujgBb6IBMCAzAgCwICsC0CaCAHAlgIyLfcJulbjW71uTbi25tunblnIUB5SuRrkm5FuTblO5LFURUBVSlRpV6VJlRZU2VTlSy0BtSrRq16tJrQstGy0nLRYDIgMAgyUDDQM9AxMDCwMbAycDFhwzALQlND00EzQLNBs0JzQWGiIaAJolGg0aPRoTGgsaGxo7EQgAGr4Kn6I0K0YAwAOUAB2AK7IyEgAjlDAAL6bQA=",
  },
  "制訂理財計劃": {
    firstQuizIndex: 81,
    suspendData: "N4IgJiBcBsAMsBoQBsoA4CMSBuUDaAujgBb6IBMCAzAgCwICsC0CA7AmggJwIaIZYMlDDQz0MTDCwzsMnchSzlK5GuXrkm5FuXbl5PKoipYqlKjSr0qTKiyrsqPWolqVaNWvVpNaLWuy0nLQ8DIgMWAyUDDQM9AxMDCwM7AyccMxY0JTQNND00EzQLNDs0Ok8rIisWKyUrDSs9KxMrCys7Kw8aLBEIABq+IKGwZGVnJh9AA5QAHYArsjISACOUMAAvhtAA==",
  },
  "強積金「可扣稅自願性供款」(TVC)": {
    firstQuizIndex: 127,
    suspendData: "N4IgJiBcBsAMsBoQBsoEYBMB2JA3KA2gLp4AWhiGCAzAgCwICsC0COAHAgJwJqJppeVNLTQM0zNKzQ40nNDwyVBGKhloYGGZhlbYEGThh7VE1QdSrUG1ZtVbUc1TtR51EdQXSp1adBnTMdKx0OHScdDyMiIyCjFSMtIwMjMyMrIw4jJyMPHAsgtBU0LTQzNCs0DjQnNA8WIhYglhUWLRYDFjMWKxYOFicWDzsiOyC7FTstOwM7MzsrOwcnOw8XIhcglxUXLRcDFzMXDhcnFw8fPywgnzCsKKw4rCSsNKwsrDysBd8vAJ/whEf3EEj+0hkf3kCiE/AwN1UQlEmiEkl0JBAADVCBZSgdpNh0QAHKAAOwArshkEgAI5QYAAX3pQA===",
  },
  "待客承諾": {
    firstQuizIndex: 83,
    suspendData: "N4IgJiBcBsAMsBoQBsoA4DMSBuUDaAujgBb6IBMCWALAgKwLQIDsCaCAnAgIyLfc9K3LN1rcG3Jt3bcu5CgPKVyWcrXJNyrcu3JcMiDAIyUMWDLQwMMTDKwzsMXaomoDqNWtQbUm1VtTs1Fx0iHQCdJR0WHS0dAx0THSsdFxwjALQlNBY0LTQDNCs0OzQXMyIzALMlMxYzLTMDMxMzKzM7MxcaIhoAmjkRCAAavgC3No+UaVMmEMADlAAdgCuyMhIAI5QwAC+u0A",
  },
  "自願醫保計劃 (VHIS) 及 年金與逆按揭": {
    firstQuizIndex: 129,
    suspendData: "N4IgJiBcBsAMsBoQBsoEYBMBOJA3KA2gLp4AWhiGCAzAgCwICsC0CA7AgBwI5qJpoEmIbTQM0zNKzQc03NDgyVBGKhloYGGZhlYYOGbthqJqg6lWq1qDas2odq3ajjqI6gulTq06DOsx0rHQcdNx0OIyIjIKMVIwMjMyMrIwcjNyMOHAsgtBU0LTQDNCs0BzQ3NA4bIhsgmxUbLRsDGzMbKxsHGzcbDiciJyCnFSctJwMnMycrJwcnNycOFiIWIJYVFi0WAxYzFisWBxY3Fi8sIJ8VHyisOKwkrDSsLKw8rC8fEICPzdoojEP0kUh+8gUQiUkKuqkhok0kMkukhskMJBAADVCOZUkUnvwZJCsOiAA5QAB2AFdkMgkABHKDAAC+TKAA==",
  },
  "財務策劃工具 I (貨幣巿場工具及債務證券)": {
    firstQuizIndex: 63,
    suspendData: "N4IgJiBcBsAMsBoQBsrQMxIG5QNoF1sALPRAJgUwBYEBWBaBAdgQA4EBOBARkW+54VumbjW6NuLbu25cy5AWQplMZGmXplGZFmXZku6ROgHpM6GunrpG6FunbouVRFQFUKVajSr0qLKnYqLlpEWgFaClpMWhpaelpGWhZadlouOAYBaDJCEAA1PAFua09GDDyABygAOwBXZGQkAEcoYABfdqA===",
  },
  "財務策劃工具 II (股票)": {
    firstQuizIndex: 81,
    suspendData: "N4IgJiBcBsAMsBoQBsoA4CMSBuUDaAujgBb6IBMCAzAgCwICsC0CA7AmggJwIaIZYMlDDQz0MTDCwzsMnDD3IUs5SuRrl65JuRbl25HlURUsVSlRpV6VJlRZV2VTlR61EtSrRq16tJrQstOy0nLQ8DIgMWAyUDDQM9AxMDCwM7AycDDxwzFjQlNA00PTQTNAs0OzQPKyIrFislKw0rPSsTKwsrOysnKw8aLBEIABq+Cph+ZyYIwAOUAB2AK7IyEgAjlDAAL47QA=",
  },
  "財務策劃工具 III (衍生工具_地產_低變現能力投資_基金)": {
    firstQuizIndex: 77,
    suspendData: "N4IgJiBcBsAMsBoQBsoHY1IG5QNoF1sALPRAJgQGYEAWBAVgWgUwA4EBOBARkW+54Vu1bnW6Nuzbpm7tuXMuQplqZOmUZlmZTGXZkulRJQGUKlapTqVGlZpUyV2NRDQE0KNajTo1GNZhpMGmcuekR6AXoKemp6OnpGemZ6THp2OCYBaApoamg6aEZoZmhMaAyuNEQ0ATQKNGo0OjRGNGhCEAA1PAEyUzCqtE6ABygAOwBXZGQkAEcoYABfJaA===",
  },
  "資產增值基本法": {
    firstQuizIndex: 77,
    suspendData: "N4IgJiBcBsAMsBoQBsoHY1IG5QNoF1sALPRAJgQGYEAWBAVgWgUwA4EBOBARkW+54Vu1bnW6Nuzbpm7tuXMuQplqZOmUZlmZTGXZkulRJQGUKlapTqVGlTJXY1ENATQo1qNOjUY1mNTBpHLnpEegF6Cnpqejp6Rnpmekx6djgmAWgKaGpoOmhGaGZoTGg0rjRENAE0CjRqNEY0aEIQADU8ATJTZkoQiroMVoAHKAA7AFdkZCQARyhgAF9FoA",
  },
  "風險與回報": {
    firstQuizIndex: 137,
    suspendData: "N4IgJiBcBsAMsBoQBsoEYDMB2JA3KA2gLp4AWhiATAhggCwICsC0COAHAgJwJqJppe1TLwZpmaVmhxpOaHpSqDK1SrUoNKzSq0o5KnSjwyIMgjNQy0MDDMwysMnDDzqI6gutTq06DOsx0rHQ4dJx0PIyIjIKM1Iy0jAyMzIysjDiMnIw8cCyC0NTQtNAM0MzQONCcWIhYgljUWLRYDFjMWKxYOFg1POyI7ILs1Oy07AzszOys7Byc7DxciFyCXNRctFwMXMxcrFw4XJxcPHz8sIJ8wrC0fGKwUrAysHKwZ3y8Al/CIgJi4i+UmkXzk8iE/EoVxUQjuGiEEh0QhkBiEZxMvDMmOEVkxEgcJBAADVCOYqqxoGdYPixNhCQAHKAAOwArshkEgAI5QYAAX15QA==",
  },
};
