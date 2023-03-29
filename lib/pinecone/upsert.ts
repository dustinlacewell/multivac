import { PineconeClient } from "@pinecone-database/pinecone";

const pinecone = new PineconeClient();

const makeUUID = () => {
    let dt = new Date().getTime();
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (dt + Math.random() * 16) % 16 | 0;
        dt = Math.floor(dt / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
};

export const upsert = async (apiKey: string, speaker: string, message: string, vector: number[]) => {
    const client = await pinecone.init({
        apiKey,
        environment: "us-west4-gcp",
    });

    const index = pinecone.Index("gpt4-general");
    const upsertRequest = {
        vectors: [
            {
                id: makeUUID(),
                values: vector,
                metadata: {
                    speaker,
                    message,
                    timestamp: new Date().toISOString(),
                },
            },
        ],
        namespace: "",
    };

    await index.upsert({ upsertRequest });
}
