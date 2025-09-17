(async () => {
  try {
    console.log("🚀 מתחילים את הבוט...");

    const { Client, LocalAuth } = require("whatsapp-web.js");
    const qrcode = require("qrcode");
    const fs = require("fs");

    let keywords = loadKeywords();

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: "main-session",
      }),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
    });

    client.on("qr", async (qr) => {
      console.log("🔄 קיבלתי קוד QR...");

      // צור קישור לתמונה של ה־QR
      const qrImageUrl = await qrcode.toDataURL(qr);

      console.log("\n🔗 פתחי את הקישור הזה בדפדפן לסריקה:\n");
      console.log(qrImageUrl);
    });

    function loadKeywords() {
      if (fs.existsSync("keywords.json")) {
        return JSON.parse(fs.readFileSync("keywords.json"));
      }
      return [];
    }

    function saveKeywords() {
      fs.writeFileSync("keywords.json", JSON.stringify(keywords, null, 2));
    }

    client.on("ready", () => {
      console.log("✅ הבוט מחובר לוואטסאפ!");
    });

    client.on("message_create", async (msg) => {
      const chat = await msg.getChat();
      const contact = await msg.getContact();
      const isFromMe = msg.fromMe;

      const text = msg.body.toLowerCase();
      const match = keywords.find((keyword) =>
        text.includes(keyword.toLowerCase())
      );

      if (match && !isFromMe) {
        console.log(`🚨 זוהתה הודעה עם מילת מפתח "${match}"`);
        console.log(`🧾 מ: ${chat.name || contact.pushname || msg.from}`);
        console.log(`💬 תוכן: ${msg.body}`);

        const senderName = chat.name || contact.pushname || msg.from;

        const alert =
          `🔔 \n` + `👤 *שולח:* *${senderName}*\n` + `💬 תוכן: ${msg.body}`;

        const targetChatName = "התראות"; // השם של הצ'אט
        const chats = await client.getChats();
        const targetChat = chats.find((chat) => chat.name === targetChatName);

        if (targetChat) {
          await client.sendMessage(targetChat.id._serialized, alert);
        } else {
          console.log(`❌ לא נמצא צ'אט בשם "${targetChatName}"`);
        }
      }

      // ניהול מילים - רק אם את שולחת
      const targetChatName = "התראות"; // שם הצ'אט שממנו מותר לשלוט בבוט

      if (isFromMe && chat.name === targetChatName) {
        if (text.startsWith("הוסף")) {
          const newKeyword = text.replace("הוסף", "").trim();
          if (!keywords.includes(newKeyword)) {
            keywords.push(newKeyword);
            saveKeywords();
            msg.reply(`✅ המילה "${newKeyword}" נוספה.`);
          } else {
            msg.reply(`⚠️ המילה כבר קיימת.`);
          }
        }

        if (text.startsWith("מחק")) {
          const removeKeyword = text.replace("מחק", "").trim();
          keywords = keywords.filter((k) => k !== removeKeyword);
          saveKeywords();
          msg.reply(`🗑️ המילה "${removeKeyword}" הוסרה.`);
        }

        if (text === "רשימה") {
          msg.reply(
            `📚 מילות מפתח:\n${keywords.join(", ") || "אין עדיין מילות מפתח."}`
          );
        }
      }
    });

    await client.initialize();
  } catch (err) {
    console.error("❌ שגיאה בעת הרצת הבוט:");
    console.error(err);
  }
})();
