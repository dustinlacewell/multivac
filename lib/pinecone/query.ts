import { PineconeClient } from "@pinecone-database/pinecone";

const pinecone = new PineconeClient();

export const query = async (apiKey: string, vector: number[], top_k = 5) => {
    const client = await pinecone.init({
        apiKey,
        environment: "us-west4-gcp",
    });

    const index = pinecone.Index("gpt4-general");

    const queryRequest = {
        vector,
        topK: 10,
        includeValues: false,
        includeMetadata: true,
        namespace: "",
    };

    return index.query({ queryRequest });
}
