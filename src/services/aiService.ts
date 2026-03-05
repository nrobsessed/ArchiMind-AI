import { GoogleGenAI, Type, Modality } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey });
};

export interface ProjectBrief {
  clientName: string;
  projectType: string;
  styles: string[];
  budget: string;
  requirements: string;
  targetAudience: string;
  imageReferences: string;
  uploadedImages?: string[];
  dwgFiles?: { name: string; size: string }[];
  location: {
    city: string;
    state: string;
    country: string;
  };
  terrain?: {
    slope: string;
    orientation: string;
    soilType: string;
    idealElevation: string;
    perimeter?: {
      length: string;
      width: string;
      isIrregular: boolean;
    };
    levelQuotes?: string; // Cotas de nível
  };
  neuroscience?: {
    cognitiveGoal: string;
    sensoryStimuli: string;
    formPreference: string;
    biophiliaLevel: string;
  };
}

export interface ConceptResult {
  title: string;
  description: string;
  colorPalette: { name: string; hex: string; psychology: string }[];
  materials: string[];
  lightingStrategy: string;
  suggestions: string[];
  regulations?: {
    summary: string;
    sources: string[];
  };
  pricingInfo?: {
    averageM2Price: string;
    marketAnalysis: string;
    suggestion: string;
  };
  topographyAnalysis?: {
    idealElevation: string;
    slopeStrategy: string;
    orientationAdvice: string;
  };
  neuroscienceAnalysis?: {
    cognitiveImpact: string;
    sensoryStrategy: string;
    biophilicAdvice: string;
  };
}

export async function getMarketEstimate(category: string, description: string, location: string): Promise<number> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Qual o valor médio de mercado (estimativa em Reais) para o seguinte item de construção/arquitetura em ${location}?
    Item: ${category}
    Descrição: ${description}
    
    Retorne apenas o número médio estimado, sem texto adicional.`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const text = response.text || "0";
  const match = text.match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

export async function generateProjectConcept(brief: ProjectBrief): Promise<ConceptResult> {
  const ai = getAI();
  
  const imageParts = (brief.uploadedImages || []).map(img => ({
    inlineData: {
      data: img.split(',')[1],
      mimeType: img.split(';')[0].split(':')[1]
    }
  }));

  const textPart = {
    text: `Crie um conceito detalhado e humanizado de design de interiores focado em realizar o sonho do cliente e manter a harmonia do espaço. Além disso, forneça orientações técnicas preliminares e análise de mercado baseadas na localização.
    
    Briefing do Projeto:
    Cliente: ${brief.clientName}
    Tipo de Projeto: ${brief.projectType}
    Localização: ${brief.location.city}, ${brief.location.state}, ${brief.location.country}
    Público-Alvo: ${brief.targetAudience}
    Estilos Desejados: ${brief.styles.join(', ')}
    Orçamento: ${brief.budget}
    Requisitos e Desejos: ${brief.requirements}
    Referências Visuais (Descrição): ${brief.imageReferences}
    ${brief.terrain ? `Topografia do Terreno: Inclinação: ${brief.terrain.slope}, Orientação: ${brief.terrain.orientation}, Tipo de Solo: ${brief.terrain.soilType}, Cota Ideal Desejada: ${brief.terrain.idealElevation}.` : ''}
    ${brief.neuroscience ? `Neuroarquitetura: Objetivo Cognitivo: ${brief.neuroscience.cognitiveGoal}, Estímulo Sensorial: ${brief.neuroscience.sensoryStimuli}, Preferência de Formas: ${brief.neuroscience.formPreference}, Nível de Biofilia: ${brief.neuroscience.biophiliaLevel}.` : ''}
    ${brief.uploadedImages && brief.uploadedImages.length > 0 ? 'O arquiteto também enviou imagens de referência em anexo para contexto visual.' : ''}
    
    Instruções Adicionais:
    - Priorize os desejos do cliente acima de tudo.
    - O conceito deve ser acolhedor, humanizado e harmonioso.
    - Forneça uma seção de "regulations" com um resumo das normas de construção, recuos e taxas de ocupação típicas para a cidade de ${brief.location.city}. 
    - Forneça uma seção de "pricingInfo" com o valor médio do m² para projetos de arquitetura/interiores na região de ${brief.location.city}. Ajude o profissional a cobrar melhor com uma breve análise de mercado.
    - Forneça uma seção de "topographyAnalysis" com a análise técnica da cota ideal, estratégias para lidar com a inclinação e conselhos sobre a orientação solar do terreno.
    - Forneça uma seção de "neuroscienceAnalysis" explicando como o design impactará o cérebro e o bem-estar do usuário (Neuroarquitetura), baseando-se nos objetivos cognitivos e sensoriais informados.
    - Para cada cor na paleta, inclua uma breve explicação de sua "psychology" (psicologia das cores) no contexto do projeto.
    - IMPORTANTE: Cite fontes confiáveis. Não invente dados. Se a informação exata não estiver disponível, forneça estimativas baseadas em tabelas de conselhos profissionais (CAU/ABD).
    
    O resultado deve ser em Português.`
  };

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [textPart, ...imageParts]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          colorPalette: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                hex: { type: Type.STRING },
                psychology: { type: Type.STRING, description: "Significado psicológico da cor neste projeto." }
              },
              required: ["name", "hex", "psychology"]
            }
          },
          materials: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          lightingStrategy: { type: Type.STRING },
          suggestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Sugestões criativas baseadas nas referências e desejos do cliente."
          },
          regulations: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING, description: "Resumo de recuos, taxas de ocupação e normas locais." },
              sources: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Fontes das informações (Prefeituras, Leis, etc)." }
            },
            required: ["summary", "sources"]
          },
          pricingInfo: {
            type: Type.OBJECT,
            properties: {
              averageM2Price: { type: Type.STRING, description: "Valor médio por m² na região." },
              marketAnalysis: { type: Type.STRING, description: "Breve análise do mercado local." },
              suggestion: { type: Type.STRING, description: "Sugestão de como o profissional deve se posicionar no preço." }
            },
            required: ["averageM2Price", "marketAnalysis", "suggestion"]
          },
          topographyAnalysis: {
            type: Type.OBJECT,
            properties: {
              idealElevation: { type: Type.STRING, description: "Análise da cota ideal para a construção." },
              slopeStrategy: { type: Type.STRING, description: "Estratégia para lidar com a inclinação do terreno." },
              orientationAdvice: { type: Type.STRING, description: "Conselhos sobre orientação solar e ventilação baseados no terreno." }
            },
            required: ["idealElevation", "slopeStrategy", "orientationAdvice"]
          },
          neuroscienceAnalysis: {
            type: Type.OBJECT,
            properties: {
              cognitiveImpact: { type: Type.STRING, description: "Como o ambiente afetará a cognição (foco, criatividade, etc)." },
              sensoryStrategy: { type: Type.STRING, description: "Estratégia sensorial (texturas, sons, luz) para o bem-estar." },
              biophilicAdvice: { type: Type.STRING, description: "Conselhos sobre integração com a natureza e ritmos circadianos." }
            },
            required: ["cognitiveImpact", "sensoryStrategy", "biophilicAdvice"]
          }
        },
        required: ["title", "description", "colorPalette", "materials", "lightingStrategy", "suggestions", "regulations", "pricingInfo", "topographyAnalysis", "neuroscienceAnalysis"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export interface ClientAnalysis {
  conversionPotential: 'Baixo' | 'Médio' | 'Alto';
  mainPains: string[];
  approachSuggestion: string;
  closingTip: string;
}

export async function analyzeClientWithAI(clientData: any): Promise<ClientAnalysis> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analise o seguinte cliente para um escritório de arquitetura e forneça insights sobre o potencial de conversão e sugestões de abordagem personalizada.
    
    Dados do Cliente:
    Nome: ${clientData.name}
    Projeto: ${clientData.project}
    Status: ${clientData.status}
    Valor Estimado: R$ ${clientData.value.toLocaleString()}
    Prioridade: ${clientData.priority}
    Último Contato: ${clientData.lastContact}
    
    Forneça uma análise estratégica em Português.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          conversionPotential: { type: Type.STRING, enum: ['Baixo', 'Médio', 'Alto'] },
          mainPains: { type: Type.ARRAY, items: { type: Type.STRING } },
          approachSuggestion: { type: Type.STRING },
          closingTip: { type: Type.STRING }
        },
        required: ["conversionPotential", "mainPains", "approachSuggestion", "closingTip"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function generateSuggestedPrompt(category: string, projectContext: string): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Gere um prompt detalhado e profissional para geração de imagem de IA (como Midjourney ou DALL-E) focado na categoria "${category}" para um projeto de arquitetura.
    
    Contexto do Projeto: ${projectContext}
    
    REQUISITOS IMPORTANTES:
    - Escala Realista: O conceito deve respeitar as dimensões reais de um espaço humano, evitando escalas monumentais desnecessárias.
    - Geometria Real: Lembre-se que plantas arquitetônicas nem sempre são retas ou ortogonais; inclua ângulos orgânicos ou paredes não lineares se apropriado.
    - Detalhes Técnicos: Solicite a inclusão visual de cotas de parede (wall dimensions) e anotações técnicas discretas para dar um ar de projeto executivo real.
    
    O prompt final deve ser em Inglês, focado em fotorrealismo, iluminação cinematográfica e detalhes técnicos de arquitetura. Retorne apenas o texto do prompt.`,
  });

  return response.text || "";
}

export async function generateVisualConcept(prompt: string): Promise<string | null> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [{ text: `High-end architectural visualization, professional photography, realistic human scale, accurate floor plan geometry with non-linear walls, include subtle technical wall dimensions (cotas de parede) and architectural annotations, ${prompt}, ultra-realistic, 8k, luxury aesthetic, believable proportions` }]
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}
