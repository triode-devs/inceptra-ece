<script>
	import { page } from '$app/state';
	import { fade, fly } from 'svelte/transition';
	import {
		Plus,
		Trash2,
		ArrowLeft,
		RefreshCw,
		CheckCircle2,
		AlertCircle,
		FileText,
		Edit3,
		X,
		Image as ImageIcon,
		UploadCloud,
		ImagePlus
	} from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { API_BASE_URL, authenticatedFetch } from '$lib';

	// Constants for styling to match theme
	const CARD_CLASSES = 'glass-card rounded-[32px] p-8 shadow-2xl shadow-blue-900/10 mb-8';
	const INPUT_CLASSES =
		'h-14 w-full rounded-2xl border border-gray-100 bg-white/60 px-4 text-sm font-bold text-zinc-900 transition-all outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5';
	const BTN_PRIMARY =
		'flex h-14 items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-8 font-bold text-white shadow-xl shadow-zinc-900/20 hover:bg-zinc-800 transition-all active:scale-95 disabled:bg-gray-400';

	// --- STATE ---
	let setId = $derived(page.params.id);

	let activeSet = $state({
		id: '',
		name: 'Loading...',
		description: '',
		questions: []
	});

	let isLoading = $state(true);
	let isSaving = $state(false);
	let newQuestionText = $state('');
	let newOptions = $state(['', '', '', '']);
	let correctOptionIndex = $state(0);
	let editingId = $state(null);

	// Image state
	let questionImage = $state(null); // Local preview URL or public URL
	let questionImageFile = $state(null);
	let optionImages = $state([null, null, null, null]);
	let optionImageFiles = $state([null, null, null, null]);
	let answerImage = $state(null);
	let answerImageFile = $state(null);

	onMount(fetchSetDetail);

	async function fetchSetDetail() {
		isLoading = true;
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/question-sets/${setId}`);
			const result = await res.json();
			if (result.success) {
				activeSet = {
					id: result.data.id,
					name: result.data.title,
					description: result.data.description,
					questions: result.data.questions.map((q) => ({
						id: q.id,
						q: q.question_text,
						question_image: q.question_image,
						a: [q.option_a_text, q.option_b_text, q.option_c_text, q.option_d_text],
						option_images: [q.option_a_image, q.option_b_image, q.option_c_image, q.option_d_image],
						answer_image: q.answer_image,
						correct: ['A', 'B', 'C', 'D'].indexOf(q.correct_option)
					}))
				};
			}
		} catch (err) {
			console.error(err);
		} finally {
			isLoading = false;
		}
	}

	// --- ACTIONS ---
	async function saveQuestion() {
		if ((!newQuestionText && !questionImage) || isSaving) return;

		isSaving = true;
		const formData = new FormData();
		formData.append('question_text', newQuestionText);
		formData.append('correct_option', ['A', 'B', 'C', 'D'][correctOptionIndex]);
		formData.append('marks', '4');
		formData.append('negative_marks', '1');

		// Options
		newOptions.forEach((opt, i) => {
			formData.append(`option_${['a', 'b', 'c', 'd'][i]}_text`, opt);
		});

		// Image files
		if (questionImageFile) formData.append('question_image', questionImageFile);
		if (answerImageFile) formData.append('answer_image', answerImageFile);
		optionImageFiles.forEach((file, i) => {
			if (file) formData.append(`option_${['a', 'b', 'c', 'd'][i]}_image`, file);
		});

		try {
			const url = editingId
				? `${API_BASE_URL}/admin/questions/${editingId}`
				: `${API_BASE_URL}/admin/question-sets/${setId}/questions`;

			// The API handles both JSON and Multipart. For questions with images, Multipart is required.
			const res = await authenticatedFetch(url, {
				method: editingId ? 'PUT' : 'POST',
				body: formData
			});

			const result = await res.json();
			if (result.success) {
				fetchSetDetail();
				resetQuestionForm();
			} else {
				alert(result.error || 'Save failed');
			}
		} catch (err) {
			alert('Connection error');
		} finally {
			isSaving = false;
		}
	}

	function handleFileSelect(e, type, index = null) {
		const file = e.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			if (type === 'question') {
				questionImage = event.target.result;
				questionImageFile = file;
			} else if (type === 'option') {
				optionImages[index] = event.target.result;
				optionImageFiles[index] = file;
			} else if (type === 'answer') {
				answerImage = event.target.result;
				answerImageFile = file;
			}
		};
		reader.readAsDataURL(file);
	}

	function startEdit(question) {
		editingId = question.id;
		newQuestionText = question.q;
		newOptions = [...question.a];
		correctOptionIndex = question.correct;

		// Map existing images
		questionImage = question.question_image;
		optionImages = [...question.option_images];
		answerImage = question.answer_image;

		// Reset file objects
		questionImageFile = null;
		optionImageFiles = [null, null, null, null];
		answerImageFile = null;

		// Scroll form into view on mobile if needed
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	async function removeQuestion(qId) {
		if (!confirm('Are you sure?')) return;
		try {
			const res = await authenticatedFetch(`${API_BASE_URL}/admin/questions/${qId}`, {
				method: 'DELETE'
			});
			const result = await res.json();
			if (result.success) {
				activeSet.questions = activeSet.questions.filter((q) => q.id !== qId);
			} else {
				alert(result.error || 'Delete failed');
			}
		} catch (err) {
			alert('Connection error');
		}
	}

	function resetQuestionForm() {
		newQuestionText = '';
		newOptions = ['', '', '', ''];
		correctOptionIndex = 0;
		editingId = null;

		questionImage = null;
		questionImageFile = null;
		optionImages = [null, null, null, null];
		optionImageFiles = [null, null, null, null];
		answerImage = null;
		answerImageFile = null;
	}
</script>

<svelte:head>
	<title>Manage Questions - {activeSet.name}</title>
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
	<header class="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between lg:mb-12">
		<div>
			<a
				href="/admin/questions"
				class="mb-4 flex items-center gap-2 text-sm font-bold text-blue-600 transition-transform hover:translate-x-[-4px]"
			>
				<ArrowLeft size={16} /> Back to Sets
			</a>
			<p class="mb-2 text-xs font-bold tracking-widest text-blue-600 uppercase">Editor</p>
			<h1 class="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">{activeSet.name}</h1>
		</div>
	</header>

	<div class="grid gap-8 xl:grid-cols-[1fr,400px]">
		<!-- Questions List -->
		<div class="space-y-4">
			<div class="mb-4 flex items-center gap-4">
				<div class="h-1 w-12 rounded-full bg-blue-500"></div>
				<h2 class="text-xl font-bold tracking-tight lg:text-2xl">
					Questions ({activeSet.questions.length})
				</h2>
			</div>

			{#if isLoading}
				{#each Array(3) as _}
					<div class="h-48 animate-pulse rounded-3xl bg-white/40"></div>
				{/each}
			{:else if activeSet.questions.length === 0}
				<div
					in:fade
					class="flex flex-col items-center rounded-[32px] border-2 border-dashed border-gray-200 p-8 text-center"
				>
					<AlertCircle size={32} class="mb-3 text-gray-200" />
					<p class="text-sm font-bold text-gray-400">No questions in this set yet.</p>
					<p class="text-xs text-gray-400">Use the form on the right to start adding.</p>
				</div>
			{:else}
				{#each activeSet.questions as q, i (q.id)}
					<div
						in:fly={{ y: 20 }}
						class="rounded-3xl border border-white bg-white/60 p-6 shadow-sm transition-all hover:shadow-md"
					>
						<div class="mb-4 flex items-start justify-between gap-4">
							<div>
								<span
									class="mb-2 block text-[10px] font-black tracking-[0.2em] text-blue-600 uppercase opacity-60"
									>Question {i + 1}</span
								>
								<p class="text-xl leading-tight font-bold text-zinc-900">{q.q}</p>

								{#if q.question_image}
									<div class="mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-white/40">
										<img
											src={q.question_image}
											alt="Question"
											class="max-h-64 w-auto object-contain"
										/>
									</div>
								{/if}
							</div>
							<div class="flex gap-2">
								<button
									onclick={() => startEdit(q)}
									class="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-500 transition-all hover:bg-blue-600 hover:text-white"
									title="Edit question"
								>
									<Edit3 size={18} />
								</button>
								<button
									onclick={() => removeQuestion(q.id)}
									class="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-400 transition-all hover:bg-red-500 hover:text-white"
									title="Delete question"
								>
									<Trash2 size={18} />
								</button>
							</div>
						</div>

						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
							{#each q.a as option, idx}
								<div
									class="relative flex items-center gap-3 rounded-2xl border p-4 transition-all
											{idx === q.correct
										? 'border-green-200 bg-green-50/50 ring-1 ring-green-200'
										: 'border-white/60 bg-white/40 opacity-80'}"
								>
									<div
										class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold
												{idx === q.correct
											? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
											: 'bg-zinc-200 text-zinc-500'}"
									>
										{String.fromCharCode(65 + idx)}
									</div>
									<div class="flex flex-col">
										<p
											class="text-sm font-bold {idx === q.correct
												? 'text-green-800'
												: 'text-zinc-600'}"
										>
											{option}
										</p>
										{#if q.option_images[idx]}
											<div
												class="mt-2 h-20 w-32 overflow-hidden rounded-lg border border-white/40 shadow-sm"
											>
												<img
													src={q.option_images[idx]}
													alt="Option"
													class="h-full w-full object-cover"
												/>
											</div>
										{/if}
									</div>
									{#if idx === q.correct}
										<CheckCircle2 size={14} class="ml-auto text-green-500" />
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Side Form (Sticky for XL) -->
		<div class="xl:sticky xl:top-8 xl:h-fit">
			<div
				class="{CARD_CLASSES} mb-0! border border-white p-6 md:p-8! {editingId
					? 'ring-2 ring-blue-500'
					: ''}"
			>
				<div class="mb-6 flex items-center justify-between">
					<h3 class="flex items-center gap-2 text-xl font-bold">
						{#if editingId}
							<Edit3 size={24} class="text-blue-500" /> Edit Question
						{:else}
							<Plus size={24} class="text-blue-500" /> Add Question
						{/if}
					</h3>
					{#if editingId}
						<button
							onclick={resetQuestionForm}
							class="text-gray-400 transition-colors hover:text-red-500"
						>
							<X size={20} />
						</button>
					{/if}
				</div>

				<div class="space-y-6">
					<div>
						<div class="mb-2 flex items-center justify-between">
							<label
								for="q-text"
								class="text-[10px] font-bold tracking-widest text-gray-400 uppercase"
								>Question Text</label
							>
							<label class="cursor-pointer text-blue-500 hover:text-blue-600">
								<input
									type="file"
									accept="image/*"
									class="sr-only"
									onchange={(e) => handleFileSelect(e, 'question')}
								/>
								<div
									class="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase"
								>
									<ImagePlus size={14} />
									{questionImage ? 'Change Image' : 'Add Image'}
								</div>
							</label>
						</div>

						{#if questionImage}
							<div
								class="group relative mb-4 h-40 w-full overflow-hidden rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30"
							>
								<img src={questionImage} alt="Preview" class="h-full w-full object-contain" />
								<button
									onclick={() => {
										questionImage = null;
										questionImageFile = null;
									}}
									class="absolute top-2 right-2 rounded-full bg-white/60 p-1.5 text-red-500 backdrop-blur-md transition-all hover:bg-red-500 hover:text-white"
								>
									<X size={16} />
								</button>
							</div>
						{/if}

						<textarea
							id="q-text"
							bind:value={newQuestionText}
							placeholder="Ask something interesting..."
							class="{INPUT_CLASSES} h-24! resize-none py-3"
						></textarea>
					</div>

					<div class="space-y-4">
						<p class="block text-[10px] font-bold tracking-widest text-gray-400 uppercase">
							Options & Correct Answer
						</p>
						{#each newOptions as option, idx}
							<div class="group relative flex gap-3">
								<label class="shrink-0">
									<input
										type="radio"
										name="correctOption"
										checked={correctOptionIndex === idx}
										onchange={() => (correctOptionIndex = idx)}
										class="peer sr-only"
									/>
									<div
										class="flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border-2 border-gray-100
												bg-gray-50 text-gray-300 transition-all
												peer-checked:border-green-500 peer-checked:bg-green-500 peer-checked:text-white hover:border-green-200"
										title="Mark as correct"
									>
										<CheckCircle2 size={24} />
									</div>
								</label>

								<div class="flex flex-1 flex-col gap-2">
									<div class="relative flex-1">
										<input
											aria-label="Option {idx + 1}"
											type="text"
											bind:value={newOptions[idx]}
											placeholder="Option {idx + 1}"
											class="{INPUT_CLASSES} h-12! transition-all
													{correctOptionIndex === idx ? 'border-green-500 bg-green-50/30' : ''}"
										/>
										<label
											class="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-blue-500"
										>
											<input
												type="file"
												accept="image/*"
												class="sr-only"
												onchange={(e) => handleFileSelect(e, 'option', idx)}
											/>
											<ImageIcon size={18} class={optionImages[idx] ? 'text-blue-500' : ''} />
										</label>
									</div>

									{#if optionImages[idx]}
										<div
											class="relative h-16 w-full overflow-hidden rounded-xl border border-gray-100 bg-gray-50/50"
										>
											<img
												src={optionImages[idx]}
												alt="Option Preview"
												class="h-full w-full object-contain"
											/>
											<button
												onclick={() => {
													optionImages[idx] = null;
													optionImageFiles[idx] = null;
												}}
												class="absolute top-1 right-1 rounded-full bg-white/60 p-1 text-red-500 backdrop-blur-md transition-all hover:bg-red-500 hover:text-white"
											>
												<X size={12} />
											</button>
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>

					<!-- Answer Explanation / Image -->
					<div>
						<div class="mb-2 flex items-center justify-between">
							<span class="text-[10px] font-bold tracking-widest text-gray-400 uppercase"
								>Answer Explanation Image</span
							>
							<label class="cursor-pointer text-blue-500 hover:text-blue-600">
								<input
									type="file"
									accept="image/*"
									class="sr-only"
									onchange={(e) => handleFileSelect(e, 'answer')}
								/>
								<div
									class="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase"
								>
									<UploadCloud size={14} />
									{answerImage ? 'Change' : 'Add Image'}
								</div>
							</label>
						</div>
						{#if answerImage}
							<div
								class="relative h-20 w-full overflow-hidden rounded-xl border border-dashed border-gray-200 bg-gray-50/50"
							>
								<img
									src={answerImage}
									alt="Answer Explanation"
									class="h-full w-full object-contain"
								/>
								<button
									onclick={() => {
										answerImage = null;
										answerImageFile = null;
									}}
									class="absolute top-1 right-1 rounded-full bg-white/60 p-1 text-red-500 backdrop-blur-md transition-all hover:bg-red-500 hover:text-white"
								>
									<X size={12} />
								</button>
							</div>
						{/if}
					</div>

					<div class="flex gap-3">
						{#if editingId}
							<button
								onclick={resetQuestionForm}
								class="flex-1 rounded-2xl bg-gray-100 py-4 font-bold text-gray-500 transition-all hover:bg-gray-200"
							>
								Cancel
							</button>
						{/if}
						<button
							onclick={saveQuestion}
							disabled={(!newQuestionText && !questionImage) || isSaving}
							class="{BTN_PRIMARY} {editingId ? 'flex-2' : 'w-full'}"
						>
							{#if isSaving}
								<RefreshCw class="animate-spin" size={18} /> Saving...
							{:else}
								{editingId ? 'Update Question' : 'Add to Set'}
							{/if}
						</button>
					</div>
				</div>
			</div>
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
