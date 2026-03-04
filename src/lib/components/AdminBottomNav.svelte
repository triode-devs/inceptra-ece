<script>
	import { Users, BarChart3, Settings, ClipboardList, DoorOpen } from 'lucide-svelte';
	import { page } from '$app/state';
	import { fade } from 'svelte/transition';

	const navItems = [
		{ name: 'People', path: '/admin', icon: Users },
		{ name: 'Questions', path: '/admin/questions', icon: ClipboardList },
		{ name: 'Rooms', path: '/admin/rooms', icon: DoorOpen },
		{ name: 'Analytics', path: '/admin/analytics', icon: BarChart3 }
	];

	function isActive(path) {
		return page.url.pathname === path || (path !== '/admin' && page.url.pathname.startsWith(path));
	}
</script>

<nav
	class="fixed bottom-6 left-1/2 z-50 w-[calc(100%-3rem)] max-w-lg -translate-x-1/2 rounded-[32px] border border-white/60 bg-white/40 p-2 shadow-2xl shadow-blue-900/10 backdrop-blur-2xl lg:p-3"
>
	<div class="flex items-center justify-around gap-2">
		{#each navItems as item}
			<a
				href={item.path}
				class="flex flex-1 flex-col items-center gap-1 rounded-[24px] py-3 transition-all
					{isActive(item.path)
					? 'bg-zinc-900 text-white shadow-xl shadow-zinc-900/20 active:scale-95'
					: 'text-zinc-500 hover:bg-white/60 hover:text-zinc-900'}"
			>
				<item.icon size={20} class={isActive(item.path) ? 'scale-110' : ''} />
				<span class="text-[10px] font-bold tracking-tight">{item.name}</span>
			</a>
		{/each}
	</div>
</nav>

<style>
</style>
