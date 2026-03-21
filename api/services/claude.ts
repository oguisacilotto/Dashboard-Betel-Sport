import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `Você é um analista de dados especialista para o Dashboard Betel Sport.
Analise qualquer documento e extraia informações estruturadas para um dashboard executivo.

RESPONDA APENAS com JSON válido, sem markdown, sem texto fora do JSON.

{
  "title": "Título descritivo da análise",
  "kpis": [
    { "label": "Nome", "value": "R$ 487K", "rawValue": 487000, "delta": "+12,4%", "deltaType": "up", "unit": "R$" }
  ],
  "insights": [
    {
      "id": 1,
      "title": "Título do insight",
      "description": "Descrição com dados concretos",
      "value": "Valor principal",
      "trend": "up",
      "trendValue": "+12%",
      "category": "financeiro"
    }
  ],
  "charts": [
    {
      "id": 1,
      "type": "bar",
      "title": "Título do gráfico",
      "description": "O que mostra",
      "visible": true,
      "insight_ref": 1,
      "data": [{ "label": "Série", "labels": ["Jan","Fev","Mar"], "values": [100,200,150] }]
    }
  ]
}

REGRAS:
- Exatamente 10 insights (id 1–10)
- Exatamente 10 gráficos: ids 1–4 com visible:true, ids 5–10 com visible:false
- Máximo 6 KPIs, os mais relevantes
- Tipos de gráfico adequados: séries temporais=line/area, distribuição=pie/donut, comparação=bar
- Valores monetários em formato BR (R$ 1.234,56), percentuais com vírgula (12,4%)
- Categories: financeiro|vendas|operacional|estoque|tendencia|alerta|destaque|meta|comparativo|previsao`;

export async function analyzeWithClaude(
  text: string,
  sourceType: string,
  imageBase64?: string
): Promise<any> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  // Use gemini-2.5-flash — current stable free tier model (March 2026)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.2,
    },
  });

  const prompt = `${SYSTEM_PROMPT}\n\nAnalise (tipo: ${sourceType}):\n\n${text.slice(0, 80000)}`;

  let result;

  if (imageBase64) {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeType   = imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
    result = await model.generateContent([
      prompt,
      { inlineData: { mimeType, data: base64Data } },
    ]);
  } else {
    result = await model.generateContent(prompt);
  }

  const raw = result.response.text()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  return JSON.parse(raw);
}
