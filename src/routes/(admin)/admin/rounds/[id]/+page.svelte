<script>
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import {
		ChevronLeft,
		Plus,
		List,
		PlayCircle,
		Users,
		Trophy,
		Loader2,
		AlertCircle,
		CheckCircle2,
		X,
		Trash2,
		Clock,
		PauseCircle,
		ArrowRight
	} from 'lucide-svelte';
	import { API_BASE_URL, authenticatedFetch } from '$lib';
	import { page } from '$app/state';

	const roundId = page.params.id;

	// --- STATE ---
	let round = $state(null);
	let room = $state(null);
	let batches = $state([]);
	let isLoading = $state(true);
	let isActionLoading = $state(false);
	let error = $state('');

	let showCreateBatchModal = $state(false);
	let showPromoteModal = $state(false);

	// Modal States
	let newBatchNumber = $state(1);
	let promoteTopN = $state(10);

	let refreshInterval;

	// Sorted copy so we never mutate reactive state in-place
	let sortedBatches = $derived([...batches].sort((a, b) => a.batch_number - b.batch_number));

	// --- ACTIONS ---
	onMount(async () => {
		try {
			await Promise.all([fetchRoundDetail(), fetchBatches()]);
		} catch (e) {
			error = 'Failed to load page data. Please refresh.';
		} finally {
			isLoading = false;
		}

		// Refresh batches periodically
		refreshInterval = setInterval(fetchBatches, 5000);
	});

	onDestroy(() => {
		if (refreshInterval) clearInterval(refreshInterval);
	});

	async function fetchRoundDetail() {
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/rounds/${roundId}`);
			const result = await res.json();
			if (result.success) {
				round = result.data;
				// Attempt to fetch room for breadcrumb context
				if (round.room_id) {
					fetchRoom(round.room_id);
				}
			}
		} catch (err) {
			error = 'Failed to load round details';
		}
	}

	async function fetchRoom(roomId) {
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/rooms/${roomId}`);
			const result = await res.json();
			if (result.success) {
				room = result.data;
			}
		} catch (e) {
			// ignore room fetch failure
		}
	}

	async function fetchBatches() {
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/rounds/${roundId}/batches`);
			const result = await res.json();
			if (result.success) {
				batches = result.data;
				if (batches.length > 0) {
					newBatchNumber = Math.max(...batches.map((b) => b.batch_number)) + 1;
				} else {
					newBatchNumber = 1;
				}
			}
		} catch (err) {
			console.error('Failed to load batches');
		}
	}

	async function handleCreateBatch(e) {
		e.preventDefault();
		isActionLoading = true;
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/rounds/${roundId}/batches`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ batch_number: newBatchNumber })
			});
			const result = await res.json();

			if (result.success) {
				showCreateBatchModal = false;
				// Re-fetch from server so list matches server truth
				await fetchBatches();
			} else {
				alert(result.error || 'Failed to create batch');
			}
		} catch (err) {
			alert('Connection error');
		} finally {
			isActionLoading = false;
		}
	}

	async function handlePromote(e) {
		e.preventDefault();
		if (
			!confirm(
				`Are you sure you want to promote the Top ${promoteTopN} participants? All batches must be ended.`
			)
		)
			return;

		isActionLoading = true;
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/rounds/${roundId}/promote`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ promote_top_n: promoteTopN })
			});
			const result = await res.json();

			if (result.success) {
				alert(`Successfully promoted ${result.data.promoted_count} participants!`);
				showPromoteModal = false;
				await fetchRoundDetail(); // Refresh data
			} else {
				alert(result.error || 'Promotion failed. Ensure all batches have ended.');
			}
		} catch (err) {
			alert('Connection error');
		} finally {
			isActionLoading = false;
		}
	}

	const INPUT_CLASSES =
		'h-14 w-full rounded-2xl border border-gray-100 bg-white/60 px-6 text-sm font-bold text-zinc-900 transition-all outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5';
</script>

<svelte:head>
	<title>{round ? `Round ${round.round_number} | ` : 'Loading... | '}Manage Round</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 pb-32 md:p-8 lg:p-12">
	<!-- Navigation -->
	<header class="mb-10 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a
				href={room ? `/admin/rooms/${room.id}` : '/admin/rooms'}
				class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-zinc-500 shadow-sm transition-all hover:bg-zinc-900 hover:text-white active:scale-95"
			>
				<ChevronLeft size={24} />
			</a>
			<div>
				<p class="text-[10px] font-black tracking-widest text-blue-600 uppercase">
					{room ? `${room.name} > Round ${round?.round_number}` : 'Round Management'}
				</p>
				<h1 class="text-3xl font-bold tracking-tight text-zinc-900">
					{round?.title || 'Loading Round...'}
				</h1>
			</div>
		</div>

		<div class="flex items-center gap-4">
			<button
				onclick={() => (showPromoteModal = true)}
				class="hidden h-12 items-center gap-2 rounded-2xl border border-gray-100 bg-white px-6 font-bold text-zinc-900 shadow-sm transition-all hover:bg-gray-50 active:scale-95 sm:flex"
			>
				<Trophy size={18} class="text-amber-500" />
				<span>Promote Top N</span>
			</button>
			<button
				onclick={() => (showCreateBatchModal = true)}
				class="flex h-12 items-center gap-2 rounded-2xl bg-zinc-900 px-6 font-bold text-white shadow-xl shadow-zinc-900/20 transition-all hover:bg-zinc-800 active:scale-95"
			>
				<Plus size={20} />
				<span>Add Batch</span>
			</button>
		</div>
	</header>

	{#if isLoading}
		<div class="flex h-64 items-center justify-center">
			<Loader2 class="h-10 w-10 animate-spin text-blue-500" />
		</div>
	{:else if !round}
		<div class="rounded-3xl border border-red-100 bg-red-50 p-12 text-center text-red-500">
			<AlertCircle class="mx-auto mb-4" size={40} />
			<p class="text-xl font-bold">Round Not Found</p>
			<button onclick={() => history.back()} class="mt-4 inline-block font-bold underline"
				>Go Back</button
			>
		</div>
	{:else}
		<!-- Round Info Stats -->
		<div class="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
			<div
				class="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-xl shadow-blue-900/5 backdrop-blur-3xl"
			>
				<div class="mb-2 flex items-center gap-3 text-gray-400">
					<List size={16} />
					<span class="text-[10px] font-black tracking-widest uppercase">Questions</span>
				</div>
				<p class="text-2xl font-bold text-zinc-900">
					{round.questions_per_participant}
					<span class="text-sm font-medium text-gray-400">per user</span>
				</p>
			</div>

			<div
				class="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-xl shadow-blue-900/5 backdrop-blur-3xl"
			>
				<div class="mb-2 flex items-center gap-3 text-gray-400">
					<Clock size={16} />
					<span class="text-[10px] font-black tracking-widest uppercase">Duration</span>
				</div>
				<p class="text-2xl font-bold text-zinc-900">
					{Math.floor(round.duration_seconds / 60)}
					<span class="text-sm font-medium text-gray-400">mins</span>
				</p>
			</div>

			<div
				class="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-xl shadow-blue-900/5 backdrop-blur-3xl"
			>
				<div class="mb-2 flex items-center gap-3 text-gray-400">
					<PlayCircle size={16} />
					<span class="text-[10px] font-black tracking-widest uppercase">Status</span>
				</div>
				<div
					class="inline-flex rounded-full px-3 py-1 text-xs font-black tracking-widest uppercase {round.status ===
					'completed'
						? 'bg-green-100 text-green-600'
						: round.status === 'active'
							? 'bg-blue-100 text-blue-600'
							: 'bg-zinc-100 text-zinc-500'}"
				>
					{round.status || 'PENDING'}
				</div>
			</div>

			<div
				class="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-xl shadow-blue-900/5 backdrop-blur-3xl"
			>
				<div class="mb-2 flex items-center gap-3 text-gray-400">
					<Users size={16} />
					<span class="text-[10px] font-black tracking-widest uppercase">Batches</span>
				</div>
				<p class="text-2xl font-bold text-zinc-900">{batches.length}</p>
			</div>
		</div>

		<!-- Mobile promotion button -->
		<button
			onclick={() => (showPromoteModal = true)}
			class="mb-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-white font-bold text-zinc-900 shadow-sm transition-all active:scale-95 sm:hidden"
		>
			<Trophy size={18} class="text-amber-500" />
			<span>Promote Top N</span>
		</button>

		<div class="flex flex-col gap-6">
			<div class="flex items-center justify-between">
				<h2 class="text-2xl font-bold text-zinc-900">Configured Batches</h2>
			</div>

			{#if batches.length === 0}
				<div
					in:fade
					class="flex flex-col items-center justify-center rounded-[40px] border-2 border-dashed border-gray-200 bg-white/20 py-24 text-center"
				>
					<div
						class="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gray-50 text-gray-400"
					>
						<Users size={32} />
					</div>
					<h3 class="text-xl font-bold text-zinc-900">No batches created</h3>
					<p class="mt-2 text-sm leading-relaxed font-medium text-gray-500">
						Create a batch to assign participants and start the quiz.
					</p>
				</div>
			{:else}
				<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each sortedBatches as batch, i}
						<div
							in:fly={{ y: 20, delay: i * 50 }}
							class="group relative overflow-hidden rounded-[32px] border border-white/60 bg-white/40 p-1 shadow-2xl shadow-blue-900/5 backdrop-blur-3xl transition-all hover:shadow-blue-900/10"
						>
							<div class="flex flex-col gap-4 p-6">
								<div class="flex items-start justify-between">
									<div class="flex items-center gap-3">
										<div
											class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 font-black text-blue-600 shadow-inner"
										>
											{batch.batch_number}
										</div>
										<h3 class="text-lg font-bold text-zinc-900">Batch {batch.batch_number}</h3>
									</div>
									<span
										class="rounded-full px-2 py-1 text-[9px] font-black tracking-widest uppercase {batch.status ===
										'ended'
											? 'bg-amber-100 text-amber-600'
											: batch.status === 'started'
												? 'bg-green-100 text-green-600'
												: 'bg-zinc-100 text-zinc-500'}"
									>
										{batch.status || 'PENDING'}
									</span>
								</div>

								<div
									class="flex items-center justify-between rounded-2xl border border-white/60 bg-white/50 p-4"
								>
									<div class="flex flex-col">
										<span class="text-[10px] font-black tracking-widest text-gray-400 uppercase"
											>Participants</span
										>
										<span class="text-lg font-bold text-zinc-900"
											>{batch.participants?.length || 0}</span
										>
									</div>
									<Users class="text-gray-300" size={24} />
								</div>

								<a
									href={`/admin/batches/${batch.id}`}
									class="mt-2 flex items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 font-bold text-white shadow-lg shadow-zinc-900/20 transition-all hover:bg-zinc-800 active:scale-95"
								>
									<span>Manage Batch</span>
									<ArrowRight size={16} />
								</a>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Modals -->

{#if showCreateBatchModal}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-md"
		in:fade
	>
		<div
			class="w-full max-w-sm overflow-hidden rounded-[40px] bg-white shadow-2xl"
			in:fly={{ y: 20 }}
		>
			<div class="flex items-center justify-between border-b border-gray-50 p-6 text-zinc-900">
				<h2 class="text-xl font-bold">New Batch</h2>
				<button
					onclick={() => (showCreateBatchModal = false)}
					class="rounded-xl p-2 text-gray-400 hover:bg-gray-100"
				>
					<X size={20} />
				</button>
			</div>

			<form onsubmit={handleCreateBatch} class="p-6">
				<label
					for="batch-num"
					class="mb-2 block text-[10px] font-black tracking-widest text-zinc-400 uppercase"
					>Batch Number</label
				>
				<input
					id="batch-num"
					type="number"
					bind:value={newBatchNumber}
					required
					min="1"
					class={INPUT_CLASSES}
				/>

				<button
					type="submit"
					disabled={isActionLoading}
					class="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-zinc-900 font-bold text-white shadow-xl shadow-zinc-900/20 transition-all hover:bg-zinc-800 active:scale-95 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none"
				>
					{#if isActionLoading}
						<Loader2 class="animate-spin" size={18} /> Preparing...
					{:else}
						<CheckCircle2 size={18} /> Create Batch
					{/if}
				</button>
			</form>
		</div>
	</div>
{/if}

{#if showPromoteModal}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-md"
		in:fade
	>
		<div
			class="w-full max-w-sm overflow-hidden rounded-[40px] bg-white shadow-2xl"
			in:fly={{ y: 20 }}
		>
			<div class="flex items-center justify-between border-b border-gray-50 p-6 text-zinc-900">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600"
					>
						<Trophy size={18} />
					</div>
					<h2 class="text-xl font-bold">Promote Top N</h2>
				</div>
				<button
					onclick={() => (showPromoteModal = false)}
					class="rounded-xl p-2 text-gray-400 hover:bg-gray-100"
				>
					<X size={20} />
				</button>
			</div>

			<form onsubmit={handlePromote} class="p-6">
				<p class="mb-6 text-xs leading-relaxed font-medium text-zinc-500">
					Ensure all batches for this round have ended. This will calculate scores and promote the
					top candidates.
				</p>

				<label
					for="top-n"
					class="mb-2 block text-[10px] font-black tracking-widest text-zinc-400 uppercase"
					>Number of Participants to Promote</label
				>
				<input
					id="top-n"
					type="number"
					bind:value={promoteTopN}
					required
					min="1"
					class={INPUT_CLASSES}
				/>

				<button
					type="submit"
					disabled={isActionLoading}
					class="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-amber-500 font-bold text-white shadow-xl shadow-amber-500/20 transition-all hover:bg-amber-600 active:scale-95 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none"
				>
					{#if isActionLoading}
						<Loader2 class="animate-spin" size={18} /> Promoting...
					{:else}
						<Trophy size={18} /> Confirm Promotion
					{/if}
				</button>
			</form>
		</div>
	</div>
{/if}

<style>
	@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

	.font-poppins {
		font-family: 'Poppins', sans-serif;
	}
</style>
