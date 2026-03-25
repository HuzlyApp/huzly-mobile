import { supabase } from '@/lib/config/supabase';

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';

interface FaqEntry {
  id: string;
  category: string;
  question: string;
  answer: string;
}

let cachedFaqs: FaqEntry[] | null = null;

async function fetchFaqs(): Promise<FaqEntry[]> {
  if (cachedFaqs) return cachedFaqs;

  try {
    const { data, error } = await supabase
      .from('faqs')
      .select('id, category, question, answer');

    if (error || !data) {
      console.error('Failed to fetch FAQ data:', error);
      return [];
    }

    cachedFaqs = data as FaqEntry[];
    console.log(`Loaded ${cachedFaqs.length} FAQ entries from database`);
    return cachedFaqs;
  } catch (err) {
    console.error('FAQ fetch exception:', err);
    return [];
  }
}

function buildSystemPrompt(faqs: FaqEntry[]): string {
  let faqContext = '';

  if (faqs.length > 0) {
    const faqLines = faqs.map(
      (f) => `[${f.category}] Q: ${f.question}\nA: ${f.answer}`
    ).join('\n\n');

    faqContext = `\n\nIMPORTANT: You MUST use the FAQ knowledge base below as your PRIMARY source of answers. When the user's question matches or relates to ANY FAQ entry, you MUST base your response on that FAQ answer. Rephrase naturally but keep the same information. Only provide a general response if no FAQ entry is relevant at all.\n\n--- FAQ DATABASE ---\n${faqLines}\n--- END FAQ ---`;
  }

  return `You are acting as a CLIENT (not an AI assistant).

Context:
- You are responding to a worker/user inquiry inside a support chat.
- Your tone should be professional, human, concise, and helpful.
- Do NOT mention AI, bots, automation, or that you are referencing a FAQ database.
- Speak as if you are the actual company/client handling the concern.
- If the user's question matches an FAQ, use that answer as the basis for your response but rephrase it naturally.

Guidelines:
- Acknowledge the user's concern
- Provide reassurance or next steps
- If issue requires escalation, say that the team is reviewing it
- Keep responses short (1–3 sentences)
- Be natural and conversational${faqContext}`;
}

export async function getAIResponse(userMessage: string): Promise<{ reply: string | null; error: string | null }> {
  const apiKey = process.env.EXPO_PUBLIC_XAI_API_KEY;
  if (!apiKey) {
    return { reply: null, error: 'XAI API key not configured' };
  }

  try {
    const faqs = await fetchFaqs();
    const systemPrompt = buildSystemPrompt(faqs);

    const response = await fetch(XAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 256,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('XAI API error:', response.status, errBody);
      return { reply: null, error: `AI service error (${response.status})` };
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return { reply: null, error: 'No response from AI' };
    }

    return { reply, error: null };
  } catch (err: any) {
    console.error('XAI fetch error:', err);
    return { reply: null, error: 'Failed to connect to AI service' };
  }
}

export function clearFaqCache() {
  cachedFaqs = null;
}
