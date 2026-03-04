<script>
	import { LayoutDashboard, Users, BarChart3, Settings, ClipboardList, X } from 'lucide-svelte';
	import { page } from '$app/state';
	import { fade } from 'svelte/transition';

	let { isMobileOpen = $bindable(false) } = $props();

	const navItems = [
		{ name: 'Participants', path: '/admin', icon: Users },
		{ name: 'Questions', path: '/admin/questions', icon: ClipboardList },
		{ name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
		{ name: 'Settings', path: '/admin/settings', icon: Settings }
	];

	function isActive(path) {
		return page.url.pathname === path || (path !== '/admin' && page.url.pathname.startsWith(path));
	}
</script>

<!-- Mobile Overlay -->
{#if isMobileOpen}
	<div
		role="button"
		tabindex="0"
		onclick={() => (isMobileOpen = false)}
		onkeydown={(e) => e.key === 'Escape' && (isMobileOpen = false)}
		class="fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-sm lg:hidden"
		transition:fade
	></div>
{/if}

<aside
	class="fixed top-0 left-0 z-50 flex h-screen w-80 flex-col gap-10 border-r border-white/60 bg-white/40 p-8 shadow-2xl backdrop-blur-2xl transition-transform duration-300 lg:translate-x-0 lg:shadow-none
	{isMobileOpen ? 'translate-x-0' : '-translate-x-full'}"
>
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<div
				class="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-2xl shadow-zinc-900/20"
			>
				<LayoutDashboard size={26} />
			</div>
			<div>
				<span class="text-2xl font-bold tracking-tight text-zinc-900">Admin</span>
				<p class="text-[10px] font-bold tracking-widest text-blue-600 uppercase">Control Panel</p>
			</div>
		</div>
		<button
			onclick={() => (isMobileOpen = false)}
			class="p-2 text-zinc-400 hover:text-zinc-900 lg:hidden"
		>
			<X size={24} />
		</button>
	</div>

	<nav class="flex flex-col gap-3">
		{#each navItems as item}
			<a
				href={item.path}
				onclick={() => (isMobileOpen = false)}
				class="flex items-center gap-4 rounded-2xl px-5 py-4 font-bold transition-all
					{isActive(item.path)
					? 'bg-zinc-900 text-white shadow-xl shadow-zinc-900/20 hover:bg-zinc-800'
					: 'text-zinc-500 hover:bg-white/60 hover:text-zinc-900'}"
			>
				<item.icon size={22} />
				{item.name}
			</a>
		{/each}
	</nav>

	<div
		class="group relative mt-auto overflow-hidden rounded-3xl bg-linear-to-br from-indigo-600 to-blue-700 p-8 text-white shadow-2xl shadow-indigo-600/20"
	>
		<div class="relative z-10">
			<p class="text-xs font-bold tracking-wider uppercase opacity-70">Analytics Pro</p>
			<p class="mt-2 mb-5 text-sm leading-relaxed font-bold">
				View detailed insights and user behavior patterns.
			</p>
			<button
				class="w-full rounded-2xl bg-white/20 py-3 text-sm font-bold backdrop-blur-md transition-all hover:bg-white/30 active:scale-95"
			>
				Upgrade Now
			</button>
		</div>
		<div class="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-2xl"></div>
	</div>
</aside>
