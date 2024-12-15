const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("whitelist")
    .setDescription("Whitelist a link that was a false positive.")
    .addStringOption((option) =>
      option.setName("link").setDescription("Link that should be added to the whitelist.").setRequired(true)
    ),
  async execute(interaction) {
    fs.readFile("../../whitelist.json", "utf8", function readFileCallback(err, jsonData) {
      if (err) {
        console.log(err);
      } else {
        obj = JSON.parse(jsonData);

        // check if link is valid
        const link = message.content.match(
          /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g
        );
        if (link == 0) return;
        obj.whitelist.push(interaction.options.getString("link"));
        json = JSON.stringify(obj);

        fs.writeFile("../../whitelist.json", json, "utf8");
      }
    });

    await interaction.reply("Pong!");
  },
};
