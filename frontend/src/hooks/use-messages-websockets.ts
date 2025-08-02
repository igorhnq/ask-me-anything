import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { type GetRoomsMessagesResponse } from "../http/get-rooms-messages";

interface useMessagesWebsocketsParams {
    roomId: string
}

type WebhookMessage = 
    | { kind: "message_created", value: { id: string, message: string } }
    | { kind: "message_answered", value: { id: string } }
    | { kind: "message_reaction_increased" | "message_reaction_decreased", value: { id: string, count: number } }


export function useMessagesWebsockets({ roomId }: useMessagesWebsocketsParams) {
    const queryClient = useQueryClient()

    useEffect(() => {
        const ws = new WebSocket(`ws://localhost:8080/subscribe/${roomId}`)

        ws.onopen = () => {
            console.log("Connected to websocket")
        }

        ws.onclose = () => {
            console.log("Disconnected from websocket")
        }

        ws.onmessage = (event) => {
            const data: WebhookMessage = JSON.parse(event.data)

            switch (data.kind) {
                case "message_created":
                    queryClient.setQueryData<GetRoomsMessagesResponse>(['messages', roomId], (state) => {
                        return {
                            messages: [
                                ...(state?.messages ?? []),
                                {
                                    id: data.value.id,
                                    text: data.value.message,
                                    amoutOfReactions: 0,
                                    answered: false
                                }
                            ]
                        }
                    })
                    break;
                case "message_answered":
                    queryClient.setQueryData<GetRoomsMessagesResponse>(['messages', roomId], (state) => {
                        if (!state) {
                            return undefined
                        }

                        return {
                            messages: state?.messages.map(message => {
                                if (message.id === data.value.id) {
                                    return {
                                        ...message,
                                        answered: true
                                    }
                                }
                                return message
                            })
                        }
                    })
                    break;
                case "message_reaction_increased":
                case "message_reaction_decreased":
                    queryClient.setQueryData<GetRoomsMessagesResponse>(['messages', roomId], (state) => {
                        if (!state) {
                            return undefined
                        }

                        return {
                            messages: state.messages.map(message => {
                                if (message.id === data.value.id) {
                                    return { ...message, amoutOfReactions: data.value.count }
                                }

                                return message
                            })
                        }
                    })
                    break;
            }
        }

        return () => {
            ws.close()
        }
    }, [roomId, queryClient])
}