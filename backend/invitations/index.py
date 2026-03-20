"""Управление приглашениями CineSync: отправить другу, принять, отклонить, список входящих"""
import json
import os
import psycopg2


def get_conn():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    return conn


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
    }


def handler(event: dict, context) -> dict:
    """Приглашения: GET входящие, POST отправить, PUT принять/отклонить"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers(), "body": ""}

    conn = get_conn()
    cur = conn.cursor()

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    session_token = event.get("headers", {}).get("X-Session-Token") or params.get("session_token", "")

    if not session_token:
        return {"statusCode": 401, "headers": cors_headers(), "body": json.dumps({"error": "Нет сессии"})}

    cur.execute("SELECT id, nickname FROM cinesync_users WHERE session_token = %s", (session_token,))
    row = cur.fetchone()
    if not row:
        return {"statusCode": 401, "headers": cors_headers(), "body": json.dumps({"error": "Пользователь не найден"})}
    user_id = str(row[0])
    user_nickname = row[1]

    # GET — входящие приглашения
    if method == "GET":
        cur.execute(
            """SELECT i.id, i.room_id, r.name, r.code, r.type, u.nickname as from_nickname, i.status, i.created_at
               FROM cinesync_invitations i
               JOIN cinesync_rooms r ON r.id = i.room_id
               JOIN cinesync_users u ON u.id = i.from_user_id
               WHERE i.to_nickname = %s AND i.status = 'pending'
               ORDER BY i.created_at DESC""",
            (user_nickname,),
        )
        rows = cur.fetchall()
        invitations = [
            {
                "id": str(r[0]),
                "room_id": str(r[1]),
                "room_name": r[2],
                "room_code": r[3],
                "room_type": r[4],
                "from_nickname": r[5],
                "status": r[6],
                "created_at": r[7].isoformat() if r[7] else None,
            }
            for r in rows
        ]
        return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"invitations": invitations, "my_nickname": user_nickname})}

    # POST — отправить приглашение
    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        room_id = body.get("room_id")
        to_nickname = body.get("to_nickname", "").strip()

        if not room_id or not to_nickname:
            return {"statusCode": 400, "headers": cors_headers(), "body": json.dumps({"error": "Нужны room_id и to_nickname"})}

        cur.execute("SELECT id FROM cinesync_rooms WHERE id = %s AND owner_id = %s", (room_id, user_id))
        if not cur.fetchone():
            return {"statusCode": 403, "headers": cors_headers(), "body": json.dumps({"error": "Только владелец может приглашать"})}

        if to_nickname == user_nickname:
            return {"statusCode": 400, "headers": cors_headers(), "body": json.dumps({"error": "Нельзя пригласить себя"})}

        cur.execute(
            """INSERT INTO cinesync_invitations (room_id, from_user_id, to_nickname)
               VALUES (%s, %s, %s) RETURNING id""",
            (room_id, user_id, to_nickname),
        )
        result = cur.fetchone()
        return {"statusCode": 201, "headers": cors_headers(), "body": json.dumps({"success": True, "invitation_id": str(result[0])})}

    # PUT — принять или отклонить
    if method == "PUT":
        body = json.loads(event.get("body") or "{}")
        invitation_id = body.get("invitation_id")
        action = body.get("action")

        if not invitation_id or action not in ("accepted", "declined"):
            return {"statusCode": 400, "headers": cors_headers(), "body": json.dumps({"error": "Нужны invitation_id и action (accepted/declined)"})}

        cur.execute(
            "SELECT room_id FROM cinesync_invitations WHERE id = %s AND to_nickname = %s AND status = 'pending'",
            (invitation_id, user_nickname),
        )
        row = cur.fetchone()
        if not row:
            return {"statusCode": 404, "headers": cors_headers(), "body": json.dumps({"error": "Приглашение не найдено"})}

        room_id = str(row[0])
        cur.execute("UPDATE cinesync_invitations SET status = %s WHERE id = %s", (action, invitation_id))

        if action == "accepted":
            cur.execute(
                "INSERT INTO cinesync_room_members (room_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (room_id, user_id),
            )
            cur.execute("SELECT code FROM cinesync_rooms WHERE id = %s", (room_id,))
            code = cur.fetchone()[0]
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"success": True, "room_code": code})}

        return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"success": True})}

    return {"statusCode": 405, "headers": cors_headers(), "body": json.dumps({"error": "Method not allowed"})}
