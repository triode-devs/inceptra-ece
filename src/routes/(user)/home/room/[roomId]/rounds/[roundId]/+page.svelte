<script>
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import {
		ChevronLeft,
		LogOut,
		AlertCircle,
		Loader2,
		Users,
		Send,
		PlayCircle,
		Clock
	} from 'lucide-svelte';
	import { API_BASE_URL } from '$lib';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	const roomId = page.params.roomId;
	const roundId = page.params.roundId;

	// --- STATE ---
	let room = $state(null);
	let round = $state(null);
	let batches = $state([]);
	let user = $state(null);

	let isLoading = $state(true);
	let joiningBatchId = $state(null); // track which batch is being joined
	let error = $state('');
	let notPromoted = $state(null); // set if 403 NOT_PROMOTED returned — holds the server message

	// Self-Service form
	let score = $state('');
	let total_questions = $state('');
	let correct = $state('');
	let wrong = $state('');
	let unattempted = $state('');
	let isSubmitting = $state(false);
	let successMsg = $state('');

	let pollInterval;

	onMount(async () => {
		const token = localStorage.getItem('participant_token');
		const userData = localStorage.getItem('participant_user');

		if (!token) {
			goto('/');
			return;
		}

		if (userData) {
			user = JSON.parse(userData);
		}

		await fetchDetails(token);
		isLoading = false;

		// Poll batches every 5s for room mode so newly created batches appear
		if (room?.mode !== 'self_service') {
			pollInterval = setInterval(() => fetchBatches(), 5000);
		}
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});

	async function fetchDetails(token) {
		try {
			// Get rooms list to resolve room info & mode
			const roomRes = await fetch(`${API_BASE_URL}/participant/rooms`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			const roomResult = await roomRes.json();
			if (roomResult.success) {
				room = roomResult.data.find((r) => r.id === roomId);
				if (!room) {
					error = 'Room not found or you are not authorized.';
					return;
				}
			} else {
				throw new Error(roomResult.error || 'Failed to fetch rooms');
			}

			// Get rounds list and find this specific round
			const roundsRes = await fetch(`${API_BASE_URL}/participant/rooms/${roomId}/rounds`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			const roundsResult = await roundsRes.json();
			if (roundsResult.success) {
				round = roundsResult.data.find((r) => r.id === roundId);
				if (!round) {
					error = 'Round not found in this room.';
					return;
				}
			}

			// For room mode, fetch available batches
			if (room.mode !== 'self_service') {
				await fetchBatches();
			}
		} catch (err) {
			error = err.message || 'Connection error. Please try again.';
		}
	}

	async function fetchBatches() {
		const token = localStorage.getItem('participant_token');
		try {
			const res = await fetch(`${API_BASE_URL}/participant/rounds/${roundId}/batches`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			const result = await res.json();
			if (result.success) {
				batches = result.data;
			}
		} catch (e) {
			// silent fail on polling
		}
	}

	async function joinBatch(batchId) {
		joiningBatchId = batchId;
		error = '';
		notPromoted = null;
		const token = localStorage.getItem('participant_token');

		try {
			const res = await fetch(`${API_BASE_URL}/participant/room/join`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({ batch_id: batchId })
			});
			const result = await res.json();

			if (result.success) {
				goto(`/home/room/${roomId}/batches/${batchId}`);
			} else if (result.code === 'ALREADY_IN_ROUND') {
				// Already joined — go straight to the live area
				goto(`/home/room/${roomId}/batches/${batchId}`);
			} else if (result.code === 'NOT_PROMOTED') {
				// Not eligible for this round — show dedicated blocked screen
				notPromoted = result.error;
			} else {
				error = result.error || 'Failed to join batch';
			}
		} catch (e) {
			error = 'Connection error. Please try again.';
		} finally {
			joiningBatchId = null;
		}
	}

	async function submitSelfServiceScore(e) {
		e.preventDefault();
		isSubmitting = true;
		error = '';
		successMsg = '';
		const token = localStorage.getItem('participant_token');

		try {
			const res = await fetch(`${API_BASE_URL}/participant/self-service/submit`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					room_id: roomId,
					round_id: roundId,
					score: Number(score),
					total_questions: Number(total_questions),
					correct: Number(correct),
					wrong: Number(wrong),
					unattempted: Number(unattempted)
				})
			});
			const result = await res.json();

			if (result.success) {
				successMsg = 'Score submitted successfully!';
				setTimeout(() => goto('/home'), 2000);
			} else {
				error = result.error || 'Failed to submit score';
			}
		} catch (e) {
			error = 'Connection error. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	function handleLogout() {
		localStorage.removeItem('participant_token');
		localStorage.removeItem('participant_user');
		goto('/');
	}

	const STATUS_CONFIG = {
		started: { label: 'Live Now', classes: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
		pending: { label: 'Waiting', classes: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
		ended: { label: 'Ended', classes: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' }
	};
</script>

<svelte:head>
	<title>
		{round ? `Round ${round.round_number} — ${room?.name ?? ''}` : 'Loading...'} | Quiz
	</title>
</svelte:head>

<div class="fixed inset-0 -z-10 h-screen w-screen overflow-hidden bg-slate-50">
	<div class="absolute inset-0 bg-linear-to-br from-blue-50 via-white to-cyan-50"></div>
	<div
		class="animate-blob absolute top-0 -left-4 h-96 w-96 rounded-full bg-blue-300 opacity-60 mix-blend-multiply blur-3xl filter"
	></div>
	<div
		class="animate-blob animation-delay-2000 absolute top-0 -right-4 h-96 w-96 rounded-full bg-cyan-200 opacity-60 mix-blend-multiply blur-3xl filter"
	></div>
</div>

<div class="font-poppins relative min-h-screen w-full p-6 md:p-12 lg:p-16">
	<!-- Navbar -->
	<header class="mx-auto mb-12 flex max-w-2xl items-center justify-between">
		<div class="flex items-center gap-4">
			<a
				href={`/home/room/${roomId}`}
				class="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white text-zinc-500 shadow-sm transition-all hover:bg-zinc-900 hover:text-white active:scale-95"
			>
				<ChevronLeft size={24} />
			</a>
			<div>
				<p class="text-[10px] font-black tracking-widest text-blue-600 uppercase">
					{room?.name ?? 'Back to Room'}
				</p>
				<h1 class="text-2xl font-bold tracking-tight text-zinc-900">
					{round ? `Round ${round.round_number} — ${round.title ?? ''}` : 'Loading...'}
				</h1>
			</div>
		</div>

		<div class="flex items-center gap-3">
			<div class="hidden flex-col items-end md:flex">
				<span class="text-sm font-bold text-zinc-900">{user?.name || 'Participant'}</span>
				<span class="text-[10px] font-bold text-gray-400">{user?.id || ''}</span>
			</div>
			<button
				onclick={handleLogout}
				class="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white bg-white text-zinc-500 shadow-sm transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500 active:scale-95"
			>
				<LogOut size={20} />
			</button>
		</div>
	</header>

	<main class="mx-auto max-w-2xl">
		{#if isLoading}
			<div class="flex h-64 items-center justify-center">
				<Loader2 class="h-10 w-10 animate-spin text-blue-500" />
			</div>
		{:else if error && !room}
			<div
				in:fade
				class="mx-auto max-w-md rounded-[32px] border border-red-100 bg-red-50 p-8 text-center"
			>
				<div
					class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-red-500 shadow-sm"
				>
					<AlertCircle size={24} />
				</div>
				<h2 class="text-xl font-bold text-red-900">Error</h2>
				<p class="mt-2 text-sm font-medium text-red-600">{error}</p>
			</div>
		{:else if room?.mode === 'self_service'}
			<!-- ── SELF SERVICE SCORE FORM ── -->
			<div
				in:fade
				class="overflow-hidden rounded-[40px] border border-white/60 bg-white/40 shadow-2xl shadow-blue-900/5 backdrop-blur-3xl"
			>
				<div class="border-b border-white/60 bg-white/50 p-8">
					<div
						class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600"
					>
						<Send size={24} />
					</div>
					<h2 class="text-2xl font-bold text-zinc-900">Self-Service Submission</h2>
					<p class="mt-2 text-sm font-medium text-gray-500">
						After completing the external evaluation, accurately report your results below.
					</p>
				</div>

				<form onsubmit={submitSelfServiceScore} class="p-8">
					{#if error}
						<div
							class="mb-6 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600"
							in:fly={{ y: -8 }}
						>
							<AlertCircle size={18} />
							{error}
						</div>
					{/if}
					{#if successMsg}
						<div
							class="mb-6 flex items-center gap-2 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-bold text-green-700"
							in:fly={{ y: -8 }}
						>
							✅ {successMsg}
						</div>
					{/if}

					<div class="mb-5 grid grid-cols-2 gap-4">
						<div>
							<label
								for="score"
								class="mb-2 block text-[10px] font-black tracking-widest text-zinc-500 uppercase"
								>Your Score</label
							>
							<input
								id="score"
								type="number"
								step="0.5"
								bind:value={score}
								required
								placeholder="e.g. 36"
								class="h-14 w-full rounded-2xl border border-gray-100 bg-white/60 px-5 font-bold text-zinc-900 transition-all outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5"
							/>
						</div>
						<div>
							<label
								for="total"
								class="mb-2 block text-[10px] font-black tracking-widest text-zinc-500 uppercase"
								>Total Questions</label
							>
							<input
								id="total"
								type="number"
								min="1"
								bind:value={total_questions}
								required
								placeholder="e.g. 20"
								class="h-14 w-full rounded-2xl border border-gray-100 bg-white/60 px-5 font-bold text-zinc-900 transition-all outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5"
							/>
						</div>
					</div>

					<div class="mb-8 grid grid-cols-3 gap-4">
						<div>
							<label
								for="correct"
								class="mb-2 block text-[10px] font-black tracking-widest text-green-600 uppercase"
								>Correct</label
							>
							<input
								id="correct"
								type="number"
								min="0"
								bind:value={correct}
								required
								placeholder="0"
								class="h-14 w-full rounded-2xl border border-green-100 bg-white/60 px-4 font-bold text-green-900 transition-all outline-none focus:border-green-500 focus:bg-white"
							/>
						</div>
						<div>
							<label
								for="wrong"
								class="mb-2 block text-[10px] font-black tracking-widest text-red-500 uppercase"
								>Wrong</label
							>
							<input
								id="wrong"
								type="number"
								min="0"
								bind:value={wrong}
								required
								placeholder="0"
								class="h-14 w-full rounded-2xl border border-red-100 bg-white/60 px-4 font-bold text-red-900 transition-all outline-none focus:border-red-500 focus:bg-white"
							/>
						</div>
						<div>
							<label
								for="ua"
								class="mb-2 block text-[10px] font-black tracking-widest text-gray-500 uppercase"
								>Skipped</label
							>
							<input
								id="ua"
								type="number"
								min="0"
								bind:value={unattempted}
								required
								placeholder="0"
								class="h-14 w-full rounded-2xl border border-gray-100 bg-white/60 px-4 font-bold text-gray-900 transition-all outline-none"
							/>
						</div>
					</div>

					<button
						type="submit"
						disabled={isSubmitting}
						class="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 font-bold text-white shadow-xl shadow-zinc-900/20 transition-all hover:bg-zinc-800 active:scale-95 disabled:bg-zinc-300 disabled:shadow-none"
					>
						{#if isSubmitting}
							<Loader2 class="animate-spin" size={20} /> Submitting...
						{:else}
							<Send size={20} /> Submit Evaluation
						{/if}
					</button>
				</form>
			</div>
		{:else}
			<!-- ── ROOM MODE: BATCH LIST ── -->
			<div in:fade>
				<!-- Round Info Card -->
				{#if round}
					<div
						class="mb-6 flex items-center gap-4 rounded-[28px] border border-white/60 bg-white/40 p-5 shadow-md shadow-blue-900/5 backdrop-blur-xl"
					>
						<div
							class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-2xl font-black text-white shadow-lg"
						>
							R{round.round_number}
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-[10px] font-black tracking-widest text-blue-600 uppercase">
								Select a Batch
							</p>
							<h2 class="truncate text-xl font-bold text-zinc-900">
								{round.title ?? `Round ${round.round_number}`}
							</h2>
						</div>
						{#if round.duration_seconds}
							<div
								class="flex shrink-0 items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-600"
							>
								<Clock size={14} />
								{Math.floor(round.duration_seconds / 60)} min
							</div>
						{/if}
					</div>
				{/if}

				{#if notPromoted}
					<!-- NOT PROMOTED — show locked panel instead of batch list -->
					<div
						class="rounded-[36px] border-2 border-amber-100 bg-amber-50/60 p-10 text-center backdrop-blur-xl"
						in:fly={{ y: 12 }}
					>
						<div
							class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600"
						>
							🔒
						</div>
						<h3 class="text-xl font-bold text-zinc-900">Not Eligible</h3>
						<p class="mt-2 text-sm leading-relaxed font-medium text-amber-700">{notPromoted}</p>
						<p class="mt-3 text-xs font-bold text-amber-500">
							You must be promoted from the previous round to enter this one.
						</p>
						<a
							href="/home"
							class="mt-6 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white shadow-xl transition-all hover:bg-zinc-800 active:scale-95"
						>
							Back to Dashboard
						</a>
					</div>
				{:else if error}
					<div
						class="mb-4 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600"
						in:fly={{ y: -8 }}
					>
						<AlertCircle size={18} />
						{error}
					</div>
				{/if}

				{#if batches.length === 0}
					<div
						class="rounded-[36px] border-2 border-dashed border-gray-200 bg-white/30 p-16 text-center backdrop-blur-xl"
					>
						<div
							class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-500"
						>
							<Users size={30} />
						</div>
						<h3 class="text-xl font-bold text-zinc-900">No active batches yet</h3>
						<p class="mt-2 text-sm font-medium text-gray-500">
							The admin hasn't opened any batches for this round. This page will update
							automatically when one is available.
						</p>
						<div
							class="mt-6 flex items-center justify-center gap-2 text-xs font-bold tracking-widest text-blue-500 uppercase"
						>
							<Loader2 size={14} class="animate-spin" /> Checking for batches...
						</div>
					</div>
				{:else}
					<div class="flex flex-col gap-4">
						{#each batches as batch, i}
							{@const cfg = STATUS_CONFIG[batch.status] ?? STATUS_CONFIG.pending}
							<div
								in:fly={{ y: 16, delay: i * 80 }}
								class="group flex items-center gap-5 rounded-[28px] border border-white/60 bg-white/40 p-5 shadow-xl shadow-blue-900/5 backdrop-blur-xl transition-all"
							>
								<!-- Batch Number Badge -->
								<div
									class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-xl font-black text-zinc-700"
								>
									#{batch.batch_number}
								</div>

								<div class="min-w-0 flex-1">
									<p class="text-sm font-bold text-zinc-900">Batch {batch.batch_number}</p>
									{#if batch.started_at}
										<p class="text-xs font-medium text-gray-400">
											Started {new Date(batch.started_at).toLocaleTimeString()}
										</p>
									{:else}
										<p class="text-xs font-medium text-gray-400">Waiting to start</p>
									{/if}
								</div>

								<!-- Status Badge -->
								<div
									class="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-black tracking-widest uppercase {cfg.classes} shrink-0"
								>
									<span
										class="h-1.5 w-1.5 rounded-full {cfg.dot} inline-block {batch.status ===
										'started'
											? 'animate-ping'
											: ''}"
									></span>
									{cfg.label}
								</div>

								<!-- Join Button -->
								<button
									onclick={() => joinBatch(batch.id)}
									disabled={joiningBatchId === batch.id}
									class="flex h-11 shrink-0 items-center gap-2 rounded-[18px] bg-zinc-900 px-5 text-sm font-bold text-white shadow-lg shadow-zinc-900/20 transition-all hover:bg-zinc-800 active:scale-95 disabled:bg-zinc-400"
								>
									{#if joiningBatchId === batch.id}
										<Loader2 size={16} class="animate-spin" />
									{:else}
										<PlayCircle size={16} />
									{/if}
									Join
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</main>
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;900&display=swap');

	.font-poppins {
		font-family: 'Poppins', sans-serif;
	}

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
</style>
