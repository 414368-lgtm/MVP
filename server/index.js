const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const authRouter = require("./auth");
console.log("AUTH ROUTER LOADED");
dotenv.config();
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;

const app = express();

const PORT = Number(process.env.PORT) || 3001;
const OLLAMA_URL =
  process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL || "qwen2.5-coder:7b";

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json({ limit: "2mb" }));
app.use("/api/auth", authRouter);
console.log("AUTH ROUTES MOUNTED");
const MVP_SYSTEM_PROMPT = `
Ты — MVP, персональный AI-агент пользователя.

Твоя главная задача — помогать пользователю двигаться к его целям и не позволять ему бесконечно откладывать действия.

ПРАВИЛА:

1. Всегда отвечай на русском языке, если пользователь сам не перешёл на другой язык.

2. Ты видишь цели пользователя, их прогресс и записи из его журнала. Используй этот контекст в ответах.

3. Не давай банальную мотивацию и пустые фразы.

4. Анализируй, что реально мешает пользователю двигаться к цели.

5. Если пользователь прокрастинирует, мягко, но прямо укажи на это.

6. Предлагай конкретное следующее действие, которое можно выполнить прямо сейчас.

7. Не перегружай пользователя длинными планами без необходимости.

8. Помни контекст диалога и не задавай повторно вопросы, на которые пользователь уже ответил.

9. Если видишь противоречие между словами пользователя, его целями и действиями — укажи на него.

10. Твоя роль — не просто чат. Ты персональный агент движения к цели.

СТИЛЬ:

Кратко.
Прямо.
Умно.
Без воды.
Без искусственной мотивации.
Без фраз вроде "Ты молодец".
Без чрезмерной вежливости.
ВАЖНО:

Перед выводом обязательно проанализируй переданные USER GOALS и RECENT JOURNAL CONTEXT.

Не придумывай препятствия, которых нет в данных.

Каждый вывод должен опираться на конкретный факт из целей, мыслей, питания или движения пользователя.

Если пользователь долго работает над одной задачей, не называй это "отвлечением" без фактов.

Сначала назови конкретный факт из контекста.
Потом объясни, что этот факт означает.
Потом предложи одно конкретное следующее действие.

Запрещены общие советы вроде:
"убери отвлекающие приложения";
"составь план";
"поставь конкретные цели";
"сосредоточься";
если такие выводы прямо не подтверждаются контекстом.

Не задавай вопрос в конце ответа, если следующий шаг уже очевиден.
Каждый ответ должен либо:
— дать решение;
— выявить препятствие;
— предложить следующий шаг;
— помочь принять решение.

Если пользователь просто пишет "привет", представься кратко и спроси, над какой целью он хочет работать сейчас.
`;

function normalizeText(value) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .map((item) => {
      const role =
        item?.role === "assistant" || item?.role === "agent"
          ? "assistant"
          : "user";

      const content = normalizeText(
        item?.content ?? item?.text ?? item?.message
      );

      return {
        role,
        content,
      };
    })
    .filter((item) => item.content.length > 0)
    .slice(-20);
}

function buildContext(goals, journalEntries) {
  const safeGoals = Array.isArray(goals) ? goals : [];
  const safeJournal = Array.isArray(journalEntries)
    ? journalEntries
    : [];

  const goalContext = safeGoals
    .slice(-10)
    .map((goal, index) => {
      const title = normalizeText(
        goal?.title ?? goal?.name ?? goal?.text
      );

      const progress =
        typeof goal?.progress === "number"
          ? String(goal.progress) + "%"
          : "not specified";

      return (
        String(index + 1) +
        ". " +
        (title || "Untitled goal") +
        " — progress: " +
        progress
      );
    })
    .join("\n");

  const journalContext = safeJournal
    .slice(-10)
    .map((entry, index) => {
      const text = normalizeText(
        entry?.text ?? entry?.content ?? entry?.message
      );

      return String(index + 1) + ". " + text;
    })
    .filter((item) => item.length > 3)
    .join("\n");

  return (
    "USER GOALS:\n" +
    (goalContext || "No goals provided.") +
    "\n\nRECENT JOURNAL CONTEXT:\n" +
    (journalContext || "No journal entries provided.")
  );
}

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    server: "MVP",
    message: "MVP agent server is running",
    model: OLLAMA_MODEL,
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    server: "MVP",
    model: OLLAMA_MODEL,
  });
});

app.post("/api/agent", async (req, res) => {
  try {
    const message = normalizeText(req.body?.message);
    const history = normalizeHistory(req.body?.history);
    const goals = Array.isArray(req.body?.goals)
      ? req.body.goals
      : [];
    const journalEntries = Array.isArray(
      req.body?.journalEntries
    )
      ? req.body.journalEntries
      : [];

    console.log("MVP USER MESSAGE:", message);

    if (!message) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    const appContext = buildContext(goals, journalEntries);
    console.log("=== MVP APP CONTEXT START ===");
console.log(appContext);
console.log("=== MVP APP CONTEXT END ===");
console.log("MVP APP CONTEXT:");
console.log(appContext);
    const messages = [
      {
        role: "system",
        content: MVP_SYSTEM_PROMPT,
      },
      {
        role: "system",
        content: appContext,
      },
      ...history,
    ];

    const lastHistoryMessage =
      messages.length > 0
        ? messages[messages.length - 1]
        : null;

    const messageAlreadyInHistory =
      lastHistoryMessage?.role === "user" &&
      lastHistoryMessage?.content === message;

    if (!messageAlreadyInHistory) {
      messages.push({
        role: "user",
        content: message,
      });
    }

    console.log("SENDING TO OLLAMA:", {
      model: OLLAMA_MODEL,
      message,
      historyLength: history.length,
    });

const ollamaResponse = await fetch(
  "https://ollama.com/api/chat",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
  "Authorization": `Bearer ${OLLAMA_API_KEY}`,
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      options: {
        temperature: 0.7,
        num_ctx: 4096,
      },
    }),
  }
);

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();

      throw new Error(
        "Ollama error " +
          ollamaResponse.status +
          ": " +
          errorText
      );
    }

    const data = await ollamaResponse.json();

    const reply = normalizeText(data?.message?.content);

    if (!reply) {
      throw new Error("Ollama returned an empty reply");
    }

    console.log("MVP AGENT REPLY:", reply);

    return res.json({
      reply,
      model: OLLAMA_MODEL,
    });
  } catch (error) {
    console.error("MVP OLLAMA AGENT ERROR:", error);

    return res.status(500).json({
      error: "Agent request failed",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(
    "MVP SERVER ACTIVE: http://localhost:" + PORT
  );

  console.log(
    "OLLAMA MODEL: " + OLLAMA_MODEL
  );
});