import { untrack } from 'svelte';

// Shared auth state for the admin layout to watch
export const adminAuth = $state({
	needsLoginModal: false,
	resolveLogin: null, // Callback to resume the fetch after login
	rejectLogin: null   // Callback to fail the fetch if login cancelled
});

/**
 * Helper to make authenticated admin requests with retry logic on 400
 */
export async function authenticatedFetch(url, options = {}) {
	const token = localStorage.getItem('admin_token');
	
	const mergedOptions = {
		...options,
		headers: {
			'Authorization': `Bearer ${token}`,
			...options.headers
		}
	};

	try {
		const res = await fetch(url, mergedOptions);
		
		// Handle 401 Unauthorized: clear token and redirect to admin login
		if (res.status === 401 && window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin') {
			localStorage.removeItem('admin_token');
			window.location.href = '/admin';
			// wait a little bit just so fetch doesn't error before navigating
			await new Promise(r => setTimeout(r, 100));
			return res;
		}

		// Per user request: handle 400 Bad Request with a login popup fallback
		if (res.status === 400) {
			// Trigger the login modal and wait for result
			const success = await triggerLoginModal();
			if (success) {
				// Retry with the NEW token
				const newToken = localStorage.getItem('admin_token');
				mergedOptions.headers['Authorization'] = `Bearer ${newToken}`;
				return fetch(url, mergedOptions);
			}
			return res; // Return the 400 if they cancel
		}
		
		return res;
	} catch (err) {
		throw err;
	}
}

function triggerLoginModal() {
	return new Promise((resolve, reject) => {
		adminAuth.needsLoginModal = true;
		adminAuth.resolveLogin = () => {
			adminAuth.needsLoginModal = false;
			resolve(true);
		};
		adminAuth.rejectLogin = () => {
			adminAuth.needsLoginModal = false;
			resolve(false);
		};
	});
}
