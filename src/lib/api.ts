import func2url from "../../backend/func2url.json";
import { getSession } from "./session";

const ROOMS_URL = func2url.rooms;
const INVITATIONS_URL = func2url.invitations;

function headers(extraNickname?: string) {
  const { token, nickname } = getSession();
  return {
    "Content-Type": "application/json",
    "X-Session-Token": token,
    "X-Nickname": extraNickname || nickname,
  };
}

export async function getPublicRooms() {
  const res = await fetch(`${ROOMS_URL}?action=list`);
  return res.json();
}

export async function getMyRooms() {
  const res = await fetch(`${ROOMS_URL}?action=my`, { headers: headers() });
  return res.json();
}

export async function createRoom(data: { name: string; type: "public" | "private"; video_url: string; nickname: string }) {
  const res = await fetch(ROOMS_URL, {
    method: "POST",
    headers: headers(data.nickname),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function joinRoomByCode(code: string) {
  const res = await fetch(`${ROOMS_URL}?action=join&code=${code}`, { headers: headers() });
  return res.json();
}

export async function getInvitations() {
  const res = await fetch(INVITATIONS_URL, { headers: headers() });
  return res.json();
}

export async function sendInvitation(room_id: string, to_nickname: string) {
  const res = await fetch(INVITATIONS_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ room_id, to_nickname }),
  });
  return res.json();
}

export async function respondInvitation(invitation_id: string, action: "accepted" | "declined") {
  const res = await fetch(INVITATIONS_URL, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ invitation_id, action }),
  });
  return res.json();
}

export function detectService(url: string): "youtube" | "vk" | "netflix" | "other" {
  if (/youtu\.be|youtube\.com/i.test(url)) return "youtube";
  if (/vk\.com|vkvideo\.ru/i.test(url)) return "vk";
  if (/netflix\.com/i.test(url)) return "netflix";
  return "other";
}

export function getEmbedUrl(url: string): string | null {
  const service = detectService(url);

  if (service === "youtube") {
    const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
  }

  if (service === "vk") {
    // VK Video: https://vk.com/video-XXXXXXX_XXXXXXXX или https://vkvideo.ru/video...
    const match = url.match(/video(-?\d+)_(\d+)/);
    if (match) return `https://vk.com/video_ext.php?oid=${match[1]}&id=${match[2]}&hd=2&autoplay=1`;
  }

  return null;
}
