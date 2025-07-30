import { useParams } from "react-router-dom";
import { Message } from "./message";
import { getRoomsMessages } from "../http/get-rooms-messages";
import { useSuspenseQuery } from "@tanstack/react-query";

export function Messages() {
    const { roomId } = useParams()

    if (!roomId) {
        throw new Error("Messages component must be used within a room")
    }

    const { data } = useSuspenseQuery({
        queryKey: ['messages', roomId],
        queryFn: () => getRoomsMessages({ roomId })
    })

    return (
        <ol className="list-decimal list-outside px-3 space-y-8">
            {data.messages.map((message) => (	
                <Message 
                    key={message.id} 
                    text={message.text} 
                    amoutOfReactions={message.amoutOfReactions} 
                    answered={message.answered} 
                />
            ))}
        </ol>
    )
}