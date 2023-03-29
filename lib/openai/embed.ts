if (!process.env.OPENAI_API_KEY)
  console.warn('OPENAI_API_KEY has not been provided in this deployment environment. ' +
    'Will use the optional keys incoming from the client, which is not recommended.');


export interface EmbeddingResponse {
  data: {
    embedding: number[];
    index: number;
    object: 'embedding';
  }[];
  model: string;
  object: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export async function embed(apiKey: string, input: string): Promise<EmbeddingResponse> {
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      method: 'POST',
      body: JSON.stringify({
        input,
        model: 'text-embedding-ada-002',
      }),
    });

    if (!res.ok) {
      let errorPayload: object = {};
      try {
        errorPayload = await res.json();
      } catch (e) {
        console.error('Error parsing error payload:', e);
      }
      throw new Error(`OpenAI API error: ${res.status} ${res.statusText} ${JSON.stringify(errorPayload)}`);
    }

    return res.json();
  } catch (error: any) {
    console.error('Fetch request failed:', error);
    throw error;
  }
}