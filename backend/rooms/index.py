"""Управление комнатами CineSync: создание, список, вход по коду"""
import json
import os
import random
import string
import psycopg2


def get_conn():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    return conn


def random_code(length=6):
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


def ensure_user(cur, session_token, nickname=None):
    cur.execute(
        "SELECT id, nickname FROM cinesync_users WHERE session_token = %s",
        (session_token,),
    )
    row = cur.fetchone()
    if row:
        return {"id": str(row[0]), "nickname": row[1]}
    if not nickname:
        nickname = "Гость_" + random_code(4)
    cur.execute(
        "INSERT INTO cinesync_users (nickname, session_token) VALUES (%s, %s) RETURNING id, nickname",
        (nickname, session_token),
    )
    row = cur.fetchone()
    return {"id": str(row[0]), "nickname": row[1]}


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Token, X-Nickname",
    }


def handler(event: dict, context) -> dict:
    """Управление комнатами: GET список публичных, POST создать, GET /join?code=XXX"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers(), "body": ""}

    conn = get_conn()
    cur = conn.cursor()

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    session_token = event.get("headers", {}).get("X-Session-Token") or params.get("session_token", "")
    nickname = event.get("headers", {}).get("X-Nickname") or ""

    # GET /rooms?action=list — публичные комнаты
    if method == "GET" and params.get("action") == "list":
        cur.execute(
            """SELECT r.id, r.code, r.name, r.type, r.video_url, r.created_at,
                      u.nickname as owner_nickname,
                      COUNT(m.id) as member_count
               FROM cinesync_rooms r
               JOIN cinesync_users u ON u.id = r.owner_id
               LEFT JOIN cinesync_room_members m ON m.room_id = r.id
               WHERE r.type = 'public'
               GROUP BY r.id, r.code, r.name, r.type, r.video_url, r.created_at, u.nickname
               ORDER BY r.created_at DESC
               LIMIT 20"""
        )
        rows = cur.fetchall()
        rooms = [
            {
                "id": str(r[0]),
                "code": r[1],
                "name": r[2],
                "type": r[3],
                "video_url": r[4],
                "created_at": r[5].isoformat() if r[5] else None,
                "owner_nickname": r[6],
                "member_count": r[7],
            }
            for r in rows
        ]
        return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"rooms": rooms})}

    # GET /rooms?action=join&code=XXX — войти в комнату по коду
    if method == "GET" and params.get("action") == "join":
        code = params.get("code", "").upper()
        if not code:
            return {"statusCode": 400, "headers": cors_headers(), "body": json.dumps({"error": "Нужен код комнаты"})}

        cur.execute(
            """SELECT r.id, r.code, r.name, r.type, r.video_url, u.nickname
               FROM cinesync_rooms r
               JOIN cinesync_users u ON u.id = r.owner_id
               WHERE r.code = %s""",
            (code,),
        )
        row = cur.fetchone()
        if not row:
            return {"statusCode": 404, "headers": cors_headers(), "body": json.dumps({"error": "Комната не найдена"})}

        room = {"id": str(row[0]), "code": row[1], "name": row[2], "type": row[3], "video_url": row[4], "owner_nickname": row[5]}

        if session_token:
            user = ensure_user(cur, session_token, nickname)
            cur.execute(
                "INSERT INTO cinesync_room_members (room_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (room["id"], user["id"]),
            )

        return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"room": room})}

    # GET /rooms?action=my — мои комнаты
    if method == "GET" and params.get("action") == "my":
        if not session_token:
            return {"statusCode": 401, "headers": cors_headers(), "body": json.dumps({"error": "Нет сессии"})}
        user = ensure_user(cur, session_token, nickname)
        cur.execute(
            """SELECT r.id, r.code, r.name, r.type, r.video_url, r.created_at,
                      COUNT(m.id) as member_count
               FROM cinesync_rooms r
               LEFT JOIN cinesync_room_members m ON m.room_id = r.id
               WHERE r.owner_id = %s
               GROUP BY r.id, r.code, r.name, r.type, r.video_url, r.created_at
               ORDER BY r.created_at DESC""",
            (user["id"],),
        )
        rows = cur.fetchall()
        rooms = [
            {
                "id": str(r[0]),
                "code": r[1],
                "name": r[2],
                "type": r[3],
                "video_url": r[4],
                "created_at": r[5].isoformat() if r[5] else None,
                "member_count": r[6],
            }
            for r in rows
        ]
        return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"rooms": rooms, "user": user})}

    # POST /rooms — создать комнату
    if method == "POST":
        if not session_token:
            return {"statusCode": 401, "headers": cors_headers(), "body": json.dumps({"error": "Нет сессии"})}
        body = json.loads(event.get("body") or "{}")
        room_name = body.get("name", "Моя комната")
        room_type = body.get("type", "private")
        video_url = body.get("video_url", "")
        nick = body.get("nickname") or nickname

        user = ensure_user(cur, session_token, nick)

        code = random_code()
        for _ in range(5):
            cur.execute("SELECT id FROM cinesync_rooms WHERE code = %s", (code,))
            if not cur.fetchone():
                break
            code = random_code()

        cur.execute(
            "INSERT INTO cinesync_rooms (code, name, type, owner_id, video_url) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (code, room_name, room_type, user["id"], video_url),
        )
        room_id = str(cur.fetchone()[0])
        cur.execute(
            "INSERT INTO cinesync_room_members (room_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (room_id, user["id"]),
        )

        return {
            "statusCode": 201,
            "headers": cors_headers(),
            "body": json.dumps({"room": {"id": room_id, "code": code, "name": room_name, "type": room_type, "video_url": video_url}, "user": user}),
        }

    return {"statusCode": 405, "headers": cors_headers(), "body": json.dumps({"error": "Method not allowed"})}
