import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Image from "next/image";
import AgentBox from './_components/AgentBox';
import { getTokensUsed } from './_actions/agent'

export default async function Home() {
	const supabase = await createClient()
	const { data: { user } } = await supabase.auth.getUser()

	if (!user) {
		redirect('/auth/login')
	}

	const { data: history } = await supabase
		.from('messages')
		.select('*')
		.order('created_at', { ascending: true })

	const tokensUsed = await getTokensUsed()

	return (
		<div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
			<div className="w-full max-w-2xl">
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-2xl font-medium text-gray-800">AI Chat</h1>
					<form action="/auth/logout" method="POST">
						<button
							type="submit"
							className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
						>
							Sign out
						</button>
					</form>
				</div>
				{/* <ChatBox
                    history={history ?? []}
                    userId={user.id}
                    initialTokensUsed={tokensUsed}
                /> */}
				<div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
					<p className="font-medium mb-1">Available tools</p>
					<p>
						<span className="font-medium">query_messages</span> — ask about your chat history, token usage, or message count.
					</p>
					<p className="mt-1">
						<span className="font-medium">search_web</span> — search for current information on any topic.
					</p>
				</div>
				<AgentBox
					history={history ?? []}
					userId={user.id}
					initialTokensUsed={tokensUsed} 
				/>
			</div>
		</div>
	)
}