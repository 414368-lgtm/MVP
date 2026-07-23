import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Ollama } from "ollama";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3001;

const MODEL = process.env.OLLAMA_MODEL || "qwen2.5-coder:7b";

const HOST = process.env.OLLAMA_URL || "https://ollama.com/api";

const client = new Ollama({
  host: HOST,
  headers: {
    Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`,
  },
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    model: MODEL,
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    const response = await client.chat({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    res.json({
      response: response.message.content,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
});

app.use(express.static(path.join(__dirname, "../dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});