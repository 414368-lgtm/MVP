import { useMemo, useState } from "react";
import "./App.css";

const initialGoals = [
  {
    id: 1,
    title: "Запустить свой AI-продукт",
    progress: 68,
    deadline: "21 день",
  },
  {
    id: 2,
    title: "Укрепить личную дисциплину",
    progress: 42,
    deadline: "Активно",
  },
];

const tabs = [
  "СЕГОДНЯ",
  "ЦЕЛИ",
  "МЫСЛИ",
  "ПИТАНИЕ",
  "ДВИЖЕНИЕ",
  "АГЕНТ",
  "ИСТОРИЯ",
];

export default function App() {
  const [agentThinking, setAgentThinking] = useState(false);
  const [activeTab, setActiveTab] = useState("СЕГОДНЯ");
  const [completed, setCompleted] = useState(false);
  const [goals, setGoals] = useState(initialGoals);

  const [thoughts, setThoughts] = useState([]);
  const [thoughtInput, setThoughtInput] = useState("");

  const [foodEntries, setFoodEntries] = useState([]);
  const [foodInput, setFoodInput] = useState("");

  const [movements, setMovements] = useState([]);
  const [movementInput, setMovementInput] = useState("");

  const [agentMessages, setAgentMessages] = useState([
    {
      role: "agent",
      text: "Я вижу твои цели. Моя задача — не дать тебе остановиться.",
    },
  ]);
const [agentChats, setAgentChats] = useState(() => {
  try {
    const savedChats = localStorage.getItem("mvp-agent-chats");

    return savedChats
      ? JSON.parse(savedChats)
      : [];
  } catch {
    return [];
  }
});

const [chatHistory, setChatHistory] = useState(() => {
  try {
    const savedHistory = localStorage.getItem("mvp-chat-history");

    return savedHistory
      ? JSON.parse(savedHistory)
      : [];
  } catch {
    return [];
  }
});

const [activeChatId, setActiveChatId] = useState(() => Date.now());
const [showChatHistory, setShowChatHistory] = useState(false);
  const [agentInput, setAgentInput] = useState("");

  const averageProgress = useMemo(() => {
    if (goals.length === 0) {
      return 0;
    }

    const total = goals.reduce((sum, goal) => {
      return sum + goal.progress;
    }, 0);

    return Math.round(total / goals.length);
  }, [goals]);

  function addThought() {
    const text = thoughtInput.trim();

    if (!text) {
      return;
    }

    setThoughts((current) => [
      {
        id: Date.now(),
        text,
        time: new Date().toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
      ...current,
    ]);

    setThoughtInput("");
  }

  function addFood() {
    const text = foodInput.trim();

    if (!text) {
      return;
    }

    setFoodEntries((current) => [
      {
        id: Date.now(),
        text,
        time: new Date().toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
      ...current,
    ]);

    setFoodInput("");
  }

  function addMovement() {
    const text = movementInput.trim();

    if (!text) {
      return;
    }

    setMovements((current) => [
      {
        id: Date.now(),
        text,
        time: new Date().toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
      ...current,
    ]);

    setMovementInput("");
  }

async function sendAgentMessage() {
  const text = agentInput.trim();

  if (!text || agentThinking) {
    return;
  }

  const userMessage = {
    role: "user",
    text,
  };

  const nextMessages = [...agentMessages, userMessage];

  setAgentMessages(nextMessages);
  setAgentInput("");
  setAgentThinking(true);

  try {
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: text,
        history: nextMessages,
        goals,
        journalEntries: [],
      }),
    });

    if (!response.ok) {
      throw new Error("Agent request failed");
    }

    const data = await response.json();

    const agentMessage = {
      role: "agent",
      text: data.reply || "Я здесь. Продолжай.",
    };

    const updatedMessages = [...nextMessages, agentMessage];

    setAgentMessages(updatedMessages);

    setChatHistory((current) => {
      const history = Array.isArray(current) ? current : [];

      const currentChat = history.find(
        (chat) => chat.id === activeChatId
      );

      const chatTitle =
        currentChat?.title ||
        text.slice(0, 40) ||
        "Новый диалог";

      const updatedChat = {
        id: activeChatId,
        title: chatTitle,
        messages: updatedMessages,
        updatedAt: Date.now(),
      };

      const nextHistory = [
        updatedChat,
        ...history.filter(
          (chat) => chat.id !== activeChatId
        ),
      ];

      localStorage.setItem(
        "mvp-chat-history",
        JSON.stringify(nextHistory)
      );

      return nextHistory;
    });
  } catch (error) {
    console.error("AGENT ERROR:", error);

    const errorMessage = {
      role: "agent",
      text: "Связь с агентом временно потеряна.",
    };

    setAgentMessages((current) => [
      ...current,
      errorMessage,
    ]);
  } finally {
    setAgentThinking(false);
  }
}
function openSavedChat(chatId) {
  const chat = chatHistory.find((item) => item.id === chatId);

  if (!chat) {
    return;
  }

  setActiveChatId(chat.id);
  setAgentMessages(chat.messages);
  setActiveTab("ИСТОРИЯ");
}

function createNewChat() {
  const newChatId = Date.now();

  setActiveChatId(newChatId);
  setAgentMessages([
    {
      role: "agent",
      text: "Я вижу твои цели. Моя задача — не дать тебе остановиться.",
    },
  ]);
  setAgentInput("");
}

function deleteSavedChat(chatId) {
  setChatHistory((current) => {
    const nextHistory = current.filter(
      (chat) => chat.id !== chatId
    );

    localStorage.setItem(
      "mvp-chat-history",
      JSON.stringify(nextHistory)
    );

    return nextHistory;
  });
}
  function increaseGoalProgress(goalId) {
    setGoals((currentGoals) =>
      currentGoals.map((goal) => {
        if (goal.id !== goalId) {
          return goal;
        }

        return {
          ...goal,
          progress: Math.min(goal.progress + 5, 100),
        };
      })
    );
  }

  function renderToday() {
    return (
      <>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              РЕЖИМ ДВИЖЕНИЯ / АКТИВЕН
            </span>

            <h1>
              ДВИГАЙСЯ.
              <br />
              <span>НЕ ЖДИ.</span>
            </h1>

            <p>
              Твоим целям не нужна новая мотивация.
              <br />
              Им нужны реальные действия.
            </p>
          </div>

         <button
  className="drive-orb"
  type="button"
  aria-label="Импульс движения"
>
  <div className="orb-ring orb-ring-one" />
  <div className="orb-ring orb-ring-two" />

  <div className="orb-core">
    <span>{averageProgress}</span>
    <small>ДРАЙВ</small>
  </div>
</button>
        </section>

        <section className="mission-card">
          <div className="mission-top">
            <div></div><span className="section-label">
                ГЛАВНАЯ ЗАДАЧА СЕГОДНЯ
              </span>

              <h2>Завершить интерфейс MVP</h2>
            </div>

            <span className="priority">
              ПРИОРИТЕТ 01
            </span>
         

          <p className="mission-text">
            Не распыляйся на новые идеи. Заверши рабочий интерфейс и
            переходи к интеграции AI-агента.
          </p>

          <div className="mission-footer">
            <div className="mission-time">
              <span>ФОКУС</span>
              <strong>90 МИН</strong>
            </div>

            <button
              className={
                completed
                  ? "complete-button completed"
                  : "complete-button"
              }
              type="button"
              onClick={() => setCompleted(true)}
            >
              {completed
                ? "ЗАДАЧА ВЫПОЛНЕНА"
                : "Я СДЕЛАЛ"}
            </button>
          </div>
        </section>

        <section className="content-grid">
          <div className="goals-panel">
            <div className="panel-heading">
              <div>
                <span className="section-label">
                  ТРАЕКТОРИЯ
                </span>

                <h3>Активные цели</h3>
              </div>
            </div>

            <div className="goal-list">
              {goals.map((goal) => (
                <article
                  className="goal-card"
                  key={goal.id}
                >
                  <div className="goal-number">
                    {String(goal.id).padStart(2, "0")}
                  </div>

                  <div className="goal-content">
                    <div className="goal-title-row">
                      <h4>{goal.title}</h4>
                      <span>{goal.progress}%</span>
                    </div>

                    <div className="progress-track">
                      <div
                        className="progress-value"
                        style={{
                          width: goal.progress + "%",
                        }}
                      />
                    </div>

                    <span className="goal-deadline">
                      ОСТАЛОСЬ ДО ЦЕЛИ: {100 - goal.progress}%
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="agent-panel">
            <div className="agent-head">
              <div className="agent-icon">
                <span />
              </div>

              <div>
                <span className="section-label">
                  MVP АГЕНТ
                </span>

                <h3>Я слежу за движением.</h3>
              </div>
            </div>

            <div className="agent-message">
              <p>
                Ты решил создавать продукты.
                Сегодня у тебя одна задача:
              </p>

              <strong>
                ЗАВЕРШИ ИНТЕРФЕЙС.
              </strong>

              <p>
                Никаких новых идей, пока главное действие
                не выполнено.
              </p>
            </div>

            <button
              className="complete-button"
              type="button"
              onClick={() => setActiveTab("АГЕНТ")}
            >
              ОТКРЫТЬ АГЕНТА
            </button>
          </div>
        </section>
      </>
    );
  }

  function renderGoals() {
    return (
      <section className="page-panel">
        <span className="eyebrow">
          ТВОЯ ТРАЕКТОРИЯ
        </span>

        <h1 className="page-title">
          ЦЕЛИ
        </h1>

        <p className="page-description">
          Система считает текущее движение и показывает,
          сколько осталось до результата.
        </p>

        <div className="goal-list">
          {goals.map((goal) => (
            <article
              className="goal-card"
              key={goal.id}
            ><div className="goal-number">
                {String(goal.id).padStart(2, "0")}
              </div>

              <div className="goal-content">
                <div className="goal-title-row">
                  <h4>{goal.title}</h4>
                  <span>{goal.progress}%</span>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-value"
                    style={{
                      width: goal.progress + "%",
                    }}
                  />
                </div>

                <span className="goal-deadline">
                  ДО РЕЗУЛЬТАТА ОСТАЛОСЬ {100 - goal.progress}%
                  {" / "}
                  {goal.deadline}
                </span>

                <button
                  className="action-button"
                  type="button"
                  onClick={() =>
                    increaseGoalProgress(goal.id)
                  }
                >
                  + ЗАФИКСИРОВАТЬ ДВИЖЕНИЕ
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderJournal(
    label,
    title,
    description,
    value,
    setValue,
    addEntry,
    entries,
    placeholder
  ) {
    return (
      <section className="page-panel">
        <span className="eyebrow">
          {label}
        </span>

        <h1 className="page-title">
          {title}
        </h1>

        <p className="page-description">
          {description}
        </p>

        <div className="journal-input">
          <input
            type="text"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                addEntry();
              }
            }}
            placeholder={placeholder}
          />

          <button
            type="button"
            onClick={addEntry}
          >
            +
          </button>
        </div>

        <div className="journal-list">
          {entries.length === 0 ? (
            <div className="empty-state">
              Пока записей нет.
            </div>
          ) : (
            entries.map((entry) => (
              <article
                className="journal-card"
                key={entry.id}
              >
                <span>{entry.time}</span>
                <p>{entry.text}</p>
              </article>
            ))
          )}
        </div>
      </section>
    );
  }
function renderHistory() {
  return (
    <section className="history-page">
      <div className="history-header">
        <div>
          <div className="memory-hero">
  <div className="memory-car">
    <div className="car-cabin"></div>
    <div className="car-body">
      <div className="car-light car-light-left"></div>
      <div className="car-light car-light-right"></div>
    </div>
    <div className="car-wheel car-wheel-left"></div>
    <div className="car-wheel car-wheel-right"></div>
  </div>

  <div className="memory-slogan">
    ОДЕРЖИ ПОБЕДУ НАД СУДЬБОЙ
  </div>
</div>
        <span className="history-kicker memory-title">MVP / MEMORY</span>
<h2 className="memory-title">История диалогов</h2>
        </div>

<button
  type="button"
  className="memory-new-chat-button"
  onClick={createNewChat}
>
  + НОВЫЙ ЧАТ
</button>
      </div>

      <div className="history-list">
        {chatHistory.length === 0 ? (
       <div className="history-empty memory-empty">
  История пока пуста.
</div>
        ) : (
          chatHistory.map((chat) => (
            <div
              className="history-card"
              key={chat.id}
            >
              <button
                type="button"
                className="history-open"
                onClick={() => {
                  openSavedChat(chat.id);
                  setActiveTab("АГЕНТ");
                }}
              >
                <span className="history-title">
                  {chat.title}
                </span>

                <span className="history-meta">
                  {chat.messages?.length || 0} сообщений
                </span>
              </button>

              <button
                type="button"
                className="history-delete"
                onClick={() => deleteSavedChat(chat.id)}
                aria-label="Удалить диалог"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
function renderAgent() {
  return (
    <section className="page-panel agent-page">
      <div className="agent-command-head">
        <div className="agent-status-line">
          <span className="agent-live-dot" />

          <span>СИСТЕМА ДВИЖЕНИЯ / НА СВЯЗИ</span>
        </div>

        <h1 className="agent-command-title">
          ГОВОРИ.
          <span> Я СЛУШАЮ.</span>
        </h1>

        <p className="agent-command-description">
          Без красивых формулировок. Напиши, что происходит.
          Система разберёт ситуацию и вернёт тебя к движению.
        </p>
      </div>

      <div className="agent-console">
        <div className="agent-console-top">
          <div className="agent-identity">
            <div className="agent-core-mini">
              <span>M</span>
            </div>

            <div>
              <strong>MVP</strong>
              <small>СИСТЕМА ДВИЖЕНИЯ</small>
            </div>
          </div>

          <span className="agent-online">
            ACTIVE
          </span>
        </div>

        <div className="agent-chat">
          {agentMessages.map((message, index) => (
            <div
              className={
                message.role === "user"
                  ? "agent-message-row user-row"
                  : "agent-message-row system-row"
              }
              key={index}
            >
              {message.role !== "user" && (
                <div className="message-core">
                  M
                </div>
              )}

              <div
                className={
                  message.role === "user"
                    ? "chat-message user-message"
                    : "chat-message agent-message-box"
                }
              >
                <span className="message-label">
                  {message.role === "user"
                    ? "ТЫ"
                    : "MVP"}
                </span>

                <p>{message.text}</p>
              </div>
            </div>
          ))}
       {agentThinking && (
  <div className="agent-thinking-dots">
    <span></span>
    <span></span>
    <span></span>
  </div>
)}
        </div>

        <div className="agent-input-zone">
          <div className="agent-input">
            <input
              type="text"
              value={agentInput}
              onChange={(event) => {
                setAgentInput(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  sendAgentMessage();
                }
              }}
              placeholder="Что сейчас мешает тебе двигаться?"
            />

            <button
              type="button"
              onClick={sendAgentMessage}
              aria-label="Отправить сообщение"
            >
              <span>↑</span>
            </button>
          </div>

          <div className="agent-input-meta">
            <span>ENTER / ОТПРАВИТЬ</span>
            <span>НЕ ФИЛЬТРУЙ МЫСЛИ</span>
          </div>
        </div>
      </div>
    </section>
  );
}

  function renderContent() {
    if (activeTab === "СЕГОДНЯ") {return renderToday();
    }
if (activeTab === "ИСТОРИЯ") return renderHistory();
    if (activeTab === "ЦЕЛИ") {
      return renderGoals();
    }

    if (activeTab === "МЫСЛИ") {
      return renderJournal(
        "ФИКСАЦИЯ СОЗНАНИЯ",
        "МЫСЛИ",
        "Записывай идеи и внутренние наблюдения. Позже AI будет анализировать повторяющиеся паттерны.",
        thoughtInput,
        setThoughtInput,
        addThought,
        thoughts,
        "Что сейчас у тебя в голове?"
      );
    }

    if (activeTab === "ПИТАНИЕ") {
      return renderJournal(
        "ЕЖЕДНЕВНЫЙ ЖУРНАЛ",
        "ПИТАНИЕ",
        "Фиксируй питание и режим. Агент будет учитывать твои ежедневные привычки.",
        foodInput,
        setFoodInput,
        addFood,
        foodEntries,
        "Что ты ел или пил?"
      );
    }

    if (activeTab === "ДВИЖЕНИЕ") {
      return renderJournal(
        "РЕАЛЬНЫЕ ДЕЙСТВИЯ",
        "ДВИЖЕНИЕ",
        "Записывай только то, что реально сделал сегодня для своих целей.",
        movementInput,
        setMovementInput,
        addMovement,
        movements,
        "Что конкретно ты сегодня сделал?"
      );
    }

    return renderAgent();
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            M
          </div>

          <div className="brand-copy">
            <span className="brand-name">
              MVP
            </span>

            <span className="brand-status">
               СИСТЕМА ДВИЖЕНИЯ
            </span>
          </div>
        </div>

        <button
          className="profile-button"
          type="button"
        >
          FF
        </button>
      </header>

      <main className="dashboard">
        {renderContent()}
      </main>

      <nav className="bottom-nav">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={
              activeTab === tab ? "active" : ""
            }
            onClick={() => {
              setActiveTab(tab);
            }}
          >
            <span className="nav-dot" />
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
}