<script>
	import { onMount } from 'svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import {
		DoorOpen,
		Plus,
		ChevronLeft,
		Trash2,
		Edit3,
		Loader2,
		AlertCircle,
		LayoutGrid,
		Settings2,
		X,
		CheckCircle2,
		ArrowRight,
		Layers,
		ClipboardList,
		Clock,
		ExternalLink
	} from 'lucide-svelte';
	import { API_BASE_URL, authenticatedFetch } from '$lib';
	import { page } from '$app/state';

	const roomId = page.params.id;

	// --- STATE ---
	let room = $state(null);
	let rounds = $state([]);
	let questionSets = $state([]);
	let isLoading = $state(true);
	let isSavingRound = $state(false);
	let error = $state('');
	let showAddRoundModal = $state(false);

	// New Round Form State
	let newRound = $state({
		round_number: 1,
		title: '',
		question_set_id: '',
		questions_per_participant: 20,
		duration_seconds: 600
	});

	// --- ACTIONS ---

	// Sorted copy — never mutate reactive state in-place
	let sortedRounds = $derived([...rounds].sort((a, b) => a.round_number - b.round_number));
	onMount(async () => {
		try {
			await Promise.all([fetchRoomDetail(), fetchRounds(), fetchQuestionSets()]);
		} catch (e) {
			error = 'Failed to load page. Please refresh.';
		} finally {
			isLoading = false;
		}
	});

	async function fetchRoomDetail() {
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/rooms/${roomId}`);
			const result = await res.json();
			if (result.success) {
				room = result.data;
			}
		} catch (err) {
			error = 'Failed to load room details';
		}
	}

	async function fetchRounds() {
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/rooms/${roomId}/rounds`);
			const result = await res.json();
			if (result.success) {
				rounds = result.data;
				// Auto-increment round number for next round
				if (rounds.length > 0) {
					newRound.round_number = Math.max(...rounds.map((r) => r.round_number)) + 1;
				}
			}
		} catch (err) {
			error = 'Failed to load rounds';
		}
	}

	async function fetchQuestionSets() {
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/question-sets`);
			const result = await res.json();
			if (result.success) {
				questionSets = result.data;
			}
		} catch (err) {
			console.error('Failed to load question sets');
		}
	}

	async function handleAddRound(e) {
		e.preventDefault();
		if (!newRound.question_set_id) {
			alert('Please select a question set');
			return;
		}

		isSavingRound = true;
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/rooms/${roomId}/rounds`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newRound)
			});
			const result = await res.json();

			if (result.success) {
				showAddRoundModal = false;
				// Re-fetch from server to get complete, accurate round data
				await fetchRounds();
				newRound = {
					round_number: rounds.length > 0 ? Math.max(...rounds.map((r) => r.round_number)) + 1 : 1,
					title: '',
					question_set_id: '',
					questions_per_participant: 20,
					duration_seconds: 600
				};
			} else {
				alert(result.error || 'Failed to add round');
			}
		} catch (err) {
			alert('Connection error');
		} finally {
			isSavingRound = false;
		}
	}

	async function deleteRound(roundId) {
		if (!confirm('Permanently delete this round and all its data?')) return;
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/rounds/${roundId}`, {
				method: 'DELETE'
			});
			const result = await res.json();
			if (result.success) {
				rounds = rounds.filter((r) => r.id !== roundId);
			} else {
				alert(result.error || 'Delete failed');
			}
		} catch (err) {
			alert('Connection error');
		}
	}

	const INPUT_CLASSES =
		'h-14 w-full rounded-2xl border border-gray-100 bg-white/60 px-6 text-sm font-bold text-zinc-900 transition-all outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5';
</script>

<svelte:head>
	<title>{room ? room.name : 'Loading...'} | Room Details</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 pb-32 md:p-8 lg:p-12">
	<!-- Navigation -->
	<header class="mb-10 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a
				href="/admin/rooms"
				class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-zinc-500 shadow-sm transition-all hover:bg-zinc-900 hover:text-white active:scale-95"
			>
				<ChevronLeft size={24} />
			</a>
			<div>
				<p class="text-[10px] font-black tracking-widest text-blue-600 uppercase">
					Room Management
				</p>
				<h1 class="text-3xl font-bold tracking-tight text-zinc-900">
					{room?.name || 'Loading Room...'}
				</h1>
			</div>
		</div>

		<button
			onclick={() => (showAddRoundModal = true)}
			class="flex h-12 items-center gap-2 rounded-2xl bg-zinc-900 px-6 font-bold text-white shadow-xl shadow-zinc-900/20 transition-all hover:bg-zinc-800 active:scale-95"
		>
			<Plus size={20} />
			<span>Add Round</span>
		</button>
	</header>

	{#if isLoading}
		<div class="flex h-64 items-center justify-center">
			<Loader2 class="h-10 w-10 animate-spin text-blue-500" />
		</div>
	{:else if !room}
		<div class="rounded-3xl border border-red-100 bg-red-50 p-12 text-center text-red-500">
			<AlertCircle class="mx-auto mb-4" size={40} />
			<p class="text-xl font-bold">Room Not Found</p>
			<a href="/admin/rooms" class="mt-4 inline-block font-bold underline">Back to list</a>
		</div>
	{:else}
		<!-- Room Info Header -->
		<div class="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
			<div
				class="rounded-[40px] border border-white/60 bg-white/40 p-8 shadow-xl shadow-blue-900/5 backdrop-blur-3xl lg:col-span-2"
			>
				<div class="flex items-start justify-between">
					<div>
						<span
							class="rounded-full px-4 py-1.5 text-[10px] font-black tracking-widest uppercase {room.mode ===
							'room'
								? 'bg-orange-100 text-orange-600'
								: 'bg-blue-100 text-blue-600'}"
						>
							{room.mode.replace('_', ' ')} MODE
						</span>
						<p class="mt-6 text-lg leading-relaxed font-medium text-gray-400">
							{room.description || 'No description provided for this hall.'}
						</p>
					</div>
					<div
						class="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-900 text-white shadow-xl"
					>
						<DoorOpen size={32} />
					</div>
				</div>
			</div>

			<div
				class="flex flex-col justify-between rounded-[40px] border border-white/60 bg-white/40 p-8 shadow-xl shadow-blue-900/5 backdrop-blur-3xl"
			>
				<div>
					<h3 class="text-[10px] font-black tracking-widest text-zinc-400 uppercase">
						Configuration
					</h3>
					<div class="mt-6 space-y-4">
						<div class="flex items-center gap-4">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600"
							>
								<Layers size={20} />
							</div>
							<div>
								<p class="text-sm font-bold text-zinc-900">{rounds.length} Rounds</p>
								<p class="text-[10px] font-bold tracking-tighter text-gray-400 uppercase">
									Event Structure
								</p>
							</div>
						</div>
						<div class="flex items-center gap-4">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600"
							>
								<CheckCircle2 size={20} />
							</div>
							<div>
								<p class="text-sm font-bold text-zinc-900">Active</p>
								<p class="text-[10px] font-bold tracking-tighter text-gray-400 uppercase">
									Current Status
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Rounds List -->
		<div class="flex flex-col gap-6">
			<div class="flex items-center justify-between">
				<h2 class="text-2xl font-bold text-zinc-900">Event Rounds</h2>
				<span class="text-xs font-bold text-gray-400">{rounds.length} Total</span>
			</div>

			{#if rounds.length === 0}
				<div
					in:fade
					class="flex flex-col items-center justify-center rounded-[40px] border-2 border-dashed border-gray-200 bg-white/20 py-24 text-center"
				>
					<div
						class="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gray-50 text-gray-400"
					>
						<Layers size={32} />
					</div>
					<h3 class="text-xl font-bold text-zinc-900">No rounds configured</h3>
					<p class="mt-2 text-sm leading-relaxed font-medium text-gray-500">
						Create a round to define the timing and question <br /> distribution for this room.
					</p>
				</div>
			{:else}
				<div class="grid gap-6 md:grid-cols-2">
					{#each sortedRounds as round, i}
						<div
							in:fly={{ y: 20, delay: i * 100 }}
							class="group relative overflow-hidden rounded-[40px] border border-white/60 bg-white/40 p-1 shadow-2xl shadow-blue-900/5 backdrop-blur-3xl transition-all hover:shadow-blue-900/10"
						>
							<div class="flex flex-col gap-6 p-8">
								<div class="flex items-start justify-between">
									<div
										class="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 font-bold text-white shadow-lg"
									>
										{round.round_number}
									</div>
									<div class="flex items-center gap-2">
										<span
											class="rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-black tracking-widest text-zinc-500 uppercase"
										>
											{round.status || 'PENDING'}
										</span>
										<button
											onclick={() => deleteRound(round.id)}
											class="rounded-xl p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
										>
											<Trash2 size={18} />
										</button>
									</div>
								</div>

								<div>
									<h3 class="text-2xl font-bold text-zinc-900">{round.title}</h3>
									<p class="mt-1 text-xs font-bold tracking-widest text-blue-600 uppercase">
										{questionSets.find((s) => s.id === round.question_set_id)?.title ||
											'Question Set Loaded'}
									</p>
								</div>

								<div class="grid grid-cols-2 gap-4">
									<div class="rounded-2xl border border-white/60 bg-white/50 p-4">
										<div class="mb-1 flex items-center gap-2 text-gray-400">
											<ClipboardList size={14} />
											<span class="text-[10px] font-black tracking-widest uppercase">Questions</span
											>
										</div>
										<p class="text-lg font-bold text-zinc-900">{round.questions_per_participant}</p>
									</div>
									<div class="rounded-2xl border border-white/60 bg-white/50 p-4">
										<div class="mb-1 flex items-center gap-2 text-gray-400">
											<Clock size={14} />
											<span class="text-[10px] font-black tracking-widest uppercase">Duration</span>
										</div>
										<p class="text-lg font-bold text-zinc-900">
											{Math.floor(round.duration_seconds / 60)}m
										</p>
									</div>
								</div>

								<a
									href={`/admin/rounds/${round.id}`}
									class="flex items-center justify-between rounded-2xl bg-zinc-900 p-4 font-bold text-white shadow-lg shadow-zinc-900/20 transition-all active:scale-95"
								>
									<span>Manage Round</span>
									<ExternalLink size={18} />
								</a>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Add Round Modal -->
{#if showAddRoundModal}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-md"
		in:fade
	>
		<div
			class="w-full max-w-lg overflow-hidden rounded-[40px] bg-white shadow-2xl"
			in:fly={{ y: 20 }}
		>
			<div class="flex items-center justify-between border-b border-gray-50 p-8 text-zinc-900">
				<div class="flex items-center gap-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg"
					>
						<Plus size={24} />
					</div>
					<div>
						<h2 class="text-2xl font-bold">New Round</h2>
						<p class="text-[10px] font-black tracking-widest text-gray-400 uppercase">
							Step Config
						</p>
					</div>
				</div>
				<button
					onclick={() => (showAddRoundModal = false)}
					class="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100"
				>
					<X size={24} />
				</button>
			</div>

			<form onsubmit={handleAddRound} class="p-8">
				<div class="space-y-6">
					<div class="grid grid-cols-4 gap-4">
						<div class="col-span-1">
							<label
								for="round-num"
								class="mb-2 block text-[10px] font-black tracking-widest text-zinc-400 uppercase"
								>Num.</label
							>
							<input
								id="round-num"
								type="number"
								bind:value={newRound.round_number}
								required
								class={INPUT_CLASSES}
							/>
						</div>
						<div class="col-span-3">
							<label
								for="round-title"
								class="mb-2 block text-[10px] font-black tracking-widest text-zinc-400 uppercase"
								>Title</label
							>
							<input
								id="round-title"
								type="text"
								bind:value={newRound.title}
								required
								placeholder="e.g. Preliminary Round"
								class={INPUT_CLASSES}
							/>
						</div>
					</div>

					<div>
						<label
							for="q-set"
							class="mb-2 block text-[10px] font-black tracking-widest text-zinc-400 uppercase"
							>Question Set</label
						>
						<select
							id="q-set"
							bind:value={newRound.question_set_id}
							required
							class="{INPUT_CLASSES} appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik02IDlsNiA2IDYtNiIvPjwvc3ZnPg==')] bg-[right_1.5rem_center] bg-no-repeat"
						>
							<option value="" disabled selected>Select a dataset...</option>
							{#each questionSets as set}
								<option value={set.id}>{set.title}</option>
							{/each}
						</select>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label
								for="q-count"
								class="mb-2 block text-[10px] font-black tracking-widest text-zinc-400 uppercase"
								>Questions / User</label
							>
							<input
								id="q-count"
								type="number"
								bind:value={newRound.questions_per_participant}
								required
								class={INPUT_CLASSES}
							/>
						</div>
						<div>
							<label
								for="duration-min"
								class="mb-2 block text-[10px] font-black tracking-widest text-zinc-400 uppercase"
								>Duration (mins)</label
							>
							<div class="relative">
								<input
									id="duration-min"
									type="number"
									value={Math.floor(newRound.duration_seconds / 60)}
									oninput={(e) => (newRound.duration_seconds = e.target.value * 60)}
									required
									class={INPUT_CLASSES}
								/>
								<span
									class="absolute top-1/2 right-6 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase"
									>Min</span
								>
							</div>
						</div>
					</div>
				</div>

				<button
					type="submit"
					disabled={isSavingRound || !newRound.title || !newRound.question_set_id}
					class="mt-10 flex h-14 w-full items-center justify-center gap-3 rounded-[24px] bg-zinc-900 font-bold text-white shadow-xl shadow-zinc-900/20 transition-all hover:bg-zinc-800 active:scale-95 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none"
				>
					{#if isSavingRound}
						<Loader2 class="animate-spin" size={20} /> Deploying...
					{:else}
						<CheckCircle2 size={20} /> Create Round
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
