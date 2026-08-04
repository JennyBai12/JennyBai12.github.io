-- ===== 白白的日记 - Supabase 建表脚本 =====
-- 在 Supabase Dashboard → SQL Editor 中粘贴执行

-- 1. 用户数据表（单表 JSON blob 策略）
CREATE TABLE IF NOT EXISTS user_data (
  user_id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 自动更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_data_updated ON user_data;
CREATE TRIGGER trg_user_data_updated
  BEFORE UPDATE ON user_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. RLS 行级安全（用户只能访问自己的数据）
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- 仅本人可读
DROP POLICY IF EXISTS "ud_select_self" ON user_data;
CREATE POLICY "ud_select_self" ON user_data
  FOR SELECT USING (auth.uid() = user_id);

-- 仅本人可写
DROP POLICY IF EXISTS "ud_insert_self" ON user_data;
CREATE POLICY "ud_insert_self" ON user_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 仅本人可改
DROP POLICY IF EXISTS "ud_update_self" ON user_data;
CREATE POLICY "ud_update_self" ON user_data
  FOR UPDATE USING (auth.uid() = user_id);

-- 仅本人可删
DROP POLICY IF EXISTS "ud_delete_self" ON user_data;
CREATE POLICY "ud_delete_self" ON user_data
  FOR DELETE USING (auth.uid() = user_id);
