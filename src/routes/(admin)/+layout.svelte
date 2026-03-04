<script>
	import { onMount, untrack } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { Lock, LogIn, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-svelte';
	import AdminBottomNav from '$lib/components/AdminBottomNav.svelte';

	import { API_BASE_URL, adminAuth } from '$lib';

	let { children } = $props();

	let isAuthenticated = $state(false);
	let adminId = $state('admin01');
	let password = $state('adminsatha');
	let error = $state('');
	let isLoading = $state(true);
	let isAuthenticating = $state(false);
	let showPassword = $state(false);

	onMount(() => {
		// Check for existing session
		const checkSession = () => {
			const token = localStorage.getItem('admin_token');
			if (token) {
				isAuthenticated = true;
			} else {
				isAuthenticated = false;
			}
		};

		checkSession();
		isLoading = false;

		// Listen for storage changes from other tabs or from the auth helper
		window.addEventListener('storage', checkSession);

		// Also set an interval to check frequently in case the auth utility clears it
		const interval = setInterval(checkSession, 1000);

		return () => {
			window.removeEventListener('storage', checkSession);
			clearInterval(interval);
		};
	});

	async function handleLogin() {
		if (!password || !adminId) return;

		isAuthenticating = true;
		error = '';

		try {
			const res = await fetch(`${API_BASE_URL}/admin/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: adminId, password })
			});

			const result = await res.json();

			if (result.success) {
				isAuthenticated = true;
				localStorage.setItem('admin_token', result.data.token);
				localStorage.setItem('admin_user', JSON.stringify(result.data.admin));

				// Handle re-authentication fallback
				if (adminAuth.resolveLogin) {
					adminAuth.resolveLogin();
					adminAuth.resolveLogin = null;
				}
			} else {
				error = result.error || 'Authentication failed';
			}
		} catch (err) {
			error = 'Connection error. Please try again.';
		} finally {
			isAuthenticating = false;
		}
	}

	function handleKeydown(e) {
		if (e.key === 'Enter') handleLogin();
	}

	function logout() {
		isAuthenticated = false;
		localStorage.removeItem('admin_token');
		localStorage.removeItem('admin_user');
	}
</script>

{#if isLoading}
	<div class="fixed inset-0 flex items-center justify-center bg-slate-50">
		<Loader2 class="h-10 w-10 animate-spin text-blue-500" />
	</div>
{:else if !isAuthenticated}
	<div
		class="font-poppins relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-50"
	>
		<!-- Consistent Background Bloom -->
		<div class="absolute inset-0 -z-10">
			<div class="absolute inset-0 bg-linear-to-br from-blue-50 via-white to-cyan-50"></div>
			<div
				class="animate-blob absolute top-0 -left-4 h-96 w-96 rounded-full bg-blue-300 opacity-60 mix-blend-multiply blur-3xl filter"
			></div>
			<div
				class="animate-blob animation-delay-2000 absolute top-0 -right-4 h-96 w-96 rounded-full bg-cyan-200 opacity-60 mix-blend-multiply blur-3xl filter"
			></div>
		</div>

		<div in:fly={{ y: 20, duration: 600 }} class="w-full max-w-md px-6">
			<div
				class="glass-card rounded-[32px] border border-white/60 bg-white/40 p-10 shadow-2xl shadow-blue-900/10 backdrop-blur-2xl"
			>
				<div class="mb-10 flex flex-col items-center text-center">
					<div
						class="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-xl shadow-zinc-900/20"
					>
						<Lock size={32} />
					</div>
					<h1 class="text-3xl font-bold tracking-tight text-zinc-900">Admin Portal</h1>
					<p class="mt-2 font-medium text-zinc-500">Restricted Area</p>
				</div>

				<div class="space-y-6">
					<div>
						<label
							for="admin-id"
							class="mb-3 ml-1 block text-[10px] font-black tracking-[0.2em] text-zinc-400 uppercase"
							>Admin ID</label
						>
						<input
							id="admin-id"
							type="text"
							bind:value={adminId}
							placeholder="admin01"
							class="mb-4 h-14 w-full rounded-2xl border border-gray-100 bg-white/60 px-6 text-sm font-bold text-zinc-900 transition-all outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5"
						/>

						<label
							for="admin-pass"
							class="mb-3 ml-1 block text-[10px] font-black tracking-[0.2em] text-zinc-400 uppercase"
							>Password</label
						>
						<div class="group relative">
							<input
								id="admin-pass"
								type={showPassword ? 'text' : 'password'}
								bind:value={password}
								onkeydown={handleKeydown}
								placeholder="••••••••"
								class="h-14 w-full rounded-2xl border border-gray-100 bg-white/60 px-6 pr-14 text-sm font-bold text-zinc-900 transition-all outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5"
							/>
							<button
								type="button"
								onclick={() => (showPassword = !showPassword)}
								class="absolute top-1/2 right-4 -translate-y-1/2 p-2 text-gray-400 transition-colors hover:text-zinc-900"
							>
								{#if showPassword}
									<EyeOff size={20} />
								{:else}
									<Eye size={20} />
								{/if}
							</button>
							{#if error}
								<div
									in:fade
									class="absolute -bottom-7 left-1 flex items-center gap-1.5 text-red-500"
								>
									<AlertCircle size={14} />
									<span class="text-[11px] font-bold">{error}</span>
								</div>
							{/if}
						</div>
					</div>

					<button
						onclick={handleLogin}
						disabled={!password || isAuthenticating}
						class="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-zinc-900 px-8 font-bold text-white shadow-xl shadow-zinc-900/20 transition-all hover:bg-zinc-800 active:scale-95 disabled:bg-zinc-300 disabled:shadow-none"
					>
						{#if isAuthenticating}
							<Loader2 size={20} class="animate-spin" />
							Verifying...
						{:else}
							<LogIn size={20} />
							Unlock Access
						{/if}
					</button>
				</div>
			</div>

			<p
				class="mt-8 flex items-center justify-center gap-2 text-center text-xs font-bold text-zinc-400"
			>
				Protected Environment <span class="h-1 w-1 rounded-full bg-zinc-300"></span> Secure Session
			</p>
		</div>
	</div>
{:else}
	<div class="font-poppins relative flex min-h-screen w-full flex-col">
		<!-- Global Header (Admin Brand) -->
		<header
			class="flex h-16 shrink-0 items-center justify-between border-b border-white/60 bg-white/40 px-6 backdrop-blur-xl lg:h-20 lg:px-12"
		>
			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-lg lg:h-12 lg:w-12"
				>
					<Lock size={20} class="lg:size-6" />
				</div>
				<div>
					<span class="text-lg font-bold text-zinc-900 lg:text-xl">Admin</span>
					<p class="hidden text-[10px] font-black tracking-widest text-blue-600 uppercase lg:block">
						Control Panel
					</p>
				</div>
			</div>
			<button
				onclick={logout}
				class="rounded-xl border border-white/60 bg-white/20 px-4 py-2 text-xs font-bold text-zinc-500 transition-all hover:bg-red-50 hover:text-red-500 active:scale-95"
			>
				Sign Out
			</button>
		</header>

		<main class="flex-1 overflow-auto pb-32 lg:pb-40">
			{@render children()}
		</main>

		<AdminBottomNav />

		<!-- Session Re-authentication Modal (Triggered by 400 Bad Request) -->
		{#if adminAuth.needsLoginModal}
			<div
				class="fixed inset-0 z-100 flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-md"
				in:fade
			>
				<div class="w-full max-w-sm rounded-[32px] bg-white p-8 shadow-2xl" in:fly={{ y: 20 }}>
					<div class="mb-6 flex flex-col items-center text-center">
						<div
							class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-500 shadow-inner"
						>
							<Lock size={28} />
						</div>
						<h3 class="text-xl font-bold text-zinc-900">Session Expired</h3>
						<p class="mt-1 text-sm font-medium text-gray-400">Please re-verify your credentials</p>
					</div>

					<div class="space-y-4">
						<div class="group relative">
							<input
								type={showPassword ? 'text' : 'password'}
								bind:value={password}
								onkeydown={handleKeydown}
								placeholder="Confirm Password"
								class="h-14 w-full rounded-2xl border border-gray-100 bg-gray-50 px-6 pr-14 text-sm font-bold text-zinc-900 transition-all outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5"
							/>
							<button
								type="button"
								onclick={() => (showPassword = !showPassword)}
								class="absolute top-1/2 right-4 -translate-y-1/2 p-2 text-gray-400 transition-colors hover:text-zinc-900"
							>
								{#if showPassword}
									<EyeOff size={20} />
								{:else}
									<Eye size={20} />
								{/if}
							</button>
						</div>
						{#if error}
							<p class="text-center text-xs font-bold text-red-500">{error}</p>
						{/if}
						<button
							onclick={handleLogin}
							disabled={!password || isAuthenticating}
							class="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 font-bold text-white transition-all hover:bg-zinc-800 active:scale-95 disabled:bg-zinc-200"
						>
							{#if isAuthenticating}
								<Loader2 size={18} class="animate-spin" />
							{:else}
								Re-authenticate
							{/if}
						</button>
						<button
							onclick={() => {
								adminAuth.rejectLogin();
								adminAuth.needsLoginModal = false;
							}}
							class="w-full py-2 text-xs font-bold text-gray-400 hover:text-zinc-900"
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.glass-card {
		background: rgba(255, 255, 255, 0.4);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
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
