//
import './components/Chat';
import './components/ChatInput';
import './components/ChatRooms';
import './components/Login';
import './components/Profile';
import './components/TwitchChat';
import './components/ProfileIndicator';
import './components/Tooltip';
//
import Events from './events/Events';

import AppEvent from './events/AppEvent';

import Application from './App';
import Account from './Account';

import { createApp } from 'vue';
import AppComponent from './vue/App.vue';
import Badges from './services/Badges';
import Emotes from './services/Emotes';
import Notifications from './util/Notifications';

// TODO: Move this stuff to VUE component
// async function onLogin(account: Account) {
//     createApp({
//         components: {
//             'App': AppComponent,
//         }
//     }).mount('#app');

//     Application.on(Events.ChannelSelected, (e: AppEvent) => {
//         console.log(e);
//         console.log('Logged in');
//     });
// }

async function onLogin(account: Account) {
    console.log('Logged in', account);

    // load critical resources
    await Badges.getGlobalBadges();
    await Emotes.getGlobalEmotes();

    // init state
    await Application.init();

    Application.setAccount(account);

    console.log('Initialized');

    window.dispatchEvent(new Event(Events.Initialize));

    Application.on(Events.ChannelSelected, e => {
        const channel = e.data.channel;
        renderSelecetdChat(channel);
    });

    renderSelecetdChat(Application.getSelectedChannel());

    Notifications.initialize();
}

// TODO: find a better method to switch between views = use vue
function renderSelecetdChat(channel: string) {
    const input = document.querySelector('chat-input');
    const container = document.querySelector('.chat');
    if (container) {
        for (let child of container.children) {
            if (child.hide != undefined) {
                child.hide();
            }
        }

        const chat = Application.getChannel(channel);
        const chatEle = chat?.chat;

        if (chatEle) {
            if (!chatEle.parentNode) {
                container.append(chatEle);
            }
            if (channel === "@") {
                input?.setAttribute('disabled', '');
            } else {
                input?.removeAttribute('disabled');
            }

            chatEle.show();
        }
    }
}

window.addEventListener('app-login', (e: LoginEvent) => {
    onLogin(e.data.account);
});

window.addEventListener(Events.ChatCommandEvent, e => {
    if (e.data.message == "/poll") {
        alert('create poll dialog');
        e.cancel();
    }
})
