import Canvas from "canvas";
import { Collection, GuildMember, Message, MessageEmbed, Snowflake, TextChannel } from "discord.js";
import { connect } from "mongoose";
import Guild from "./database/Guild";
import User from "./database/User";
import { roundRect } from "./util/Functions/roundRect";
import { canvasUsername } from "./util/Functions/canvasUsername"
import Rank from "./util/Interfaces/Rank.interface";
import questions from "./util/Interfaces/Questions.interface";

export class Experience {
    #initialized = false;        /** Guild ID */        /** User ID */
    #userCollection = new Collection<Snowflake, Collection<Snowflake, number>>();
    constructor( 
        /**
         * The Mongoose URI to connect discord-experience to your Mongoose database.
         */
        public mongoURI: string,
        /**
         * Whether or not to console log actions.
         */
        public verbose: boolean,
        /**
         * An option path to your custom User Schema. This must follow a base structure or it will throw an error.
         */
        // public schemaPath?: string,
    ) { };

    public init() {
        // const CustomSchema = require(this.schemaPath);

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

        if (this.#userCollection.get(message.guild.id) && guild.timeout - (Date.now() - this.#userCollection.get(message.guild.id).get(message.author.id)) > 0) return;

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

        const userMention = message.mentions.users.first() || message.author;

        let guild = await Guild.findOne({ guildID: message.guild.id });
        if (!guild) guild = await Guild.create({
            guildID: message.guild.id,
        });

        let user = await User.findOne({ userId: userMention.id });
        if (!user) user = await User.create({
            userId: userMention.id,
            guildId: message.guild.id,
        });

        const allUsers = await User.find();

        const guildUsers = allUsers.filter(u => u.guildId === message.guild.id);
        const sortedGUsers = guildUsers.sort((a, b) => b.totalXp - a.totalXp);

        const sortedAUsers = allUsers.sort((a, b) => b.totalXp - a.totalXp);

        const guildRank = sortedGUsers.findIndex(u => u.userId === userMention.id) + 1;
        const globalRank = sortedAUsers.findIndex(u => u.userId === userMention.id) + 1;

        const Data = {
            guildRank,
            globalRank,
            currentXP: user.xp,
            requiredXP: (user.level * guild.baseXP) * guild.levelMulti,
            level: user.level,
        }

        return Data;
    }

    public async rankCard (message: Message, RankData: Rank) {

        const user = message.mentions.users.first() || message.author;

        let guild = await Guild.findOne({ guildID: message.guild.id });
        if (!guild) guild = await Guild.create({
            guildID: message.guild.id,
        });

        Canvas.registerFont("./node_modules/discord-experience/src/util/Fonts/Manrope-Regular.ttf", {
            family: "Manrope",
            weight: "regular",
            style: "normal"
        });

        Canvas.registerFont("./node_modules/discord-experience/src/util/Fonts/Manrope-Bold.ttf", {
            family: "Manrope",
            weight: "bold",
            style: "normal"
        });

        const canvas = Canvas.createCanvas(1000, 333);
        const ctx = canvas.getContext("2d");

        const font = "Manrope";

        ctx.fillStyle = "#282a2c";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#2e3033";
        ctx.fillRect(0, 0, canvas.width, 25);
        ctx.fillRect(0, 0, 25, canvas.height);
        ctx.fillRect(canvas.width - 25, 0, canvas.width, canvas.height)
        ctx.fillRect(0, canvas.height - 25, canvas.width, canvas.height)

        ctx.lineWidth = 4;
        ctx.strokeStyle = "#ffffff";
        ctx.globalAlpha = 1;


        ctx.strokeStyle = "#000000";
        roundRect(ctx, 43, 233, 700, 58, 32, false, true);
        ctx.strokeStyle = "#ffffff";
        roundRect(ctx, 40, 230, 700, 58, 32, true, false, "#282a2c");
        ctx.closePath();

        ctx.globalAlpha = 1;

        ctx.beginPath();
        ctx.fillStyle = message.member.displayHexColor;
        ctx.arc(69, 259, 28.5, 1.5 * Math.PI, 0.5 * Math.PI, true);
        ctx.fill();
        ctx.closePath();

        ctx.beginPath();
        ctx.fillRect(69, 230, (100 / (RankData.requiredXP) * (RankData.currentXP)) * 6.4, 58);
        ctx.arc(69 + (100 / (RankData.requiredXP) * (RankData.currentXP)) * 6.4 - 1, 259, 28.5, 1.5 * Math.PI, 0.5 * Math.PI, false);
        ctx.fill();
        ctx.closePath();

        ctx.beginPath();
        roundRect(ctx, 40, 230, 700, 58, 32, false, true)
        ctx.closePath();

        ctx.beginPath();
        ctx.font = `33px ${font}`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#000000";
        ctx.fillText(`${RankData.currentXP >= 1000 ? (RankData.currentXP / 1000).toPrecision(4) + "k" : RankData.currentXP} / ${(RankData.level * guild.baseXP) >= 1000 ? ((RankData.level * guild.baseXP) / 1000).toPrecision(2) + "k" : RankData.currentXP}`, 392, 272)
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`${RankData.currentXP >= 1000 ? (RankData.currentXP / 1000).toPrecision(4) + "k" : RankData.currentXP} / ${(RankData.level * guild.baseXP) >= 1000 ? ((RankData.level * guild.baseXP) / 1000).toPrecision(2) + "k" : RankData.currentXP}`, 390, 270)

        ctx.font = `bold 42px ${font}`;

        ctx.fillStyle = "#000000";
        ctx.textAlign = "left";
        ctx.fillText(canvasUsername(ctx, canvas, user.username, user.discriminator, (canvas.width / 6), ctx.font, ctx.textAlign, 0, 300), (canvas.width / 6), 123);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(canvasUsername(ctx, canvas, user.username, user.discriminator, (canvas.width / 6), ctx.font, ctx.textAlign, 0, 300), (canvas.width / 6) - 2, 121);

        ctx.font = `bold 36px ${font}`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#000000";
        ctx.fillText("Level:", 188, 203);
        ctx.fillStyle = "#999999";
        ctx.fillText("Level:", 185, 200);

        ctx.fillStyle = "#000000";
        ctx.textAlign = "left";
        ctx.fillText(RankData.level >= 1000 ? `${(RankData.level / 1000).toPrecision(3)}k` : `${RankData.level}`, 248, 203);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(RankData.level >= 1000 ? `${(RankData.level / 1000).toPrecision(3)}k` : `${RankData.level}`, 245, 200);

        ctx.textAlign = "center";
        ctx.fillStyle = "#000000";
        ctx.globalAlpha = 1;
        ctx.fillText("Rank:", 553, 203);

        ctx.globalAlpha = 1;
        ctx.fillStyle = "#999999";
        ctx.fillText("Rank:", 550, 200);

        ctx.textAlign = "left";
        ctx.fillStyle = "#000000";
        ctx.globalAlpha = 1;
        ctx.fillText(RankData.guildRank >= 1000 ? `${(RankData.guildRank / 1000).toPrecision(3)}k` : `${RankData.guildRank}`, 613, 203);

        ctx.globalAlpha = 1;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(RankData.guildRank >= 1000 ? `${(RankData.guildRank / 1000).toPrecision(3)}k` : `${RankData.guildRank}`, 610, 200);

        ctx.save()
        ctx.beginPath();
        ctx.arc(853, 153, 100, 0, Math.PI * 2, true);
        ctx.lineWidth = 7;
        ctx.strokeStyle = "#000000";
        ctx.stroke()
        ctx.closePath();
        ctx.beginPath();
        ctx.arc(850, 150, 100, 0, Math.PI * 2, true);
        ctx.lineWidth = 7;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.closePath();
        ctx.clip();
        const avatar = await Canvas.loadImage(user.displayAvatarURL({ format: "png", size: 2048 }));
        ctx.drawImage(avatar, 746, 46, 220, 220);
        ctx.closePath();
        ctx.restore();

        ctx.fillStyle = "#282a2c";
        ctx.beginPath();
        ctx.arc(777, 223, 30, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.closePath();


        
        if (user.presence.status == "dnd") {
            ctx.beginPath();
            ctx.fillStyle = "#F04747";
            ctx.arc(777, 223, 19, 0, Math.PI * 2, true);
            ctx.fill();
            ctx.closePath();
            ctx.beginPath();
            roundRect(ctx, 762, 219, 29, 9, 6, true, false, "#282a2c");
            ctx.closePath();
        } else if (user.presence.status == "idle") {
  
            ctx.beginPath();
            ctx.fillStyle = "#faa61a";
            ctx.arc(777, 223, 19, 0, Math.PI * 2, true);
            ctx.fill();
            ctx.closePath();
            
            ctx.beginPath();
            ctx.fillStyle = "#282a2c";
            ctx.arc(770, 214, 13.8, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.closePath();
  
        } else if (user.presence.status == "online") {
  
            ctx.fillStyle = "#43b581";
            ctx.beginPath();
            ctx.arc(777, 223, 19, 0, Math.PI * 2, true);
            ctx.fill();
            ctx.closePath();
  
        } else if (user.presence.status == "offline") {
        
            ctx.fillStyle = "#747f8e";
            ctx.beginPath();
            ctx.arc(777, 223, 19, 0, Math.PI * 2, true);
            ctx.fill();
            ctx.closePath();
        
            ctx.fillStyle = "#2f3136";
            ctx.beginPath();
            ctx.arc(777, 223, 10, 0, Math.PI * 2, true);
            ctx.fill();
            ctx.closePath();
  
        }
  
        if (user.presence.activities.length > 0) {
            if (user.presence.activities.find(a => a.type == "STREAMING") !== undefined) {
                ctx.restore();
                ctx.fillStyle = "#282a2c";
                ctx.beginPath();
                ctx.arc(777, 223, 30, 0, Math.PI * 2, true);
                ctx.fill();
                ctx.closePath();

                ctx.beginPath();
                ctx.fillStyle = "#593696";
                ctx.arc(777, 223, 20, 0, Math.PI * 2, true);
                ctx.fill();
                ctx.closePath();
                ctx.lineWidth = 3;
                ctx.strokeStyle = "#282a2c";
                ctx.fillStyle = "#282a2c";
                ctx.restore();
                ctx.beginPath();
                ctx.moveTo(770, 213);
                ctx.lineTo(770, 234);
                ctx.lineTo(788, 223);
                ctx.lineTo(770, 213);
                ctx.fill();
                ctx.closePath();
  
            }
        }
        return canvas.toBuffer("image/png");
    }

    public async updateGuildSettings (message: Message) {
        let guild = await Guild.findOne({ guildID: message.guild.id });
        if (!guild) guild = await Guild.create({
            guildID: message.guild.id,
        });

        const Questions: questions[] = [
            { question: "What amount of base XP would you like to require? (This number will be the amount required for level 1, and is the base for the levels to come.) Ex: You choose 500. Level 1: 500xp, Level 2: 1000xp", setting: "baseXP", answerType: "number" },
            { question: "What level multiplier would you like to use? Multi > 1 = Longer Level up times, Multi < 1 & > 0 = Shorter Level up times", setting: "levelMulti", answerType: "number" },
            { question: "Would you like to ignore any users? Type their mention or ID's into chat now.", setting: "ignoredUsers", answerType: "array" },
            { question: "Would you like to ignore any channels? Type their mention or ID's into chat now.", setting: "ignoredChannels", answerType: "array" },
            { question: "What channel would you like level up messages sent to?", setting: "levelingChannel", answerType: "string" },
            { question: "What amount of XP would you like the max amount a user can get in one message to be?", setting: "XPMax", answerType: "number" },
            { question: "What timeout would you like to have for users gaining xp.", setting: "timeout", answerType: "time" },
        ];

        let msg: Message;

        let update: {} = {};

        for (let i = 0; i < Questions.length; i++) {
            const q = Questions[i];

            const embed = new MessageEmbed()
                .setDescription(`${Questions[i - 1] ? `${Questions[i - 1].setting} successfully set to ${update[Questions[i - 1].setting]}` : ""}\n\n${q.question}\n\nType \`cancel\` at any point to cancel.`)
                .setColor("RED");
            if (!msg) msg = await message.channel.send("", { embed });
            else msg = await msg.edit("", { embed });

            const filter = (m: Message) => message.author.id === m.author.id;
            const collector = await message.channel.awaitMessages(filter, { max: 1 });
            const m = collector.first();

            if (m && m.deletable) await m.delete();

            if (m && m.content.toLowerCase() === "cancel") {
                const Cancelled = new MessageEmbed()
                    .setDescription("Operation cancelled successfully")
                    .setColor("RED");
                await msg.edit("", { embed: Cancelled });
                break;
            } else {
                
                switch (q.answerType) {
                    case "array":
                        const tempArgs = m.content.split(" ");

                        switch(q.setting) {
                            case "ignoredUsers":
                                let mMentions = message.mentions.members.size > 0 ? message.mentions.members.array().map(m => m.id) : null;
                                if (!mMentions) {

                                    mMentions = [];

                                    const mBad: string[] = [];

                                    for (const arg of tempArgs) {
                                        if (message.guild.members.cache.get(arg)) {
                                            const mem = message.guild.members.cache.get(arg);
                                            mMentions.push(mem.id);
                                        } else {
                                            mBad.push(arg);
                                        }
                                        console.log(message.guild.members.cache.get(arg));
                                    }
                                    if (mBad.length === tempArgs.length) {
                                        message.channel.send("Please input at least one valid ID or mention!").then(m => m.delete({ timeout: 10000 }));
                                        i--;
                                        break;
                                    }
                                    if (mBad.length > 0) message.channel.send(`Removed ${mBad.length} invaled ID's.\n${mBad.join(" | ")}`).then(m => m.delete({ timeout: 15000 }));
                                }
                                update[q.setting] = mMentions;
                            break;
                            case "ignoredChannels":
                                let cMentions = message.mentions.channels.size > 0 ? message.mentions.channels.array().map(c => c.id) : null;
                                if (!cMentions) {
                                    cMentions = [];

                                    const cBad: string[] = [];

                                    for (const arg of tempArgs) {
                                        if (message.guild.channels.cache.get(arg)) {
                                            const ch = message.guild.channels.cache.get(arg);
                                            cMentions.push(ch.id);
                                        } else {
                                            cBad.push(arg);
                                        }
                                    }
                                    if (cBad.length === tempArgs.length) {
                                        message.channel.send("Please input at least one valid ID or mention!").then(m => m.delete({ timeout: 10000 }));
                                        i--;
                                        break;
                                    }
                                    if (cBad.length > 0) message.channel.send(`Removed ${cBad.length} invaled ID's.\n${cBad.join(" | ")}`).then(m => m.delete({ timeout: 15000 }));
                                }
                                update[q.setting] = cMentions;
                            break;
                        }
                    break;
                    case "number":
                        if (isNaN(parseInt(m.content))) {
                            message.channel.send("Please enter a valid number!").then(m => m.delete({ timeout: 10000 }));
                            i--;
                        } else {
                            const num = parseFloat(m.content);
                            update[q.setting] = num;
                        }
                    break;
                    case "string":

                    break;
                    case "time":

                    break;
                }

            }
        }
        console.log(update);

    }
}

module.exports.Experience = Experience;