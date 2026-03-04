<script>
	import { onMount } from 'svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import {
		DoorOpen,
		Plus,
		Search,
		MoreVertical,
		Trash2,
		Edit3,
		Loader2,
		AlertCircle,
		LayoutGrid,
		Settings2,
		X,
		CheckCircle2,
		ArrowRight
	} from 'lucide-svelte';
	import { API_BASE_URL, authenticatedFetch } from '$lib';

	// --- STATE ---
	let rooms = $state([]);
	let isLoading = $state(true);
	let isSaving = $state(false);
	let error = $state('');
	let showCreateModal = $state(false);
	let searchQuery = $state('');

	// Form State
	let newRoom = $state({
		name: '',
		mode: 'room', // room or self_service
		description: ''
	});

	// --- ACTIONS ---
	onMount(async () => {
		await fetchRooms();
	});

	async function fetchRooms() {
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/rooms`);
			const result = await res.json();
			if (result.success) {
				rooms = result.data;
			} else {
				error = result.error || 'Failed to load rooms';
			}
		} catch (err) {
			error = 'Connection error. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	async function handleCreateRoom(e) {
		e.preventDefault();
		isSaving = true;
		error = '';

		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/rooms`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newRoom)
			});
			const result = await res.json();

			if (result.success) {
				rooms = [result.data, ...rooms];
				showCreateModal = false;
				newRoom = { name: '', mode: 'room', description: '' };
			} else {
				error = result.error || 'Failed to create room';
			}
		} catch (err) {
			error = 'Connection error.';
		} finally {
			isSaving = false;
		}
	}

	async function deleteRoom(id) {
		if (!confirm('Are you sure you want to delete this room? All associated rounds will be lost.'))
			return;

		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/rooms/${id}`, {
				method: 'DELETE'
			});
			if (res.ok) {
				rooms = rooms.filter((r) => r.id !== id);
			}
		} catch (err) {
			alert('Failed to delete room');
		}
	}

	let filteredRooms = $derived(
		rooms.filter(
			(r) =>
				r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
		)
	);

	const INPUT_CLASSES =
		'h-14 w-full rounded-2xl border border-gray-100 bg-white/60 px-6 text-sm font-bold text-zinc-900 transition-all outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5';
</script>

<svelte:head>
	<title>Admin | Room Management</title>
</svelte:head>

<!-- Background -->
<div class="fixed inset-0 -z-10 bg-slate-50/50">
	<div class="absolute inset-0 bg-linear-to-br from-blue-50/50 via-white to-cyan-50/50"></div>
	<div
		class="absolute top-0 left-0 h-full w-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02]"
	></div>
</div>

<div class="mx-auto max-w-7xl p-6 md:p-8 lg:p-12">
	<!-- Hero Header -->
	<header class="mb-12 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
		<div in:fade={{ duration: 400 }}>
			<p class="mb-2 text-xs font-bold tracking-widest text-blue-600 uppercase">Orchestration</p>
			<h1 class="text-4xl font-bold tracking-tight text-zinc-900">Quiz Rooms</h1>
		</div>

		<div class="flex flex-wrap items-center gap-4">
			<div class="relative w-full md:w-72">
				<Search class="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" size={18} />
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search rooms..."
					class="h-12 w-full rounded-2xl border border-white bg-white/60 pr-4 pl-11 text-sm font-bold text-zinc-900 shadow-sm transition-all outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5"
				/>
			</div>
			<button
				onclick={() => (showCreateModal = true)}
				class="flex h-12 items-center gap-2 rounded-2xl bg-zinc-900 px-6 font-bold text-white shadow-xl shadow-zinc-900/20 transition-all hover:bg-zinc-800 active:scale-95"
			>
				<Plus size={20} />
				<span>Create Room</span>
			</button>
		</div>
	</header>

	{#if isLoading}
		<div class="flex h-64 items-center justify-center">
			<Loader2 class="h-10 w-10 animate-spin text-blue-500" />
		</div>
	{:else if filteredRooms.length === 0}
		<div
			in:fade
			class="flex flex-col items-center justify-center rounded-[40px] border border-dashed border-gray-200 bg-white/40 py-20 text-center backdrop-blur-sm"
		>
			<div
				class="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gray-100 text-gray-400"
			>
				<LayoutGrid size={40} />
			</div>
			<h3 class="text-xl font-bold text-zinc-900">No rooms found</h3>
			<p class="mt-2 text-sm font-medium text-gray-500">
				Create your first room hall to start organizing rounds.
			</p>
		</div>
	{:else}
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each filteredRooms as room, i}
				<div
					in:fly={{ y: 20, delay: i * 50 }}
					class="group relative overflow-hidden rounded-[40px] border border-white/60 bg-white/40 p-1 shadow-2xl shadow-blue-900/5 backdrop-blur-3xl transition-all hover:shadow-blue-900/10"
				>
					<div class="flex flex-col gap-6 p-8">
						<div class="flex items-start justify-between">
							<div
								class="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg transition-transform group-hover:scale-110"
							>
								<DoorOpen size={24} />
							</div>

							<div class="flex items-center gap-2">
								<span
									class="rounded-full px-3 py-1 text-[10px] font-black tracking-widest uppercase {room.mode ===
									'self_service'
										? 'bg-blue-100 text-blue-600'
										: 'bg-orange-100 text-orange-600'}"
								>
									{room.mode.replace('_', ' ')}
								</span>
								<button
									onclick={() => deleteRoom(room.id)}
									class="rounded-xl p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
								>
									<Trash2 size={18} />
								</button>
							</div>
						</div>

						<div>
							<h3 class="line-clamp-1 text-xl font-bold text-zinc-900">{room.name}</h3>
							<p class="mt-2 line-clamp-2 text-xs leading-relaxed font-medium text-gray-400">
								{room.description || 'No description provided for this hall.'}
							</p>
						</div>

						<div class="flex items-center justify-between border-t border-gray-100 pt-6">
							<div class="flex flex-col">
								<span class="text-[10px] font-black tracking-widest text-gray-400 uppercase"
									>Status</span
								>
								<span class="flex items-center gap-1.5 text-xs font-bold text-green-600">
									<CheckCircle2 size={12} /> Active
								</span>
							</div>
							<a
								href={`/admin/rooms/${room.id}`}
								class="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-900 shadow-sm transition-all hover:bg-zinc-900 hover:text-white"
							>
								<ArrowRight size={18} />
							</a>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Create Room Modal -->
{#if showCreateModal}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-md"
		in:fade
	>
		<div
			class="w-full max-w-lg overflow-hidden rounded-[40px] bg-white shadow-2xl"
			in:fly={{ y: 20 }}
		>
			<div class="flex items-center justify-between border-b border-gray-50 p-8">
				<div class="flex items-center gap-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg"
					>
						<Plus size={24} />
					</div>
					<div>
						<h2 class="text-2xl font-bold text-zinc-900">New Quiz Room</h2>
						<p class="text-xs font-medium tracking-widest text-gray-400 uppercase">
							Hall Configuration
						</p>
					</div>
				</div>
				<button
					onclick={() => (showCreateModal = false)}
					class="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-zinc-900"
				>
					<X size={24} />
				</button>
			</div>

			<form onsubmit={handleCreateRoom} class="p-8">
				<div class="space-y-6">
					<div>
						<label
							for="name"
							class="mb-2 block text-[10px] font-black tracking-widest text-zinc-400 uppercase"
							>Room Name</label
						>
						<input
							id="name"
							type="text"
							bind:value={newRoom.name}
							required
							placeholder="e.g. Grand Finale 2024"
							class={INPUT_CLASSES}
						/>
					</div>

					<div>
						<label class="mb-2 block text-[10px] font-black tracking-widest text-zinc-400 uppercase"
							>Operation Mode</label
						>
						<div class="grid grid-cols-2 gap-4">
							<button
								type="button"
								onclick={() => (newRoom.mode = 'room')}
								class="flex flex-col items-center gap-3 rounded-2xl border-2 p-5 transition-all
									{newRoom.mode === 'room'
									? 'border-zinc-900 bg-zinc-900 text-white shadow-lg'
									: 'border-gray-50 bg-gray-50 text-gray-500 hover:border-gray-200'}"
							>
								<DoorOpen size={24} />
								<span class="text-xs font-bold">Live Room</span>
							</button>
							<button
								type="button"
								onclick={() => (newRoom.mode = 'self_service')}
								class="flex flex-col items-center gap-3 rounded-2xl border-2 p-5 transition-all
									{newRoom.mode === 'self_service'
									? 'border-zinc-900 bg-zinc-900 text-white shadow-lg'
									: 'border-gray-50 bg-gray-50 text-gray-500 hover:border-gray-200'}"
							>
								<Settings2 size={24} />
								<span class="text-xs font-bold">Self Service</span>
							</button>
						</div>
					</div>

					<div>
						<label
							for="desc"
							class="mb-2 block text-[10px] font-black tracking-widest text-zinc-400 uppercase"
							>Description</label
						>
						<textarea
							id="desc"
							bind:value={newRoom.description}
							placeholder="Provide context for the participants..."
							class="{INPUT_CLASSES} h-32 resize-none py-4"
						></textarea>
					</div>
				</div>

				{#if error}
					<p class="mt-4 text-center text-xs font-bold text-red-500" in:slide>{error}</p>
				{/if}

				<button
					type="submit"
					disabled={isSaving || !newRoom.name}
					class="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-zinc-900 font-bold text-white shadow-xl shadow-zinc-900/20 transition-all hover:bg-zinc-800 active:scale-95 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none"
				>
					{#if isSaving}
						<Loader2 class="animate-spin" size={20} /> Creating...
					{:else}
						<Plus size={20} /> Create Hall
					{/if}
				</button>
			</form>
		</div>
	</div>
{/if}
