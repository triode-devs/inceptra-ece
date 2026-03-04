<script>
	import { fade, fly } from 'svelte/transition';
	import { Loader2, CheckCircle2, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-svelte';
	import { API_BASE_URL } from '$lib';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// --- ASSETS ---
	const IMAGES = {
		logo: 'https://img.icons8.com/isometric/100/graduation-cap.png'
	};

	// --- CONSTANTS ---
	const INPUT_CLASSES =
		'h-14 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-zinc-900 transition-all outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10';
	const BTN_PRIMARY_CLASSES =
		'group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-zinc-900 text-lg font-bold text-white shadow-xl shadow-zinc-900/20 transition-all hover:bg-zinc-800 active:scale-95 disabled:bg-gray-400 disabled:scale-100 disabled:shadow-none';
	const OPTION_BTN_CLASSES =
		'w-full text-left rounded-xl border-2 border-transparent bg-white/60 backdrop-blur-sm px-5 py-4 text-sm font-bold text-gray-600 shadow-sm transition-all hover:border-blue-500 hover:bg-white hover:text-zinc-900 active:scale-95';

	// --- STATE ---
	let authMode = $state('register'); // 'register' or 'login'
	let showPassword = $state(false);
	let step = $state(1); // 1: Auth, 2: Quiz, 3: Result

	// Form Data
	let id = $state('');
	let password = $state('');
	let name = $state('');
	let email = $state('');
	let phone = $state('');
	let college = $state('');

	// Quiz State
	let questions = $state([]);
	let currentIndex = $state(0);
	let score = $state(0);
	let isAuthenticating = $state(false);
	let isSubmitting = $state(false);
	let errorMessage = $state('');
	let elapsedSeconds = $state(0);
	let timerInterval;

	// --- DERIVED STATE ---
	let currentQuestion = $derived(questions[currentIndex]);
	let progressPercent = $derived((currentIndex / (questions.length || 1)) * 100);
	let formattedMin = $derived(Math.floor(elapsedSeconds / 60));
	let formattedSec = $derived(String(elapsedSeconds % 60).padStart(2, '0'));
	let avatarUrl = $derived(
		`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'Felix')}`
	);

	onMount(() => {
		const token = localStorage.getItem('participant_token');
		if (token) {
			goto('/home');
		}
	});

	// --- ACTIONS ---
	async function handleAuth(e) {
		e.preventDefault();
		isAuthenticating = true;
		errorMessage = '';

		const endpoint = authMode === 'register' ? '/participant/register' : '/participant/login';
		const payload =
			authMode === 'register'
				? { id, password, name, email, college_name: college, phone_number: phone }
				: { id, password };

		try {
			const res = await fetch(`${API_BASE_URL}${endpoint}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const result = await res.json();

			if (!res.ok) throw new Error(result.error || 'Authentication failed');

			// If success, store token and user then redirect to rooms hall
			localStorage.setItem('participant_token', result.data.token);
			localStorage.setItem('participant_user', JSON.stringify(result.data.participant));

			goto('/home');
		} catch (error) {
			errorMessage = error.message;
		} finally {
			isAuthenticating = false;
		}
	}

	async function startQuiz() {
		try {
			// Fetch real questions from API instead of hardcoded
			const res = await fetch(`${API_BASE_URL}/questions`);
			const result = await res.json();
			if (result.success) {
				questions = result.data.sort(() => Math.random() - 0.5);
				step = 2;
				timerInterval = setInterval(() => {
					elapsedSeconds++;
				}, 1000);
			} else {
				throw new Error(result.error || 'Failed to load questions');
			}
		} catch (err) {
			errorMessage = 'Could not load questions. Please check connection.';
		}
	}

	function handleAnswer(selectedIndex) {
		if (selectedIndex === currentQuestion.correct) score++;

		if (currentIndex + 1 < questions.length) {
			currentIndex++;
		} else {
			finishQuiz();
		}
	}

	async function finishQuiz() {
		clearInterval(timerInterval);
		step = 3;
		isSubmitting = true;

		try {
			const res = await fetch(`${API_BASE_URL}/submit-score`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, score, time_taken: elapsedSeconds })
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to submit score');
			}
		} catch (error) {
			errorMessage = error.message;
		} finally {
			isSubmitting = false;
		}
	}

	function playAgain() {
		location.reload();
	}
	import { slide } from 'svelte/transition';
</script>

<svelte:head>
	<title>Interactive Quiz</title>
</svelte:head>

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

<div class="font-poppins relative flex min-h-screen w-full items-center justify-center p-4">
	<div class="glass-card w-full max-w-md rounded-[32px] p-8 shadow-2xl shadow-blue-900/10">
		{#if step === 1}
			<div in:fade={{ duration: 300 }}>
				<div class="mb-8 text-center">
					<div
						class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-xl shadow-zinc-900/20"
					>
						<img src={IMAGES.logo} alt="Logo" class="h-10 w-10 brightness-0 invert" />
					</div>
					<h1 class="text-3xl font-bold tracking-tight text-zinc-900">Quiz Portal</h1>
					<p class="mt-2 text-sm font-medium text-gray-500">Enter your details to continue</p>
				</div>

				<!-- Auth Toggle -->
				<div class="mb-8 flex rounded-2xl bg-gray-100 p-1">
					<button
						onclick={() => (authMode = 'register')}
						class="flex-1 rounded-xl py-2.5 text-sm font-bold transition-all {authMode ===
						'register'
							? 'bg-white text-zinc-900 shadow-sm'
							: 'text-gray-500 hover:text-zinc-900'}"
					>
						Register
					</button>
					<button
						onclick={() => (authMode = 'login')}
						class="flex-1 rounded-xl py-2.5 text-sm font-bold transition-all {authMode === 'login'
							? 'bg-white text-zinc-900 shadow-sm'
							: 'text-gray-500 hover:text-zinc-900'}"
					>
						Login
					</button>
				</div>

				{#if errorMessage}
					<div
						class="mb-6 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600"
						in:fly={{ y: -10 }}
					>
						<AlertCircle size={18} />
						{errorMessage}
					</div>
				{/if}

				<form onsubmit={handleAuth} class="flex flex-col gap-4" autocomplete="off">
					<input
						type="text"
						bind:value={id}
						required
						autocomplete="off"
						placeholder="Registration ID"
						class={INPUT_CLASSES}
					/>
					<div class="group/pass relative">
						<input
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							required
							autocomplete={authMode === 'register' ? 'new-password' : 'current-password'}
							placeholder="Password"
							class="{INPUT_CLASSES} pr-14"
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

					{#if authMode === 'register'}
						<div in:slide class="flex flex-col gap-4">
							<input
								type="text"
								bind:value={name}
								required
								autocomplete="off"
								placeholder="Full Name"
								class={INPUT_CLASSES}
							/>
							<input
								type="email"
								bind:value={email}
								required
								autocomplete="off"
								placeholder="Email Address"
								class={INPUT_CLASSES}
							/>
							<input
								type="tel"
								bind:value={phone}
								required
								autocomplete="off"
								placeholder="Phone Number"
								class={INPUT_CLASSES}
							/>
							<input
								type="text"
								bind:value={college}
								required
								autocomplete="off"
								placeholder="College / Institution"
								class={INPUT_CLASSES}
							/>
						</div>
					{/if}

					<button type="submit" disabled={isAuthenticating} class={BTN_PRIMARY_CLASSES + ' mt-4'}>
						{#if isAuthenticating}
							<Loader2 class="animate-spin" size={20} /> Processing...
						{:else}
							<span>{authMode === 'register' ? 'Register & Start' : 'Login & Resume'}</span>
						{/if}
					</button>
				</form>
			</div>
		{/if}

		{#if step === 2}
			<div in:fade={{ duration: 300 }}>
				<div class="mb-6 flex items-center justify-between">
					<div>
						<p class="text-xs font-bold tracking-wider text-gray-400 uppercase">Question</p>
						<h2 class="text-xl font-bold text-zinc-900">{currentIndex + 1} / {questions.length}</h2>
					</div>
					<div class="flex items-center gap-3">
						<div class="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-600">
							{formattedMin}:{formattedSec}
						</div>
						<div
							class="h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-sm ring-2 ring-blue-100"
						>
							<img src={avatarUrl} alt="User Avatar" />
						</div>
					</div>
				</div>

				<div class="mb-6 h-2 w-full overflow-hidden rounded-full bg-gray-200">
					<div
						class="h-full bg-blue-600 transition-all duration-300"
						style="width: {progressPercent}%"
					></div>
				</div>

				<div class="mb-6 text-lg font-bold text-zinc-900">
					{currentQuestion.q}
				</div>

				<div class="flex flex-col gap-3">
					{#each currentQuestion.options || [] as opt, index}
						<button onclick={() => handleAnswer(index)} class={OPTION_BTN_CLASSES}>
							{opt}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		{#if step === 3}
			<div in:fade={{ duration: 300 }} class="text-center">
				{#if isSubmitting}
					<div class="flex flex-col items-center justify-center py-10">
						<Loader2 class="mb-4 h-12 w-12 animate-spin text-blue-500" />
						<h2 class="text-xl font-bold text-zinc-900">Saving Results...</h2>
					</div>
				{:else}
					<div
						class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-500 shadow-inner"
					>
						<CheckCircle2 size={40} />
					</div>

					<h2 class="mb-2 text-2xl font-bold text-zinc-900">Quiz Completed!</h2>
					<p class="text-sm font-bold text-gray-500">{name} • {college}</p>

					{#if errorMessage}
						<p class="mt-2 text-sm font-bold text-red-500">{errorMessage}</p>
					{/if}

					<div class="my-6 rounded-2xl border border-gray-100 bg-gray-50 p-5">
						<div class="mb-4 flex items-center justify-between">
							<span class="text-xs font-bold text-gray-400 uppercase">Your Score</span>
							<div class="text-2xl font-bold text-blue-600">{score} / {questions.length}</div>
						</div>
						<div class="flex items-center justify-between border-t border-gray-200 pt-4">
							<span class="text-xs font-bold text-gray-400 uppercase">Time Taken</span>
							<div class="text-lg font-bold text-zinc-700">
								{#if formattedMin > 0}{formattedMin} min{/if}
								{Number(formattedSec)} sec
							</div>
						</div>
					</div>

					<a href="/results" class={BTN_PRIMARY_CLASSES + ' mb-3'}>
						View Leaderboard <ArrowRight size={20} />
					</a>
					<button
						onclick={playAgain}
						class="w-full py-3 text-sm font-bold text-gray-500 transition-colors hover:text-zinc-900"
					>
						Play Again
					</button>
				{/if}
			</div>
		{/if}
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
