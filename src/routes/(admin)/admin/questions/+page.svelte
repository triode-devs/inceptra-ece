<script>
	import { fade, fly, slide } from 'svelte/transition';
	import {
		Plus,
		Trash2,
		X,
		ChevronRight,
		ClipboardList,
		FileText,
		Search,
		RefreshCw
	} from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { API_BASE_URL, authenticatedFetch } from '$lib';

	// Constants for styling
	const CARD_CLASSES = 'glass-card rounded-[32px] p-8 shadow-2xl shadow-blue-900/10 mb-8';
	const INPUT_CLASSES =
		'h-14 w-full rounded-2xl border border-gray-100 bg-white/60 px-4 text-sm font-bold text-zinc-900 transition-all outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5';
	const BTN_PRIMARY =
		'flex h-14 items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-8 font-bold text-white shadow-xl shadow-zinc-900/20 hover:bg-zinc-800 transition-all active:scale-95 disabled:bg-gray-400';

	let questionSets = $state([]);
	let isLoading = $state(true);
	let isCreatingSet = $state(false);
	let isSaving = $state(false);
	let newSetName = $state('');
	let newSetDesc = $state('');
	let searchTerm = $state('');
	let errorMessage = $state('');

	onMount(fetchSets);

	async function fetchSets() {
		isLoading = true;
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/question-sets`);
			const result = await res.json();
			if (result.success) {
				// Convert to UI structure
				questionSets = result.data.map((set) => ({
					id: set.id,
					name: set.title,
					description: set.description,
					questions_count: 0 // Count will be fetched in detail view or we can assume it's not provided here
				}));
			} else {
				errorMessage = result.error || 'Failed to fetch sets';
			}
		} catch (err) {
			errorMessage = 'Connection error';
		} finally {
			isLoading = false;
		}
	}

	// --- DERIVED ---
	let filteredSets = $derived(
		questionSets.filter(
			(s) =>
				s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				s.description?.toLowerCase().includes(searchTerm.toLowerCase())
		)
	);

	// --- ACTIONS ---
	async function createSet() {
		if (!newSetName || isSaving) return;
		isSaving = true;
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/question-sets`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ title: newSetName, description: newSetDesc })
			});
			const result = await res.json();
			if (result.success) {
				fetchSets();
				newSetName = '';
				newSetDesc = '';
				isCreatingSet = false;
			} else {
				alert(result.error || 'Creation failed');
			}
		} catch (err) {
			alert('Connection error');
		} finally {
			isSaving = false;
		}
	}

	async function deleteSet(id) {
		if (!confirm('Are you sure you want to delete this set?')) return;
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/question-sets/${id}`, {
				method: 'DELETE'
			});
			const result = await res.json();
			if (result.success) {
				questionSets = questionSets.filter((s) => s.id !== id);
			} else {
				alert(result.error || 'Delete failed');
			}
		} catch (err) {
			alert('Connection error');
		}
	}
</script>

<svelte:head>
	<title>Questions Management - Admin</title>
</svelte:head>

<!-- Consistent Background -->
<div
	class="font-poppins fixed inset-0 -z-10 h-screen w-screen overflow-hidden bg-slate-50 text-zinc-900"
>
	<div class="absolute inset-0 bg-linear-to-br from-blue-50 via-white to-cyan-50"></div>
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

<div class="mx-auto max-w-7xl p-6 md:p-8 lg:p-12">
	<header class="mb-12 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
		<div in:fade={{ duration: 400 }}>
			<p class="mb-2 text-xs font-bold tracking-widest text-blue-600 uppercase">Management</p>
			<h1 class="text-4xl font-bold tracking-tight text-zinc-900">Question Sets</h1>
		</div>

		<div class="flex items-center gap-4" in:fade={{ duration: 400, delay: 100 }}>
			<div class="relative w-full md:w-80">
				<Search class="absolute top-1/2 left-5 -translate-y-1/2 text-gray-400" size={20} />
				<input
					type="text"
					bind:value={searchTerm}
					placeholder="Search sets..."
					class="{INPUT_CLASSES} h-14 pr-6 pl-14"
				/>
			</div>
			<button onclick={() => (isCreatingSet = !isCreatingSet)} class="{BTN_PRIMARY} h-14! shrink-0">
				<Plus size={20} /> <span class="hidden sm:inline">New Set</span>
			</button>
		</div>
	</header>

	{#if isCreatingSet}
		<div in:slide class={CARD_CLASSES}>
			<div class="mb-6 flex items-center justify-between">
				<h2 class="flex items-center gap-2 text-2xl font-bold">
					<ClipboardList class="text-blue-500" /> Create New Set
				</h2>
				<button onclick={() => (isCreatingSet = false)} class="text-gray-400 hover:text-zinc-900">
					<X size={24} />
				</button>
			</div>

			<div class="grid gap-6 md:grid-cols-2">
				<div>
					<label
						for="set-name"
						class="mb-2 block text-xs font-bold tracking-widest text-gray-400 uppercase"
						>Set Name</label
					>
					<input
						id="set-name"
						type="text"
						bind:value={newSetName}
						placeholder="e.g., JavaScript Advanced"
						class={INPUT_CLASSES}
					/>
				</div>
				<div>
					<label
						for="set-desc"
						class="mb-2 block text-xs font-bold tracking-widest text-gray-400 uppercase"
						>Description</label
					>
					<input
						id="set-desc"
						type="text"
						bind:value={newSetDesc}
						placeholder="Short description of the topic"
						class={INPUT_CLASSES}
					/>
				</div>
			</div>

			<div class="mt-8 flex justify-end gap-4">
				<button
					onclick={() => (isCreatingSet = false)}
					class="h-14 px-8 font-bold text-gray-500 hover:text-zinc-900">Cancel</button
				>
				<button onclick={createSet} disabled={isSaving} class={BTN_PRIMARY}>
					{#if isSaving}
						<RefreshCw class="animate-spin" size={18} /> Saving...
					{:else}
						Create Set
					{/if}
				</button>
			</div>
		</div>
	{/if}

	<!-- Sets Grid -->
	<div class="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#if isLoading}
			{#each Array(3) as _}
				<div class="h-64 animate-pulse rounded-[32px] bg-white/40"></div>
			{/each}
		{:else}
			{#each filteredSets as set (set.id)}
				<div in:fly={{ y: 20, duration: 400 }}>
					<a
						href="/admin/questions/{set.id}"
						class="group relative flex h-full flex-col overflow-hidden rounded-[32px] bg-white/60 p-8 text-left text-zinc-900 shadow-xl shadow-blue-900/5 transition-all hover:scale-[1.02] hover:bg-white"
					>
						<div class="mb-4 flex items-start justify-between">
							<div
								class="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600"
							>
								<FileText size={24} />
							</div>
							<div
								role="button"
								tabindex="0"
								onclick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									deleteSet(set.id);
								}}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										e.stopPropagation();
										deleteSet(set.id);
									}
								}}
								class="cursor-pointer rounded-xl p-2 text-gray-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
							>
								<Trash2 size={20} />
							</div>
						</div>

						<h3 class="mb-2 text-xl font-bold tracking-tight uppercase">{set.name}</h3>
						<p class="mb-6 line-clamp-2 text-sm font-bold opacity-60">{set.description}</p>

						<div class="pointer-events-none mt-auto flex items-center justify-between">
							<span class="text-xs font-bold tracking-widest uppercase opacity-60">Enter Set</span>
							<ChevronRight
								size={18}
								class="opacity-40 transition-transform group-hover:translate-x-1"
							/>
						</div>
					</a>
				</div>
			{/each}
		{/if}
	</div>

	{#if filteredSets.length === 0 && !isCreatingSet}
		<div in:fade class="flex flex-col items-center justify-center py-24 text-center">
			<Search class="mb-4 h-16 w-16 text-gray-200" />
			<p class="text-xl font-bold text-gray-400">No question sets found</p>
			<button
				onclick={() => (searchTerm = '')}
				class="mt-4 text-sm font-bold text-blue-600 hover:underline"
			>
				Clear search
			</button>
		</div>
	{/if}
</div>

<style>
	/* Animation delays for blobs */
	.animation-delay-2000 {
		animation-delay: 2s;
	}
	.animation-delay-4000 {
		animation-delay: 4s;
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
