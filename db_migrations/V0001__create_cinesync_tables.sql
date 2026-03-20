
CREATE TABLE cinesync_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cinesync_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('public', 'private')),
  owner_id UUID NOT NULL REFERENCES cinesync_users(id),
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cinesync_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES cinesync_rooms(id),
  user_id UUID NOT NULL REFERENCES cinesync_users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

CREATE TABLE cinesync_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES cinesync_rooms(id),
  from_user_id UUID NOT NULL REFERENCES cinesync_users(id),
  to_nickname TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
