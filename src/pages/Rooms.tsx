import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/icon";
import { getPublicRooms, createRoom, joinRoomByCode, getInvitations, respondInvitation, detectService } from "@/lib/api";
import { getSession, setNickname, getNickname } from "@/lib/session";

type Room = {
  id: string;
  code: string;
  name: string;
  type: "public" | "private";
  video_url: string;
  owner_nickname: string;
  member_count: number;
};

type Invitation = {
  id: string;
  room_name: string;
  room_code: string;
  from_nickname: string;
};

const SERVICE_ICONS: Record<string, string> = {
  youtube: "Youtube",
  vk: "Play",
  netflix: "Tv",
  other: "Link",
};

const SERVICE_LABELS: Record<string, string> = {
  youtube: "YouTube",
  vk: "VK Видео",
  netflix: "Netflix",
  other: "Другой",
};

export default function Rooms() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [nickname, setNicknameState] = useState(getNickname());
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [form, setForm] = useState({ name: "", type: "private" as "public" | "private", video_url: "" });
  const [creating, setCreating] = useState(false);
  const [nicknameSet, setNicknameSet] = useState(!!getNickname());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [roomsData, invData] = await Promise.all([
      getPublicRooms(),
      getNickname() ? getInvitations() : Promise.resolve({ invitations: [] }),
    ]);
    setRooms(roomsData.rooms || []);
    setInvitations(invData.invitations || []);
    setLoading(false);
  }

  function saveNickname() {
    if (!nickname.trim()) return;
    setNickname(nickname.trim());
    setNicknameSet(true);
    loadData();
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.video_url.trim()) return;
    setCreating(true);
    const data = await createRoom({ ...form, nickname });
    setCreating(false);
    if (data.room?.code) {
      navigate(`/room/${data.room.code}`);
    }
  }

  async function handleJoin() {
    setJoinError("");
    const data = await joinRoomByCode(joinCode.trim().toUpperCase());
    if (data.room?.code) {
      navigate(`/room/${data.room.code}`);
    } else {
      setJoinError(data.error || "Комната не найдена");
    }
  }

  async function handleInvite(inv: Invitation, action: "accepted" | "declined") {
    const data = await respondInvitation(inv.id, action);
    if (action === "accepted" && data.room_code) {
      navigate(`/room/${data.room_code}`);
    } else {
      setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
    }
  }

  if (!nicknameSet) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center"
        >
          <h1 className="text-white text-3xl font-bold tracking-tight mb-2">CINESYNC</h1>
          <p className="text-neutral-400 text-sm mb-8">Введите ник, чтобы начать</p>
          <input
            className="w-full bg-neutral-900 border border-neutral-700 text-white px-4 py-3 mb-4 focus:outline-none focus:border-white transition-colors"
            placeholder="Ваш никнейм"
            value={nickname}
            onChange={(e) => setNicknameState(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveNickname()}
          />
          <button
            onClick={saveNickname}
            className="w-full bg-white text-black py-3 text-sm uppercase tracking-wide font-medium hover:bg-neutral-200 transition-colors"
          >
            Войти
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-800">
        <button onClick={() => navigate("/")} className="text-white font-bold tracking-widest text-lg">
          CINESYNC
        </button>
        <div className="flex items-center gap-4">
          <span className="text-neutral-400 text-sm">{getNickname()}</span>
          <button
            onClick={() => setShowJoin(true)}
            className="border border-neutral-600 text-white px-4 py-2 text-xs uppercase tracking-wide hover:border-white transition-colors"
          >
            Войти по коду
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-white text-black px-4 py-2 text-xs uppercase tracking-wide font-medium hover:bg-neutral-200 transition-colors"
          >
            + Создать комнату
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Приглашения */}
        <AnimatePresence>
          {invitations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-10"
            >
              <h2 className="text-xs uppercase tracking-widest text-neutral-400 mb-4">Приглашения</h2>
              <div className="space-y-3">
                {invitations.map((inv) => (
                  <div key={inv.id} className="bg-neutral-900 border border-neutral-700 px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{inv.room_name}</p>
                      <p className="text-neutral-400 text-xs mt-0.5">от {inv.from_nickname}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleInvite(inv, "accepted")}
                        className="bg-white text-black px-4 py-1.5 text-xs uppercase tracking-wide hover:bg-neutral-200 transition-colors"
                      >
                        Принять
                      </button>
                      <button
                        onClick={() => handleInvite(inv, "declined")}
                        className="border border-neutral-600 text-neutral-400 px-4 py-1.5 text-xs uppercase tracking-wide hover:border-neutral-400 transition-colors"
                      >
                        Отклонить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Публичные комнаты */}
        <h2 className="text-xs uppercase tracking-widest text-neutral-400 mb-6">Публичные комнаты</h2>
        {loading ? (
          <div className="text-neutral-500 text-sm">Загрузка...</div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-neutral-800">
            <Icon name="Clapperboard" size={40} className="text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-500 text-sm">Публичных комнат пока нет</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 text-white text-sm underline underline-offset-4 hover:text-neutral-300"
            >
              Создать первую
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rooms.map((room) => {
              const service = detectService(room.video_url);
              return (
                <motion.button
                  key={room.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => navigate(`/room/${room.code}`)}
                  className="bg-neutral-900 border border-neutral-800 p-5 text-left hover:border-neutral-600 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon name={SERVICE_ICONS[service]} size={16} className="text-neutral-400" />
                      <span className="text-neutral-500 text-xs uppercase tracking-wide">{SERVICE_LABELS[service]}</span>
                    </div>
                    <span className="text-neutral-600 text-xs flex items-center gap-1">
                      <Icon name="Users" size={12} />
                      {room.member_count}
                    </span>
                  </div>
                  <p className="text-white font-medium mb-1 group-hover:text-neutral-200 transition-colors">{room.name}</p>
                  <p className="text-neutral-500 text-xs">Код: {room.code} · {room.owner_nickname}</p>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Модал: Создать комнату */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-6"
            onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-700 w-full max-w-md p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-bold text-lg tracking-tight">Новая комната</h2>
                <button onClick={() => setShowCreate(false)} className="text-neutral-500 hover:text-white">
                  <Icon name="X" size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-neutral-400 text-xs uppercase tracking-wide mb-1.5 block">Название</label>
                  <input
                    className="w-full bg-neutral-800 border border-neutral-700 text-white px-4 py-3 focus:outline-none focus:border-white transition-colors text-sm"
                    placeholder="Пятничный киновечер"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-neutral-400 text-xs uppercase tracking-wide mb-1.5 block">Ссылка на видео</label>
                  <input
                    className="w-full bg-neutral-800 border border-neutral-700 text-white px-4 py-3 focus:outline-none focus:border-white transition-colors text-sm"
                    placeholder="YouTube, VK Видео или Netflix"
                    value={form.video_url}
                    onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                  />
                  {form.video_url && (
                    <p className="text-neutral-500 text-xs mt-1.5 flex items-center gap-1.5">
                      <Icon name={SERVICE_ICONS[detectService(form.video_url)]} size={12} />
                      {SERVICE_LABELS[detectService(form.video_url)]}
                      {detectService(form.video_url) === "netflix" && (
                        <span className="text-amber-500"> · Откроется в новой вкладке</span>
                      )}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-neutral-400 text-xs uppercase tracking-wide mb-2 block">Тип комнаты</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["private", "public"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setForm({ ...form, type: t })}
                        className={`py-3 text-xs uppercase tracking-wide border transition-colors flex items-center justify-center gap-2 ${
                          form.type === t
                            ? "bg-white text-black border-white"
                            : "bg-transparent text-neutral-400 border-neutral-700 hover:border-neutral-500"
                        }`}
                      >
                        <Icon name={t === "private" ? "Lock" : "Globe"} size={12} />
                        {t === "private" ? "Приватная" : "Публичная"}
                      </button>
                    ))}
                  </div>
                  <p className="text-neutral-600 text-xs mt-2">
                    {form.type === "private" ? "Войти можно только по ссылке или приглашению" : "Отображается в общем списке"}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={creating || !form.name.trim() || !form.video_url.trim()}
                className="w-full mt-6 bg-white text-black py-3 text-sm uppercase tracking-wide font-medium hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {creating ? "Создаю..." : "Создать и войти"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Модал: Войти по коду */}
      <AnimatePresence>
        {showJoin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-6"
            onClick={(e) => e.target === e.currentTarget && setShowJoin(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-700 w-full max-w-sm p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-bold text-lg tracking-tight">Войти по коду</h2>
                <button onClick={() => setShowJoin(false)} className="text-neutral-500 hover:text-white">
                  <Icon name="X" size={20} />
                </button>
              </div>
              <input
                className="w-full bg-neutral-800 border border-neutral-700 text-white px-4 py-3 focus:outline-none focus:border-white transition-colors text-sm text-center tracking-widest uppercase font-mono"
                placeholder="XXXXXX"
                maxLength={6}
                value={joinCode}
                onChange={(e) => { setJoinCode(e.target.value); setJoinError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
              {joinError && <p className="text-red-400 text-xs mt-2">{joinError}</p>}
              <button
                onClick={handleJoin}
                disabled={joinCode.length < 6}
                className="w-full mt-4 bg-white text-black py-3 text-sm uppercase tracking-wide font-medium hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Войти
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
