const { Client, Collection, Events, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const axios = require("axios");
const https = require("https");
const cheerio = require("cheerio");
require("dotenv").config();

// ---

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});
client.commands = new Collection();

const agent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}

// ---

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const link = message.content.match(
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g
  );
  if (link == 0) return;

  async function scrapeSite(url) {
    const { data: html } = await axios.get(url, {
      httpsAgent: agent,
    });

    const $ = cheerio.load(html);
    let totalHTMLJS = "";
    totalHTMLJS += html;

    const scriptUrls = [];
    $("script[src]").each((_, element) => {
      const scriptUrl = $(element).attr("src");

      if (scriptUrl) scriptUrls.push(new URL(scriptUrl, url).href);
    });

    for (const scriptUrl of scriptUrls) {
      const { data: scriptContent } = await axios.get(scriptUrl, {
        httpsAgent: agent,
      });
      totalHTMLJS += scriptContent;
    }

    return totalHTMLJS;
  }

  scrapeSite(link)
    .then(async (result) => {
      const audioTags = result.match(/(<audio)|(new Audio\()|(\.play\()|(\.ogg)|(\.mp3)/g);
      // const videoTags = result.match(/(<video)|(new Video\()/g);
      const noscriptTags = result.match(/<noscript>/g);
      let foundSomething = "";

      if (audioTags != null) {
        foundSomething = "Possible audio";
      } else if (noscriptTags != null) {
        foundSomething = "Possible noscript";
      } else {
        return;
      }

      const annoyanceEmbed = new EmbedBuilder()
        .setColor("White")
        .setTitle(":warning: Annoyance link!!!")
        .setDescription(
          `${foundSomething} found in: <${link}>\nOpen with caution\n\nFalse positive? Run \`\/whitelist [link]\``
        );

      await message.channel.send({ embeds: [annoyanceEmbed] });
    })
    .catch(async (err) => {
      await message.channel.send({ content: `Error: ${err}` });
    });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) return console.error(`No command matching ${interaction.commandName} was found.`);

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command!",
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

// ---

client.login(process.env.DISCORD_TOKEN);
