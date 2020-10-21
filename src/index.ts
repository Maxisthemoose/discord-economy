import { Collection, Message, Snowflake, TextChannel } from "discord.js";
import { connect } from "mongoose";
import Guild from "./database/Guild";
import User from "./database/User";

export class Experience {
    #initialized = false;        /** Guild ID */        /** User ID */
    #userCollection = new Collection<Snowflake, Collection<Snowflake, number>>();
    constructor( 
        public mongoURI: string,
    ) { };

    public init() {
        connect(this.mongoURI, { useUnifiedTopology: true, useNewUrlParser: true },  (err) => {
            if (err) throw err;
            else console.log("Successfully connected discord-experience to the Mongoose Database.");
            this.#initialized = true;
        });
    }

    public async addXP(message: Message) {
        if (!this.#initialized) throw new Error("Please initialize discord-experience before trying to use any methods. To do so, call the init() method first thing in your top level folder.");

        let guild = await Guild.findOne({ guildID: message.guild.id });
        if (!guild) guild = await Guild.create({
            guildID: message.guild.id
        });

        if (guild.ignoredChannels.includes(message.channel.id)) return;
        if (guild.ignoredUsers.includes(message.author.id)) return;

        let user = await User.findOne({ userId: message.author.id, guildId: message.guild.id });
        if (!user) user = await User.create({
            guildId: message.guild.id,
            userId: message.author.id,
        });

        const xpNeeded = (guild.baseXP * user.level) * guild.levelMulti;

        const newXp = Math.floor(Math.random() * guild.XPMax) + 1;

        user.xp += newXp;
        user.totalXp += newXp;

        if (user.xp > xpNeeded) {
            user.xp = 0;
            user.level += 1;
            if (guild.levelingChannel) {
                if (message.guild.channels.cache.get(guild.levelingChannel))
                    (<TextChannel>message.guild.channels.cache.get(guild.levelingChannel)).send(`Congratulations ${message.author}! You leveled up to level ${user.level}!`);
            }
        }

        try {
            await user.updateOne(user);
            this.#userCollection.set(message.guild.id, new Collection());
            this.#userCollection.get(message.guild.id).set(message.author.id, Date.now());
        } catch (err) {
            throw err;
        }
    }

    public async getUserData (message: Message) {

        let guild = await Guild.findOne({ guildID: message.guild.id });
        if (!guild) guild = await Guild.create({
            guildID: message.guild.id,
        });

        let user = await User.findOne({ userId: message.author.id });
        if (!user) user = await User.create({
            userId: message.author.id,
            guildId: message.guild.id,
        });

        const allUsers = await User.find();

        const guildUsers = allUsers.filter(u => u.guildId === message.guild.id);
        const sortedGUsers = guildUsers.sort((a, b) => b.totalXp - a.totalXp);

        const sortedAUsers = allUsers.sort((a, b) => b.totalXp - a.totalXp);

        const guildRank = sortedGUsers.findIndex(u => u.userId === message.author.id) + 1;
        const globalRank = sortedAUsers.findIndex(u => u.userId === message.author.id) + 1;

        const Data = {
            guildRank,
            globalRank,
            currentXP: user.xp,
            requiredXP: (user.level * guild.baseXP) * guild.levelMulti,
            level: user.level,
        }

        return Data;
    }

    public async rankCard (message: Message) {

    }
}

module.exports.Experience = Experience;