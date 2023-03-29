import { NextRequest } from "next/server";

export class MissingKeyError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'MissingKeyError'
    }
}

export const getApiKey = (data: any, key: string, env: string) => {
    const userKey = data[key] || process.env[env]

    if (!userKey) {
        throw new MissingKeyError(`Error: missing ${key}. Add it on the client side (Settings icon) or server side (your deployment).`)
    }

    return userKey
}

export const getOpenAiKey = (data: any) => {
    return getApiKey(data, "apiKey", "OPENAI_API_KEY")
}

export const getPineconeKey = (data: any) => {
    return getApiKey(data, "dbApiKey", "PINECONE_API_KEY")
}
