-- Aura Family Mirror — initial schema
CREATE EXTENSION IF NOT EXISTS vector;

-- Families
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Family members
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6ec1ff',
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  google_event_id TEXT,
  title TEXT NOT NULL,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  done BOOLEAN DEFAULT false,
  assigned_to UUID REFERENCES family_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  quantity TEXT,
  done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE chore_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  stars INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  UNIQUE(member_id, week_start)
);

CREATE TABLE family_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  from_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  pinned BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  meal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  prep_minutes INTEGER,
  on_list BOOLEAN DEFAULT false,
  UNIQUE(family_id, meal_date)
);

CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  carrier TEXT,
  count INTEGER DEFAULT 1,
  eta_text TEXT,
  arriving_date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE commute_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  leave_by TIMESTAMPTZ NOT NULL,
  delay_minutes INTEGER DEFAULT 0,
  route_note TEXT,
  alert_date DATE DEFAULT CURRENT_DATE,
  UNIQUE(family_id, alert_date, destination)
);

CREATE TABLE upcoming_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  event_date DATE,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE slideshow_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  location TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE aura_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Memory graph
CREATE TABLE memory_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX memory_nodes_embedding_idx ON memory_nodes
  USING hnsw (embedding vector_cosine_ops);

CREATE TABLE memory_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES memory_nodes(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES memory_nodes(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  weight FLOAT DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_id, target_id, relationship)
);

-- Seed Mehta family
INSERT INTO families (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Mehta family');

INSERT INTO family_members (id, family_id, name, color) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Gaurav', '#6ec1ff'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Maya', '#ff8fb1'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Arjun', '#5fd28a'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Priya', '#b89bff');

INSERT INTO calendar_events (family_id, member_id, title, location, starts_at) VALUES
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Drop-off + standup', NULL, date_trunc('day', now()) + interval '8 hours 30 minutes'),
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Dentist — Maya', 'Dr. Lin', date_trunc('day', now()) + interval '13 hours'),
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Soccer pickup', NULL, date_trunc('day', now()) + interval '17 hours 30 minutes');

INSERT INTO todos (family_id, text, done, assigned_to) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Pay water bill', true, NULL),
  ('00000000-0000-0000-0000-000000000001', 'Sign permission slip', false, '10000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000001', 'Call plumber', false, NULL);

INSERT INTO shopping_items (family_id, text) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Milk'),
  ('00000000-0000-0000-0000-000000000001', 'Eggs');

INSERT INTO chore_points (family_id, member_id, week_start, stars, points) VALUES
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', date_trunc('week', now())::date, 4, 80),
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', date_trunc('week', now())::date, 3, 60);

INSERT INTO family_notes (family_id, from_member_id, body) VALUES
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'Arjun has a dentist form in his backpack — sign before Wed!'),
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Can we do pizza Friday? 🍕');

INSERT INTO meals (family_id, title, prep_minutes, on_list) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Lemon herb chicken', 35, true);

INSERT INTO packages (family_id, carrier, count, eta_text) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Amazon', 2, 'by 4 PM');

INSERT INTO commute_alerts (family_id, destination, leave_by, delay_minutes, route_note) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Lincoln Elementary', date_trunc('day', now()) + interval '8 hours 5 minutes', 6, 'Route 9');

INSERT INTO upcoming_items (family_id, label, title, subtitle, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'In 4 days', 'Grandma''s birthday', '🎁 gift idea ready', 1),
  ('00000000-0000-0000-0000-000000000001', 'Wed', 'Maya — early dismissal', '1:15 PM', 2),
  ('00000000-0000-0000-0000-000000000001', 'Fri', 'Arjun — field trip', 'pack lunch', 3),
  ('00000000-0000-0000-0000-000000000001', 'Jun 21', 'Anniversary', '🎁 plan dinner', 4);

INSERT INTO slideshow_photos (family_id, url, caption, location, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1100&q=80', 'Beach day, last summer', 'Santa Cruz · July 2025', 1),
  ('00000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1602771968066-0acb09bcc5a7?w=1100&q=80', 'Family hike', 'Yosemite · August 2025', 2);

-- Seed memory nodes (embeddings added at runtime)
INSERT INTO memory_nodes (family_id, type, label, content) VALUES
  ('00000000-0000-0000-0000-000000000001', 'person', 'Maya', 'Maya is a child in the Mehta family. She has dental appointments with Dr. Lin at Maplewood Dental.'),
  ('00000000-0000-0000-0000-000000000001', 'place', 'Dr. Lin', 'Dr. Lin practices at Maplewood Dental. Preferred after-school appointment times.'),
  ('00000000-0000-0000-0000-000000000001', 'preference', 'Tavola', 'The Mehta family enjoys dining at Tavola, an Italian restaurant nearby.'),
  ('00000000-0000-0000-0000-000000000001', 'preference', 'Shopping brands', 'Family usually buys Bounty paper towels and dark roast coffee.');

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE todos;
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_items;
ALTER PUBLICATION supabase_realtime ADD TABLE chore_points;
ALTER PUBLICATION supabase_realtime ADD TABLE family_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE family_members;
ALTER PUBLICATION supabase_realtime ADD TABLE upcoming_items;
ALTER PUBLICATION supabase_realtime ADD TABLE meals;
ALTER PUBLICATION supabase_realtime ADD TABLE packages;
ALTER PUBLICATION supabase_realtime ADD TABLE commute_alerts;

-- RLS (permissive for family mirror kiosk — tighten for production)
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE commute_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE upcoming_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE slideshow_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read" ON families FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON family_members FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON calendar_events FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON todos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_read" ON shopping_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_read" ON chore_points FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON family_notes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_read" ON meals FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON packages FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON commute_alerts FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON upcoming_items FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON slideshow_photos FOR SELECT TO anon USING (true);
