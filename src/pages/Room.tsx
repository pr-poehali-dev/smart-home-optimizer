import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/icon";
import { joinRoomByCode, sendInvitation, detectService, getEmbedUrl } from "@/lib/api";
import { getNickname } from "@/lib/session";

type Room = {
  id: string;
  code: string;
  name: string;
  type: "public" | "private";
  video_url: string;
  owner_nickname: string;
};

const SERVICE_LABELS: Record<string, string> = {
  youtube: "YouTube",
  vk: "VK Видео",
  netflix: "Netflix",
  other: "Видео",
};

const SERVICE_COLORS: Record<string, string> = {
  youtube: "text-red-400",
  vk: "text-blue-400",
  netflix: "text-red-500",
  other: "text-neutral-400",
};

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [inviteNickname, setInviteNickname] = useState("");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (code) loadRoom(code);
  }, [code]);

  async function loadRoom(roomCode: string) {
    setLoading(true);
    const data = await joinRoomByCode(roomCode);
    if (data.room) {
      setRoom(data.room);
    } else {
      setError(data.error || "Комната не найдена");
    }
    setLoading(false);
  }

  async function handleSendInvite() {
    if (!room || !inviteNickname.trim()) return;
    setInviteStatus("sending");
    const data = await sendInvitation(room.id, inviteNickname.trim());
    if (data.success) {
      setInviteStatus("sent");
      setInviteNickname("");
    } else {
      setInviteStatus("error");
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyCode() {
    if (room) navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <p className="text-neutral-500 text-sm animate-pulse">Подключаемся к комнате...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center flex-col gap-4">
        <Icon name="AlertCircle" size={40} className="text-neutral-600" />
        <p className="text-neutral-400 text-sm">{error || "Комната не найдена"}</p>
        <button onClick={() => navigate("/rooms")} className="text-white text-sm underline underline-offset-4">
          Вернуться к комнатам
        </button>
      </div>
    );
  }

  const service = detectService(room.video_url);
  const embedUrl = getEmbedUrl(room.video_url);
  const isNetflix = service === "netflix";

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/rooms")} className="text-neutral-500 hover:text-white transition-colors">
            <Icon name="ChevronLeft" size={20} />
          </button>
          <div>
            <p className="text-white text-sm font-medium">{room.name}</p>
            <p className={`text-xs ${SERVICE_COLORS[service]}`}>{SERVICE_LABELS[service]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowShare(true)}
            className="border border-neutral-700 text-neutral-300 px-3 py-1.5 text-xs uppercase tracking-wide hover:border-white hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Icon name="Link" size={12} />
            Поделиться
          </button>
          {getNickname() === room.owner_nickname && (
            <button
              onClick={() => setShowInvite(true)}
              className="bg-white text-black px-3 py-1.5 text-xs uppercase tracking-wide font-medium hover:bg-neutral-200 transition-colors flex items-center gap-1.5"
            >
              <Icon name="UserPlus" size={12} />
              Пригласить
            </button>
          )}
        </div>
      </div>

      {/* Плеер */}
      <div className="flex-1 bg-black flex items-center justify-center relative">
        {isNetflix ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center px-6 max-w-md"
          >
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name="Tv" size={28} className="text-white" />
            </div>
            <h2 className="text-white text-xl font-bold mb-2">Netflix</h2>
            <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
              Netflix не разрешает встроенный просмотр. Откройте фильм в отдельной вкладке и смотрите синхронно с друзьями.
            </p>
            <a
              href={room.video_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 text-sm uppercase tracking-wide font-medium hover:bg-red-700 transition-colors"
            >
              <Icon name="ExternalLink" size={14} />
              Открыть на Netflix
            </a>
            <p className="text-neutral-600 text-xs mt-4">
              Договоритесь с друзьями и нажмите Play одновременно
            </p>
          </motion.div>
        ) : embedUrl ? (
          <iframe
            src={embedUrl}
            className="w-full h-full"
            style={{ minHeight: "calc(100vh - 56px)" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="text-center px-6">
            <Icon name="AlertCircle" size={36} className="text-neutral-600 mx-auto mb-4" />
            <p className="text-neutral-400 text-sm mb-4">Не удалось распознать ссылку для встроенного просмотра</p>
            <a
              href={room.video_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border border-neutral-600 text-white px-5 py-2.5 text-sm hover:border-white transition-colors"
            >
              <Icon name="ExternalLink" size={14} />
              Открыть видео
            </a>
          </div>
        )}
      </div>

      {/* Модал: Поделиться */}
      <AnimatePresence>
        {showShare && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
            onClick={(e) => e.target === e.currentTarget && setShowShare(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-700 w-full max-w-sm p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white font-bold">Поделиться комнатой</h2>
                <button onClick={() => setShowShare(false)} className="text-neutral-500 hover:text-white">
                  <Icon name="X" size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="bg-neutral-800 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-neutral-400 text-xs mb-0.5">Код комнаты</p>
                    <p className="text-white font-mono font-bold tracking-widest text-lg">{room.code}</p>
                  </div>
                  <button
                    onClick={copyCode}
                    className="text-neutral-400 hover:text-white transition-colors"
                  >
                    <Icon name={copied ? "Check" : "Copy"} size={16} />
                  </button>
                </div>

                <button
                  onClick={copyLink}
                  className="w-full border border-neutral-700 text-white px-4 py-3 text-sm flex items-center justify-center gap-2 hover:border-white transition-colors"
                >
                  <Icon name={copied ? "Check" : "Link"} size={14} />
                  {copied ? "Скопировано!" : "Копировать ссылку"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Модал: Пригласить */}
      <AnimatePresence>
        {showInvite && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
            onClick={(e) => e.target === e.currentTarget && setShowInvite(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-700 w-full max-w-sm p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white font-bold">Пригласить друга</h2>
                <button onClick={() => setShowInvite(false)} className="text-neutral-500 hover:text-white">
                  <Icon name="X" size={18} />
                </button>
              </div>
              <input
                className="w-full bg-neutral-800 border border-neutral-700 text-white px-4 py-3 focus:outline-none focus:border-white transition-colors text-sm mb-3"
                placeholder="Никнейм друга"
                value={inviteNickname}
                onChange={(e) => { setInviteNickname(e.target.value); setInviteStatus("idle"); }}
                onKeyDown={(e) => e.key === "Enter" && handleSendInvite()}
              />
              {inviteStatus === "sent" && (
                <p className="text-green-400 text-xs mb-3 flex items-center gap-1.5">
                  <Icon name="Check" size={12} /> Приглашение отправлено
                </p>
              )}
              {inviteStatus === "error" && (
                <p className="text-red-400 text-xs mb-3">Ошибка. Проверьте никнейм.</p>
              )}
              <button
                onClick={handleSendInvite}
                disabled={inviteStatus === "sending" || !inviteNickname.trim()}
                className="w-full bg-white text-black py-3 text-sm uppercase tracking-wide font-medium hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {inviteStatus === "sending" ? "Отправляю..." : "Отправить приглашение"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
