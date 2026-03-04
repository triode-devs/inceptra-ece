<script>
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import {
		ChevronLeft,
		PlayCircle,
		StopCircle,
		Users,
		Trophy,
		Loader2,
		AlertCircle,
		CheckCircle2,
		Trash2,
		Clock,
		Search
	} from 'lucide-svelte';
	import { API_BASE_URL, authenticatedFetch } from '$lib';
	import { page } from '$app/state';

	const batchId = page.params.id;

	// --- STATE ---
	let batch = $state(null);
	let round = $state(null);
	let scores = $state([]);
	let isLoading = $state(true);
	let isActionLoading = $state(false);
	let error = $state('');
	let searchQuery = $state('');

	let refreshInterval;

	// --- ACTIONS ---
	onMount(async () => {
		try {
			await loadData();
		} catch (e) {
			// loadData has its own error handling; catch anything that slips through
		} finally {
			isLoading = false;
		}

		// Refresh batch periodically to get real-time status and participants
		refreshInterval = setInterval(loadData, 5000);
	});

	onDestroy(() => {
		if (refreshInterval) clearInterval(refreshInterval);
	});

	async function loadData() {
		try {
			await fetchBatchDetail();
			if (batch?.status === 'ended' && scores.length === 0) {
				await fetchScores();
			}
		} catch (e) {
			console.error('Polling error', e);
		}
	}

	async function fetchBatchDetail() {
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/batches/${batchId}`);
			const result = await res.json();
			if (result.success) {
				const oldStatus = batch?.status;
				batch = result.data;

				if (!round && batch.round_id) {
					fetchRound(batch.round_id);
				}

				if (oldStatus && oldStatus !== batch.status && batch.status === 'ended') {
					fetchScores();
				}
			}
		} catch (err) {
			if (!batch) error = 'Failed to load batch details';
		}
	}

	async function fetchRound(roundId) {
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/rounds/${roundId}`);
			const result = await res.json();
			if (result.success) {
				round = result.data;
			}
		} catch (e) {
			// ignore
		}
	}

	async function fetchScores() {
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/batches/${batchId}/scores`);
			const result = await res.json();
			if (result.success) {
				scores = result.data;
			}
		} catch (e) {
			// ignore
		}
	}

	async function updateBatchStatus(action) {
		// 'start' or 'end'
		let warnMsg =
			action === 'start'
				? 'Are you sure you want to START this batch now?'
				: 'Are you sure you want to END this batch? This will finalize scores.';

		if (!confirm(warnMsg)) return;

		isActionLoading = true;
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/batches/${batchId}/${action}`, {
				method: 'POST'
			});
			const result = await res.json();

			if (result.success) {
				batch.status = result.data.status;
				if (action === 'end') {
					await fetchScores();
				}
			} else {
				alert(result.error || `Failed to ${action} batch`);
			}
		} catch (err) {
			alert('Connection error');
		} finally {
			isActionLoading = false;
		}
	}

	async function deleteBatch() {
		if (!confirm('Permanently delete this batch? All associated data will be lost.')) return;

		isActionLoading = true;
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/batches/${batchId}`, {
				method: 'DELETE'
			});
			const result = await res.json();

			if (res.ok && result.success !== false) {
				history.back(); // Redirect out after delete
			} else {
				alert(result.error || 'Failed to delete batch');
			}
		} catch (err) {
			alert('Connection error');
		} finally {
			isActionLoading = false;
		}
	}

	let filteredParticipants = $derived(
		(batch?.participants || []).filter(
			(p) =>
				p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				p.participant_id?.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	let filteredScores = $derived(
		scores.filter(
			(s) =>
				s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				s.participant_id?.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);
</script>

<svelte:head>
	<title>{batch ? `Batch ${batch.batch_number} | ` : 'Loading... | '}Manage Batch</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 pb-32 md:p-8 lg:p-12">
	<!-- Navigation -->
	<header class="mb-10 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a
				href={round ? `/admin/rounds/${round.id}` : '/admin/rooms'}
				class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-zinc-500 shadow-sm transition-all hover:bg-zinc-900 hover:text-white active:scale-95"
			>
				<ChevronLeft size={24} />
			</a>
			<div>
				<p class="text-[10px] font-black tracking-widest text-blue-600 uppercase">
					{round ? `${round.title} > Batch ${batch?.batch_number}` : 'Batch Management'}
				</p>
				<h1 class="text-3xl font-bold tracking-tight text-zinc-900">
					Batch {batch?.batch_number || '...'}
				</h1>
			</div>
		</div>

		{#if batch && !isLoading}
			<div class="flex items-center gap-4">
				{#if batch.status === 'pending'}
					<button
						onclick={deleteBatch}
						disabled={isActionLoading}
						class="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-100 bg-white text-red-500 shadow-sm transition-all hover:bg-red-50 active:scale-95 disabled:opacity-50"
						title="Delete Batch"
					>
						<Trash2 size={20} />
					</button>
					<button
						onclick={() => updateBatchStatus('start')}
						disabled={isActionLoading}
						class="flex h-12 items-center gap-2 rounded-2xl bg-zinc-900 px-6 font-bold text-white shadow-xl shadow-zinc-900/20 transition-all hover:bg-zinc-800 active:scale-95 disabled:opacity-50"
					>
						{#if isActionLoading}
							<Loader2 class="animate-spin" size={20} />
						{:else}
							<PlayCircle size={20} />
						{/if}
						<span>Start Batch</span>
					</button>
				{:else if batch.status === 'started'}
					<button
						onclick={() => updateBatchStatus('end')}
						disabled={isActionLoading}
						class="flex h-12 items-center gap-2 rounded-2xl bg-red-500 px-6 font-bold shadow-xl shadow-red-500/20 transition-all hover:bg-red-600 active:scale-95 disabled:opacity-50"
					>
						{#if isActionLoading}
							<Loader2 class="animate-spin" size={20} />
						{:else}
							<StopCircle size={20} />
						{/if}
						<span>Force End Batch</span>
					</button>
				{:else}
					<div
						class="flex h-12 items-center gap-2 rounded-2xl bg-green-100 px-6 font-bold text-green-700 shadow-sm"
					>
						<CheckCircle2 size={20} />
						<span>Batch Ended</span>
					</div>
				{/if}
			</div>
		{/if}
	</header>

	{#if isLoading && !batch}
		<div class="flex h-64 items-center justify-center">
			<Loader2 class="h-10 w-10 animate-spin text-blue-500" />
		</div>
	{:else if !batch}
		<div class="rounded-3xl border border-red-100 bg-red-50 p-12 text-center text-red-500">
			<AlertCircle class="mx-auto mb-4" size={40} />
			<p class="text-xl font-bold">Batch Not Found</p>
			<button onclick={() => history.back()} class="mt-4 inline-block font-bold underline"
				>Go Back</button
			>
		</div>
	{:else}
		<!-- Batch Info Stats -->
		<div class="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
			<div
				class="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-xl shadow-blue-900/5 backdrop-blur-3xl"
			>
				<div class="mb-2 flex items-center gap-3 text-gray-400">
					<Users size={16} />
					<span class="text-[10px] font-black tracking-widest uppercase">Participants</span>
				</div>
				<p class="text-2xl font-bold text-zinc-900">{batch.participants?.length || 0}</p>
			</div>

			<div
				class="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-xl shadow-blue-900/5 backdrop-blur-3xl"
			>
				<div class="mb-2 flex items-center gap-3 text-gray-400">
					<CheckCircle2 size={16} />
					<span class="text-[10px] font-black tracking-widest uppercase">Status</span>
				</div>
				<p
					class="text-xl font-bold {batch.status === 'ended'
						? 'text-amber-600'
						: batch.status === 'started'
							? 'text-green-600'
							: 'text-zinc-500'} uppercase"
				>
					{batch.status || 'Pending'}
				</p>
			</div>

			<div
				class="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-xl shadow-blue-900/5 backdrop-blur-3xl lg:col-span-2"
			>
				<div class="mb-2 flex items-center gap-3 text-gray-400">
					<Clock size={16} />
					<span class="text-[10px] font-black tracking-widest uppercase">Timing Info</span>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<p class="text-[10px] font-bold text-gray-400 uppercase">Started At</p>
						<p class="mt-1 truncate text-sm font-bold text-zinc-900">
							{batch.started_at ? new Date(batch.started_at).toLocaleString() : '--'}
						</p>
					</div>
					<div>
						<p class="text-[10px] font-bold text-gray-400 uppercase">Ended At</p>
						<p class="mt-1 truncate text-sm font-bold text-zinc-900">
							{batch.ended_at ? new Date(batch.ended_at).toLocaleString() : '--'}
						</p>
					</div>
				</div>
			</div>
		</div>

		<div class="flex flex-col gap-6">
			<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
				<h2 class="text-2xl font-bold text-zinc-900">
					{batch.status === 'ended' ? 'Batch Scores' : 'Current Participants'}
				</h2>

				<div class="relative w-full sm:w-72">
					<Search class="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" size={18} />
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search via Name or ID..."
						class="h-12 w-full rounded-2xl border border-white bg-white/60 pr-4 pl-11 text-sm font-bold text-zinc-900 shadow-sm transition-all outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5"
					/>
				</div>
			</div>

			{#if batch.status === 'ended'}
				<!-- SCORE BOARD -->
				<div
					class="overflow-hidden rounded-[32px] border border-white/60 bg-white/40 shadow-2xl shadow-blue-900/5 backdrop-blur-3xl"
				>
					<div class="overflow-x-auto">
						<table class="w-full text-left text-sm">
							<thead
								class="border-b border-white/60 bg-white/50 text-[10px] font-black tracking-widest text-gray-400 uppercase"
							>
								<tr>
									<th class="px-6 py-4">Rank</th>
									<th class="px-6 py-4">Participant</th>
									<th class="py-4text-center px-6">Total Marks</th>
									<th class="px-6 py-4 text-center">Correct</th>
									<th class="px-6 py-4 text-center">Wrong</th>
									<th class="px-6 py-4 text-center">Unattempted</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-white/60 font-medium text-zinc-900">
								{#if filteredScores.length === 0}
									<tr>
										<td colspan="6" class="px-6 py-12 text-center text-gray-500">
											{searchQuery ? 'No scores match your search.' : 'No scores available.'}
										</td>
									</tr>
								{:else}
									{#each filteredScores.sort((a, b) => b.total_marks - a.total_marks) as score, i}
										<tr class="transition-colors hover:bg-white/50">
											<td class="px-6 py-4 font-bold whitespace-nowrap text-zinc-900">
												#{i + 1}
											</td>
											<td class="px-6 py-4">
												<div class="font-bold">{score.name}</div>
												<div class="text-[10px] tracking-widest text-gray-400 uppercase">
													{score.participant_id}
												</div>
											</td>
											<td
												class="px-6 py-4 text-center text-lg font-black whitespace-nowrap text-blue-600"
											>
												{score.total_marks}
											</td>
											<td class="px-6 py-4 text-center font-bold whitespace-nowrap text-green-600">
												{score.correct_count}
											</td>
											<td class="px-6 py-4 text-center font-bold whitespace-nowrap text-red-500">
												{score.wrong_count}
											</td>
											<td class="px-6 py-4 text-center font-bold whitespace-nowrap text-gray-400">
												{score.unattempted}
											</td>
										</tr>
									{/each}
								{/if}
							</tbody>
						</table>
					</div>
				</div>
			{:else}
				<!-- LIVE PARTICIPANTS -->
				<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each filteredParticipants as participant, i}
						<div
							in:fly={{ y: 20, delay: i * 20 }}
							class="flex items-center gap-4 rounded-3xl border border-white/60 bg-white/40 p-4 shadow-xl shadow-blue-900/5 backdrop-blur-3xl"
						>
							<img
								src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(participant.name)}`}
								alt={participant.name}
								class="h-12 w-12 rounded-full border-2 border-white bg-blue-50/50"
							/>
							<div>
								<h3 class="leading-tight font-bold text-zinc-900">{participant.name}</h3>
								<p class="text-[10px] font-black tracking-widest text-gray-400 uppercase">
									{participant.participant_id}
								</p>
							</div>
						</div>
					{:else}
						<div
							class="col-span-full rounded-2xl border-2 border-dashed border-gray-200 bg-white/20 py-12 text-center"
						>
							<p class="text-sm font-bold text-gray-500">
								{searchQuery
									? 'No participants found matching search.'
									: 'Waiting for participants to join...'}
							</p>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

	.font-poppins {
		font-family: 'Poppins', sans-serif;
	}
</style>
