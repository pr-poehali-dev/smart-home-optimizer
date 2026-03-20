import Icon from "@/components/ui/icon";

type FeatureItem = {
  icon: string;
  title: string;
  desc: string;
};

const features: FeatureItem[] = [
  {
    icon: "Play",
    title: "Синхронный просмотр",
    desc: "Пауза, перемотка и воспроизведение синхронизируются у всех участников в реальном времени.",
  },
  {
    icon: "MessageCircle",
    title: "Живой чат",
    desc: "Обсуждайте сцены, делитесь реакциями и смейтесь вместе — прямо во время просмотра.",
  },
  {
    icon: "Users",
    title: "Комнаты для друзей",
    desc: "Создайте приватную комнату и пригласите до 10 друзей одной ссылкой.",
  },
  {
    icon: "Film",
    title: "Фильмы и сериалы",
    desc: "Смотрите из любого источника — добавляйте ссылку и наслаждайтесь вместе.",
  },
];

export default function Featured() {
  return (
    <div
      id="features"
      className="flex flex-col lg:flex-row lg:justify-between lg:items-center min-h-screen px-6 py-20 lg:py-0 bg-white"
    >
      <div className="flex-1 h-[400px] lg:h-[800px] mb-12 lg:mb-0 lg:order-2 relative overflow-hidden bg-neutral-950 flex items-center justify-center">
        <div className="grid grid-cols-2 gap-6 p-10 w-full max-w-sm">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-neutral-900 rounded-xl p-5 flex flex-col gap-3 hover:bg-neutral-800 transition-colors"
            >
              <Icon name={f.icon} size={28} className="text-white opacity-80" />
              <p className="text-white text-xs font-medium leading-tight">{f.title}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 text-left lg:h-[800px] flex flex-col justify-center lg:mr-16 lg:order-1">
        <h3 className="uppercase mb-4 text-sm tracking-wide text-neutral-500">
          Всё для совместного просмотра
        </h3>
        <div className="space-y-6 mb-10">
          {features.map((f) => (
            <div key={f.title}>
              <h4 className="text-lg font-semibold text-neutral-900 mb-1 flex items-center gap-2">
                <Icon name={f.icon} size={18} className="text-neutral-600" />
                {f.title}
              </h4>
              <p className="text-neutral-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
        <button className="bg-black text-white border border-black px-6 py-3 text-sm transition-all duration-300 hover:bg-white hover:text-black cursor-pointer w-fit uppercase tracking-wide">
          Попробовать бесплатно
        </button>
      </div>
    </div>
  );
}
