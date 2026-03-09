<script>
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import {
		DoorOpen,
		Clock,
		ChevronRight,
		LogOut,
		CircleUser,
		AlertCircle,
		Loader2
	} from 'lucide-svelte';
	import { API_BASE_URL } from '$lib';
	import { goto } from '$app/navigation';

	// --- STATE ---
	let rooms = $state([]);
	let user = $state(null);
	let isLoading = $state(true);
	let error = $state('');

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

		await fetchRooms(token);
	});

	async function fetchRooms(token) {
		try {
			const res = await fetch(`${API_BASE_URL}/participant/rooms`, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});
			const result = await res.json();

			if (result.success) {
				rooms = result.data;
			} else if (result.code === 'UNAUTHORIZED') {
				handleLogout();
				return;
			} else {
				error = result.error || 'Failed to load rooms';
			}
		} catch (err) {
			error = 'Connection error. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	function handleLogout() {
		localStorage.removeItem('participant_token');
		localStorage.removeItem('participant_user');
		goto('/');
	}
</script>

<svelte:head>
	<title>Quiz Dashboard | Available Rooms</title>
</svelte:head>

<!-- Premium Background -->
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
	<header class="mx-auto mb-12 flex max-w-5xl items-center justify-between">
		<div class="flex items-center gap-4">
			<div
				class="flex h-12 w-12 items-center justify-center rounded-[18px] bg-zinc-900 text-white shadow-xl shadow-zinc-900/20"
			>
				<DoorOpen size={24} />
			</div>
			<div>
				<h1 class="text-2xl font-bold tracking-tight text-zinc-900">Rooms</h1>
				<p class="text-[10px] font-black tracking-widest text-blue-600 uppercase">
					Available Events
				</p>
			</div>
		</div>

		<div class="flex items-center gap-3">
			<div class="hidden flex-col items-end md:flex">
				<span class="text-sm font-bold text-zinc-900">{user?.name || 'Participant'}</span>
				<span class="text-[10px] font-bold text-gray-400">{user?.id || 'ID'}</span>
			</div>
			<button
				onclick={handleLogout}
				class="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white bg-white text-zinc-500 shadow-sm transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500 active:scale-95"
			>
				<LogOut size={20} />
			</button>
		</div>
	</header>

	<main class="mx-auto max-w-5xl">
		{#if isLoading}
			<div class="flex h-64 items-center justify-center">
				<Loader2 class="h-10 w-10 animate-spin text-blue-500" />
			</div>
		{:else if error}
			<div
				in:fade
				class="mx-auto max-w-md rounded-[32px] border border-red-100 bg-red-50 p-8 text-center"
			>
				<div
					class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-red-500 shadow-sm"
				>
					<AlertCircle size={24} />
				</div>
				<h2 class="text-xl font-bold text-red-900">Oops! Error</h2>
				<p class="mt-2 text-sm font-medium text-red-600">{error}</p>
				<button
					onclick={() => window.location.reload()}
					class="mt-6 rounded-2xl bg-red-600 px-8 py-3 text-sm font-bold text-white shadow-xl shadow-red-900/10 transition-all hover:bg-red-700 active:scale-95"
				>
					Retry Connection
				</button>
			</div>
		{:else if rooms.length === 0}
			<div
				in:fade
				class="mx-auto max-w-md rounded-[40px] border border-white/60 bg-white/40 p-12 text-center backdrop-blur-3xl"
			>
				<div
					class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600"
				>
					<DoorOpen size={32} />
				</div>
				<h2 class="text-2xl font-bold text-zinc-900">No rooms available</h2>
				<p class="mt-3 font-medium text-gray-500">
					There are no active quiz halls currently available. Please check back later.
				</p>
			</div>
		{:else}
			<div class="grid gap-6 md:grid-cols-2">
				{#each rooms as room, i}
					<div
						in:fly={{ y: 20, delay: i * 100 }}
						class="group relative overflow-hidden rounded-[40px] border border-white/60 bg-white/40 p-1 shadow-2xl shadow-blue-900/5 backdrop-blur-3xl transition-all hover:shadow-blue-900/10"
					>
						<div class="flex flex-col gap-6 p-8">
							<div class="flex items-start justify-between">
								<div
									class="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg transition-transform group-hover:scale-110"
								>
									<DoorOpen size={28} />
								</div>
								{#if room.mode === 'self_service'}
									<span
										class="rounded-full bg-blue-100 px-4 py-1.5 text-[10px] font-black tracking-widest text-blue-600 uppercase"
									>
										Self Service
									</span>
								{:else}
									<span
										class="rounded-full bg-orange-100 px-4 py-1.5 text-[10px] font-black tracking-widest text-orange-600 uppercase"
									>
										Live Room
									</span>
								{/if}
							</div>

							<div>
								<h3 class="text-2xl font-bold text-zinc-900">{room.name}</h3>
								<p class="mt-2 line-clamp-2 text-sm leading-relaxed font-medium text-gray-500">
									{room.description || 'No description available for this room hall.'}
								</p>
							</div>

							<a
								href={`/home/room/${room.id}`}
								class="mt-4 flex items-center justify-between rounded-[24px] bg-white p-4 font-bold text-zinc-900 shadow-sm transition-all hover:bg-zinc-900 hover:text-white"
							>
								<span>Enter Room Hall</span>
								<ChevronRight size={18} />
							</a>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</main>
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

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
