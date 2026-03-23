import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `Você é um analista de dados especialista para o Dashboard Betel Sport.
Analise qualquer documento e extraia informações estruturadas para um dashboard executivo.

RESPONDA APENAS com JSON válido, sem markdown, sem texto fora do JSON.
MUITO IMPORTANTE: O JSON deve estar COMPLETO e bem formado. Não truncar nunca.

{
  "title": "Título descritivo da análise",
  "kpis": [
    { "label": "Nome", "value": "R$ 487K", "rawValue": 487000, "delta": "+12,4%", "deltaType": "up", "unit": "R$" }
  ],
  "insights": [
    {
      "id": 1,
      "title": "Título do insight",
      "description": "Descrição objetiva em no máximo 120 caracteres",
      "value": "Valor",
      "trend": "up",
      "trendValue": "+12%",
      "category": "financeiro"
    }
  ],
  "charts": [
    {
      "id": 1,
      "type": "bar",
      "title": "Título",
      "description": "O que mostra",
      "visible": true,
      "insight_ref": 1,
      "data": [{ "label": "Série", "labels": ["Jan","Fev","Mar"], "values": [100,200,150] }]
    }
  ]
}

REGRAS OBRIGATÓRIAS:
- Exatamente 10 insights (id 1–10). Descrições CURTAS: máximo 120 caracteres cada
- Exatamente 10 gráficos: ids 1–4 visible:true, ids 5–10 visible:false
- Máximo 4 KPIs (reduzido para caber no limite)
- Tipos de gráfico: séries temporais=line/area, distribuição=pie/donut, comparação=bar
- Cada gráfico: máximo 3 séries de dados, máximo 6 pontos por série
- Valores monetários em formato BR (R$ 1.234,56)
- Categories: financeiro|vendas|operacional|estoque|tendencia|alerta|destaque|meta|comparativo|previsao
- NUNCA deixar o JSON incompleto. Se o conteúdo for muito grande, simplifique os dados mas complete o JSON`;

export async function analyzeWithClaude(
  text: string,
  sourceType: string,
  imageBase64?: string
): Promise<any> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      maxOutputTokens: 65536, // aumentado para 64K — suficiente para qualquer resposta
      temperature: 0.1,       // mais determinístico = menos verboso = menos truncamento
    },
  });

  // Limitar texto de entrada para deixar espaço na saída
  const maxInput = 40000;
  const truncatedText = text.length > maxInput
    ? text.slice(0, maxInput) + '\n\n[... documento truncado para análise ...]'
    : text;

  const prompt = `${SYSTEM_PROMPT}\n\nAnalise (tipo: ${sourceType}):\n\n${truncatedText}`;

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

  let raw = result.response.text()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  // Tentar reparar JSON truncado antes de jogar erro
  try {
    return JSON.parse(raw);
  } catch {
    // Tentar fechar JSON incompleto
    raw = repairJson(raw);
    try {
      return JSON.parse(raw);
    } catch (e2) {
      throw new Error(`Gemini retornou JSON inválido. Tente novamente com um documento menor. Detalhe: ${(e2 as Error).message}`);
    }
  }
}

/**
 * Tenta fechar um JSON truncado adicionando os fechamentos necessários.
 * Funciona para truncamentos simples no meio de strings ou arrays.
 */
function repairJson(raw: string): string {
  // Remove trailing comma se houver
  let s = raw.replace(/,\s*$/, '');

  // Conta abertura/fechamento de chaves e colchetes
  let braces   = 0;
  let brackets = 0;
  let inString = false;
  let escape   = false;

  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    if (ch === '}') braces--;
    if (ch === '[') brackets++;
    if (ch === ']') brackets--;
  }

  // Se estamos no meio de uma string, fechar a string primeiro
  if (inString) s += '"';

  // Fechar arrays e objetos na ordem inversa
  // Heurística: fechar primeiro os colchetes pendentes, depois as chaves
  while (brackets > 0) { s += ']'; brackets--; }
  while (braces > 0)   { s += '}'; braces--;   }

  return s;
}
