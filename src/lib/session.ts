export function getSession(): { token: string; nickname: string } {
  let token = localStorage.getItem("cs_token");
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem("cs_token", token);
  }
  const nickname = localStorage.getItem("cs_nickname") || "";
  return { token, nickname };
}

export function setNickname(nickname: string) {
  localStorage.setItem("cs_nickname", nickname);
}

export function getNickname(): string {
  return localStorage.getItem("cs_nickname") || "";
}