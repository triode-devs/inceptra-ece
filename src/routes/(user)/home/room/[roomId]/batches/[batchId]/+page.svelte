<script>
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import {
		Clock,
		AlertCircle,
		Loader2,
		CheckCircle2,
		ShieldAlert,
		ChevronRight,
		ChevronLeft
	} from 'lucide-svelte';
	import { API_BASE_URL } from '$lib';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	const roomId = page.params.roomId;
	const batchId = page.params.batchId;

	// --- STATE ---
	let user = $state(null);
	let statusData = $state(null);
	let questions = $state([]);

	let isLoading = $state(true);
	let isSubmitting = $state(false);
	let error = $state('');

	// Quiz navigation
	let currentIndex = $state(0);
	let currentQuestion = $derived(questions[currentIndex]);
	let progressPercent = $derived((currentIndex / Math.max(questions.length - 1, 1)) * 100);

	// Answers: { question_id: 'A' | 'B' | 'C' | 'D' }
	let answers = $state({});
	let answeredCount = $derived(Object.keys(answers).length);

	// Timer
	let timeRemainingSeconds = $state(0);
	let timerInterval;
	let statusInterval;

	const formatMin = $derived(String(Math.floor(timeRemainingSeconds / 60)).padStart(2, '0'));
	const formatSec = $derived(String(Math.floor(timeRemainingSeconds) % 60).padStart(2, '0'));
	const isTimeLow = $derived(timeRemainingSeconds > 0 && timeRemainingSeconds < 60);

	// View mode derived from state
	let mode = $derived(
		statusData?.status === 'started' && questions.length > 0 ? 'playing' : 'waiting'
	);

	onMount(async () => {
		const token = localStorage.getItem('participant_token');
		const userData = localStorage.getItem('participant_user');

		if (!token) {
			goto('/');
			return;
		}
		if (userData) user = JSON.parse(userData);

		await checkStatus();
		isLoading = false;

		// Poll status every 3s
		statusInterval = setInterval(checkStatus, 3000);
	});

	onDestroy(() => {
		if (timerInterval) clearInterval(timerInterval);
		if (statusInterval) clearInterval(statusInterval);
	});

	async function checkStatus() {
		try {
			const token = localStorage.getItem('participant_token');
			const res = await fetch(`${API_BASE_URL}/participant/room/status`, {
				headers: { Authorization: `Bearer ${token}` }
			});

			// 404 = not currently in any batch — could be a race after a join, ignore silently
			if (res.status === 404 && !statusData) return;

			const result = await res.json();
			if (!result.success) return;

			// Ensure this is the right batch
			if (result.data.batch_id !== batchId) {
				error = 'This session belongs to a different batch.';
				clearInterval(statusInterval);
				return;
			}

			const previousStatus = statusData?.status;
			statusData = result.data;

			// Sync timer from server
			if (statusData.time_remaining_seconds != null) {
				timeRemainingSeconds = statusData.time_remaining_seconds;
			}

			// Pending → Started: fetch questions and start local countdown
			if (
				previousStatus !== 'started' &&
				statusData.status === 'started' &&
				questions.length === 0
			) {
				await fetchQuestions();
				startLocalTimer();
			}

			// Batch ended externally (admin force-ended) → go home
			if (statusData.status === 'ended') {
				clearInterval(statusInterval);
				clearInterval(timerInterval);
				goto('/home');
			}
		} catch (e) {
			// Silent fail — just retry on next tick
		}
	}

	function startLocalTimer() {
		if (timerInterval) clearInterval(timerInterval);
		timerInterval = setInterval(() => {
			if (timeRemainingSeconds > 0) {
				timeRemainingSeconds--;
			} else {
				clearInterval(timerInterval);
				if (mode === 'playing') submitUnanswered();
			}
		}, 1000);
	}

	async function fetchQuestions() {
		const token = localStorage.getItem('participant_token');
		try {
			const res = await fetch(`${API_BASE_URL}/participant/room/questions`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			const result = await res.json();
			if (result.success) {
				// Sort by question_order if present
				questions = result.data.sort((a, b) => (a.question_order ?? 0) - (b.question_order ?? 0));
			} else {
				throw new Error(result.error || 'Failed to load questions');
			}
		} catch (e) {
			error = e.message;
		}
	}

	async function handleSelection(letter) {
		const q = currentQuestion;
		if (!q) return;

		// Optimistic UI
		answers = { ...answers, [q.question_id]: letter };

		try {
			const token = localStorage.getItem('participant_token');
			await fetch(`${API_BASE_URL}/participant/room/answer`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({
					batch_id: batchId,
					question_id: q.question_id,
					selected_option: letter
				})
			});
		} catch (e) {
			console.warn('Answer save failed:', e);
		}

		// Auto-advance to next question after brief delay
		if (currentIndex < questions.length - 1) {
			setTimeout(() => {
				currentIndex++;
			}, 340);
		}
	}

	async function submitUnanswered() {
		isSubmitting = true;
		clearInterval(statusInterval);
		clearInterval(timerInterval);
		const token = localStorage.getItem('participant_token');
		try {
			await fetch(`${API_BASE_URL}/participant/room/submit`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` }
			});
		} catch (e) {
			// Best-effort — proceed to home either way
		} finally {
			isSubmitting = false;
			goto('/home');
		}
	}

	// Helpers for option display (API returns option_a_text, option_a_image etc.)
	function getOptions(q) {
		if (!q) return [];
		return [
			{ l: 'A', text: q.option_a_text, img: q.option_a_image },
			{ l: 'B', text: q.option_b_text, img: q.option_b_image },
			{ l: 'C', text: q.option_c_text, img: q.option_c_image },
			{ l: 'D', text: q.option_d_text, img: q.option_d_image }
		].filter((o) => o.text || o.img);
	}
</script>

<svelte:head>
	<title>Live Quiz</title>
</svelte:head>

<!-- Animated Background -->
<div class="fixed inset-0 -z-10 overflow-hidden bg-slate-50">
	<div class="absolute inset-0 bg-linear-to-br from-blue-50 via-white to-cyan-50"></div>
	<div
		class="animate-blob absolute top-0 -left-4 h-96 w-96 rounded-full bg-blue-300 opacity-50 mix-blend-multiply blur-3xl"
	></div>
	<div
		class="animate-blob animation-delay-2000 absolute top-0 -right-4 h-96 w-96 rounded-full bg-cyan-200 opacity-50 mix-blend-multiply blur-3xl"
	></div>
	<div
		class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"
	></div>
</div>

<div
	class="font-poppins relative flex min-h-screen w-full flex-col items-center justify-center p-4"
>
	<div
		class="mx-auto w-full max-w-xl rounded-[44px] border border-white/60 bg-white/50 p-6 shadow-2xl shadow-blue-900/10 backdrop-blur-3xl md:p-10"
	>
		<!-- ── LOADING ── -->
		{#if isLoading}
			<div class="flex h-60 flex-col items-center justify-center">
				<Loader2 class="mb-4 h-12 w-12 animate-spin text-blue-500" />
				<p class="font-bold text-zinc-900">Connecting to session…</p>
			</div>

			<!-- ── ERROR / MISMATCHED BATCH ── -->
		{:else if error && mode === 'waiting'}
			<div in:fade class="text-center">
				<div
					class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[24px] bg-red-50 text-red-500"
				>
					<ShieldAlert size={40} />
				</div>
				<h2 class="mb-2 text-2xl font-bold text-red-900">Session Error</h2>
				<p class="mb-6 text-sm font-medium text-red-500">{error}</p>
				<button
					onclick={() => goto('/home')}
					class="w-full rounded-[20px] bg-red-600 py-4 text-sm font-bold text-white shadow-xl hover:bg-red-700 active:scale-95"
				>
					Return to Dashboard
				</button>
			</div>

			<!-- ── WAITING FOR ADMIN TO START ── -->
		{:else if mode === 'waiting'}
			<div in:fade={{ duration: 300 }} class="py-6 text-center">
				<div
					class="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-[32px] bg-blue-100 text-blue-500"
				>
					<Loader2 size={56} class="absolute animate-spin opacity-20" />
					<Clock size={44} />
				</div>
				<h1 class="mb-3 text-3xl font-bold tracking-tight text-zinc-900">You're In!</h1>
				<p class="mx-auto max-w-xs text-sm leading-relaxed font-medium text-gray-500">
					You've joined the batch. Hold tight — the quiz will begin as soon as the admin starts it.
				</p>
				<div
					class="mx-auto mt-8 w-fit rounded-full bg-blue-50 px-5 py-2 text-xs font-black tracking-widest text-blue-600 uppercase ring-1 ring-blue-100"
				>
					Batch Connected ✓
				</div>
			</div>

			<!-- ── PLAYING ── -->
		{:else if mode === 'playing' && currentQuestion}
			{@const opts = getOptions(currentQuestion)}
			<div in:fade={{ duration: 200 }}>
				<!-- Timer + Progress header -->
				<div class="mb-6 flex items-center justify-between">
					<div>
						<p class="text-[10px] font-black tracking-widest text-gray-400 uppercase">Progress</p>
						<p class="text-2xl font-black text-zinc-900 tabular-nums">
							{currentIndex + 1}<span class="text-base text-gray-400"> / {questions.length}</span>
						</p>
					</div>
					<div
						class="flex items-center gap-2 rounded-2xl px-4 py-2 font-black tracking-widest text-white tabular-nums shadow-lg transition-colors {isTimeLow
							? 'animate-pulse bg-red-500 shadow-red-500/30'
							: 'bg-zinc-900 shadow-zinc-900/20'}"
					>
						{formatMin}:{formatSec}
					</div>
				</div>

				<!-- Progress bar -->
				<div class="mb-6 h-2 w-full overflow-hidden rounded-full bg-gray-100">
					<div
						class="h-full rounded-full bg-blue-500 transition-all duration-500"
						style="width:{progressPercent}%"
					></div>
				</div>

				<!-- Question marks badge -->
				<div class="mb-4 flex gap-2">
					{#if currentQuestion.marks}
						<span
							class="rounded-xl bg-green-100 px-3 py-1 text-[10px] font-black tracking-widest text-green-700 uppercase"
							>+{currentQuestion.marks} marks</span
						>
					{/if}
				</div>

				<!-- Question image -->
				{#if currentQuestion.question_image}
					<div class="mb-5 overflow-hidden rounded-2xl border border-gray-100 bg-white/60">
						<img
							src={currentQuestion.question_image}
							alt="Question"
							class="max-h-52 w-full object-contain p-2 mix-blend-multiply"
						/>
					</div>
				{/if}

				<!-- Question text -->
				<h3 class="mb-7 text-lg leading-snug font-bold text-zinc-900">
					{currentQuestion.question_text}
				</h3>

				<!-- Options -->
				<div class="mb-8 flex flex-col gap-3">
					{#each opts as opt}
						{@const isSelected = answers[currentQuestion.question_id] === opt.l}
						<button
							onclick={() => handleSelection(opt.l)}
							class="relative flex w-full flex-col rounded-[20px] border-2 bg-white text-left text-sm font-bold text-zinc-900 shadow-sm transition-all active:scale-[0.98] {isSelected
								? 'border-blue-500 bg-blue-50/60 shadow-blue-500/10'
								: 'border-transparent hover:border-gray-200 hover:bg-gray-50'}"
						>
							<!-- Label + text row -->
							<div class="flex min-h-14 w-full items-center gap-4 px-5 py-3.5">
								<span
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] font-black {isSelected
										? 'bg-blue-500 text-white'
										: 'bg-gray-100 text-gray-500'}"
								>
									{opt.l}
								</span>
								<span class="flex-1 leading-snug">{opt.text ?? ''}</span>
								{#if isSelected}
									<CheckCircle2 size={20} class="shrink-0 text-blue-500" />
								{/if}
							</div>

							<!-- Image (large, full-width below text) -->
							{#if opt.img}
								<div
									class="w-full overflow-hidden rounded-b-[18px] border-t border-gray-100 bg-white/80 p-3"
								>
									<img
										src={opt.img}
										alt="Option {opt.l}"
										class="mx-auto max-h-48 w-full object-contain mix-blend-multiply"
									/>
								</div>
							{/if}
						</button>
					{/each}
				</div>

				<!-- Answered count + prev/next navigation -->
				<div class="flex items-center gap-3">
					<button
						disabled={currentIndex === 0}
						onclick={() => currentIndex--}
						class="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-gray-200 bg-white text-zinc-600 transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-30"
					>
						<ChevronLeft size={20} />
					</button>

					<!-- answered dots overview -->
					<div class="flex flex-1 flex-wrap items-center justify-center gap-1.5 overflow-hidden">
						{#each questions as q, idx}
							<button
								onclick={() => (currentIndex = idx)}
								class="h-2.5 w-2.5 rounded-full transition-all {answers[q.question_id]
									? 'bg-blue-500'
									: 'bg-gray-200'} {idx === currentIndex ? 'scale-150' : 'hover:scale-125'}"
								title="Q{idx + 1}"
							></button>
						{/each}
					</div>

					{#if currentIndex === questions.length - 1}
						<button
							onclick={submitUnanswered}
							disabled={isSubmitting}
							class="flex h-12 items-center gap-2 rounded-[18px] bg-zinc-900 px-5 text-sm font-bold text-white shadow-xl shadow-zinc-900/20 hover:bg-zinc-800 active:scale-95 disabled:bg-gray-400"
						>
							{#if isSubmitting}
								<Loader2 size={16} class="animate-spin" /> Saving…
							{:else}
								Submit <ChevronRight size={16} />
							{/if}
						</button>
					{:else}
						<button
							onclick={() => currentIndex++}
							class="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-zinc-900 text-white shadow-xl shadow-zinc-900/20 transition-all hover:bg-zinc-800 active:scale-95"
						>
							<ChevronRight size={20} />
						</button>
					{/if}
				</div>

				<!-- Answered summary -->
				<p class="mt-4 text-center text-xs font-bold text-gray-400">
					{answeredCount} of {questions.length} answered
				</p>
			</div>

			<!-- ── RESULTS ── -->
		{:else if mode === 'finished'}
			<div in:fade={{ duration: 300 }} class="text-center">
				<div
					class="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[32px] bg-green-100 text-green-500 shadow-inner shadow-green-900/10"
				>
					<Trophy size={48} />
				</div>

				<h2 class="mb-1 text-3xl font-bold tracking-tight text-zinc-900">Results</h2>
				<p class="mb-8 text-sm font-medium text-gray-500">
					Your score has been recorded. Well done, {user?.name ?? 'Participant'}!
				</p>

				<div class="mb-6 grid grid-cols-2 gap-3">
					<div
						class="col-span-2 flex flex-col rounded-[24px] bg-zinc-900 p-6 text-white shadow-xl shadow-zinc-900/20"
					>
						<span class="mb-1 text-xs font-black tracking-widest uppercase opacity-50"
							>Total Marks</span
						>
						<span class="text-5xl font-black tabular-nums">{scoreResult.total_marks}</span>
					</div>
					<div class="flex flex-col rounded-[20px] border border-green-100 bg-green-50 p-5">
						<span class="mb-1 text-[10px] font-black tracking-widest text-green-600 uppercase"
							>Correct</span
						>
						<span class="text-3xl font-bold text-green-600 tabular-nums"
							>{scoreResult.correct_count}</span
						>
					</div>
					<div class="flex flex-col rounded-[20px] border border-red-100 bg-red-50 p-5">
						<span class="mb-1 text-[10px] font-black tracking-widest text-red-500 uppercase"
							>Wrong</span
						>
						<span class="text-3xl font-bold text-red-500 tabular-nums"
							>{scoreResult.wrong_count}</span
						>
					</div>
					<div
						class="col-span-2 flex flex-col rounded-[20px] border border-gray-100 bg-gray-50 p-5"
					>
						<span class="mb-1 text-[10px] font-black tracking-widest text-gray-400 uppercase"
							>Skipped</span
						>
						<span class="text-2xl font-bold text-gray-400 tabular-nums"
							>{scoreResult.unattempted}</span
						>
					</div>
				</div>

				<a
					href="/home"
					class="flex w-full items-center justify-center gap-2 rounded-[24px] bg-zinc-900 py-4 font-bold text-white shadow-xl shadow-zinc-900/20 transition-all hover:bg-zinc-800 active:scale-95"
				>
					Back to Dashboard <ArrowRight size={20} />
				</a>
			</div>
		{/if}
	</div>
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;900&display=swap');
	.font-poppins {
		font-family: 'Poppins', sans-serif;
	}

	@keyframes blob {
		0% {
			transform: translate(0, 0) scale(1);
		}
		33% {
			transform: translate(30px, -50px) scale(1.1);
		}
		66% {
			transform: translate(-20px, 20px) scale(0.9);
		}
		100% {
			transform: translate(0, 0) scale(1);
		}
	}
	.animate-blob {
		animation: blob 20s infinite;
	}
	.animation-delay-2000 {
		animation-delay: 2s;
	}
</style>
