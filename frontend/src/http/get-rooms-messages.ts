interface GetRoomsMessagesRequest {
    roomId: string
}

export interface GetRoomsMessagesResponse {
    messages: {
        id: string;
        text: string;
        amoutOfReactions: number;
        answered: boolean;
    }[]
}

export async function getRoomsMessages({ roomId }: GetRoomsMessagesRequest): Promise<GetRoomsMessagesResponse> {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/rooms/${roomId}/messages`, {
        method: 'GET',
    })

    const data: Array<{
        id: string
        room_id: string
        message: string
        reaction_count: number
        answered: boolean
    }> = await response.json()

    return {
        messages: data.map((message) => {
            return {
                id: message.id,
                text: message.message,
                amoutOfReactions: message.reaction_count,
                answered: message.answered,
            }
        }),
    }
}

