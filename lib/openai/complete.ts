import { createParser, ParsedEvent, ReconnectInterval } from 'eventsource-parser';
import { query, upsert } from '../pinecone';
import { embed } from './embed';
import { CallbackManager } from "langchain/callbacks";
import { ChatOpenAI } from "langchain/chat_models";
import { HumanChatMessage } from "langchain/schema";


/**
 * The client will be sent a stream of words. As an extra (an totally optional) 'data channel' we send a
 * string'ified JSON object with the few initial variables. We hope in the future to adopt a better
 * solution (e.g. websockets, but that will exclude deployment in Edge Functions).
 */
export interface ApiChatFirstOutput {
    model: string;
}

export interface ChatMessage {
    role: 'assistant' | 'system' | 'user';
    content: string;
}

export interface ChatCompletionsRequest {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    max_tokens?: number;
    stream: boolean;
    n: number;
}

export interface ChatCompletionsResponseChunked {
    id: string; // unique id of this chunk
    object: 'chat.completion.chunk';
    created: number; // unix timestamp in seconds
    model: string; // can differ from the ask, e.g. 'gpt-4-0314'
    choices: {
        delta: Partial<ChatMessage>;
        index: number; // always 0s for n=1
        finish_reason: 'stop' | 'length' | null;
    }[];
}


// function to send a completion request to OpenAI
export async function complete(apiKey: string, dbApiKey: string, payload: Omit<ChatCompletionsRequest, 'stream' | 'n'>, signal: AbortSignal): Promise<ReadableStream> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const lastMessage = payload.messages[payload.messages.length - 1];
    const embedRes = await embed(apiKey, payload.messages[payload.messages.length - 1].content);
    const embedding = embedRes.data[0].embedding;
    await upsert(dbApiKey, lastMessage.role, lastMessage.content, embedding);

    const similarMessages = await query(dbApiKey, embedding);
    console.log("SimilarMessages:")
    console.log(similarMessages)
    const similarContent = similarMessages.matches
        ?.map(m => m.metadata)
        .map((m: any) => `${m.speaker} said on ${m.timestamp}: ${m.message}`) || [];

    lastMessage.content = [
        "HISTORIC CONTEXT:",
        ...similarContent,
        "NEW MESSAGE:",
        lastMessage.content,
    ].reduce((acc, cur) => acc + '\n' + cur);

    console.log("Full context:")
    console.log(lastMessage.content)

    const streamingPayload: ChatCompletionsRequest = {
        ...payload,
        stream: true,
        n: 1,
    };

    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            method: 'POST',
            body: JSON.stringify(streamingPayload),
            signal,
        });

        let fullResponse = '';

        return new ReadableStream({
            async start(controller) {

                // handle errors here, to return them as custom text on the stream
                if (!res.ok) {
                    let errorPayload: object = {};
                    try {
                        errorPayload = await res.json();
                    } catch (e) {
                        // ignore
                    }
                    // return custom text
                    controller.enqueue(encoder.encode(`OpenAI API error: ${res.status} ${res.statusText} ${JSON.stringify(errorPayload)}`));
                    controller.close();
                    return;
                }

                // the first packet will have the model name
                let sentFirstPacket = false;

                // stream response (SSE) from OpenAI may be fragmented into multiple chunks
                // this ensures we properly read chunks and invoke an event for each SSE event stream
                const parser = createParser((event: ParsedEvent | ReconnectInterval) => {
                    // ignore reconnect interval
                    if (event.type !== 'event')
                        return;

                    // https://beta.openai.com/docs/api-reference/completions/create#completions/create-stream
                    if (event.data === '[DONE]') {
                        controller.close();
                        return;
                    }

                    try {
                        const json: ChatCompletionsResponseChunked = JSON.parse(event.data);

                        // ignore any 'role' delta update
                        if (json.choices[0].delta?.role)
                            return;

                        // stringify and send the first packet as a JSON object
                        if (!sentFirstPacket) {
                            sentFirstPacket = true;
                            const firstPacket: ApiChatFirstOutput = {
                                model: json.model,
                            };
                            controller.enqueue(encoder.encode(JSON.stringify(firstPacket)));
                        }

                        // transmit the text stream
                        const text = json.choices[0].delta?.content || '';
                        fullResponse += text;
                        const queue = encoder.encode(text);
                        controller.enqueue(queue);

                    } catch (e) {
                        // maybe parse error
                        controller.error(e);
                    }
                });

                // https://web.dev/streams/#asynchronous-iteration
                for await (const chunk of res.body as any)
                    parser.feed(decoder.decode(chunk));

                // embed result
                const embedding = await embed(apiKey, fullResponse);
                await upsert(dbApiKey, "ai", fullResponse, embedding.data[0].embedding);
            },
        });

    } catch (error: any) {

        if (error.name === 'AbortError') {
            console.log('Fetch request aborted');
            return new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode('Request aborted by the user.'));
                    controller.close();
                },
            });
        } else {
            console.error('Fetch request failed:', error);
            return new ReadableStream(); // Return an empty ReadableStream
        }

    }

}

// function to send a completion request to OpenAI
export async function complete2(apiKey: string, dbApiKey: string, payload: Omit<ChatCompletionsRequest, 'stream' | 'n'>, signal: AbortSignal): Promise<ReadableStream> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const lastMessage = payload.messages[payload.messages.length - 1];
    const embedRes = await embed(apiKey, payload.messages[payload.messages.length - 1].content);
    const embedding = embedRes.data[0].embedding;
    await upsert(dbApiKey, lastMessage.role, lastMessage.content, embedding);

    const similarMessages = await query(dbApiKey, embedding);
    console.log("SimilarMessages:")
    console.log(similarMessages)
    const similarContent = similarMessages.matches
        ?.map(m => m.metadata)
        .map((m: any) => `${m.speaker} said on ${m.timestamp}: ${m.message}`) || [];

    lastMessage.content = [
        "HISTORIC CONTEXT:",
        ...similarContent,
        "NEW MESSAGE:",
        lastMessage.content,
    ].reduce((acc, cur) => acc + '\n' + cur);

    console.log("Full context:")
    console.log(lastMessage.content)

    const streamingPayload: ChatCompletionsRequest = {
        ...payload,
        stream: true,
        n: 1,
    };

    try {
        let fullResponse = '';

        return new ReadableStream({
            async start(controller) {
                // the first packet will have the model name
                let sentFirstPacket = false;

                const chat = new ChatOpenAI({
                    maxTokens: 250,
                    streaming: true,
                    callbackManager: CallbackManager.fromHandlers({
                        async handleLLMNewToken(token: string) {
                            if (!sentFirstPacket) {
                                sentFirstPacket = true;
                                const firstPacket: ApiChatFirstOutput = {
                                    model: "GPT4",
                                };
                                controller.enqueue(encoder.encode(JSON.stringify(firstPacket)));
                            }

                            fullResponse += token;
                            const queue = encoder.encode(token);
                            controller.enqueue(queue);
                        },
                    }),
                });

                await chat.call([new HumanChatMessage("Tell me a joke.")]);

                // embed result
                const embedding = await embed(apiKey, fullResponse);
                await upsert(dbApiKey, "ai", fullResponse, embedding.data[0].embedding);
            },
        });

    } catch (error: any) {

        if (error.name === 'AbortError') {
            console.log('Fetch request aborted');
            return new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode('Request aborted by the user.'));
                    controller.close();
                },
            });
        } else {
            console.error('Fetch request failed:', error);
            return new ReadableStream(); // Return an empty ReadableStream
        }

    }

}