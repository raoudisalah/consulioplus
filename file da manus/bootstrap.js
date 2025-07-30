/**
 * Laravel Bootstrap
 * 
 * Configurazione base per l'applicazione Laravel
 */

// Import Axios
window.axios = require('axios');

// Configurazione CSRF token per Axios
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// CSRF Token
let token = document.head.querySelector('meta[name="csrf-token"]');

if (token) {
    window.axios.defaults.headers.common['X-CSRF-TOKEN'] = token.content;
} else {
    console.error('CSRF token not found: https://laravel.com/docs/csrf#csrf-x-csrf-token');
}

console.log('Laravel bootstrap caricato');

