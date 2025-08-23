-- Contacts Management Schema
-- This replaces the placeholder implementation using relationships table

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  company VARCHAR(200),
  job_title VARCHAR(200),
  notes TEXT,
  avatar_url TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT contacts_email_check CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT contacts_phone_check CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$'),
  
  -- Indexes for performance
  UNIQUE(user_id, email),
  INDEX idx_contacts_user_id (user_id),
  INDEX idx_contacts_email (email),
  INDEX idx_contacts_company (company),
  INDEX idx_contacts_favorite (is_favorite),
  INDEX idx_contacts_created_at (created_at)
);

-- Contact tags table
CREATE TABLE IF NOT EXISTS contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT contact_tags_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 50),
  CONSTRAINT contact_tags_color_format CHECK (color ~* '^#[0-9A-Fa-f]{6}$'),
  
  -- Indexes
  UNIQUE(user_id, name),
  INDEX idx_contact_tags_user_id (user_id)
);

-- Contact-tag relationships
CREATE TABLE IF NOT EXISTS contact_tag_relationships (
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES contact_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  PRIMARY KEY (contact_id, tag_id),
  INDEX idx_contact_tag_relationships_contact (contact_id),
  INDEX idx_contact_tag_relationships_tag (tag_id)
);

-- Contact groups table
CREATE TABLE IF NOT EXISTS contact_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#10B981',
  is_system_group BOOLEAN DEFAULT FALSE, -- For system groups like "All Contacts", "Favorites"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT contact_groups_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  CONSTRAINT contact_groups_color_format CHECK (color ~* '^#[0-9A-Fa-f]{6}$'),
  
  -- Indexes
  UNIQUE(user_id, name),
  INDEX idx_contact_groups_user_id (user_id),
  INDEX idx_contact_groups_system (is_system_group)
);

-- Contact-group relationships
CREATE TABLE IF NOT EXISTS contact_group_relationships (
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES contact_groups(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- member, admin, moderator
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  PRIMARY KEY (contact_id, group_id),
  INDEX idx_contact_group_relationships_contact (contact_id),
  INDEX idx_contact_group_relationships_group (group_id),
  INDEX idx_contact_group_relationships_role (role)
);

-- Contact import history
CREATE TABLE IF NOT EXISTS contact_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  import_type VARCHAR(50) NOT NULL, -- csv, vcf, google, outlook
  total_records INTEGER NOT NULL,
  successful_imports INTEGER NOT NULL DEFAULT 0,
  failed_imports INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'processing', -- processing, completed, failed
  error_log TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes
  INDEX idx_contact_imports_user_id (user_id),
  INDEX idx_contact_imports_status (status),
  INDEX idx_contact_imports_created_at (created_at)
);

-- Contact activity log
CREATE TABLE IF NOT EXISTS contact_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- created, updated, deleted, tagged, grouped, imported
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_contact_activity_log_contact (contact_id),
  INDEX idx_contact_activity_log_user (user_id),
  INDEX idx_contact_activity_log_type (activity_type),
  INDEX idx_contact_activity_log_created_at (created_at)
);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contacts_updated_at 
  BEFORE UPDATE ON contacts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_groups_updated_at 
  BEFORE UPDATE ON contact_groups 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create system groups for new users
CREATE OR REPLACE FUNCTION create_user_system_groups()
RETURNS TRIGGER AS $$
BEGIN
  -- Create "All Contacts" group
  INSERT INTO contact_groups (user_id, name, description, color, is_system_group)
  VALUES (NEW.id, 'All Contacts', 'All contacts in your address book', '#6B7280', TRUE);
  
  -- Create "Favorites" group
  INSERT INTO contact_groups (user_id, name, description, color, is_system_group)
  VALUES (NEW.id, 'Favorites', 'Your favorite contacts', '#F59E0B', TRUE);
  
  -- Create "Recently Added" group
  INSERT INTO contact_groups (user_id, name, description, color, is_system_group)
  VALUES (NEW.id, 'Recently Added', 'Contacts added in the last 30 days', '#10B981', TRUE);
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_system_groups_on_user_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_system_groups();

-- Function to automatically add contacts to "All Contacts" group
CREATE OR REPLACE FUNCTION add_contact_to_all_contacts_group()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO contact_group_relationships (contact_id, group_id)
  SELECT NEW.id, cg.id
  FROM contact_groups cg
  WHERE cg.user_id = NEW.user_id AND cg.name = 'All Contacts' AND cg.is_system_group = TRUE;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER add_contact_to_all_contacts
  AFTER INSERT ON contacts
  FOR EACH ROW EXECUTE FUNCTION add_contact_to_all_contacts_group();

-- Function to automatically add favorite contacts to "Favorites" group
CREATE OR REPLACE FUNCTION manage_favorite_contacts_group()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_favorite = TRUE AND OLD.is_favorite = FALSE THEN
    -- Add to favorites group
    INSERT INTO contact_group_relationships (contact_id, group_id)
    SELECT NEW.id, cg.id
    FROM contact_groups cg
    WHERE cg.user_id = NEW.user_id AND cg.name = 'Favorites' AND cg.is_system_group = TRUE;
  ELSIF NEW.is_favorite = FALSE AND OLD.is_favorite = TRUE THEN
    -- Remove from favorites group
    DELETE FROM contact_group_relationships cgr
    USING contact_groups cg
    WHERE cgr.contact_id = NEW.id 
      AND cgr.group_id = cg.id 
      AND cg.user_id = NEW.user_id 
      AND cg.name = 'Favorites' 
      AND cg.is_system_group = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER manage_favorite_contacts
  AFTER UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION manage_favorite_contacts_group();

-- Views for easier querying
CREATE OR REPLACE VIEW contact_details AS
SELECT 
  c.*,
  array_agg(DISTINCT ct.name) FILTER (WHERE ct.name IS NOT NULL) as tags,
  array_agg(DISTINCT cg.name) FILTER (WHERE cg.name IS NOT NULL) as groups,
  COUNT(DISTINCT e.id) as event_count
FROM contacts c
LEFT JOIN contact_tag_relationships ctr ON c.id = ctr.contact_id
LEFT JOIN contact_tags ct ON ctr.tag_id = ct.id
LEFT JOIN contact_group_relationships cgr ON c.id = cgr.contact_id
LEFT JOIN contact_groups cg ON cgr.group_id = cg.id
LEFT JOIN events e ON c.email = e.attendee_email
GROUP BY c.id;

-- Row Level Security (RLS) policies
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_activity_log ENABLE ROW LEVEL SECURITY;

-- Contacts policies
CREATE POLICY "Users can view their own contacts" ON contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contacts" ON contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" ON contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" ON contacts
  FOR DELETE USING (auth.uid() = user_id);

-- Contact tags policies
CREATE POLICY "Users can view their own contact tags" ON contact_tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own contact tags" ON contact_tags
  FOR ALL USING (auth.uid() = user_id);

-- Contact groups policies
CREATE POLICY "Users can view their own contact groups" ON contact_groups
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own contact groups" ON contact_groups
  FOR ALL USING (auth.uid() = user_id);

-- Contact imports policies
CREATE POLICY "Users can view their own contact imports" ON contact_imports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own contact imports" ON contact_imports
  FOR ALL USING (auth.uid() = user_id);

-- Contact activity log policies
CREATE POLICY "Users can view their own contact activity" ON contact_activity_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contact activity" ON contact_activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
