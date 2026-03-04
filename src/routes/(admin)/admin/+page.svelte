<script>
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import {
		LayoutDashboard,
		Users,
		BarChart3,
		Settings,
		Search,
		Trash2,
		Download,
		RefreshCw,
		Loader2,
		AlertCircle,
		CheckCircle2,
		X
	} from 'lucide-svelte';
	import { API_BASE_URL, authenticatedFetch } from '$lib';

	let stats = $state({
		totalUsers: 0,
		avgScore: 0,
		avgTime: 0
	});

	let participants = $state([]);
	let isLoading = $state(true);
	let isSaving = $state(false);
	let showCreateForm = $state(false);
	let searchTerm = $state('');
	let errorMessage = $state('');

	let newParticipant = $state({
		id: '',
		password: '',
		name: '',
		college_name: '',
		phone_number: '',
		email: ''
	});

	async function fetchData() {
		isLoading = true;
		errorMessage = '';
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/participants`);
			if (!res.ok) throw new Error('Failed to fetch participants');
			const result = await res.json();

			if (result.success) {
				participants = result.data.map((p) => ({
					...p,
					score: p.score, // Might be undefined if not provided by this endpoint
					time_taken: p.time_taken
				}));

				stats = {
					totalUsers: participants.length,
					avgScore:
						participants.length > 0
							? (
									participants.reduce((acc, p) => acc + (p.score || 0), 0) / participants.length
								).toFixed(1)
							: 0,
					avgTime:
						participants.length > 0
							? (
									participants.reduce((acc, p) => acc + (p.time_taken || 0), 0) /
									participants.length
								).toFixed(0)
							: 0
				};
			} else {
				throw new Error(result.error || 'Failed to fetch data');
			}
		} catch (error) {
			errorMessage = error.message;
		} finally {
			isLoading = false;
		}
	}

	async function createParticipant() {
		if (!newParticipant.id || !newParticipant.password || !newParticipant.name || isSaving) return;
		isSaving = true;
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/participants`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(newParticipant)
			});
			const result = await res.json();
			if (result.success) {
				fetchData();
				showCreateForm = false;
				newParticipant = {
					id: '',
					password: '',
					name: '',
					college_name: '',
					phone_number: '',
					email: ''
				};
			} else {
				alert(result.error || 'Failed to create participant');
			}
		} catch (err) {
			alert('Connection error');
		} finally {
			isSaving = false;
		}
	}

	async function deleteParticipant(id) {
		if (!confirm('Are you sure you want to delete this participant?')) return;
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/participants/${id}`, {
				method: 'DELETE'
			});
			const result = await res.json();
			if (result.success) {
				participants = participants.filter((p) => p.id !== id);
			} else {
				alert(result.error || 'Delete failed');
			}
		} catch (err) {
			alert('Connection error');
		}
	}

	onMount(fetchData);

	let filteredParticipants = $derived(
		participants.filter(
			(p) =>
				p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				p.college_name?.toLowerCase().includes(searchTerm.toLowerCase())
		)
	);

	function formatTime(seconds) {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return m > 0 ? `${m}m ${s}s` : `${s}s`;
	}

	// --- DESIGN TOKENS ---
	const CARD_CLASSES = 'glass-card rounded-[32px] p-8 shadow-2xl shadow-blue-900/10';
	const STAT_CARD_CLASSES =
		'flex items-center gap-5 rounded-3xl bg-white/60 p-6 border border-white shadow-sm transition-all hover:bg-white hover:-translate-y-1';
	const BTN_ACTION =
		'flex h-12 items-center gap-2 rounded-2xl px-6 font-bold transition-all active:scale-95';
</script>

<svelte:head>
	<title>Admin Dashboard - Interactive Quiz</title>
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

<!-- Optimized Main Content -->
<div class="mx-auto max-w-7xl p-6 md:p-8 lg:p-12">
	<!-- Consistent Header -->
	<header class="mb-12 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
		<div in:fade={{ duration: 400 }}>
			<p class="mb-1 text-xs font-bold tracking-widest text-blue-600 uppercase">Overview</p>
			<h1 class="text-3xl font-bold tracking-tight text-zinc-900 lg:text-4xl">Quiz Dashboard</h1>
		</div>

		<div class="flex items-center gap-4" in:fade={{ duration: 400, delay: 100 }}>
			<button
				onclick={fetchData}
				class="flex h-14 w-14 items-center justify-center rounded-2xl border border-white bg-white shadow-sm transition-all hover:bg-gray-50 active:scale-90"
			>
				<RefreshCw size={22} class={isLoading ? 'animate-spin text-blue-500' : 'text-zinc-600'} />
			</button>
			<button
				onclick={() => (showCreateForm = !showCreateForm)}
				class="{BTN_ACTION} h-14 bg-zinc-900 text-lg text-white shadow-xl shadow-zinc-900/20 hover:bg-zinc-800"
			>
				<Users size={20} /> New Participant
			</button>
		</div>
	</header>

	{#if showCreateForm}
		<div in:slide class="{CARD_CLASSES} mb-12">
			<div class="mb-6 flex items-center justify-between">
				<h2 class="text-2xl font-bold text-zinc-900">Add New Participant</h2>
				<button onclick={() => (showCreateForm = false)} class="text-gray-400 hover:text-zinc-900">
					<X size={24} />
				</button>
			</div>
			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				<div class="space-y-2">
					<label for="p-id" class="text-[10px] font-bold tracking-widest text-gray-400 uppercase"
						>Reg ID / Username</label
					>
					<input
						id="p-id"
						type="text"
						bind:value={newParticipant.id}
						placeholder="reg001"
						class="h-12 w-full rounded-xl border border-gray-100 bg-white/60 px-4 text-sm font-bold"
					/>
				</div>
				<div class="space-y-2">
					<label for="p-pass" class="text-[10px] font-bold tracking-widest text-gray-400 uppercase"
						>Password</label
					>
					<input
						id="p-pass"
						type="password"
						bind:value={newParticipant.password}
						placeholder="••••••"
						class="h-12 w-full rounded-xl border border-gray-100 bg-white/60 px-4 text-sm font-bold"
					/>
				</div>
				<div class="space-y-2">
					<label for="p-name" class="text-[10px] font-bold tracking-widest text-gray-400 uppercase"
						>Full Name</label
					>
					<input
						id="p-name"
						type="text"
						bind:value={newParticipant.name}
						placeholder="Alice Johnson"
						class="h-12 w-full rounded-xl border border-gray-100 bg-white/60 px-4 text-sm font-bold"
					/>
				</div>
				<div class="space-y-2">
					<label
						for="p-college"
						class="text-[10px] font-bold tracking-widest text-gray-400 uppercase"
						>College Name</label
					>
					<input
						id="p-college"
						type="text"
						bind:value={newParticipant.college_name}
						placeholder="MIT University"
						class="h-12 w-full rounded-xl border border-gray-100 bg-white/60 px-4 text-sm font-bold"
					/>
				</div>
				<div class="space-y-2">
					<label for="p-email" class="text-[10px] font-bold tracking-widest text-gray-400 uppercase"
						>Email (Optional)</label
					>
					<input
						id="p-email"
						type="email"
						bind:value={newParticipant.email}
						placeholder="alice@example.com"
						class="h-12 w-full rounded-xl border border-gray-100 bg-white/60 px-4 text-sm font-bold"
					/>
				</div>
				<div class="space-y-2">
					<label for="p-phone" class="text-[10px] font-bold tracking-widest text-gray-400 uppercase"
						>Phone (Optional)</label
					>
					<input
						id="p-phone"
						type="text"
						bind:value={newParticipant.phone_number}
						placeholder="9876543210"
						class="h-12 w-full rounded-xl border border-gray-100 bg-white/60 px-4 text-sm font-bold"
					/>
				</div>
			</div>
			<div class="mt-8 flex justify-end gap-4">
				<button
					onclick={() => (showCreateForm = false)}
					class="px-8 font-bold text-gray-500 hover:text-zinc-900">Cancel</button
				>
				<button
					onclick={createParticipant}
					disabled={isSaving}
					class="flex h-12 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-8 font-bold text-white shadow-lg transition-all hover:bg-zinc-800 active:scale-95 disabled:bg-gray-400"
				>
					{#if isSaving}
						<Loader2 class="animate-spin" size={18} /> Saving...
					{:else}
						Create Participant
					{/if}
				</button>
			</div>
		</div>
	{/if}

	<!-- Premium Stats Grid -->
	<div class="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
		{#each [{ label: 'Participants', value: stats.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' }, { label: 'Avg. Score', value: stats.avgScore, icon: BarChart3, color: 'text-orange-600', bg: 'bg-orange-100' }, { label: 'Avg. Time', value: formatTime(stats.avgTime), icon: RefreshCw, color: 'text-green-600', bg: 'bg-green-100' }] as stat, i}
			<div class={STAT_CARD_CLASSES} in:fly={{ y: 20, delay: 200 + i * 100 }}>
				<div
					class="flex h-14 w-14 items-center justify-center rounded-2xl {stat.bg} {stat.color} shadow-inner"
				>
					<stat.icon size={28} />
				</div>
				<div>
					<p class="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
						{stat.label}
					</p>
					<p class="text-3xl font-bold text-zinc-900 tabular-nums">{stat.value}</p>
				</div>
			</div>
		{/each}
	</div>

	<!-- Consistent Glass Table Card -->
	<div class={CARD_CLASSES} in:fade={{ duration: 600, delay: 500 }}>
		<div class="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
			<h2 class="text-2xl font-bold text-zinc-900">Participants</h2>
			<div class="relative w-full md:w-80">
				<Search class="absolute top-1/2 left-5 -translate-y-1/2 text-gray-400" size={20} />
				<input
					type="text"
					bind:value={searchTerm}
					placeholder="Search entries..."
					class="h-14 w-full rounded-2xl border border-gray-100 bg-gray-50/50 pr-6 pl-14 text-sm font-bold transition-all outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5"
				/>
			</div>
		</div>

		<div class="overflow-x-auto rounded-[24px] border border-white/40">
			<table class="w-full text-left text-sm">
				<thead class="bg-gray-50/50 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
					<tr>
						<th class="px-8 py-5">Participant Details</th>
						<th class="px-8 py-5">Institution</th>
						<th class="px-8 py-5 text-center">Score</th>
						<th class="px-8 py-5 text-center">Duration</th>
						<th class="px-8 py-5 text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-white/40 bg-white/20">
					{#if isLoading}
						<tr>
							<td colspan="5" class="py-32 text-center">
								<Loader2 class="mx-auto mb-4 h-12 w-12 animate-spin text-blue-500" />
								<p class="text-lg font-bold text-gray-400">Synchronizing data...</p>
							</td>
						</tr>
					{:else if filteredParticipants.length === 0}
						<tr>
							<td colspan="5" class="py-32 text-center">
								<AlertCircle class="mx-auto mb-4 h-12 w-12 text-gray-200" />
								<p class="text-lg font-bold text-gray-400">No matching records found</p>
							</td>
						</tr>
					{:else}
						{#each filteredParticipants as p, i}
							<tr class="group cursor-default transition-all hover:bg-white/60">
								<td class="px-8 py-6">
									<div class="flex items-center gap-4">
										<div
											class="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white bg-blue-50"
										>
											<img
												src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.name || i)}`}
												alt="Avatar"
											/>
										</div>
										<div>
											<p class="text-base font-bold text-zinc-900">{p.name || 'Anonymous'}</p>
											<p class="text-xs font-bold text-gray-400">
												{p.email || 'No email provided'}
											</p>
										</div>
									</div>
								</td>
								<td class="px-8 py-6">
									<p class="font-bold text-zinc-600">{p.college_name || 'Not specified'}</p>
								</td>
								<td class="px-8 py-6 text-center">
									<span
										class="inline-flex rounded-xl bg-blue-500/10 px-4 py-1.5 text-sm font-bold text-blue-600"
									>
										{p.score !== undefined ? `${p.score} / 20` : '-'}
									</span>
								</td>
								<td class="px-8 py-6 text-center">
									<div class="flex items-center justify-center gap-1.5 font-bold text-zinc-500">
										<RefreshCw size={14} class="opacity-50" />
										{p.time_taken ? formatTime(p.time_taken) : '-'}
									</div>
								</td>
								<td class="px-8 py-6 text-right">
									<button
										onclick={() => deleteParticipant(p.id)}
										class="rounded-xl p-3 text-gray-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
									>
										<Trash2 size={20} />
									</button>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
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
