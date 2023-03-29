import { ChatMessage, complete2 } from '@/lib/openai';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getOpenAiKey, getPineconeKey } from '../../lib/utils';


if (!process.env.OPENAI_API_KEY)
  console.warn('OPENAI_API_KEY has not been provided in this deployment environment. ' +
    'Will use the optional keys incoming from the client, which is not recommended.');


// Next.js API route

export interface ApiChatInput {
  apiKey?: string;
  dbApiKey?: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export default async function handler(req: NextRequest): Promise<Response> {
  const data = await req.json() as ApiChatInput;
  const { model, messages, temperature = 0.5, max_tokens = 2048 } = data

  try {
    const apiKey = getOpenAiKey(data);
    const dbApiKey = getPineconeKey(data);

    const stream: ReadableStream = await complete2(apiKey, dbApiKey, {
      model,
      messages,
      temperature,
      max_tokens,
    }, req.signal);

    return new NextResponse(stream);

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('Fetch request aborted in handler');
      return new Response('Request aborted by the user.', { status: 499 }); // Use 499 status code for client closed request
    } else if (error.code === 'ECONNRESET') {
      console.log('Connection reset by the client in handler');
      return new Response('Connection reset by the client.', { status: 499 }); // Use 499 status code for client closed request
    } else if (error.name === 'MissingKeyError') {
      console.error('Missing key:', error.message);
      return new Response(error.message, { status: 400 });
    } else {
      console.error('Fetch request failed:', error);
      return new Response('Error: Fetch request failed.', { status: 500 });
    }
  }

};

//noinspection JSUnusedGlobalSymbols
export const config = {
  runtime: 'edge',
};
