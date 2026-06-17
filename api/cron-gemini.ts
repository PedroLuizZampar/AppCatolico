import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dbQuery } from './db';

const PROMPT_EVANGELHO = `
  Atue como um Diretor Espiritual e Teólogo Católico de profunda sensibilidade pastoral. Quero que você crie uma reflexão litúrgica diária baseada no Evangelho do dia. O texto deve ser estritamente devocional, com sólida teologia, mas escrito de forma natural, acolhedora e de fácil compreensão para o fiel leigo. 

Não insira o texto do Evangelho por extenso, concentre-se exclusivamente na meditação profunda sobre ele. Não responda como um modelo de IA; comece diretamente no conteúdo, sem saudações ou introduções formais.

A estrutura geral de títulos (H2 e H3) e o uso de negritos devem seguir rigorosamente o modelo abaixo, mas a organização interna do conteúdo (seja por parágrafos fluídos, listas ou blocos de citação, apenas tabelas que não) fica totalmente a seu critério, utilizando o formato que você considerar mais didático e profundo para o tema do dia.

## Contextualização Litúrgica
Crie uma introdução situando o leitor na liturgia de hoje. Use a fórmula básica: "Como hoje é [Dia da Semana], [Data por extenso], a Igreja celebra a [Semana e Tempo Litúrgico]. A liturgia de hoje nos convida a...". Faça uma ponte direta entre o tempo litúrgico e o tema central do Evangelho, preparando a alma do leitor.

---

## A Mensagem do Dia: [Subtítulo Curto e Impactante]
Desenvolva a mensagem central do Evangelho. Você deve abordar o contexto teológico (o que Jesus quis ensinar originalmente naquele momento histórico, indo além da superfície) e a conexão com o agora (como esse ensinamento desafia o homem moderno, o ritmo de vida atual, as redes sociais ou a cultura contemporânea). Sinta-se livre para organizar esses dois aspectos em parágrafos, tópicos ou citações, focando na profundidade e na clareza.

---

## O Ensinamento Prático de Jesus: A Radicalidade do Evangelho
Apresente os desdobramentos práticos e as virtudes extraídas da passagem. Esta seção deve conter ensinamentos essenciais e passos concretos para o fiel aplicar no cotidiano, além de perguntas reflexivas para o exame de consciência. A organização visual desta seção é livre: você pode usar tabelas comparativas, listas ordenadas ou blocos de texto, desde que use negritos nos conceitos-chave para guiar o olhar do leitor.

---

## Oração Acerca do Tema
Comece com: "Em nome do Pai, do Filho e do Espírito Santo. Amém."
Escreva uma oração íntima, sincera e profunda em primeira pessoa do singular (eu). A oração deve passar naturalmente por momentos de reconhecimento da soberania divina, pedido de perdão pelas fraquezas diárias, súplica por força para realizar as renúncias necessárias na vida moderna e intercessão pelas famílias ou pela Igreja. Termine com "Amém."

---
Gere a meditação para o Evangelho de hoje:
`;

const PROMPT_CURIOSIDADES = `
  Atue como um Professor de História da Igreja e Catequista dinâmico. Quero que você crie um texto fascinante, rico em conteúdo e altamente visual sobre um assunto curioso, artístico, histórico ou teológico da fé católica (Ex: arquitetura, relíquias, catacumbas, sacramentais, vestes litúrgicas, tradições esquecidas).

O tom deve ser natural, instigante, que desperte curiosidade no leitor, mantendo a profundidade e a reverência teológica. Não responda como um modelo de IA; comece diretamente no texto.

A estrutura de títulos (H2 e H3) e o uso de negritos devem seguir rigorosamente o modelo abaixo, mas a organização interna do conteúdo (o uso de listas, parágrafos ou blocos de destaque, apenas tabelas que não) fica totalmente a seu critério, utilizando o formato que você considerar mais didático e atraente para o assunto escolhido.

## Mistérios da Fé: [Nome do Assunto Geral]
Abra com uma pergunta provocativa para capturar o leitor e faça uma breve introdução contextualizando como a mentalidade católica sempre utilizou a arte, a história e os símbolos como uma catequese viva. Termine esta introdução com a frase: "Aqui está o resumo rápido para você dominar o assunto hoje:"

---

## O que é (ou o que foram) os [Nome do Assunto]?
Desenvolva a definição técnica, histórica ou conceitual do assunto. Explique a origem desse fato ou tradição e mostre que o objetivo nunca foi puramente estético ou social, mas sim uma chave de leitura para realidades espirituais invisíveis. Organize a explicação da maneira que achar mais clara.

---

## Três Pilares Surpreendentes deste Legado
Apresente exatamente 3 pontos fundamentais sobre o tema. Para cada um dos 3 pontos, você deve criar um subtítulo H3 indicando o nome do item. A forma de expor o fato histórico e o significado espiritual de cada item é livre (em parágrafos separados, listas ou blocos), mas você deve obrigatoriamente usar o termo **O significado:** em negrito para destacar a explicação teológica e sua conexão com a vida de fé.

### [Nome do Primeiro Item]
### [Nome do Segundo Item]
### [Nome do Terceiro Item]

---

## Por que isso importa hoje?
Escreva uma conclusão profunda e de fácil compreensão, consolidando o aprendizado. Mostre como o olhar sacramental da Igreja une o mundo visível ao invisível, e como resgatar esse conhecimento enriquece a nossa experiência de fé no mundo contemporâneo.

---
Escolha um assunto católico aleatório e fascinante e gere o texto seguindo o modelo acima.
`;

/**
 * Faz a chamada HTTP para a API oficial do Gemini
 */
async function chamarGeminiAPI(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Chave de API do Gemini (GEMINI_API_KEY) não configurada no ambiente.');
  }

  // Usamos o modelo gemini-2.5-flash por ser rápido, moderno e eficiente para tarefas de texto
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro na API do Gemini: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('A API do Gemini retornou uma resposta vazia ou malformada.');
  }

  return text.trim();
}

/**
 * Obtém a data de hoje formatada como YYYY-MM-DD no fuso horário de Brasília (America/Sao_Paulo)
 */
function getTodayDateString(): string {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const day = parts.find((p) => p.type === 'day')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const year = parts.find((p) => p.type === 'year')?.value;
  return `${year}-${month}-${day}`;
}

/**
 * Obtém a passagem e o texto do Evangelho do Dia a partir da API de liturgia
 */
async function obterEvangelhoDoDia(dateString: string): Promise<{ referencia: string; titulo: string; texto: string; dataLiteral: string } | null> {
  try {
    const [year, month, day] = dateString.split('-');
    const url = `https://liturgia.up.railway.app/v2/?dia=${parseInt(day)}&mes=${parseInt(month)}&ano=${year}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erro ao buscar liturgia da API: ${response.status}`);
    }
    const data = await response.json();
    const evangelho = data.leituras?.evangelho?.[0];
    if (evangelho) {
      return {
        referencia: evangelho.referencia || '',
        titulo: evangelho.titulo || '',
        texto: evangelho.texto || '',
        dataLiteral: data.data || '',
      };
    }
  } catch (error) {
    console.error('[Liturgia API] Falha ao obter evangelho do dia:', error);
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Validar autorização do Cron Job (apenas em produção)
  if (process.env.NODE_ENV === 'production') {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Não autorizado.' });
    }
  }

  try {
    const dateString = getTodayDateString();
    console.log(`[Cron Gemini] Iniciando verificação para a data: ${dateString}`);

    // 2. Verificar se já existem registros para hoje
    const [meditacaoExist, curiosidadeExist] = await Promise.all([
      dbQuery('SELECT 1 FROM meditacoes_evangelho WHERE data = $1', [dateString]),
      dbQuery('SELECT 1 FROM curiosidades_catolicas WHERE data = $1', [dateString]),
    ]);

    const precisaMeditacao = meditacaoExist.rowCount === 0;
    const precisaCuriosidade = curiosidadeExist.rowCount === 0;

    // Se ambos já existem, não faz chamada à API
    if (!precisaMeditacao && !precisaCuriosidade) {
      console.log('[Cron Gemini] Meditação e Curiosidade já existem para hoje. Nenhuma chamada necessária.');
      return res.status(200).json({
        message: 'Registros já atualizados para hoje.',
        date: dateString,
        actions: { meditacao: 'skipped', curiosidade: 'skipped' },
      });
    }

    const tasks: Promise<any>[] = [];
    let generatedMeditacao = '';
    let generatedCuriosidade = '';
    let resolvedEvangelho: any = null;

    // 3. Agendar chamadas paralelas à API do Gemini para evitar timeouts na Vercel
    if (precisaMeditacao) {
      console.log('[Cron Gemini] Solicitando nova Meditação do Evangelho à API do Gemini...');
      tasks.push(
        obterEvangelhoDoDia(dateString).then(async (evangelho) => {
          resolvedEvangelho = evangelho;
          const dataPorExtenso = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            dateStyle: 'full',
          }).format(new Date());

          let promptEvangelho = PROMPT_EVANGELHO;
          if (evangelho) {
            console.log(`[Cron Gemini] Evangelho obtido com sucesso: ${evangelho.referencia}`);
            promptEvangelho += ` Passagem: ${evangelho.referencia} (${evangelho.titulo}).\n\nData de hoje: ${dataPorExtenso}.\n\nTexto do Evangelho:\n"${evangelho.texto}"`;
          } else {
            console.log('[Cron Gemini] Aviso: Não foi possível obter o Evangelho. Usando fuso de Brasília.');
            promptEvangelho += ` correspondente à data: ${dataPorExtenso}.`;
          }
          generatedMeditacao = await chamarGeminiAPI(promptEvangelho);
        })
      );
    }

    if (precisaCuriosidade) {
      console.log('[Cron Gemini] Solicitando nova Curiosidade Católica à API do Gemini...');
      tasks.push(
        chamarGeminiAPI(PROMPT_CURIOSIDADES).then((resText) => {
          generatedCuriosidade = resText;
        })
      );
    }

    // Executa as chamadas em paralelo
    await Promise.all(tasks);

    // 4. Salvar os resultados gerados no banco de dados Neon
    const saveTasks: Promise<any>[] = [];

    if (generatedMeditacao) {
      let conteudoCompleto = '';
      conteudoCompleto = `${generatedMeditacao}`;

      saveTasks.push(
        dbQuery(
          `INSERT INTO meditacoes_evangelho (conteudo, data) 
           VALUES ($1, $2) 
           ON CONFLICT (data) 
           DO UPDATE SET conteudo = EXCLUDED.conteudo`,
          [conteudoCompleto, dateString]
        )
      );
    }

    if (generatedCuriosidade) {
      saveTasks.push(
        dbQuery(
          `INSERT INTO curiosidades_catolicas (conteudo, data) 
           VALUES ($1, $2) 
           ON CONFLICT (data) 
           DO UPDATE SET conteudo = EXCLUDED.conteudo`,
          [generatedCuriosidade, dateString]
        )
      );
    }

    await Promise.all(saveTasks);
    console.log('[Cron Gemini] Registros salvos com sucesso no Neon DB!');

    return res.status(200).json({
      message: 'Geração e sincronização de dados concluída com sucesso.',
      date: dateString,
      actions: {
        meditacao: precisaMeditacao ? 'generated' : 'skipped',
        curiosidade: precisaCuriosidade ? 'generated' : 'skipped',
      },
    });
  } catch (error: any) {
    console.error('[Cron Gemini] Falha crítica no processamento:', error);
    return res.status(500).json({
      error: 'Erro interno ao processar e salvar dados do Gemini.',
      details: error.message || error,
    });
  }
}
