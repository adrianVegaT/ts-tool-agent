'use server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
})

// --- Tool definitions ---
const tools: Anthropic.Tool[] = [
    {
        name: 'query_messages',
        description: `Query the authenticated user's message history from the database.
                      Use this when the user asks about their messages, token usage,
                      conversation count, or any question about their chat history.
                      Returns count and list of messages with token usage data.`,
        input_schema: {
            type: 'object' as const,
            properties: {
                period: {
                    type: 'string',
                    enum: ['today', 'week', 'month', 'all'],
                    description: 'Time period to query: today, week, month, or all'
                },
                keyword: {
                    type: 'string',
                    description: 'Optional keyword to filter messages by content'
                }
            },
            required: ['period']
        }
    },
    {
        name: 'search_web',
        description: `Search the web for current information on any topic.
                      Use this when the user asks about recent news, current events,
                      or any topic that requires up-to-date information beyond
                      the model's training data.`,
        input_schema: {
            type: 'object' as const,
            properties: {
                query: {
                    type: 'string',
                    description: 'The search query to look up on the web'
                }
            },
            required: ['query']
        }
    }
]

// --- Tool implementations ---
async function executeQueryMessages(period: string, keyword?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    let query = supabase
        .from('messages')
        .select('question, response, input_tokens, output_tokens, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    const now = new Date()
    if (period === 'today') {
        const start = new Date(now)
        start.setHours(0, 0, 0, 0)
        query = query.gte('created_at', start.toISOString())
    } else if (period === 'week') {
        const start = new Date(now)
        start.setDate(start.getDate() - 7)
        query = query.gte('created_at', start.toISOString())
    } else if (period === 'month') {
        const start = new Date(now)
        start.setDate(start.getDate() - 30)
        query = query.gte('created_at', start.toISOString())
    }

    if (keyword) {
        query = query.ilike('question', `%${keyword}%`)
    }

    const { data } = await query

    const totalTokens = data?.reduce(
        (acc, msg) => acc + msg.input_tokens + msg.output_tokens, 0
    ) ?? 0

    return {
        count: data?.length ?? 0,
        totalTokens,
        messages: data ?? []
    }
}

async function executeSearchWeb(searchQuery: string) {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json&no_html=1&skip_disambig=1`
    const response = await fetch(url)
    const data = await response.json()

    return {
        abstract: data.Abstract || 'No direct answer found',
        source: data.AbstractSource || '',
        url: data.AbstractURL || '',
        relatedTopics: data.RelatedTopics?.slice(0, 3).map((t: { Text: string }) => t.Text) ?? []
    }
}

// --- Main agent function ---
export interface AgentResponse {
    text: string
    toolUsed: string | null
    toolInput: Record<string, unknown> | null
}

export async function runAgent(question: string): Promise<AgentResponse> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        tools,
        messages: [{ role: 'user', content: question }]
    })

    if (response.stop_reason === 'tool_use') {
        const toolUseBlock = response.content.find(
            block => block.type === 'tool_use'
        ) as Anthropic.ToolUseBlock

        let toolResult
        const toolInput = toolUseBlock.input as Record<string, unknown>

        if (toolUseBlock.name === 'query_messages') {
            toolResult = await executeQueryMessages(
                toolInput.period as string,
                toolInput.keyword as string | undefined
            )
        } else if (toolUseBlock.name === 'search_web') {
            toolResult = await executeSearchWeb(toolInput.query as string)
        }

        const finalResponse = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            tools,
            messages: [
                { role: 'user', content: question },
                { role: 'assistant', content: response.content },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'tool_result',
                            tool_use_id: toolUseBlock.id,
                            content: JSON.stringify(toolResult)
                        }
                    ]
                }
            ]
        })

        const finalBlock = finalResponse.content[0]
        return {
            text: finalBlock?.type === 'text' ? finalBlock.text : '',
            toolUsed: toolUseBlock.name,
            toolInput
        }
    }

    const block = response.content[0]
    return {
        text: block?.type === 'text' ? block.text : '',
        toolUsed: null,
        toolInput: null
    }
}