import { useScroll, useTransform, motion } from "framer-motion";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function Hero() {
  const navigate = useNavigate();
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0vh", "50vh"]);

  return (
    <div
      ref={container}
      className="relative flex items-center justify-center h-screen overflow-hidden"
    >
      <motion.div
        style={{ y }}
        className="absolute inset-0 w-full h-full"
      >
        <img
          src="/images/mountain-landscape.jpg"
          alt="Cinema atmosphere"
          className="w-full h-full object-cover"
          style={{ filter: "brightness(0.45) saturate(0.8)" }}
        />
      </motion.div>

      <div className="relative z-10 text-center text-white px-6">
        <p className="text-xs md:text-sm uppercase tracking-[0.3em] mb-4 opacity-70">Смотри вместе с друзьями</p>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
          CINESYNC
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-90 mb-8">
          Синхронный просмотр фильмов и сериалов с близкими — где бы они ни были
        </p>
        <button
          onClick={() => navigate("/rooms")}
          className="bg-white text-black px-8 py-3 text-sm uppercase tracking-wide font-medium hover:bg-neutral-200 transition-colors duration-300 cursor-pointer"
        >
          Создать комнату
        </button>
      </div>
    </div>
  );
}