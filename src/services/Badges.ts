let global_badges = {};

export default class Badges {

    static getBadgeByName(name: string, version: number) {
        const badge = global_badges[name];
        return badge.versions[version].image_url_2x;
    }

    static async getChannelBadges(channel_id: string) {
        return fetch(`https://badges.twitch.tv/v1/badges/channels/${channel_id}/display`)
            .then(res => res.json())
            .then(json => {
                return json.badge_sets;
            })
            .catch(err => {
                console.error(err);
            })
    }

    static async getGlobalBadges() {
        return fetch("https://badges.twitch.tv/v1/badges/global/display")
            .then(res => res.json())
            .then(json => {
                global_badges = json.badge_sets;
            })
            .catch(err => {
                console.error(err);
            })
    }

}

Badges.getGlobalBadges();
