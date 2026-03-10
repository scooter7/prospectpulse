import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// POST /api/ai/generate
// Generates marketing creative (email or SMS) using GPT-4o-mini
export async function POST(request: NextRequest) {
  try {
    const { type, businessName, campaignName, tone, details } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Add OPENAI_API_KEY to your environment variables.' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = type === 'email'
      ? `You are a marketing copywriter creating outreach emails for a B2B advertising agency. Write professional, compelling emails that are personalized and action-oriented. Keep emails concise (under 200 words). Include a clear subject line.`
      : `You are a marketing copywriter creating SMS outreach messages for a B2B advertising agency. Write concise, engaging text messages under 160 characters. Include a clear call to action.`;

    const userPrompt = `Generate a ${type === 'email' ? 'follow-up email' : 'follow-up SMS message'} for:
- Business: ${businessName}
- Campaign: ${campaignName}
- Tone: ${tone || 'professional and friendly'}
${details ? `- Additional context: ${details}` : ''}

${type === 'email' ? 'Format with Subject: line first, then the email body.' : 'Keep under 160 characters.'}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return NextResponse.json({
      content: completion.choices[0]?.message?.content || '',
      type,
    });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}
