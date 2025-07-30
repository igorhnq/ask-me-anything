interface GetRoomsMessagesRequest {
    roomId: string
}

export async function getRoomsMessages({ roomId }: GetRoomsMessagesRequest) {
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

