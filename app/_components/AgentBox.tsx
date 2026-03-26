'use client'
import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { runAgent, AgentResponse } from '../_actions/agent'
import { TOKEN_LIMIT } from '@/lib/config'

interface Message {
    id: string
    question: string
    response: string
    toolUsed: string | null
    toolInput: Record<string, unknown> | null
}

interface AgentBoxProps {
    history: Message[]
    userId: string
    initialTokensUsed: number
}

export default function AgentBox({ history, userId, initialTokensUsed }: AgentBoxProps) {
    const [messages, setMessages] = useState<Message[]>(history)
    const [question, setQuestion] = useState('')
    const [loading, setLoading] = useState(false)
    const [tokensUsed, setTokensUsed] = useState(initialTokensUsed)
    const [error, setError] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const tokensRemaining = Math.max(0, TOKEN_LIMIT - tokensUsed)
    const limitReached = tokensRemaining <= 0
    const usagePercent = Math.min(100, (tokensUsed / TOKEN_LIMIT) * 100)

    function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
        setQuestion(e.target.value)
        const textarea = textareaRef.current
        if (textarea) {
            textarea.style.height = 'auto'
            textarea.style.height = textarea.scrollHeight + 'px'
        }
    }

    async function handleSubmit() {
        if (!question.trim()) return
        setLoading(true)
        setError('')

        try {
            const result: AgentResponse = await runAgent(question)

            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                question,
                response: result.text,
                toolUsed: result.toolUsed,
                toolInput: result.toolInput
            }])

            setQuestion('')
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'
            }
        } catch {
            setError('Something went wrong. Please try again.')
        }

        setLoading(false)
    }

    return (
        <div className="space-y-4">
            {messages.map(msg => (
                <div key={msg.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-3">
                    <p className="text-sm font-medium text-gray-800">{msg.question}</p>

                    {msg.toolUsed && (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">
                                tool: {msg.toolUsed}
                            </span>
                            {msg.toolInput && (
                                <span className="text-gray-400">
                                    {JSON.stringify(msg.toolInput)}
                                </span>
                            )}
                        </div>
                    )}

                    <div className="prose prose-sm max-w-none text-gray-800">
                        <ReactMarkdown>{msg.response}</ReactMarkdown>
                    </div>
                </div>
            ))}

            {limitReached ? (
                <p className="text-sm text-center text-gray-500 py-2">
                    You have used all your tokens for this demo account.
                </p>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-3">
                    <div className="flex gap-2 items-center">
                        <textarea
                            ref={textareaRef}
                            value={question}
                            onChange={handleInput}
                            placeholder="Ask me about your messages or search the web..."
                            rows={1}
                            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 outline-none focus:border-gray-400 transition-colors resize-none overflow-hidden"
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                        >
                            {loading ? 'Thinking...' : 'Ask'}
                        </button>
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </div>
            )}
        </div>
    )
}