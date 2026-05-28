import { createApp } from 'vue';
import router from './router';
import i18n from './i18n';
import './index.css';
import '@desktop-renderer-globals-css';
import '@desktop-renderer-i18n';
import App from './App.vue';

document.documentElement.classList.add('prompthub-web-runtime');
document.body.classList.add('prompthub-web-runtime');

const app = createApp(App);
app.use(router);
app.use(i18n);
app.mount('#root');
