import { MessageCircle, RefreshCw, Send, X } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import "./ChatWidget.css";

const SESSION_KEY = "rik_chat_session_id";
const MESSAGES_KEY = "rik_chat_messages";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const quickReplies = [
  "Опросный лист на вентилятор",
  "Опросный лист на центральный кондиционер",
  "Хочу связаться с менеджером"
];
const fallbackAnswer = "Сейчас я немного перегружен. Попробуйте написать чуть позже.";

function createSessionId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  const randomPart = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
  return [
    Date.now().toString(36),
    randomPart(),
    randomPart(),
    randomPart(),
    randomPart(),
    randomPart()
  ].join("-");
}

function getInitialSessionId() {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const next = createSessionId();
  localStorage.setItem(SESSION_KEY, next);
  return next;
}

function getInitialMessages() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MESSAGES_KEY) || "[]");
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(-20);
  } catch {
    localStorage.removeItem(MESSAGES_KEY);
  }
  return [{ role: "assistant", content: "Здравствуйте. Я помогу сориентироваться по сайту. Что хотите узнать?" }];
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(getInitialSessionId);
  const [messages, setMessages] = useState(getInitialMessages);
  const [input, setInput] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages.slice(-20)));
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function saveSession(nextSessionId) {
    setSessionId(nextSessionId);
    localStorage.setItem(SESSION_KEY, nextSessionId);
  }

  function resetChat() {
    const nextSessionId = createSessionId();
    saveSession(nextSessionId);
    setMessages([{ role: "assistant", content: "Начнем заново. Чем могу помочь?" }]);
    setInput("");
  }

  async function sendMessage(text) {
    const cleanText = text.trim();
    if (!cleanText || isLoading) return;

    setInput("");
    setIsLoading(true);
    setMessages((current) => [
      ...current,
      { role: "user", content: cleanText },
      { role: "assistant", content: "" }
    ]);

    try {
      const streamed = await requestStream(cleanText);
      if (!streamed) await requestPlain(cleanText);
    } catch {
      replaceLastAssistant(fallbackAnswer);
    } finally {
      setIsLoading(false);
    }
  }

  async function requestStream(text) {
    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(text))
    });

    if (!response.ok || !response.body) return false;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let received = false;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const rawEvent of events) {
        const parsed = parseSse(rawEvent);
        if (parsed.event === "message") {
          received = true;
          appendLastAssistant(parsed.data.delta || "");
        }
        if (parsed.event === "done" && parsed.data.sessionId) {
          saveSession(parsed.data.sessionId);
        }
      }
    }

    return received;
  }

  async function requestPlain(text) {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(text))
    });
    const data = await response.json();
    if (data.sessionId) saveSession(data.sessionId);
    replaceLastAssistant(data.answer || fallbackAnswer);
  }

  function buildPayload(message) {
    return {
      sessionId,
      message,
      history: messages
        .filter((item) => item.content && (item.role === "user" || item.role === "assistant"))
        .slice(-12)
        .map((item) => ({ role: item.role, content: item.content })),
      pageUrl: window.location.href,
      metadata: {}
    };
  }

  function appendLastAssistant(delta) {
    setMessages((current) => {
      const next = [...current];
      const last = next[next.length - 1];
      next[next.length - 1] = { ...last, content: `${last.content}${delta}` };
      return next;
    });
  }

  function replaceLastAssistant(content) {
    setMessages((current) => {
      const next = [...current];
      const last = next[next.length - 1];
      if (last?.role === "assistant") {
        next[next.length - 1] = { ...last, content };
      } else {
        next.push({ role: "assistant", content });
      }
      return next;
    });
  }

  return (
    <div className={`chat-widget${isOpen ? " is-open" : ""}`}>
      {isOpen && (
        <section className="chat-window" aria-label="Чат с ассистентом">
          <header className="chat-header">
            <div className="chat-title">
              <strong>Ассистент сайта</strong>
              <span>Отвечает по материалам проекта</span>
            </div>
            <div className="chat-actions">
              <button className="icon-button secondary" type="button" onClick={resetChat} title="Начать заново" aria-label="Начать заново">
                <RefreshCw />
              </button>
              <button className="icon-button secondary" type="button" onClick={() => setIsOpen(false)} title="Закрыть" aria-label="Закрыть">
                <X />
              </button>
            </div>
          </header>

          <div className="chat-messages" role="log" aria-live="polite" ref={listRef}>
            {messages.map((message, index) => (
              <div className={`message ${message.role === "user" ? "user" : "assistant"}`} key={`${message.role}-${index}`}>
                {message.content ? renderMessage(message.content) : "Печатаю..."}
              </div>
            ))}
          </div>

          <div>
            {!isLoading && (
              <div className="quick-replies">
                {quickReplies.map((reply) => (
                  <button type="button" onClick={() => sendMessage(reply)} key={reply}>
                    {reply}
                  </button>
                ))}
              </div>
            )}
            <p className="chat-pd-note">
              Не указывайте в чате персональные данные (имя, телефон, e-mail). Для заявки —{" "}
              <a href="/request">форма «Запросить расчёт»</a>.
            </p>
            <form
              className="chat-form"
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage(input);
              }}
            >
              <textarea
                className="chat-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage(input);
                  }
                }}
                rows={1}
                placeholder="Напишите сообщение..."
                aria-label="Сообщение"
                disabled={isLoading}
              />
              <button className="send-button" type="submit" disabled={isLoading || !input.trim()} title="Отправить" aria-label="Отправить">
                <Send />
              </button>
            </form>
          </div>
        </section>
      )}

      <button className="chat-toggle" type="button" onClick={() => setIsOpen((value) => !value)} aria-label={isOpen ? "Закрыть чат" : "Открыть чат"} title={isOpen ? "Закрыть чат" : "Открыть чат"}>
        <MessageCircle />
      </button>
    </div>
  );
}

function parseSse(raw) {
  const event = raw.match(/^event:\s*(.+)$/m)?.[1] || "message";
  const dataRaw = raw.match(/^data:\s*(.+)$/m)?.[1] || "{}";
  try {
    return { event, data: JSON.parse(dataRaw) };
  } catch {
    return { event, data: {} };
  }
}

function renderMessage(content) {
  const lines = content.split(/\r?\n/);
  const nodes = [];

  lines.forEach((line, index) => {
    const listMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (listMatch) {
      nodes.push(
        <div className="message-list-line" key={`line-${index}`}>
          <span aria-hidden="true">•</span>
          <span>{renderInline(listMatch[1])}</span>
        </div>
      );
    } else {
      nodes.push(<Fragment key={`line-${index}`}>{renderInline(line)}</Fragment>);
    }

    if (index < lines.length - 1) {
      nodes.push(<br key={`br-${index}`} />);
    }
  });

  return nodes;
}

function renderInline(text) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      const isDownload = /\.(xlsx|xls|docx|pdf)(\?.*)?$/i.test(href);
      return (
        <a
          className="message-action-link"
          download={isDownload ? true : undefined}
          href={href}
          key={index}
          rel="noreferrer"
          target={href.startsWith("http") ? "_blank" : undefined}
        >
          {label}
        </a>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}
