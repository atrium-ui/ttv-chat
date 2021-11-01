import { css, html } from 'lit-element';
import { Application } from '../App';
import IRCChatClient from '../IRCChatClient';
import TwitchAPI, { getUserInfo } from '../services/Twitch';
import Webbrowser from '../Webbrowser';
import Chat from './Chat';
import ContextMenu from './ContextMenu';
import Format from '../Format';
// Components
import './FluidInput';
import './Timer';
import './UserList';

export default class TwitchChat extends Chat {

    stream_title: string = "";

    connect = false;

    info = null;

    r9k = false;
    subscribers_only = false;
    emote_only = false;
    follwers_only = 0;
    slow_mode = 0;
    chatter_count = 0;

    slowmode_time = 10;
    followermode_time = 10;
    
    moderator = false;
    broadcaster = false;

    canvas = document.createElement('canvas');

    appendMessage(...args) {
        const line = super.appendMessage(...args);

        if(!this.connect) {
            line.style.opacity = "0.5";
        }
    }

    setRoom(roomName: string) {
        super.setRoom(roomName);

        if(!this.connect) {
            this.appendNote(`Connecting`);
        }

        const updateStatus = async () => {
            const stream = await TwitchAPI.getStreams(this.info.id);
            if(stream[0]) {

                const {
                    viewer_count,
                    started_at,
                    game_name,
                    title
                } = stream[0];

                this.stream_title = html`
                    <div title="${title}">
                        ${Format.number(viewer_count)} - <stream-timer starttime="${started_at}"></stream-timer> - ${game_name} - ${title}
                    </div>
                `;

                this.update();
            }
        }

        setInterval(() => {
            updateStatus();
        }, 1000 * 15);

        getUserInfo(this.roomName).then(async info => {
            this.info = info;

            updateStatus();

            const channel = await TwitchAPI.getChannel(info.id);
            info.channel_info = channel[0];

            this.update();
        })

        this.update();
    }

    async updateChatterCount() {
        return IRCChatClient.getUserlist(this.roomName).then(chatters => {
            this.chatter_count = chatters.chatter_count;
            this.update();
        });
    }

    constructor() {
        super();


        const context = this.canvas.getContext("2d");
        let scrollY = 0;
        
        const draw = (ms = 0) => {
            if(context) {
                context.clearRect(0, 0, context.canvas.width, context.canvas.height);

                for(let i = 0; i < context.canvas.height; i += 20) {
                    const txt = Math.floor(Math.random() * 100000000000000000000000000).toFixed();
                    context.fillStyle = "#eee";
                    context.fillText(txt, 0, i * 20);
                }
            }
            requestAnimationFrame(draw);
        }

        draw();

        // update room info at interval
        const update_info = () => getUserInfo(this.roomName).then(info => {
            this.setRoom(this.roomName);
            this.updateChatterCount();
            setTimeout(() => update_info(), 1000 * 60);
        });
        window.addEventListener('loggedin', e => {
            update_info();
        });

        IRCChatClient.listen('chat.user', msg => {
            if(msg.channel === this.roomName) {
                this.moderator = msg.badges.find(b => b.name == "moderator") !== undefined;
                this.broadcaster = msg.badges.find(b => b.name == "broadcaster") !== undefined;
                this.update();

                if(this.moderator === true || this.broadcaster === true) {
                    this.setAttribute('modview', '');
                } else {
                    this.removeAttribute('modview');
                }
            }
        })

        IRCChatClient.listen('chat.state', msg => {
            if(msg.channel_login == this.roomName) {
                if(msg.r9k !== null) {
                    this.r9k = msg.r9k;
                }
                if(msg.subscribers_only !== null) {
                    this.subscribers_only = msg.subscribers_only;
                }
                if(msg.emote_only !== null) {
                    this.emote_only = msg.emote_only;
                }
                if(msg.follwers_only !== null) {
                    this.follwers_only = msg.follwers_only !== "Disabled" ? msg.follwers_only.Enabled.secs : 0;
                    if(this.followermode_time === 0) {
                        this.followermode_time = this.follwers_only / 60;
                    }
                }
                if(msg.slow_mode !== null) {
                    this.slow_mode = msg.slow_mode.secs;
                    if(this.slowmode_time === 0) {
                        this.slowmode_time = this.slow_mode;
                    }
                }
                this.update();

                if(!this.connect) {
                    this.appendNote(`Connected to ${this.roomName}`);
                    this.updateChatterCount();

                    this.connect = true;
                }
            }
        });
    }

    static get styles() {
        return css`
            :host {
                display: block;
                height: 100%;
                width: 100%;
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
            }
            .lines {
                padding-top: 60px;
                box-sizing: border-box;
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                overflow: hidden;
            }
            canvas {
                width: 100%;
                height: 100%;
                position: absolute;
                top: 0;
                left: 0;
            }
            .line {

            }
            .info {
                opacity: 0.5;
                padding: 10px 15px;
            }

            .header {
                background: rgba(25, 25, 28, 0.75);
                backdrop-filter: blur(24px);
                background: rgba(25, 25, 28, 0.9);
                backdrop-filter: blur(24px);
                position: relative;
                z-index: 1000;
            }

            .chat-title {
                width: 100%;
                padding: 5px 10px;
                box-sizing: border-box;
                overflow: hidden;
                text-overflow: ellipsis;
                align-items: center;
                white-space: nowrap;
                font-size: 12px;
                font-weight: 400;
                color: #ababab;
                border-bottom: 1px solid black;
            }

            .chat-title > div {
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .chat-title span {
                opacity: 0.5;
            }

            .chat-actions {
                width: 100%;
                display: grid;
                grid-template-columns: 1fr auto 1fr;
                align-items: center;
                padding: 4px 8px;
                box-sizing: border-box;
            }

            .chat-action {
                display: inline-flex;
                justify-content: center;
                align-items: center;
                position: relative;
            }

            .chat-actions button {
                border: none;
                padding: 0px;
                margin: 0px;
                background: transparent;
                min-width: 24px;
                height: 22px;
                cursor: pointer;
            }
            .chat-actions button:hover {
                outline: #464646 solid 1px;
            }
            .chat-actions button:active {
                background: #333333;
            }
            .chat-actions button:active img {
                transform: scale(0.95);
            }

            :host(:not([locked])) .scroll-to-bottom {
                display: block;
            }

            .scroll-to-bottom {
                display: none;
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                background: #080808;
                padding: 8px 15px;
                text-align: center;
                box-sizing: border-box;
                z-index: 100000;
                opacity: 0.9;
                cursor: pointer;
            }
            .scroll-to-bottom:hover {
                opacity: 0.95;
            }
            .scroll-to-bottom:active {
                opacity: 1;
            }

            @keyframes bio-slidein {
                from { transform: translate(0, -0px); opacity: 0; }
            }
            .bio {
                animation: bio-slidein .2s ease;
                display: grid;
                grid-template-columns: auto 1fr;
                padding: 30px 30px 40px 30px;
                margin-bottom: 10px;
                background: #0c0c0c;
            }
            .profile-image {
                border-radius: 50%;
                overflow: hidden;
                width: 112px;
                height: 112px;
                border: 3px solid rgb(148, 74, 255);
            }
            .profile-image img {
                width: 100%;
            }
            .pin {
                margin-left: 30px;
            }
            .profile-name {
                font-size: 28px;
                margin-bottom: 5px;
                white-space: nowrap;
            }
            .profile-desc {
                margin-top: 20px;
                grid-column: 1 / span 2;
                line-height: 150%;
            }
            .viewcount {
                opacity: 0.5;
                margin-bottom: 5px;
            }
            .game {
                opacity: 0.5;
                margin-bottom: 5px;
                font-weight: bold;
            }
            .language {
                opacity: 0.5;
                margin-bottom: 5px;
            }

            /* // webkit scrollbars */
            ::-webkit-scrollbar {
                width: 8px;
                margin: 5px 0;
            }
            ::-webkit-scrollbar-button {
                display: none;
            }
            ::-webkit-scrollbar-track-piece  {
                background: transparent;
            }
            ::-webkit-scrollbar-thumb {
                background: var(--color-scrollbar-thumb, #1c1c1c);
                border-radius: 5px;
            }
            ::-webkit-scrollbar-thumb:hover {
                background: var(--color-scrollbar-thumb-hover, #333333);
            }
            ::-webkit-scrollbar-corner {
                background: transparent;
            }

            .chat-state-icons {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                grid-column: 3;
            }
            .user-state-icon,
            .room-state-icon {
                display: none;
                color: #eee;
                opacity: 0.5;
                margin-left: 5px;
                cursor: default;
                justify-content: center;
                align-items: center;
                margin-left: 8px;
                user-select: none;
                padding: 0px 3px;
            }
            .room-state-icon.action-expand {
                padding: 0px;
            }
            .user-state-icon[active],
            .room-state-icon[active] {
                display: flex;
            }
            :host([modview]) .room-state-icon {
                opacity: 0.25;
                display: flex;
            }
            :host([modview]) .room-state-icon[active] {
                opacity: 1;
            }

            :host([modview]) .room-state-icon {
                border: none;
                margin: 0px;
                background: transparent;
                min-width: 16px;
                height: 22px;
                cursor: pointer;
                border-radius: 3px;
            }
            :host([modview]) .room-state-icon:hover {
                outline: #464646 solid 1px;
            }
            :host([modview]) .room-state-icon:active {
                background: #333333;
            }
            :host([modview]) .room-state-icon:active img {
                transform: scale(0.95);
            }

            .user-list-preview:focus-within,
            .user-list-preview:hover,
            .user-list-preview:focus,
            .user-list-button:focus ~ .user-list-preview {
                display: block;
            }

            .user-list-preview {
                position: absolute;
                top: calc(100% + 5px);
                left: -10px;
                display: none;
            }

            .expand-list {
                display: inline-block;
                margin-left: 8px;
            }

            .chat-channel-name {
                opacity: 0.75;
                font-size: 12px;
                font-weight: 400;
            }
            .chat-channel-name:hover {
                text-decoration: underline;
                cursor: pointer;
            }
            .chat-channel-name:active {
                opacity: 0.5;
            }
            :host([modview]) .chat-channel-name {
                display: none;
            }
        `;
    }

    async openUserlist() {
        const listEle = this.shadowRoot.querySelector('chat-user-list');
        listEle.updateList();
    }

    toggleSlowMode() {
        if(this.moderator || this.broadcaster) {
            if(this.slow_mode) {
                IRCChatClient.sendMessage(this.roomName, "/slowoff");
            } else {
                IRCChatClient.sendMessage(this.roomName, "/slow " + this.slowmode_time);
            }
        }
    }

    toggleFollowerMode() {
        if(this.moderator || this.broadcaster) {
            if(this.follwers_only) {
                IRCChatClient.sendMessage(this.roomName, "/followersoff");
            } else {
                IRCChatClient.sendMessage(this.roomName, "/followers " + this.followermode_time);
            }
        }
    }

    toggleEmoteOnlyMode() {
        if(this.moderator || this.broadcaster) {
            if(this.emote_only) {
                IRCChatClient.sendMessage(this.roomName, "/emoteonlyoff");
            } else {
                IRCChatClient.sendMessage(this.roomName, "/emoteonly");
            }
        }
    }

    toggleSubOnlyMode() {
        if(this.moderator || this.broadcaster) {
            if(this.subscribers_only) {
                IRCChatClient.sendMessage(this.roomName, "/subscribersoff");
            } else {
                IRCChatClient.sendMessage(this.roomName, "/subscribers");
            }
        }
    }

    toggleR9kMode() {
        if(this.moderator || this.broadcaster) {
            if(this.r9k) {
                IRCChatClient.sendMessage(this.roomName, "/r9kbetaoff");
            } else {
                IRCChatClient.sendMessage(this.roomName, "/r9kbeta");
            }
        }
    }

    openSlowModeSettins(e) {
        const menu = ContextMenu.openOn(e.target, 'down');
        const input = document.createElement('fluid-input');
        input.value = this.slowmode_time;
        input.steps = "1";
        input.min = 1;
        input.max = 600;
        input.suffix = "sec";
        input.style.width = "100px";
        input.addEventListener('change', e => {
            this.slowmode_time = input.value;
        })
        menu.append(input);
    }

    openFollowerModeSettings(e) {
        const menu = ContextMenu.openOn(e.target, 'down');
        const input = document.createElement('fluid-input');
        input.value = this.followermode_time;
        input.steps = "1";
        input.min = 1;
        input.max = 600;
        input.suffix = "min";
        input.style.width = "100px";
        input.addEventListener('change', e => {
            this.followermode_time = input.value;
        })
        menu.append(input);
    }

    render() {
        return html`
            <div class="header">
                <div class="chat-actions">
                    <div>
                        <div class="chat-action">
                            <button title="Close chat" @click="${(e) => {
                                Application.closeRoom(this.roomName);
                            }}">
                                <img src="./images/close.svg" width="16px" height="16px" />
                            </button>
                        </div>
                        <div class="chat-action">
                            <button class="user-list-button" title="Userlist" @click="${() => {
                                this.openUserlist();
                            }}">
                                <img src="./images/people.svg" width="16px" height="16px" />
                            </button>
                            <div class="user-list-preview" tabindex="0">
                                <chat-user-list channel="${this.roomName}"></chat-user-list>
                            </div>
                        </div>
                        <div class="chat-action">
                            <button title="Open Stream" @click="${() => {
                                Webbrowser.openInBrowwser(`https://www.twitch.tv/${this.roomName}`);
                            }}">
                                <img src="./images/open.svg" width="16px" height="16px" />
                            </button>
                        </div>
                        <div class="chat-action">
                            <button title="Relaod Chat" @click="${() => {
                                location.reload();
                            }}">
                                <img src="./images/refresh_white_24dp.svg" width="16px" height="16px" />
                            </button>
                        </div>
                    </div>
                    <div class="chat-channel-name" @click="${() => {
                        Webbrowser.openInBrowwser(`https://www.twitch.tv/${this.roomName}`);
                    }}">
                        ${this.roomName}
                    </div>
                    <div class="chat-state-icons">
                        <div class="chat-action">
                            <div class="room-state-icon" title="Slow mode for ${this.slow_mode}s" ?active="${this.slow_mode !== 0}" @click="${this.toggleSlowMode}">
                                <img src="./images/slowmode.svg" width="18px" height="18px"/>
                            </div>
                            <div class="room-state-icon action-expand" title="Slowmode time" @click="${this.openSlowModeSettins}">
                                <img src="./images/expand_more_black_24dp.svg" width="16px" height="16px"/>
                            </div>
                        </div>
                        <div class="chat-action">
                            <div class="room-state-icon" title="Follow mode for ${this.follwers_only}s" ?active="${this.follwers_only !== 0}" @click="${this.toggleFollowerMode}">
                                <img src="./images/follower.svg" width="18px" height="18px"/>
                            </div>
                            <div class="room-state-icon action-expand" title="Follower time" @click="${this.openFollowerModeSettings}">
                                <img src="./images/expand_more_black_24dp.svg" width="16px" height="16px"/>
                            </div>
                        </div>
                        <div class="chat-action">
                            <div class="room-state-icon" title="Emote only mode" ?active="${this.emote_only}" @click="${this.toggleEmoteOnlyMode}">
                                <img src="./images/emote.svg" width="18px" height="18px"/>
                            </div>
                        </div>
                        <div class="chat-action">
                            <div class="room-state-icon" title="Sub only mode" ?active="${this.subscribers_only}" @click="${this.toggleSubOnlyMode}">
                                <img src="./images/subscriber.svg" width="18px" height="18px"/>
                            </div>
                        </div>
                        <div class="chat-action">
                            <div class="room-state-icon" title="r9k mode" ?active="${this.r9k}" @click="${this.toggleR9kMode}">r9k</div>
                        </div>
                        <div class="chat-action">
                            <div class="user-state-icon" title="Moderator" ?active="${this.moderator}">
                                <img src="https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/2" width="18px" height="18px"/>
                            </div>
                        </div>
                        <div class="chat-action">
                            <div class="user-state-icon" title="Broadcaster" ?active="${this.broadcaster}">
                                <img src="https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/2" width="18px" height="18px"/>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="chat-title">
                    ${this.stream_title == "" ? 
                        (this.chatter_count > 0 ? `Offline - ${Format.number(this.chatter_count)} chatters` : "Offline") 
                    : this.stream_title}
                </div>
            </div>
            <div class="scroll-to-bottom" @click="${() => this.lock()}">
                <span>Scroll to the bottom</span>
            </div>
            <div class="lines">
                ${this.canvas}
            </div>
        `;
    }
}

customElements.define('twitch-chat', TwitchChat);
