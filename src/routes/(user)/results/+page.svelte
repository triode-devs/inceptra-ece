<script>
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { Trophy, Medal, Timer, Award, ArrowLeft, Loader2, RefreshCw } from 'lucide-svelte';
	import { API_BASE_URL } from '$lib';

	let leaderboard = $state([]);
	let isLoading = $state(true);
	let errorMessage = $state('');

	async function fetchLeaderboard() {
		isLoading = true;
		errorMessage = '';
		try {
			const res = await fetch(`${API_BASE_URL}/leaderboard`);
			if (!res.ok) throw new Error('Failed to fetch leaderboard');
			const data = await res.json();
			// Assuming data is an array of { name, score, time_taken, college_name }
			leaderboard = data.sort((a, b) => {
				if (b.score !== a.score) return b.score - a.score;
				return a.time_taken - b.time_taken;
			});
		} catch (error) {
			errorMessage = error.message;
		} finally {
			isLoading = false;
		}
	}

	onMount(fetchLeaderboard);

	function formatTime(seconds) {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return m > 0 ? `${m}m ${s}s` : `${s}s`;
	}
</script>

<svelte:head>
	<title>Leaderboard - Interactive Quiz</title>
</svelte:head>

<div
	class="font-poppins fixed inset-0 -z-10 h-screen w-screen overflow-hidden bg-slate-50 text-zinc-900"
>
	<div class="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50"></div>
	<div
		class="animate-blob absolute top-0 -left-4 h-96 w-96 rounded-full bg-blue-300 opacity-60 mix-blend-multiply blur-3xl filter"
	></div>
	<div
		class="animate-blob animation-delay-2000 absolute top-0 -right-4 h-96 w-96 rounded-full bg-cyan-200 opacity-60 mix-blend-multiply blur-3xl filter"
	></div>
	<div
		class="animate-blob animation-delay-4000 absolute -bottom-32 left-20 h-96 w-96 rounded-full bg-indigo-200 opacity-60 mix-blend-multiply blur-3xl filter"
	></div>
	<div
		class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"
	></div>
</div>

<div class="font-poppins relative flex min-h-screen w-full flex-col items-center px-4 py-10">
	<div class="w-full max-w-2xl">
		<div class="mb-8 flex items-center justify-between">
			<a
				href="/"
				class="flex items-center gap-2 font-bold text-zinc-600 transition-colors hover:text-zinc-900"
			>
				<ArrowLeft size={20} /> Back to Quiz
			</a>
			<button
				onclick={fetchLeaderboard}
				class="rounded-full p-2 transition-colors hover:bg-white/50"
				title="Refresh"
			>
				<RefreshCw size={20} class={isLoading ? 'animate-spin' : ''} />
			</button>
		</div>

		<div class="glass-card overflow-hidden rounded-[32px] shadow-2xl shadow-blue-900/10">
			<div class="p-8 pb-4 text-center">
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 shadow-inner"
				>
					<Trophy size={32} />
				</div>
				<h1 class="text-3xl font-bold text-zinc-900">Leaderboard</h1>
				<p class="text-sm font-bold text-gray-500">Hall of Fame - Top Performers</p>
			</div>

			<div class="p-4 md:p-8">
				{#if isLoading && leaderboard.length === 0}
					<div class="flex flex-col items-center justify-center py-20">
						<Loader2 class="mb-4 h-10 w-10 animate-spin text-blue-500" />
						<p class="font-bold text-gray-400">Loading rankings...</p>
					</div>
				{:else if errorMessage}
					<div class="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-red-600">
						<p class="font-bold">{errorMessage}</p>
						<button
							onclick={fetchLeaderboard}
							class="mt-4 rounded-xl bg-red-600 px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700"
						>
							Try Again
						</button>
					</div>
				{:else if leaderboard.length === 0}
					<div class="py-20 text-center text-gray-400">
						<Award size={48} class="mx-auto mb-4 opacity-20" />
						<p class="font-bold">No results yet. Be the first one!</p>
					</div>
				{:else}
					<div class="flex flex-col gap-3">
						{#each leaderboard as entry, i}
							<div
								in:fly={{ y: 20, delay: i * 50 }}
								class="flex transform items-center gap-4 rounded-2xl border border-white bg-white/60 p-4 shadow-sm transition-all hover:-translate-y-1 hover:bg-white"
							>
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold
										{i === 0
										? 'bg-yellow-100 text-yellow-700'
										: i === 1
											? 'bg-slate-200 text-slate-700'
											: i === 2
												? 'bg-orange-100 text-orange-700'
												: 'bg-gray-100 text-gray-500'}"
								>
									{i + 1}
								</div>

								<div class="min-w-0 flex-1">
									<p class="truncate font-bold text-zinc-900">{entry.name}</p>
									<p class="truncate text-xs font-bold text-gray-400 uppercase">
										{entry.college_name}
									</p>
								</div>

								<div class="flex gap-4 text-right">
									<div>
										<p class="text-[10px] font-bold text-gray-400 uppercase">Score</p>
										<p class="font-bold text-blue-600">{entry.score}</p>
									</div>
									<div class="w-20">
										<p class="text-[10px] font-bold text-gray-400 uppercase">Time</p>
										<p class="flex items-center justify-end gap-1 font-bold text-zinc-600">
											<Timer size={12} />
											{formatTime(entry.time_taken)}
										</p>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	/* Global Font Import */
	@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

	.font-poppins {
		font-family: 'Poppins', sans-serif;
	}

	.glass-card {
		background: rgba(255, 255, 255, 0.4);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.6);
	}

	/* Blob Animations */
	@keyframes blob {
		0% {
			transform: translate(0px, 0px) scale(1);
		}
		33% {
			transform: translate(30px, -50px) scale(1.1);
		}
		66% {
			transform: translate(-20px, 20px) scale(0.9);
		}
		100% {
			transform: translate(0px, 0px) scale(1);
		}
	}
	.animate-blob {
		animation: blob 20s infinite;
	}
	.animation-delay-2000 {
		animation-delay: 2s;
	}
	.animation-delay-4000 {
		animation-delay: 4s;
	}
</style>
