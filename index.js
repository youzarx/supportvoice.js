const { Client, Intents, MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ],
});
const { channelID: channelIdToJoin, textChannelID, supportRoleID, categoryID, token, timeout, mp3File } = require('./config.json');
const mp3FilePath = path.resolve(mp3File);

const lastInteractions = new Map();
let isPlaying = false;

async function joinVoiceChannelAndPlay() {
    try {
        const channel = client.channels.cache.get(channelIdToJoin);
        if (!channel || channel.type !== 'GUILD_VOICE') {
            console.error('Invalid voice channel ID or the bot cannot find the channel.');
            return null;
        }

        const connection = joinVoiceChannel({
            channelId: channelIdToJoin,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        return connection;
    } catch (error) {
        console.error(error);
        return null;
    }
}

client.once('ready', async () => {
    console.log('Bot is ready');
    console.log('Code by youzarx');


    client.on('voiceStateUpdate', async (oldState, newState) => {
        const oldChannel = oldState.channel;
        const newChannel = newState.channel;

        if (newState.member.user.bot) {
            return;
        }

        if (newChannel && newChannel.id === channelIdToJoin) {
            const textChannel = client.channels.cache.get(textChannelID);
            if (textChannel) {
                textChannel.send(`<@&${supportRoleID}> : ${newState.member.user}   Waiting for technical support`);
            }

            let userCount = 0;
            const categoryChannels = newState.guild.channels.cache.filter(channel => channel.type === 'GUILD_VOICE' && channel.parentId === categoryID);
            categoryChannels.forEach(channel => {
                userCount += channel.members.size;
            });
            //hado asi axel meesage li kaywaslak fi dm 
            const embed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('NEED HELP❓ ')
                .setDescription('If you need help, our support team is here to help !')
                .addFields(
                    { name: '`🔊 Number of support team currently available`', value: `**${userCount}** member`, inline: false },
                    { name: ' How to get help ❔', value: 'Click the button below to let our support team know. They will be with you soon !', inline: false }
                )
                .setFooter({ text: '.by Strides Studio' });

            try {
                await newState.member.send({ embeds: [embed], components: [new MessageActionRow().addComponents(new MessageButton().setCustomId('support_button').setLabel('Technical support ').setStyle('PRIMARY'))] });
            } catch (error) {
                console.error('Could not send message to user :', error);
            }

            if (isPlaying) {
                if (client.voice && client.voice.connections) {
                    client.voice.connections.forEach(connection => {
                        connection.disconnect();
                    });
                }
                isPlaying = false;
            }

            setTimeout(async () => {
                const connection = await joinVoiceChannelAndPlay();
                if (connection) {
                    const player = createAudioPlayer();
                    connection.subscribe(player);
                    const resource = createAudioResource(fs.createReadStream(mp3FilePath));
                    player.play(resource);
                    isPlaying = true;
                }
            }, 1000 * timeout);
        }
    });

    client.on('interactionCreate', async interaction => {
        if (!interaction.isButton()) return;

        if (interaction.customId === 'support_button') {
            const currentTime = Date.now();
            const cooldownAmount = 3 * 60 * 1000; // d9ay9

            if (lastInteractions.has(interaction.user.id)) {
                const lastInteractionTime = lastInteractions.get(interaction.user.id);
                const timePassed = currentTime - lastInteractionTime;

                if (timePassed < cooldownAmount) {
                    const timeLeft = (cooldownAmount - timePassed) / 1000;
                    await interaction.reply({ content: `Please wait${timeLeft.toFixed(1)} **seconds so you can alert the technical support team** `, ephemeral: true });
                    return;
                }
            }

            lastInteractions.set(interaction.user.id, currentTime);

            const textChannel = client.channels.cache.get(textChannelID);
            if (textChannel) {
                textChannel.send(`<@&${supportRoleID}>: ${interaction.user} Sends an alert notification to the technical support team `);
            }
            await interaction.reply({ content: 'An alert message has been sent to the technical support team', ephemeral: true });
        }
    });
});


client.login('put your token here');