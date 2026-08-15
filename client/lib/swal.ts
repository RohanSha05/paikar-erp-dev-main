import Swal from 'sweetalert2';

const toastWidth = '320px';
const modalWidth = '360px';

const toastAlert = Swal.mixin({
	toast: true,
	position: 'top-end',
	showConfirmButton: false,
	timerProgressBar: true,
	showCloseButton: true,
	closeButtonHtml: '&times;',
	didOpen: (toast) => {
		toast.onmouseenter = Swal.stopTimer;
		toast.onmouseleave = Swal.resumeTimer;
	},
});

const modalAlert = Swal.mixin({
	position: 'center',
	showCloseButton: true,
	closeButtonHtml: '&times;',
	width: modalWidth,
	padding: '0.9rem',
	customClass: {
		popup: 'swal-modal-small',
		title: 'swal-modal-title',
		htmlContainer: 'swal-modal-text',
	},
});

export function showSuccess(title: string, text?: string) {
	return toastAlert.fire({
		icon: 'success',
		title,
		text,
		timer: 3000,
		width: toastWidth,
		padding: '0.75rem',
		customClass: {
			popup: 'swal-toast-small',
			title: 'swal-toast-title',
			htmlContainer: 'swal-toast-text',
		},
	});
}

export function showError(title: string, text?: string) {
	return toastAlert.fire({
		icon: 'error',
		title,
		text,
		timer: 1800,
		width: toastWidth,
		padding: '0.75rem',
		customClass: {
			popup: 'swal-toast-small',
			title: 'swal-toast-title',
			htmlContainer: 'swal-toast-text',
		},
	});
}

export function showConfirm(title: string, text?: string) {
	return modalAlert.fire({
		icon: 'question',
		title,
		text,
		showCancelButton: true,
		confirmButtonText: 'Yes',
		cancelButtonText: 'Cancel',
	});
}

export async function promptText(title: string, value?: string) {
	const result = await modalAlert.fire({
		title,
		input: 'text',
		inputValue: value || '',
		showCancelButton: true,
		confirmButtonText: 'Save',
		cancelButtonText: 'Cancel',
	});

	if (!result.isConfirmed) return null;
	return String(result.value || '').trim();
}

export async function promptPassword(title: string, text?: string) {
	const result = await modalAlert.fire({
		title,
		text,
		input: 'password',

		inputAttributes: {
			autocomplete: 'current-password',
		},

		showCancelButton: true,
		confirmButtonText: 'Verify',
		cancelButtonText: 'Cancel',

		inputValidator: (value) => {
			if (!String(value || '').trim()) {
				return 'Password is required';
			}
			return null;
		},
	});

	if (!result.isConfirmed) return null;

	return String(result.value || '').trim();
}